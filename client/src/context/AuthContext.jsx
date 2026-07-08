import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import apiClient, { setAuthToken } from '../api/client.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'bhabhi.auth';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { token: storedToken, user: storedUser } = JSON.parse(stored);
        setToken(storedToken);
        setUser(storedUser);
        setAuthToken(storedToken);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  const persist = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthToken(nextToken);
    if (nextToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (username, password) => {
      const { data } = await apiClient.post('/api/auth/login', { username, password });
      persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const register = useCallback(
    async (username, email, password) => {
      const { data } = await apiClient.post('/api/auth/register', { username, email, password });
      persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  return (
    <AuthContext.Provider value={{ token, user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
