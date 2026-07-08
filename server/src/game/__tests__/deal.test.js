const { deal, findAceOfSpadesHolder } = require('../deal');
const { createDeck } = require('../deck');

function fixedRng(sequence) {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe('deal', () => {
  it('deals 13 cards to each of 4 players', () => {
    const hands = deal(4);
    expect(hands).toHaveLength(4);
    hands.forEach((hand) => expect(hand).toHaveLength(13));
  });

  it('deals every card in the deck exactly once, with no duplicates', () => {
    const hands = deal(4);
    const allCards = hands.flat();
    expect(allCards).toHaveLength(52);
    expect(new Set(allCards).size).toBe(52);
    expect(new Set(allCards)).toEqual(new Set(createDeck()));
  });

  it('deals evenly for other player counts', () => {
    const hands = deal(2);
    expect(hands).toHaveLength(2);
    hands.forEach((hand) => expect(hand).toHaveLength(26));
  });

  it('produces a different order than the raw deck when shuffled', () => {
    const hands = deal(4, fixedRng([0.1, 0.9, 0.3, 0.7, 0.5, 0.2, 0.6, 0.4]));
    const allCards = hands.flat();
    expect(allCards).not.toEqual(createDeck());
  });

  it('is deterministic given a deterministic rng', () => {
    const rngSeq = [0.99, 0.01, 0.5, 0.33, 0.66, 0.25, 0.75, 0.1, 0.9, 0.2];
    const handsA = deal(4, fixedRng(rngSeq));
    const handsB = deal(4, fixedRng(rngSeq));
    expect(handsA).toEqual(handsB);
  });
});

describe('findAceOfSpadesHolder', () => {
  it('finds the seat index holding the Ace of Spades', () => {
    const hands = [['2H', '3D'], ['AS', '4C'], ['5S'], ['6D']];
    expect(findAceOfSpadesHolder(hands)).toBe(1);
  });

  it('returns -1 if nobody holds it', () => {
    const hands = [['2H'], ['3D'], ['4C'], ['5S']];
    expect(findAceOfSpadesHolder(hands)).toBe(-1);
  });
});
