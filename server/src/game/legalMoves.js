const { parseCard } = require('./deck');
const { ACE_OF_SPADES } = require('./constants');

/**
 * Returns the subset of `hand` that may legally be played given the led suit.
 * - No led suit yet (leading a trick): any card may be led.
 * - Led suit set: must follow suit if able; if void in that suit, any card
 *   may be thrown (a "Thulla").
 */
function legalMoves(hand, ledSuit) {
  if (!ledSuit) return hand.slice();
  const followSuit = hand.filter((card) => parseCard(card).suit === ledSuit);
  return followSuit.length > 0 ? followSuit : hand.slice();
}

/**
 * The very first trick of a game is constrained: whoever holds the Ace of
 * Spades must lead with it.
 */
function legalMovesForLead(hand, { isFirstTrick }) {
  if (isFirstTrick && hand.includes(ACE_OF_SPADES)) {
    return [ACE_OF_SPADES];
  }
  return hand.slice();
}

module.exports = { legalMoves, legalMovesForLead };
