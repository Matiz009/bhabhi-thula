import Card from './Card.jsx';
import { sortHand } from '../utils/cards.js';

export default function PlayerHand({ hand, legalMoves, isYourTurn, onPlayCard, disabled }) {
  const sorted = sortHand(hand);
  const legalSet = new Set(legalMoves);
  const count = sorted.length;

  return (
    <div className="player-hand">
      {sorted.map((code, i) => {
        const angle = (i - (count - 1) / 2) * 4;
        const offsetY = Math.abs(i - (count - 1) / 2) * 4;
        const legal = isYourTurn && legalSet.has(code) && !disabled;
        return (
          <div
            key={code}
            className="player-hand__card-wrap"
            style={{ transform: `rotate(${angle}deg) translateY(${offsetY}px)`, zIndex: i }}
          >
            <Card code={code} legal={legal} onClick={legal ? () => onPlayCard(code) : undefined} />
          </div>
        );
      })}
    </div>
  );
}
