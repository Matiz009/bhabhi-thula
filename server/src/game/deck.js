const { SUITS, RANKS } = require('./constants');

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck;
}

function shuffle(deck, rng = Math.random) {
  const arr = deck.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseCard(code) {
  const suit = code.slice(-1);
  const rank = code.slice(0, -1);
  return { rank, suit };
}

module.exports = { createDeck, shuffle, parseCard };
