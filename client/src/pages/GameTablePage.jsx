import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useGameSocket } from '../hooks/useGameSocket.js';
import PlayerHand from '../components/PlayerHand.jsx';
import Opponent from '../components/Opponent.jsx';
import TrickArea from '../components/TrickArea.jsx';
import GameLog from '../components/GameLog.jsx';
import EndScreen from '../components/EndScreen.jsx';

export default function GameTablePage() {
  const { roomId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const {
    gameState,
    log,
    lastError,
    pickupAnimation,
    joinRoom,
    leaveRoom,
    startGame,
    playCard,
  } = useGameSocket(token);

  const [joinError, setJoinError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [playError, setPlayError] = useState(null);

  useEffect(() => {
    joinRoom(roomId).catch((err) => setJoinError(err.message));
  }, [roomId, joinRoom]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    setJoinError(null);
    try {
      await startGame(roomId);
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setStarting(false);
    }
  }, [roomId, startGame]);

  const handlePlayCard = useCallback(
    async (card) => {
      setPlayError(null);
      try {
        await playCard(roomId, card);
      } catch (err) {
        setPlayError(err.message);
      }
    },
    [roomId, playCard]
  );

  const handleLeave = useCallback(async () => {
    await leaveRoom(roomId).catch(() => {});
    navigate('/lobby');
  }, [roomId, leaveRoom, navigate]);

  if (joinError) {
    return (
      <div className="game-table-page game-table-page--error">
        <p className="auth-error">{joinError}</p>
        <button onClick={() => navigate('/lobby')}>Back to lobby</button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="game-table-page game-table-page--loading">
        <p>Connecting to table…</p>
      </div>
    );
  }

  if (!gameState.started) {
    return (
      <div className="game-table-page waiting-room">
        <h1>Waiting Room</h1>
        <ul className="waiting-room__players">
          {gameState.players.map((p) => (
            <li key={p.seatIndex}>
              {p.username}
              {p.isBot && ' (bot)'}
            </li>
          ))}
          {Array.from({ length: Math.max(0, gameState.maxPlayers - gameState.players.length) }).map(
            (_, i) => (
              <li key={`empty-${i}`} className="waiting-room__empty-seat">
                Empty seat (bot will fill in)
              </li>
            )
          )}
        </ul>
        {gameState.isHost ? (
          <button className="btn-primary" onClick={handleStart} disabled={starting}>
            {starting ? 'Starting…' : 'Start Game'}
          </button>
        ) : (
          <p>Waiting for the host to start the game…</p>
        )}
        <button className="btn-secondary" onClick={handleLeave}>
          Leave room
        </button>
      </div>
    );
  }

  const numPlayers = gameState.players.length;
  const yourSeatIndex = gameState.yourSeatIndex;
  const opponents = gameState.players.filter((p) => p.seatIndex !== yourSeatIndex);

  function relativePosition(seatIndex) {
    const rel = (seatIndex - yourSeatIndex + numPlayers) % numPlayers;
    return { 1: 'left', 2: 'top', 3: 'right' }[rel] || 'top';
  }

  return (
    <div className="game-table-page">
      <div className="game-table">
        {opponents.map((p) => (
          <div key={p.seatIndex} className={`opponent-slot opponent-slot--${relativePosition(p.seatIndex)}`}>
            <Opponent player={p} isCurrentTurn={gameState.currentTurnSeatIndex === p.seatIndex} />
          </div>
        ))}

        <TrickArea
          currentTrick={gameState.currentTrick}
          yourSeatIndex={yourSeatIndex}
          numPlayers={numPlayers}
          pickupAnimation={pickupAnimation}
        />

        <div className="your-area">
          <div className={`your-turn-banner${gameState.isYourTurn ? ' your-turn-banner--active' : ''}`}>
            {gameState.isYourTurn ? "Your turn" : 'Waiting…'}
          </div>
          {playError && <div className="auth-error">{playError}</div>}
          <PlayerHand
            hand={gameState.yourHand}
            legalMoves={gameState.legalMoves}
            isYourTurn={gameState.isYourTurn}
            onPlayCard={handlePlayCard}
            disabled={gameState.isOver}
          />
          <div className="your-name">{user?.username} (you)</div>
        </div>
      </div>

      <GameLog entries={log} />

      {gameState.isOver && (
        <EndScreen
          bhabhiUsername={
            gameState.bhabhiSeatIndex !== null
              ? gameState.players.find((p) => p.seatIndex === gameState.bhabhiSeatIndex)?.username
              : null
          }
          isYouBhabhi={gameState.bhabhiSeatIndex === yourSeatIndex}
          isHost={gameState.isHost}
          onRematch={handleStart}
          rematching={starting}
        />
      )}
    </div>
  );
}
