const { createGame, playCard, getCurrentPlayer, getLegalMovesForPlayer } = require('../engine');
const { chooseCard } = require('../bot');
const { GameError } = require('../errors');
const { createDeck } = require('../deck');

function fixedRng(sequence) {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

/** Builds a fully custom state for isolated playCard tests (bypasses deal/shuffle). */
function buildState(overrides) {
  return {
    players: ['p1', 'p2', 'p3', 'p4'],
    hands: { p1: [], p2: [], p3: [], p4: [] },
    currentTrick: [],
    ledSuit: null,
    turnIndex: 0,
    isFirstTrick: false,
    discardPile: [],
    safePlayers: [],
    bhabhi: null,
    isOver: false,
    ...overrides,
  };
}

describe('createGame', () => {
  it('deals 13 cards to each of 4 players and sets the Ace of Spades holder to lead', () => {
    const state = createGame(['p1', 'p2', 'p3', 'p4']);
    Object.values(state.hands).forEach((hand) => expect(hand).toHaveLength(13));
    const leader = getCurrentPlayer(state);
    expect(state.hands[leader]).toContain('AS');
    expect(state.isFirstTrick).toBe(true);
  });
});

describe('playCard — validation', () => {
  it('rejects a play out of turn', () => {
    const state = buildState({
      hands: { p1: ['2H'], p2: ['3H'], p3: ['4H'], p4: ['5H'] },
      turnIndex: 0,
    });
    expect(() => playCard(state, 'p2', '3H')).toThrow(GameError);
    expect(() => playCard(state, 'p2', '3H')).toThrow(/turn/i);
  });

  it('rejects a card not in hand', () => {
    const state = buildState({ hands: { p1: ['2H'], p2: [], p3: [], p4: [] }, turnIndex: 0 });
    expect(() => playCard(state, 'p1', 'KH')).toThrow(/not in hand/i);
  });

  it('rejects playing off-suit when able to follow', () => {
    const state = buildState({
      hands: { p1: ['2H'], p2: ['9H', '3C'], p3: [], p4: [] },
      currentTrick: [{ playerId: 'p1', card: '2H' }],
      ledSuit: 'H',
      turnIndex: 1,
    });
    expect(() => playCard(state, 'p2', '3C')).toThrow(/illegal/i);
  });

  it('forces the Ace of Spades lead on the first trick', () => {
    const state = buildState({
      hands: { p1: ['2H', 'AS'], p2: [], p3: [], p4: [] },
      turnIndex: 0,
      isFirstTrick: true,
    });
    expect(() => playCard(state, 'p1', '2H')).toThrow(/illegal/i);
    const { state: next } = playCard(state, 'p1', 'AS');
    expect(next.currentTrick).toEqual([{ playerId: 'p1', card: 'AS' }]);
  });

  it('rejects further plays once the game is over', () => {
    const state = buildState({ isOver: true, hands: { p1: ['2H'], p2: [], p3: [], p4: [] } });
    expect(() => playCard(state, 'p1', '2H')).toThrow(/already over/i);
  });
});

describe('playCard — thulla ends the trick immediately', () => {
  it('resolves with only 2 cards on the table if the 2nd player throws a thulla', () => {
    let state = buildState({
      hands: { p1: ['5H', '2D'], p2: ['3C', '4D'], p3: ['KH', '4C'], p4: ['9H', '5D'] },
      turnIndex: 0,
    });
    let events;
    ({ state } = playCard(state, 'p1', '5H'));
    ({ state, events } = playCard(state, 'p2', '3C')); // void -> immediate thulla

    const thullaEvent = events.find((e) => e.type === 'thullaThrown');
    expect(thullaEvent.count).toBe(2);
    expect(thullaEvent.winnerPlayerId).toBe('p1'); // only led-suit card on the table
    expect(state.hands.p3).toEqual(['KH', '4C']); // untouched — never got a turn this trick
    expect(state.hands.p4).toEqual(['9H', '5D']);
    expect(getCurrentPlayer(state)).toBe('p1');
  });
});

describe('playCard — trick resolution', () => {
  it('discards a clean-follow trick with no pickup and leader becomes the highest card', () => {
    // Each player keeps a spare card so nobody empties their hand this trick
    // (that path is covered separately below) — isolates trick resolution.
    let state = buildState({
      hands: { p1: ['5H', '2S'], p2: ['KH', '3S'], p3: ['2H', '4S'], p4: ['9H', '5S'] },
      turnIndex: 0,
    });
    let events;
    ({ state } = playCard(state, 'p1', '5H'));
    ({ state } = playCard(state, 'p2', 'KH'));
    ({ state } = playCard(state, 'p3', '2H'));
    ({ state, events } = playCard(state, 'p4', '9H'));

    expect(events.some((e) => e.type === 'trickResolved')).toBe(true);
    expect(events.some((e) => e.type === 'thullaThrown')).toBe(false);
    expect(state.discardPile).toEqual(expect.arrayContaining(['5H', 'KH', '2H', '9H']));
    expect(state.hands.p1).toEqual(['2S']);
    expect(getCurrentPlayer(state)).toBe('p2'); // p2 played KH, the highest of led suit
  });

  it('a thulla ends the trick immediately — later players never get to throw in', () => {
    // p4 holds 9H, which would win the trick outright, but the rules say the
    // trick ends the instant p3 throws off-suit — p4 never plays this trick.
    let state = buildState({
      hands: { p1: ['5H', '2D'], p2: ['KH', '3D'], p3: ['2C', '4D'], p4: ['9H', '5D'] },
      turnIndex: 0,
    });
    let events;
    ({ state } = playCard(state, 'p1', '5H'));
    ({ state } = playCard(state, 'p2', 'KH'));
    ({ state, events } = playCard(state, 'p3', '2C')); // void in hearts -> thulla, trick ends now

    const thullaEvent = events.find((e) => e.type === 'thullaThrown');
    expect(thullaEvent).toBeDefined();
    expect(thullaEvent.throwerPlayerId).toBe('p3');
    expect(thullaEvent.winnerPlayerId).toBe('p2');
    expect(thullaEvent.count).toBe(3);
    expect(state.hands.p2.sort()).toEqual(['2C', '3D', '5H', 'KH'].sort());
    expect(state.hands.p1).toEqual(['2D']);
    expect(state.hands.p3).toEqual(['4D']);
    // p4 never played into this trick — hand is untouched.
    expect(state.hands.p4.sort()).toEqual(['5D', '9H'].sort());
    expect(getCurrentPlayer(state)).toBe('p2');
  });

  it('players who empty their hand become safe and are skipped in turn order', () => {
    let state = buildState({
      hands: { p1: ['5H'], p2: ['KH'], p3: ['2C'], p4: ['9H', '3D'] },
      turnIndex: 0,
    });
    let events;
    ({ state } = playCard(state, 'p1', '5H')); // p1's only card — empties on this play
    ({ state } = playCard(state, 'p2', 'KH'));
    // p3 is void and throws a thulla, ending the trick right here (p4 never plays).
    ({ state, events } = playCard(state, 'p3', '2C'));

    expect(events.some((e) => e.type === 'playerSafe' && e.playerId === 'p1')).toBe(true);
    expect(events.some((e) => e.type === 'playerSafe' && e.playerId === 'p3')).toBe(true);
    expect(state.safePlayers.sort()).toEqual(['p1', 'p3']);
    expect(state.hands.p4).toEqual(['9H', '3D']); // untouched
    // p1 and p3 are now safe; the winner (p2) leads the next trick.
    expect(getCurrentPlayer(state)).toBe('p2');

    const { state: afterLead } = playCard(state, 'p2', state.hands.p2[0]);
    // Turn order must skip both safe players (p1, p3) and land on p4.
    expect(afterLead.turnIndex).toBe(state.players.indexOf('p4'));
  });

  it('ends the game and names the Bhabhi when only one player still holds cards', () => {
    let state = buildState({
      hands: { p1: [], p2: ['5H'], p3: ['2C'], p4: [] },
      safePlayers: ['p1', 'p4'],
      turnIndex: 1,
    });
    let events;
    ({ state } = playCard(state, 'p2', '5H'));
    ({ state, events } = playCard(state, 'p3', '2C'));

    expect(state.isOver).toBe(true);
    expect(state.bhabhi).toBe('p2'); // p3 threw a thulla, p2 (only led-suit card) picks up and is stuck holding cards
    expect(events.some((e) => e.type === 'gameOver')).toBe(true);
  });
});

describe('full simulated game (bots only) — conservation and termination', () => {
  it('always terminates with exactly one Bhabhi (or none) and never loses/creates cards', () => {
    for (let trial = 0; trial < 25; trial++) {
      const rng = fixedRng(
        Array.from(
          { length: 500 },
          (_, i) => ((i * 2654435761 + trial * 97) % 100000) / 100000
        )
      );
      let state = createGame(['p1', 'p2', 'p3', 'p4'], rng);
      let guard = 0;

      while (!state.isOver) {
        guard += 1;
        if (guard > 2000) throw new Error('Game did not terminate — possible infinite loop');

        const player = getCurrentPlayer(state);
        const legal = getLegalMovesForPlayer(state, player);
        expect(legal.length).toBeGreaterThan(0);

        const card = chooseCard(
          legal,
          state.currentTrick.length === 0 ? null : state.ledSuit,
          { isFirstTrick: state.isFirstTrick }
        );

        ({ state } = playCard(state, player, card));

        const totalCards =
          Object.values(state.hands).reduce((sum, h) => sum + h.length, 0) +
          state.discardPile.length +
          state.currentTrick.length;
        expect(totalCards).toBe(52);
      }

      expect(state.isOver).toBe(true);
      const remaining = Object.values(state.hands).filter((h) => h.length > 0);
      expect(remaining.length).toBeLessThanOrEqual(1);
      if (remaining.length === 1) {
        expect(state.bhabhi).not.toBeNull();
      }
    }
  });
});
