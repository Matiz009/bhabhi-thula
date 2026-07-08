import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import LobbyPage from './pages/LobbyPage.jsx';
import GameTablePage from './pages/GameTablePage.jsx';

function ProtectedRoute({ children }) {
  const { token, ready } = useAuth();
  if (!ready) return null;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <LobbyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:roomId"
        element={
          <ProtectedRoute>
            <GameTablePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  );
}
