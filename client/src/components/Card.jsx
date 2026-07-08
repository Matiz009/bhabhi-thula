import { parseCard, suitSymbol, isRedSuit } from '../utils/cards.js';

export default function Card({ code, faceDown = false, legal = true, selected = false, onClick, small = false }) {
  const classNames = ['playing-card'];
  if (small) classNames.push('playing-card--small');
  if (faceDown) classNames.push('playing-card--back');
  if (!faceDown && !legal) classNames.push('playing-card--illegal');
  if (selected) classNames.push('playing-card--selected');

  if (faceDown) {
    return <div className={classNames.join(' ')} aria-hidden="true" />;
  }

  const { rank, suit } = parseCard(code);
  const red = isRedSuit(suit);

  return (
    <button
      type="button"
      className={classNames.join(' ')}
      style={{ color: red ? '#c0392b' : '#1a1a1a' }}
      onClick={onClick}
      disabled={!onClick || !legal}
    >
      <span className="playing-card__corner playing-card__corner--top">
        {rank}
        {suitSymbol(suit)}
      </span>
      <span className="playing-card__suit">{suitSymbol(suit)}</span>
      <span className="playing-card__corner playing-card__corner--bottom">
        {rank}
        {suitSymbol(suit)}
      </span>
    </button>
  );
}
