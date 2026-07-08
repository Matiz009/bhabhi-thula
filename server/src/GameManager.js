const {
  createGame,
  playCard: enginePlayCard,
  getLegalMovesForPlayer,
  chooseCard,
  GameError,
} = require('./game');
const Room = require('./models/Room');
const MatchHistory = require('./models/MatchHistory');
const User = require('./models/User');

const RECONNECT_GRACE_MS = 30_000;
const BOT_MOVE_DELAY_MS = 900;

/**
 * Owns all live, in-memory game state. Rooms are mirrored in Mongo for
 * lobby listings, but the authoritative in-progress state (hands, trick,
 * turn order) only ever lives here. Mongo is only written to on room
 * creation/status changes and once a game finishes.
 */
class GameManager {
  constructor() {
    /** @type {Map<string, object>} roomId -> live room */
    this.rooms = new Map();
    this.io = null;
  }

  attachIO(io) {
    this.io = io;
  }

  // ---------------------------------------------------------------------
  // Room lifecycle
  // ---------------------------------------------------------------------

  registerRoom({ id, name, hostUserId, hostUsername }) {
    const room = {
      id,
      name,
      hostUserId,
      maxPlayers: 4,
      seats: [
        {
          userId: hostUserId,
          username: hostUsername,
          isBot: false,
          socketId: null,
          connected: false,
        },
      ],
      status: 'waiting',
      game: null,
      disconnectTimers: {},
    };
    this.rooms.set(id, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  listOpenRooms() {
    return [...this.rooms.values()]
      .filter((r) => r.status === 'waiting')
      .map((r) => this.roomSummary(r));
  }

  roomSummary(room) {
    return {
      id: room.id,
      name: room.name,
      status: room.status,
      players: room.seats.map((s) => s.username),
      seatsTaken: room.seats.length,
      maxPlayers: room.maxPlayers,
    };
  }

  joinRoom(roomId, { userId, username, socketId }) {
    const room = this.rooms.get(roomId);
    if (!room) throw new GameError('Room not found', 'ROOM_NOT_FOUND');

    const existingSeat = room.seats.find((s) => s.userId === userId);
    if (existingSeat) {
      existingSeat.socketId = socketId;
      existingSeat.connected = true;
      this._clearDisconnectTimer(room, userId);
      return room;
    }

    if (room.status !== 'waiting') {
      throw new GameError('Game already in progress', 'ROOM_IN_PROGRESS');
    }
    if (room.seats.length >= room.maxPlayers) {
      throw new GameError('Room is full', 'ROOM_FULL');
    }

    room.seats.push({ userId, username, isBot: false, socketId, connected: true });
    return room;
  }

  leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.status === 'waiting') {
      room.seats = room.seats.filter((s) => s.userId !== userId);
      if (room.hostUserId === userId && room.seats.length > 0) {
        room.hostUserId = room.seats[0].userId;
      }
      if (room.seats.length === 0) {
        this.rooms.delete(roomId);
      }
    } else if (room.status === 'in-progress') {
      // Leaving mid-game immediately hands the seat to a bot (no grace period
      // for an explicit, intentional leave).
      this._replaceWithBot(room, userId);
    }
  }

  // ---------------------------------------------------------------------
  // Disconnect / reconnect handling
  // ---------------------------------------------------------------------

  handleDisconnect(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const seat = room.seats.find((s) => s.userId === userId);
    if (!seat || seat.isBot) return;

    seat.connected = false;
    seat.socketId = null;

    if (room.status !== 'in-progress') return;

    this._clearDisconnectTimer(room, userId);
    room.disconnectTimers[userId] = setTimeout(() => {
      this._replaceWithBot(room, userId);
      delete room.disconnectTimers[userId];
    }, RECONNECT_GRACE_MS);

    this._broadcast(room, 'playerDisconnected', {
      username: seat.username,
      gracePeriodMs: RECONNECT_GRACE_MS,
    });
  }

  _clearDisconnectTimer(room, userId) {
    if (room.disconnectTimers[userId]) {
      clearTimeout(room.disconnectTimers[userId]);
      delete room.disconnectTimers[userId];
    }
  }

