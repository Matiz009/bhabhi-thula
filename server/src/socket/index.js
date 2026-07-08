const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const gameManager = require('../GameManager');
const { GameError } = require('../game');

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication token required'));

  try {
    const payload = verifyToken(token);
    socket.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
}

function initSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  gameManager.attachIO(io);
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    let currentRoomId = null;

    socket.on('joinRoom', ({ roomId }, ack) => {
      try {
        const room = gameManager.joinRoom(roomId, {
          userId: socket.user.id,
          username: socket.user.username,
          socketId: socket.id,
        });
        currentRoomId = roomId;
        socket.join(roomId);

        gameManager.broadcastRoomState(roomId);
        ack?.({ ok: true, roomId });
      } catch (err) {
        emitError(socket, err);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('leaveRoom', ({ roomId }, ack) => {
      try {
        const targetRoomId = roomId || currentRoomId;
        gameManager.leaveRoom(targetRoomId, socket.user.id);
        socket.leave(targetRoomId);
        currentRoomId = null;
        gameManager.broadcastRoomState(targetRoomId);
        ack?.({ ok: true });
      } catch (err) {
        emitError(socket, err);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('startGame', ({ roomId }, ack) => {
      try {
        const room = gameManager.getRoom(roomId || currentRoomId);
        if (!room) throw new GameError('Room not found', 'ROOM_NOT_FOUND');
        if (room.hostUserId !== socket.user.id) {
          throw new GameError('Only the host can start the game', 'NOT_HOST');
        }
        gameManager.startGame(room.id);
        ack?.({ ok: true });
      } catch (err) {
        emitError(socket, err);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('playCard', ({ roomId, card }, ack) => {
      try {
        gameManager.playCard(roomId || currentRoomId, socket.user.id, card);
        ack?.({ ok: true });
      } catch (err) {
        emitError(socket, err);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (currentRoomId) {
        gameManager.handleDisconnect(currentRoomId, socket.user.id);
      }
    });
  });

  return io;
}

function emitError(socket, err) {
  if (err instanceof GameError) {
    socket.emit('error', { message: err.message, code: err.code });
  } else {
    console.error(err);
    socket.emit('error', { message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

module.exports = { initSocket };
