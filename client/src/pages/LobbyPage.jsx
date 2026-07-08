import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchRooms, createRoom, fetchMyStats } from '../api/rooms.js';

export default function LobbyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [roomList, myStats] = await Promise.all([fetchRooms(), fetchMyStats()]);
      setRooms(roomList);
      setStats(myStats.stats);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load lobby');
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const room = await createRoom(newRoomName.trim());
      setNewRoomName('');
      navigate(`/game/${room.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <div>
          <h1>Bhabhi Lobby</h1>
          <p className="lobby-welcome">
            Welcome, <strong>{user?.username}</strong>
          </p>
        </div>
        {stats && (
          <div className="lobby-stats">
            <span>Games: {stats.gamesPlayed}</span>
            <span>Wins: {stats.wins}</span>
            <span>Times Bhabhi: {stats.timesAsBhabhi}</span>
          </div>
        )}
        <button className="btn-secondary" onClick={logout}>
          Log out
        </button>
      </header>

      {error && <div className="auth-error">{error}</div>}

      <form className="create-room-form" onSubmit={handleCreateRoom}>
        <input
          placeholder="New room name"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          maxLength={40}
        />
        <button type="submit" disabled={loading}>
          Create room
        </button>
      </form>

      <ul className="room-list">
        {rooms.length === 0 && <li className="room-empty">No open rooms yet — create one!</li>}
        {rooms.map((room) => (
          <li key={room.id} className="room-item">
            <div>
              <strong>{room.name}</strong>
              <span className="room-players">
                {room.seatsTaken}/{room.maxPlayers} players — {room.players.join(', ')}
              </span>
            </div>
            <button onClick={() => navigate(`/game/${room.id}`)}>Join</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
