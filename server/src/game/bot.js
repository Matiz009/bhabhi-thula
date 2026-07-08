const { parseCard } = require('./deck');
const { RANK_VALUES } = require('./constants');
const { legalMoves, legalMovesForLead } = require('./legalMoves');

function byRank(card) {
  return RANK_VALUES[parseCard(card).rank];
}

function highestCard(cards) {
  return cards.slice().sort((a, b) => byRank(b) - byRank(a))[0];
}

function lowestCard(cards) {
  return cards.slice().sort((a, b) => byRank(a) - byRank(b))[0];
}

/**
 * Basic bot strategy:
 * - Forced to lead the Ace of Spades on the first trick: no choice.
 * - Leading otherwise: dump the highest card (get rid of dangerous cards
 *   while there's no risk of being caught following suit).
 * - Following suit (not void): play the lowest legal card, conserving low
 *   cards for later safety.
 * - Void of the led suit (must throw a Thulla): throw the most dangerous
 *   (highest) card, since it's a free discard onto whoever wins the trick.
 */
function chooseCard(hand, ledSuit, { isFirstTrick = false } = {}) {
  if (!ledSuit) {
    const leadOptions = legalMovesForLead(hand, { isFirstTrick });
    return leadOptions.length === 1 ? leadOptions[0] : highestCard(leadOptions);
  }

  const legal = legalMoves(hand, ledSuit);
  const isVoid = !hand.some((card) => parseCard(card).suit === ledSuit);

  if (isVoid) {
    return highestCard(legal);
  }
  return lowestCard(legal);
}

module.exports = { chooseCard, highestCard, lowestCard };
