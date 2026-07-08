import Card from './Card.jsx';

const SEAT_OFFSETS = {
  0: { top: '55%', left: '50%' }, // you (unused, hand is rendered separately)
  1: { top: '50%', left: '12%' }, // left
  2: { top: '10%', left: '50%' }, // across
  3: { top: '50%', left: '88%' }, // right
};

export default function TrickArea({ currentTrick, yourSeatIndex, numPlayers, pickupAnimation }) {
  function relativeSeat(seatIndex) {
    return (seatIndex - yourSeatIndex + numPlayers) % numPlayers;
  }

  return (
    <div className="trick-area">
      {currentTrick.map((play) => {
        const rel = relativeSeat(play.seatIndex);
        const pos = SEAT_OFFSETS[rel] || SEAT_OFFSETS[2];
        return (
          <div
            key={play.seatIndex}
            className="trick-area__card"
            style={{ '--from-top': pos.top, '--from-left': pos.left }}
          >
            <Card code={play.card} legal onClick={undefined} />
          </div>
        );
      })}

      {pickupAnimation && (
        <div
          className="trick-pickup"
          style={{
            '--to-top': (SEAT_OFFSETS[relativeSeat(pickupAnimation.winnerSeatIndex)] || SEAT_OFFSETS[2]).top,
            '--to-left': (SEAT_OFFSETS[relativeSeat(pickupAnimation.winnerSeatIndex)] || SEAT_OFFSETS[2]).left,
          }}
        >
          {pickupAnimation.cards.map((play, i) => (
            <div key={`${pickupAnimation.id}-${i}`} className="trick-pickup__card" style={{ '--i': i }}>
              <Card code={play.card} faceDown small />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
