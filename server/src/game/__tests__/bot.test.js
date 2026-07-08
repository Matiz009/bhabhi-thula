const { chooseCard } = require('../bot');

describe('bot chooseCard', () => {
  it('must lead the Ace of Spades on the first trick if held', () => {
    const hand = ['2H', 'AS', '9D'];
    expect(chooseCard(hand, null, { isFirstTrick: true })).toBe('AS');
  });

  it('dumps the highest card when leading and unconstrained', () => {
    const hand = ['2H', 'KS', '9D'];
    expect(chooseCard(hand, null, { isFirstTrick: false })).toBe('KS');
  });

  it('plays the lowest legal card when following suit (not void)', () => {
    const hand = ['9H', '2H', 'KS'];
    expect(chooseCard(hand, 'H')).toBe('2H');
  });

  it('throws the highest (most dangerous) card when void of the led suit', () => {
    const hand = ['9S', '2S', 'KH'];
    expect(chooseCard(hand, 'D')).toBe('KH');
  });

  it('has no choice when only one legal card exists', () => {
    const hand = ['9H'];
    expect(chooseCard(hand, 'H')).toBe('9H');
  });
});
