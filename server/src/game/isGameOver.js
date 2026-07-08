/**
 * Determines the current game-completion status from a hands map/array.
 *
 * @param {Object<string, string[]>|string[][]} hands - playerId -> cards,
 *   or an array of hands indexed by seat.
 * @returns {{ isOver: boolean, safe: string[], bhabhi: string|null }}
 *
 * A player is "safe" once their hand is empty. The game ends once at most
 * one player still holds cards; that lone player is the Bhabhi (loser). In
 * the rare case the final trick empties every remaining hand at once, there
 * is no Bhabhi.
 */
function isGameOver(hands) {
  const entries = Array.isArray(hands)
    ? hands.map((cards, idx) => [String(idx), cards])
    : Object.entries(hands);

  const safe = entries.filter(([, cards]) => cards.length === 0).map(([id]) => id);
  const remaining = entries.filter(([, cards]) => cards.length > 0);

  const isOver = remaining.length <= 1;
  const bhabhi = isOver && remaining.length === 1 ? remaining[0][0] : null;

  return { isOver, safe, bhabhi };
}

module.exports = { isGameOver };
