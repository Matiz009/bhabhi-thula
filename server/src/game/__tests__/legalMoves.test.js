const { legalMoves, legalMovesForLead } = require('../legalMoves');

describe('legalMoves', () => {
  it('allows any card when there is no led suit (leading)', () => {
    const hand = ['2H', 'KS', '9D'];
    expect(legalMoves(hand, null)).toEqual(hand);
  });

  it('restricts to the led suit when the player can follow', () => {
    const hand = ['2H', 'KS', '9H', '3C'];
    expect(legalMoves(hand, 'H')).toEqual(['2H', '9H']);
  });

  it('allows any card when the player is void in the led suit', () => {
    const hand = ['2H', 'KS', '3C'];
    expect(legalMoves(hand, 'D')).toEqual(hand);
  });

  it('returns an empty array for an empty hand', () => {
    expect(legalMoves([], 'H')).toEqual([]);
  });
});

describe('legalMovesForLead', () => {
  it('forces the Ace of Spades on the first trick if held', () => {
    const hand = ['2H', 'AS', '9D'];
    expect(legalMovesForLead(hand, { isFirstTrick: true })).toEqual(['AS']);
  });

  it('allows any lead card on the first trick if AS is not held', () => {
    const hand = ['2H', 'KS', '9D'];
    expect(legalMovesForLead(hand, { isFirstTrick: true })).toEqual(hand);
  });

  it('allows any lead card on later tricks even if AS is held', () => {
    const hand = ['2H', 'AS', '9D'];
    expect(legalMovesForLead(hand, { isFirstTrick: false })).toEqual(hand);
  });
});
