const { isGameOver } = require('../isGameOver');

describe('isGameOver', () => {
  it('is not over while 2+ players still hold cards', () => {
    const hands = { p1: ['2H'], p2: [], p3: ['3D', '4C'], p4: [] };
    const result = isGameOver(hands);
    expect(result.isOver).toBe(false);
    expect(result.bhabhi).toBeNull();
    expect(result.safe.sort()).toEqual(['p2', 'p4']);
  });

  it('declares the sole remaining player the Bhabhi', () => {
    const hands = { p1: [], p2: ['KH'], p3: [], p4: [] };
    const result = isGameOver(hands);
    expect(result.isOver).toBe(true);
    expect(result.bhabhi).toBe('p2');
    expect(result.safe.sort()).toEqual(['p1', 'p3', 'p4']);
  });

  it('handles the everyone-empties-at-once edge case with no Bhabhi', () => {
    const hands = { p1: [], p2: [], p3: [], p4: [] };
    const result = isGameOver(hands);
    expect(result.isOver).toBe(true);
    expect(result.bhabhi).toBeNull();
    expect(result.safe.sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('works with an array of hands indexed by seat', () => {
    const hands = [[], ['9S'], [], []];
    const result = isGameOver(hands);
    expect(result.isOver).toBe(true);
    expect(result.bhabhi).toBe('1');
  });

  it('is not over at the very start of the game', () => {
    const hands = { p1: Array(13).fill('2H'), p2: Array(13).fill('3H'), p3: Array(13).fill('4H'), p4: Array(13).fill('5H') };
    expect(isGameOver(hands).isOver).toBe(false);
  });
});
