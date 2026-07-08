# Bhabhi (Thulla) — Real-time Multiplayer Card Game

A real-time multiplayer implementation of Bhabhi (Thulla) built on the MERN
stack with Socket.IO. The server is the single source of truth for game
state; clients only render state and send action requests.

## Stack

- **Client**: React (Vite), Socket.IO client, React Router
- **Server**: Express, Socket.IO, Mongoose (MongoDB), JWT + bcrypt
- **Game engine**: pure, framework-free functions under `server/src/game`,
  covered by Jest unit tests

## Project structure

```
/client   React + Vite frontend
/server   Express + Socket.IO backend
  src/game        pure game engine (deal, legalMoves, resolveTrick, isGameOver, bot, engine)
  src/GameManager.js  in-memory live room/game state, persisted to Mongo only on game end
  src/socket      Socket.IO event wiring
  src/routes      REST API (auth, rooms, users)
  src/models      Mongoose schemas (User, Room, MatchHistory)
```

## Rules implemented

- 52-card deck, 4 players, 13 cards each.
- Holder of the Ace of Spades leads the first trick and must play it.
- Players must follow the led suit if able.
- If every player follows suit, the trick is discarded and the highest card
  of the led suit leads next.
- If a player is void and throws off-suit (a **Thulla**), the trick ends
  **immediately** — the highest led-suit card on the table picks up every
  card played so far and leads next.
- Emptying your hand makes you safe. The last player left holding cards is
  the **Bhabhi** (loser).
- Empty seats are filled with bots (dump high cards while leading, keep low
  cards while following suit, throw the most dangerous card as a Thulla when
  void).

## Setup

### Prerequisites

- Node.js 18+
- A running MongoDB instance (local or Atlas)

### Install

```bash
npm run install:all
```

This installs dependencies in both `/server` and `/client`.

### Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` with your MongoDB URI and a JWT secret:

```
MONGO_URI=mongodb://127.0.0.1:27017/bhabhi
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

### Seed test users

```bash
npm run seed
```

Creates `alice`, `bob`, `carol`, `dave` — all with password `password123`.

### Run

```bash
npm run dev
```

Runs the server (http://localhost:5000) and the client
(http://localhost:5173) concurrently. Or run them separately:

```bash
npm run dev:server
npm run dev:client
```

### Test

```bash
npm test
```

Runs the Jest suite for the game engine (deal, legalMoves, resolveTrick,
isGameOver, bot strategy, and full simulated games), including Thulla
resolution and edge cases (fewer than 4 players in a trick, everyone
emptying their hand simultaneously, card conservation across a full game).

## How a game flows

1. Register/login (JWT issued, stored client-side).
2. Create or join a room from the lobby.
3. The host starts the game — any empty seats are filled with bots.
4. Play proceeds over Socket.IO (`playCard`); the server validates every
   move (turn order + legal suit) and rejects illegal ones with an `error`
   event.
5. On game over, match history and win/loss/Bhabhi stats are persisted to
   MongoDB, and the room can be rematched.

## Notes

- Live in-progress game state (hands, trick, turn order) lives only in
  server memory (`GameManager`) — never in MongoDB. Only room metadata,
  match history, and user stats are persisted.
- A disconnected player gets a 30-second reconnect grace period before their
  seat is handed to a bot.
- Each socket only ever receives its own hand plus card counts for other
  players — hands are never broadcast to the wrong client.
"# bhabhi-thula" 
