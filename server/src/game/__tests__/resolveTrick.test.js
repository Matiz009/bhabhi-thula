const { resolveTrick } = require('../resolveTrick');

describe('resolveTrick', () => {
  it('throws when given an empty trick', () => {
    expect(() => resolveTrick([])).toThrow();
    expect(() => resolveTrick(null)).toThrow();
  });

  it('resolves a clean follow (no thulla): highest of led suit wins, no pickup', () => {
    const trick = [
      { playerId: 'p1', card: '5H' },
      { playerId: 'p2', card: 'KH' },
      { playerId: 'p3', card: '2H' },
      { playerId: 'p4', card: '9H' },
    ];
    const result = resolveTrick(trick);
    expect(result.isThulla).toBe(false);
    expect(result.ledSuit).toBe('H');
    expect(result.winnerPlayerId).toBe('p2');
    expect(result.nextLeaderPlayerId).toBe('p2');
    expect(result.cardsPickedUp).toEqual(['5H', 'KH', '2H', '9H']);
  });

  it('detects a thulla when a player throws off-suit', () => {
    const trick = [
      { playerId: 'p1', card: '5H' },
      { playerId: 'p2', card: 'KH' },
      { playerId: 'p3', card: '2C' }, // void in hearts, throws a thulla
      { playerId: 'p4', card: '9H' },
    ];
    const result = resolveTrick(trick);
    expect(result.isThulla).toBe(true);
    expect(result.winnerPlayerId).toBe('p2');
    expect(result.nextLeaderPlayerId).toBe('p2');
    expect(result.cardsPickedUp).toEqual(['5H', 'KH', '2C', '9H']);
    expect(result.cardsPickedUp).toHaveLength(4);
  });

  it('winner is determined only among led-suit cards, ignoring off-suit rank', () => {
    // An off-suit Ace should never beat the led suit, no matter how high.
    const trick = [
      { playerId: 'p1', card: '3S' },
      { playerId: 'p2', card: 'AH' }, // off suit ace - doesn't count
      { playerId: 'p3', card: '4S' },
      { playerId: 'p4', card: '2S' },
    ];
    const result = resolveTrick(trick);
    expect(result.isThulla).toBe(true);
    expect(result.winnerPlayerId).toBe('p3'); // 4S is highest of led suit S
  });

  it('the leader wins if nobody else follows or beats their card', () => {
    const trick = [
      { playerId: 'p1', card: '2D' },
      { playerId: 'p2', card: '3C' },
      { playerId: 'p3', card: '5S' },
      { playerId: 'p4', card: '9H' },
    ];
    const result = resolveTrick(trick);
    expect(result.isThulla).toBe(true);
    expect(result.winnerPlayerId).toBe('p1');
    expect(result.cardsPickedUp).toHaveLength(4);
  });

  it('handles a trick with fewer than 4 plays (players already safe)', () => {
    const trick = [
      { playerId: 'p1', card: '7D' },
      { playerId: 'p3', card: 'QD' },
      { playerId: 'p4', card: '2C' },
    ];
    const result = resolveTrick(trick);
    expect(result.isThulla).toBe(true);
    expect(result.winnerPlayerId).toBe('p3');
    expect(result.cardsPickedUp).toHaveLength(3);
  });

  it('ranks Ace as highest and 2 as lowest', () => {
    const trick = [
      { playerId: 'p1', card: '2S' },
      { playerId: 'p2', card: 'AS' },
      { playerId: 'p3', card: 'KS' },
      { playerId: 'p4', card: '10S' },
    ];
    const result = resolveTrick(trick);
    expect(result.winnerPlayerId).toBe('p2');
    expect(result.isThulla).toBe(false);
  });
});
