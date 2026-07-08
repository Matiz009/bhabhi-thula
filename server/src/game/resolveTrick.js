const { parseCard } = require('./deck');
const { RANK_VALUES } = require('./constants');

/**
 * Resolves a completed trick.
 *
 * @param {Array<{playerId: string, card: string}>} trick - plays in the
 *   order they were made; trick[0] is the lead.
 * @returns {{
 *   isThulla: boolean,
 *   ledSuit: string,
 *   winnerPlayerId: string,
 *   cardsPickedUp: string[],
 *   nextLeaderPlayerId: string
 * }}
 *
 * Rules:
 * - The winner is always whoever played the highest card of the led suit,
 *   regardless of whether the trick was a clean follow or a Thulla.
 * - If everyone followed suit, the trick is simply discarded (callers should
 *   NOT add cardsPickedUp to any hand) and the winner leads next.
 * - If anyone played off-suit (a Thulla), the winner picks up every card on
 *   the table and leads next.
 */
function resolveTrick(trick) {
  if (!trick || trick.length === 0) {
    throw new Error('Cannot resolve an empty trick');
  }

  const ledSuit = parseCard(trick[0].card).suit;
  const isThulla = trick.some((play) => parseCard(play.card).suit !== ledSuit);

  const ledSuitPlays = trick.filter((play) => parseCard(play.card).suit === ledSuit);
  const winningPlay = ledSuitPlays.reduce((best, play) => {
    const rank = RANK_VALUES[parseCard(play.card).rank];
    const bestRank = RANK_VALUES[parseCard(best.card).rank];
    return rank > bestRank ? play : best;
  }, ledSuitPlays[0]);

  return {
    isThulla,
    ledSuit,
    winnerPlayerId: winningPlay.playerId,
    cardsPickedUp: trick.map((play) => play.card),
    nextLeaderPlayerId: winningPlay.playerId,
  };
}

module.exports = { resolveTrick };
