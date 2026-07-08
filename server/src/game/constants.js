const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUES = RANKS.reduce((acc, rank, i) => {
  acc[rank] = i + 2;
  return acc;
}, {});

const ACE_OF_SPADES = 'AS';

module.exports = { SUITS, RANKS, RANK_VALUES, ACE_OF_SPADES };
