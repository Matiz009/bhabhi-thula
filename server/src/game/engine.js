const { deal } = require('./deal');
const { parseCard } = require('./deck');
const { legalMoves, legalMovesForLead } = require('./legalMoves');
const { resolveTrick } = require('./resolveTrick');
const { isGameOver } = require('./isGameOver');
const { ACE_OF_SPADES } = require('./constants');
const { GameError } = require('./errors');

/**
 * Composes the pure primitives (deal / legalMoves / resolveTrick /
 * isGameOver) into a full game state machine. Still framework-free: no I/O,
 * no sockets, no persistence — just state in, {state, events} out.
 */
function createGame(playerIds, rng = Math.random) {
  if (!Array.isArray(playerIds) || playerIds.length < 2) {
    throw new GameError('A game requires at least 2 players', 'INVALID_PLAYERS');
  }

  const hands = deal(playerIds.length, rng);
  const handsMap = {};
  playerIds.forEach((id, i) => {
    handsMap[id] = hands[i];
  });

  const leaderIndex = playerIds.findIndex((id) => handsMap[id].includes(ACE_OF_SPADES));

  return {
    players: playerIds.slice(),
    hands: handsMap,
    currentTrick: [],
    ledSuit: null,
    turnIndex: leaderIndex,
    isFirstTrick: true,
    discardPile: [],
    safePlayers: [],
    bhabhi: null,
    isOver: false,
  };
}

function getCurrentPlayer(state) {
  return state.players[state.turnIndex];
}

function getLegalMovesForPlayer(state, playerId) {
  const hand = state.hands[playerId] || [];
  if (state.currentTrick.length === 0) {
    return legalMovesForLead(hand, { isFirstTrick: state.isFirstTrick });
  }
  return legalMoves(hand, state.ledSuit);
}

/** Next seat index after `fromIndex` (exclusive) that isn't safe yet. */
function nextActiveIndex(players, safePlayers, fromIndex) {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (!safePlayers.includes(players[idx])) return idx;
  }
  return -1;
}

/** First seat index at-or-after `fromIndex` (inclusive) that isn't safe yet. */
function activeIndexFrom(players, safePlayers, fromIndex) {
  const n = players.length;
  for (let step = 0; step < n; step++) {
    const idx = (fromIndex + step) % n;
    if (!safePlayers.includes(players[idx])) return idx;
  }
  return -1;
}

/**
 * Applies a single card play. Validates turn order and legality, then
 * resolves the trick if this was the last card played into it.
 *
 * @returns {{ state: object, events: Array<object> }}
 * @throws {GameError} on any illegal action
 */
function playCard(state, playerId, card) {
  if (state.isOver) {
    throw new GameError('Game is already over', 'GAME_OVER');
  }

  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer !== playerId) {
    throw new GameError(`It is not ${playerId}'s turn`, 'NOT_YOUR_TURN');
  }

  const hand = state.hands[playerId] || [];
  if (!hand.includes(card)) {
    throw new GameError('Card not in hand', 'CARD_NOT_IN_HAND');
  }

  const legal = getLegalMovesForPlayer(state, playerId);
  if (!legal.includes(card)) {
    throw new GameError('Illegal move: must follow suit if able', 'ILLEGAL_MOVE');
  }

  const events = [{ type: 'cardPlayed', playerId, card }];

  const nextHands = { ...state.hands, [playerId]: hand.filter((c) => c !== card) };
  const nextTrick = [...state.currentTrick, { playerId, card }];
  const nextLedSuit = state.ledSuit || parseCard(card).suit;

  let next = { ...state, hands: nextHands, currentTrick: nextTrick, ledSuit: nextLedSuit };

  const activePlayerCount = state.players.filter((id) => !state.safePlayers.includes(id)).length;
  const playedSuit = parseCard(card).suit;
  // A thulla ends the trick immediately, however many players have played so
  // far — it never waits for the remaining active players to follow.
  const isThullaThrow = state.ledSuit !== null && playedSuit !== state.ledSuit;
  const trickComplete = isThullaThrow || nextTrick.length === activePlayerCount;

  if (!trickComplete) {
    next.turnIndex = nextActiveIndex(next.players, next.safePlayers, state.turnIndex);
    return { state: next, events };
  }

  // Trick complete — resolve it.
  const result = resolveTrick(nextTrick);
  const updatedHands = { ...next.hands };

  if (result.isThulla) {
    updatedHands[result.winnerPlayerId] = [
      ...updatedHands[result.winnerPlayerId],
      ...result.cardsPickedUp,
    ];
    events.push({
      type: 'thullaThrown',
      throwerPlayerId: playerId,
      winnerPlayerId: result.winnerPlayerId,
      cardsPickedUp: result.cardsPickedUp,
      count: result.cardsPickedUp.length,
    });
  } else {
    next.discardPile = [...next.discardPile, ...result.cardsPickedUp];
    events.push({
      type: 'trickResolved',
      winnerPlayerId: result.winnerPlayerId,
      cards: result.cardsPickedUp,
    });
  }

  const newlySafe = next.players.filter(
    (id) => !next.safePlayers.includes(id) && updatedHands[id].length === 0
  );
  const updatedSafePlayers = [...next.safePlayers, ...newlySafe];
  for (const id of newlySafe) {
    events.push({ type: 'playerSafe', playerId: id });
  }

  next = {
    ...next,
    hands: updatedHands,
    currentTrick: [],
    ledSuit: null,
    isFirstTrick: false,
    safePlayers: updatedSafePlayers,
  };

  const status = isGameOver(updatedHands);
  if (status.isOver) {
    next.isOver = true;
    next.bhabhi = status.bhabhi;
    events.push({ type: 'gameOver', bhabhi: status.bhabhi });
    return { state: next, events };
  }

  const winnerSeatIndex = next.players.indexOf(result.winnerPlayerId);
  next.turnIndex = activeIndexFrom(next.players, next.safePlayers, winnerSeatIndex);

  return { state: next, events };
}

module.exports = {
  createGame,
  playCard,
  getCurrentPlayer,
  getLegalMovesForPlayer,
};
