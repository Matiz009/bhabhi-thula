const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = RANK_ORDER.reduce((acc, r, i) => {
  acc[r] = i + 2;
  return acc;
}, {});

export function parseCard(code) {
  const suit = code.slice(-1);
  const rank = code.slice(0, -1);
  return { rank, suit };
}

export function suitSymbol(suit) {
  return SUIT_SYMBOLS[suit] || suit;
}

export function isRedSuit(suit) {
  return suit === 'H' || suit === 'D';
}

export function rankValue(code) {
  return RANK_VALUES[parseCard(code).rank];
}

export function sortHand(hand) {
  return hand
    .slice()
    .sort((a, b) => {
      const ca = parseCard(a);
      const cb = parseCard(b);
      if (ca.suit !== cb.suit) return ca.suit.localeCompare(cb.suit);
      return rankValue(a) - rankValue(b);
    });
}
