const { createDeck, shuffle } = require('./deck');
const { ACE_OF_SPADES } = require('./constants');

/**
 * Deals a shuffled 52-card deck as evenly as possible across numPlayers.
 * Bhabhi is always played with 4 players / 13 cards each, but this stays
 * general so tests can exercise other player counts.
 */
function deal(numPlayers = 4, rng = Math.random) {
  const deck = shuffle(createDeck(), rng);
  const hands = Array.from({ length: numPlayers }, () => []);
  deck.forEach((card, i) => {
    hands[i % numPlayers].push(card);
  });
  return hands;
}

function findAceOfSpadesHolder(hands) {
  return hands.findIndex((hand) => hand.includes(ACE_OF_SPADES));
}

module.exports = { deal, findAceOfSpadesHolder };