  _replaceWithBot(room, userId) {
    const seat = room.seats.find((s) => s.userId === userId);
    if (!seat || seat.isBot) return;

    seat.isBot = true;
    seat.connected = false;
    seat.socketId = null;

    this._broadcastAll(room);

    if (room.game && !room.game.isOver) {
      this._maybeRunBots(room);
    }
  }

  // ---------------------------------------------------------------------
  // Game lifecycle
  // ---------------------------------------------------------------------

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) throw new GameError('Room not found', 'ROOM_NOT_FOUND');
    if (room.status === 'in-progress') {
      throw new GameError('Game already in progress', 'ROOM_IN_PROGRESS');
    }

    while (room.seats.length < room.maxPlayers) {
      const seatIndex = room.seats.length;
      room.seats.push({
        userId: null,
        username: `Bot ${seatIndex + 1}`,
        isBot: true,
        socketId: null,
        connected: true,
      });
    }

    const playerIds = room.seats.map((_, idx) => String(idx));
    room.game = createGame(playerIds);
    room.game.startedAt = new Date();
    room.status = 'in-progress';

    this._broadcastAll(room);
    this._maybeRunBots(room);

    return room;
  }

  playCard(roomId, userId, card) {
    const room = this.rooms.get(roomId);
    if (!room) throw new GameError('Room not found', 'ROOM_NOT_FOUND');
    if (!room.game) throw new GameError('Game has not started', 'GAME_NOT_STARTED');

    const seatIndex = room.seats.findIndex((s) => s.userId === userId);
    if (seatIndex === -1) throw new GameError('You are not seated in this room', 'NOT_SEATED');

    this._applyMove(room, String(seatIndex), card);
    this._maybeRunBots(room);
  }

  _applyMove(room, seatPlayerId, card) {
    const { state, events } = enginePlayCard(room.game, seatPlayerId, card);
    room.game = state;
    this._emitEvents(room, events);
    this._broadcastAll(room);

    if (state.isOver) {
      this._finalizeGame(room).catch((err) => {
        console.error(`Failed to persist match history for room ${room.id}:`, err);
      });
    }
  }

  _emitEvents(room, events) {
    for (const event of events) {
      switch (event.type) {
        case 'thullaThrown': {
          const winnerSeat = Number(event.winnerPlayerId);
          const throwerSeat = Number(event.throwerPlayerId);
          this._broadcast(room, 'thullaThrown', {
            throwerSeatIndex: throwerSeat,
            throwerUsername: room.seats[throwerSeat].username,
            winnerSeatIndex: winnerSeat,
            winnerUsername: room.seats[winnerSeat].username,
            count: event.count,
          });
          break;
        }
        case 'trickResolved': {
          const winnerSeat = Number(event.winnerPlayerId);
          this._broadcast(room, 'trickResolved', {
            winnerSeatIndex: winnerSeat,
            winnerUsername: room.seats[winnerSeat].username,
            cardCount: event.cards.length,
          });
          break;
        }
        case 'playerSafe': {
          const seatIndex = Number(event.playerId);
          this._broadcast(room, 'playerSafe', {
            seatIndex,
            username: room.seats[seatIndex].username,
          });
          break;
        }
        case 'gameOver': {
          const bhabhiSeat = event.bhabhi !== null ? Number(event.bhabhi) : null;
          this._broadcast(room, 'gameOver', {
            bhabhiSeatIndex: bhabhiSeat,
            bhabhiUsername: bhabhiSeat !== null ? room.seats[bhabhiSeat].username : null,
          });
          break;
        }
        default:
          break;
      }
    }
  }

  /** Runs consecutive bot turns (with a small delay each) until a human's turn or game over. */
  _maybeRunBots(room) {
    if (!room.game || room.game.isOver) return;

    const seatIndex = room.game.turnIndex;
    const seat = room.seats[seatIndex];
    if (!seat || !seat.isBot) return;

    setTimeout(() => {
      const currentRoom = this.rooms.get(room.id);
      if (!currentRoom || !currentRoom.game || currentRoom.game.isOver) return;

      const state = currentRoom.game;
      const playerId = String(state.turnIndex);
      const legal = getLegalMovesForPlayer(state, playerId);
      const ledSuit = state.currentTrick.length === 0 ? null : state.ledSuit;
      const card = chooseCard(legal, ledSuit, { isFirstTrick: state.isFirstTrick });

      try {
        this._applyMove(currentRoom, playerId, card);
      } catch (err) {
        console.error(`Bot move failed in room ${room.id}:`, err);
        return;
      }
      // Keep chaining: the next player may also be a bot.
      this._maybeRunBots(currentRoom);
    }, BOT_MOVE_DELAY_MS);
  }

  async _finalizeGame(room) {
    room.status = 'finished';
    const bhabhiSeatIndex = room.game.bhabhi !== null ? Number(room.game.bhabhi) : null;

    const humanSeats = room.seats.filter((s) => !s.isBot && s.userId);

    await Promise.all(
      humanSeats.map(async (seat) => {
        const seatIndex = room.seats.indexOf(seat);
        const isBhabhi = seatIndex === bhabhiSeatIndex;
        const update = { $inc: { 'stats.gamesPlayed': 1 } };
        if (isBhabhi) {
          update.$inc['stats.timesAsBhabhi'] = 1;
        } else {
          update.$inc['stats.wins'] = 1;
        }
        await User.findByIdAndUpdate(seat.userId, update);
      })
    );

    await MatchHistory.create({
      room: room.id,
      roomName: room.name,
      participants: room.seats.map((s, idx) => ({
        userId: s.userId,
        username: s.username,
        isBot: s.isBot,
        isBhabhi: idx === bhabhiSeatIndex,
      })),
      bhabhiUsername: bhabhiSeatIndex !== null ? room.seats[bhabhiSeatIndex].username : null,
      startedAt: room.game.startedAt || new Date(),
      endedAt: new Date(),
    });

    await Room.findByIdAndUpdate(room.id, { status: 'finished' }).catch(() => {});

    // Allow a rematch on the same room/seats.
    room.status = 'waiting';
  }

  // ---------------------------------------------------------------------
  // Broadcasting
  // ---------------------------------------------------------------------

  buildPlayerView(room, seatIndex) {
    const game = room.game;
    if (!game) {
      return {
        players: room.seats.map((s) => ({
          seatIndex: room.seats.indexOf(s),
          username: s.username,
          isBot: s.isBot,
          connected: s.connected,
        })),
        started: false,
        yourSeatIndex: seatIndex,
        isHost: seatIndex !== null && room.seats[seatIndex]?.userId === room.hostUserId,
        maxPlayers: room.maxPlayers,
      };
    }

    const players = room.seats.map((seat, idx) => ({
      seatIndex: idx,
      username: seat.username,
      isBot: seat.isBot,
      connected: seat.connected,
      cardCount: game.hands[String(idx)] ? game.hands[String(idx)].length : 0,
      safe: game.safePlayers.includes(String(idx)),
    }));

    const isYourTurn = game.turnIndex === seatIndex;
    const yourHand = seatIndex !== null && game.hands[String(seatIndex)] ? game.hands[String(seatIndex)] : [];

    return {
      started: true,
      players,
      yourSeatIndex: seatIndex,
      isHost: seatIndex !== null && room.seats[seatIndex]?.userId === room.hostUserId,
      yourHand,
      legalMoves: isYourTurn ? getLegalMovesForPlayer(game, String(seatIndex)) : [],
      currentTurnSeatIndex: game.turnIndex,
      isYourTurn,
      ledSuit: game.currentTrick.length === 0 ? null : game.ledSuit,
      currentTrick: game.currentTrick.map((p) => ({
        seatIndex: Number(p.playerId),
        card: p.card,
      })),
      isFirstTrick: game.isFirstTrick,
      discardCount: game.discardPile.length,
      isOver: game.isOver,
      bhabhiSeatIndex: game.bhabhi !== null ? Number(game.bhabhi) : null,
    };
  }

  broadcastRoomState(roomId) {
    const room = this.rooms.get(roomId);
    if (room) this._broadcastAll(room);
  }

  _broadcastAll(room) {
    if (!this.io) return;
    room.seats.forEach((seat, idx) => {
      if (seat.isBot || !seat.socketId) return;
      const view = this.buildPlayerView(room, idx);
      this.io.to(seat.socketId).emit('gameState', view);
    });
  }

  _broadcast(room, event, payload) {
    if (!this.io) return;
    this.io.to(room.id).emit(event, payload);
  }
}

module.exports = new GameManager();
