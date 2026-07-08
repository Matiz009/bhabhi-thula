const { createDeck, shuffle, parseCard } = require('./deck');
const { deal, findAceOfSpadesHolder } = require('./deal');
const { legalMoves, legalMovesForLead } = require('./legalMoves');
const { resolveTrick } = require('./resolveTrick');
const { isGameOver } = require('./isGameOver');
const { chooseCard } = require('./bot');
const { createGame, playCard, getCurrentPlayer, getLegalMovesForPlayer } = require('./engine');
const { GameError } = require('./errors');
const { SUITS, RANKS, RANK_VALUES, ACE_OF_SPADES } = require('./constants');

module.exports = {
  createDeck,
  shuffle,
  parseCard,
  deal,
  findAceOfSpadesHolder,
  legalMoves,
  legalMovesForLead,
  resolveTrick,
  isGameOver,
  chooseCard,
  createGame,
  playCard,
  getCurrentPlayer,
  getLegalMovesForPlayer,
  GameError,
  SUITS,
  RANKS,
  RANK_VALUES,
  ACE_OF_SPADES,
};
