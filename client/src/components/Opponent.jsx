export default function Opponent({ player, isCurrentTurn }) {
  return (
    <div className={`opponent${isCurrentTurn ? ' opponent--active' : ''}${player.safe ? ' opponent--safe' : ''}`}>
      <div className="opponent__avatar">{player.username.slice(0, 2).toUpperCase()}</div>
      <div className="opponent__info">
        <div className="opponent__name">
          {player.username}
          {player.isBot && <span className="opponent__tag">BOT</span>}
          {!player.connected && !player.isBot && <span className="opponent__tag opponent__tag--warn">away</span>}
        </div>
        <div className="opponent__cards">
          {player.safe ? 'Safe ✔' : `${player.cardCount} card${player.cardCount === 1 ? '' : 's'}`}
        </div>
      </div>
      {isCurrentTurn && <div className="opponent__turn-indicator">Turn</div>}
    </div>
  );
}
