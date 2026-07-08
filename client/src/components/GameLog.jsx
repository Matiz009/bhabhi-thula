import { useEffect, useRef } from 'react';

export default function GameLog({ entries }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries]);

  return (
    <div className="game-log">
      <h3>Game Log</h3>
      <div className="game-log__list">
        {entries.map((entry) => (
          <div key={entry.id} className={`game-log__entry game-log__entry--${entry.type}`}>
            {entry.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
