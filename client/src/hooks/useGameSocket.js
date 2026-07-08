import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/client.js';

let nextLogId = 1;
let nextPickupId = 1;
const PICKUP_ANIMATION_MS = 900;

export function useGameSocket(token) {
  const socketRef = useRef(null);
  const lastGameStateRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [log, setLog] = useState([]);
  const [lastError, setLastError] = useState(null);
  const [pickupAnimation, setPickupAnimation] = useState(null);

  const pushLog = useCallback((message, type = 'info') => {
    setLog((prev) => [...prev.slice(-49), { id: nextLogId++, message, type, at: Date.now() }]);
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('gameState', (state) => {
      lastGameStateRef.current = state;
      setGameState(state);
    });

    const triggerPickup = (winnerSeatIndex) => {
      const prevTrick = lastGameStateRef.current?.currentTrick || [];
      if (prevTrick.length === 0) return;
      const id = nextPickupId++;
      setPickupAnimation({ id, cards: prevTrick, winnerSeatIndex });
      setTimeout(() => {
        setPickupAnimation((current) => (current?.id === id ? null : current));
      }, PICKUP_ANIMATION_MS);
    };

    socket.on('trickResolved', (payload) => {
      pushLog(`${payload.winnerUsername} won the trick (${payload.cardCount} cards discarded).`);
      triggerPickup(payload.winnerSeatIndex);
    });

    socket.on('thullaThrown', (payload) => {
      pushLog(
        `${payload.throwerUsername} threw a Thulla! ${payload.winnerUsername} picks up ${payload.count} cards.`,
        'thulla'
      );
      triggerPickup(payload.winnerSeatIndex);
    });

    socket.on('playerSafe', (payload) => {
      pushLog(`${payload.username} is safe!`, 'safe');
    });

    socket.on('gameOver', (payload) => {
      pushLog(
        payload.bhabhiUsername ? `Game over — ${payload.bhabhiUsername} is the Bhabhi!` : 'Game over!',
        'gameOver'
      );
    });

    socket.on('playerDisconnected', (payload) => {
      pushLog(`${payload.username} disconnected. Waiting up to 30s before a bot takes over…`, 'warn');
    });

    socket.on('error', (payload) => {
      setLastError(payload);
      pushLog(`Error: ${payload.message}`, 'error');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, pushLog]);

  const emitWithAck = useCallback((event, payload) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Not connected'));
      socketRef.current.emit(event, payload, (ack) => {
        if (ack?.ok) resolve(ack);
        else reject(new Error(ack?.error || 'Action failed'));
      });
    });
  }, []);

  const joinRoom = useCallback((roomId) => emitWithAck('joinRoom', { roomId }), [emitWithAck]);
  const leaveRoom = useCallback((roomId) => emitWithAck('leaveRoom', { roomId }), [emitWithAck]);
  const startGame = useCallback((roomId) => emitWithAck('startGame', { roomId }), [emitWithAck]);
  const playCard = useCallback(
    (roomId, card) => emitWithAck('playCard', { roomId, card }),
    [emitWithAck]
  );

  return {
    connected,
    gameState,
    log,
    lastError,
    pickupAnimation,
    joinRoom,
    leaveRoom,
    startGame,
    playCard,
  };
}
