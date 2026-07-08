import Confetti from './Confetti.jsx';

export default function EndScreen({ bhabhiUsername, isYouBhabhi, isHost, onRematch, rematching }) {
  return (
    <div className="end-screen">
      {!isYouBhabhi && <Confetti />}
      <div className="end-screen__card">
        <h2>{isYouBhabhi ? 'You are the Bhabhi!' : 'Game Over'}</h2>
        <p className="end-screen__bhabhi">
          {bhabhiUsername ? (
            <>
              <strong>{bhabhiUsername}</strong> is the Bhabhi (loser)!
            </>
          ) : (
            'Everyone emptied their hands at once — no Bhabhi this round!'
          )}
        </p>
        {isHost ? (
          <button className="btn-primary" onClick={onRematch} disabled={rematching}>
            {rematching ? 'Starting…' : 'Rematch'}
          </button>
        ) : (
          <p className="end-screen__waiting">Waiting for the host to start a rematch…</p>
        )}
      </div>
    </div>
  );
}
