# Dart Score App 🎯

Real-time dart scoring application for multiple players with live spectator support.

## 📋 Table of Contents

- [Project Description](#project-description)
- [Features](#features)
- [Technologies](#technologies)
- [Requirements](#requirements)
- [Installation](#installation)
- [Running](#running)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [WebSocket Events](#websocket-events)
- [Database Schema](#database-schema)
- [Deployment](#deployment)

## 📖 Project Description

Mobile-first application for managing dart games for 2-8 players with support for:
- Real-time score updates for all spectators
- Permission system (admin/viewer)
- Game history
- Player statistics

## ✨ Features

### Game Modes
- **301** - start with 301 points
- **501** - start with 501 points
- Straight in/straight out (no double in/out)
- Matches: Best of 3, 5, or 7 legs

### Players
- 2-8 players per game
- No registration/login required
- Loser of previous leg starts the next one

### Permission System
- **Main admin** - game creator
- **Additional admins** - unlimited (via special link)
- **Viewers** - read-only access (via basic link)
- Admin can:
  - Add scores
  - Undo last throw
  - Generate/revoke admin tokens
  - End game prematurely

### Input Interface (mobile)
```
[1x] [double] [triple] ← modyfikatory

[MISS] [1] [2] [3] [4] [5]
[6] [7] [8] [9] [10]
[11] [12] [13] [14] [15]
[16] [17] [18] [19] [20]
[25] [BULL]

[←] cofnij ostatni rzut
```

### Statistics
- **Leg average** - average points per throw in current leg
- **Match average** - average points per throw for entire match
- Calculation: total points / number of throws

### History
- List of active games (10 + pagination)
- List of finished games (10 + pagination)
- Saved data: date, players, final score

### Rules
- 3 throws per turn
- **Bust** (exceeding 0) - turn cancelled, return to score before turn
- Game timeout: 6 hours (automatic finish)

## 🛠 Technologies

### Backend
- **Node.js** - runtime
- **Express** - HTTP server + REST API
- **Socket.io** - WebSocket for real-time
- **SQLite3** - database
- **UUID** - generating unique tokens

### Frontend
- **Vanilla JavaScript** (ES6 modules)
- **Tailwind CSS** (CDN) - styling
- **Socket.io-client** - WebSocket client
- Mobile-first responsive design

## 📦 Requirements

- Node.js (v14+)
- npm or yarn
- SQLite3 dev libraries (sqlite-dev)
- Linux Alpine (VPS)

## 🚀 Installation

```bash
# Clone repository
cd /home/marek/project/mc-projects/dart

# Install backend dependencies
cd backend
npm install

# Initialize database
node src/config/initDatabase.js

# Return to main directory
cd ..
```

## ▶️ Running

### Development

```bash
# Backend
cd backend
node server.js

# Application available at:
# https://frog03-11217.wykr.es/ (production - via reverse proxy)
# http://localhost:3000 (locally)
```

### Production

```bash
cd backend
NODE_ENV=production PORT=3000 node server.js

# Or with PM2 (future):
# pm2 start server.js --name "dart-app"
```

## 📁 Project Structure

```
/home/marek/project/mc-projects/dart/
├── README.md
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js         # Konfiguracja SQLite
│   │   │   └── initDatabase.js     # Inicjalizacja schematu
│   │   ├── models/
│   │   │   ├── Game.js             # Model rozgrywki
│   │   │   ├── Player.js           # Model gracza
│   │   │   ├── Leg.js              # Model lega
│   │   │   └── Turn.js             # Model tury
│   │   ├── controllers/
│   │   │   ├── gameController.js   # REST endpoints dla gier
│   │   │   └── adminController.js  # REST endpoints dla adminów
│   │   ├── socket/
│   │   │   ├── socketHandler.js    # Socket.io main logic
│   │   │   └── gameEvents.js       # Game event handlers
│   │   ├── services/
│   │   │   ├── gameService.js      # Game business logic
│   │   │   └── statsService.js     # Statistics calculation
│   │   ├── middleware/
│   │   │   └── adminAuth.js        # Token verification
│   │   ├── utils/
│   │   │   ├── gameLogic.js        # Dart logic (bust, checkout)
│   │   │   └── validators.js       # Data validation
│   │   └── app.js                  # Express + Socket.io setup
│   ├── database.db                 # SQLite (generated, .gitignore)
│   ├── package.json
│   └── server.js                   # Entry point
│
└── frontend/
    ├── public/
    │   ├── index.html              # Dashboard - game list
    │   ├── create.html             # Game creation form
    │   ├── game.html               # Game view
    │   ├── css/
    │   │   └── styles.css          # Custom CSS (Tailwind via CDN)
    │   └── js/
    │       ├── app.js              # Main entry point
    │       ├── socket-client.js    # Socket.io wrapper
    │       ├── components/
    │       │   ├── dashboard.js    # Game list
    │       │   ├── createGame.js   # Creation form
    │       │   ├── gameView.js     # Game view for spectators
    │       │   ├── adminPanel.js   # Admin panel
    │       │   └── scoreBoard.js   # Score board
    │       └── utils/
    │           ├── api.js          # REST API calls
    │           └── helpers.js      # Helper functions
    └── package.json                # (optional, for dev tools)
```

## 🔌 API Documentation

### REST Endpoints

#### Create Game
```http
POST /api/games
Content-Type: application/json

{
  "type": 501,              // 301 or 501
  "bestOf": 5,              // 3, 5, or 7
  "players": [              // 2-8 players
    "Marek",
    "Tomek",
    "Anna"
  ]
}

Response:
{
  "gameId": "uuid-v4",
  "adminToken": "uuid-v4",
  "viewLink": "https://frog03-11217.wykr.es/game.html?id=xxx",
  "adminLink": "https://frog03-11217.wykr.es/game.html?id=xxx&admin=yyy"
}
```

#### List Games
```http
GET /api/games?status=active&page=1&limit=10

Response:
{
  "games": [
    {
      "id": "uuid",
      "type": 501,
      "bestOf": 5,
      "status": "active",
      "players": ["Marek", "Tomek"],
      "currentScore": "2-1",
      "createdAt": "2026-01-02T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

#### Game Details
```http
GET /api/games/:id

Response:
{
  "id": "uuid",
  "type": 501,
  "bestOf": 5,
  "status": "active",
  "createdAt": "2026-01-02T10:00:00Z",
  "finishedAt": null,
  "players": [
    {
      "id": 1,
      "name": "Marek",
      "order": 0,
      "legsWon": 2,
      "currentScore": 301,
      "avgThisLeg": 45.2,
      "avgTotal": 52.1
    }
  ],
  "currentLeg": 3,
  "currentPlayer": 0
}
```

#### Generate Admin Token
```http
POST /api/games/:id/admin-token
Content-Type: application/json

{
  "adminToken": "main-admin-token"
}

Response:
{
  "token": "new-admin-token-uuid",
  "link": "https://frog03-11217.wykr.es/game.html?id=xxx&admin=new-token"
}
```

#### Revoke Admin Token
```http
DELETE /api/games/:id/admin-token
Content-Type: application/json

{
  "adminToken": "main-admin-token",
  "tokenToRevoke": "token-to-remove"
}

Response:
{
  "success": true
}
```

#### End Game
```http
POST /api/games/:id/end
Content-Type: application/json

{
  "adminToken": "admin-token"
}

Response:
{
  "success": true,
  "finalScores": { ... }
}
```

#### Verify Admin
```http
GET /api/games/:id/verify-admin?token=admin-token

Response:
{
  "valid": true,
  "isMainAdmin": true
}
```

## 🔄 WebSocket Events

### Client → Server

#### Join Game
```javascript
socket.emit('join:game', {
  gameId: 'uuid',
  adminToken: 'uuid' // optional
});
```

#### Add Dart (admin only)
```javascript
socket.emit('game:add-dart', {
  gameId: 'uuid',
  adminToken: 'uuid',
  score: 20,        // 0-25 (or null for MISS)
  multiplier: 3     // 1, 2, or 3
});
```

#### Undo Dart (admin only)
```javascript
socket.emit('game:undo-dart', {
  gameId: 'uuid',
  adminToken: 'uuid'
});
```

### Server → Client

#### Game State Update
```javascript
socket.on('game:update', (data) => {
  // data = {
  //   currentLeg: 2,
  //   currentPlayer: 1,
  //   players: [
  //     {
  //       id: 1,
  //       name: "Marek",
  //       legsWon: 1,
  //       currentScore: 281,
  //       avgThisLeg: 45.2,
  //       avgTotal: 52.1,
  //       lastThreeDarts: ["T20", "D10", "5"]
  //     }
  //   ],
  //   currentTurn: ["T20", "D10", null], // null = not thrown yet
  //   turnNumber: 5
  // }
});
```

#### Leg Finished
```javascript
socket.on('leg:finished', (data) => {
  // data = {
  //   legNumber: 2,
  //   winner: {
  //     id: 1,
  //     name: "Marek"
  //   },
  //   newLegStarting: true,
  //   scores: { "Marek": 2, "Tomek": 1 }
  // }
});
```

#### Game Finished
```javascript
socket.on('game:finished', (data) => {
  // data = {
  //   winner: {
  //     id: 1,
  //     name: "Marek"
  //   },
  //   finalScores: { "Marek": 3, "Tomek": 2 },
  //   totalDuration: 3600000 // ms
  // }
});
```

#### Error
```javascript
socket.on('game:error', (data) => {
  // data = {
  //   message: "Bust! Turn cancelled.",
  //   type: "bust"
  // }
});
```

#### Admins Update
```javascript
socket.on('admins:update', (data) => {
  // data = {
  //   count: 3,
  //   activeTokens: ['token1', 'token2', 'token3']
  // }
});
```

## 🗄 Database Schema

### Table `games`
| Column | Type | Description |
|---------|-----|------|
| id | TEXT (PK) | Game UUID |
| type | INTEGER | 301 or 501 |
| best_of | INTEGER | 3, 5, or 7 |
| status | TEXT | 'active', 'finished', 'abandoned' |
| created_at | DATETIME | Creation date |
| finished_at | DATETIME | Finish date (nullable) |
| admin_token | TEXT | Main admin token |

### Table `game_players`
| Column | Type | Description |
|---------|-----|------|
| id | INTEGER (PK, AI) | Player ID |
| game_id | TEXT (FK) | Game UUID |
| player_name | TEXT | Player name |
| player_order | INTEGER | Throw order (0-7) |
| legs_won | INTEGER | Legs won (default: 0) |

### Table `legs`
| Column | Type | Description |
|---------|-----|------|
| id | INTEGER (PK, AI) | Leg ID |
| game_id | TEXT (FK) | Game UUID |
| leg_number | INTEGER | Leg number (1-7) |
| winner_id | INTEGER (FK) | Winner ID (nullable) |
| started_at | DATETIME | Leg start |
| finished_at | DATETIME | Leg end (nullable) |

### Table `turns`
| Column | Type | Description |
|---------|-----|------|
| id | INTEGER (PK, AI) | Turn ID |
| leg_id | INTEGER (FK) | Leg ID |
| player_id | INTEGER (FK) | Player ID |
| turn_number | INTEGER | Turn number |
| dart1_score | INTEGER | 1st dart score (nullable) |
| dart1_multiplier | INTEGER | 1st dart multiplier |
| dart2_score | INTEGER | 2nd dart score (nullable) |
| dart2_multiplier | INTEGER | 2nd dart multiplier |
| dart3_score | INTEGER | 3rd dart score (nullable) |
| dart3_multiplier | INTEGER | 3rd dart multiplier |
| total_score | INTEGER | Total turn score |
| remaining_before | INTEGER | Score before turn |
| remaining_after | INTEGER | Score after turn |
| is_bust | BOOLEAN | Whether turn was bust |
| created_at | DATETIME | Timestamp |

### Table `admin_tokens`
| Column | Type | Description |
|---------|-----|------|
| id | INTEGER (PK, AI) | Token ID |
| game_id | TEXT (FK) | Game UUID |
| token | TEXT (UNIQUE) | Token UUID |
| created_by | TEXT | Creator token |
| created_at | DATETIME | Creation date |
| revoked | BOOLEAN | Whether revoked (default: 0) |

## 🚀 Deployment

### Environment Configuration

```bash
# .env (optional)
NODE_ENV=production
PORT=3000
DB_PATH=./database.db
FRONTEND_URL=https://frog03-11217.wykr.es
```

### Running on VPS (Alpine Linux)

```bash
# Navigate to project directory
cd /home/marek/project/mc-projects/dart/backend

# Install dependencies
npm install

# Initialize database
node src/config/initDatabase.js

# Start server
NODE_ENV=production PORT=3000 node server.js
```

### Access
- **Frontend**: https://frog03-11217.wykr.es/
- **Backend API**: https://frog03-11217.wykr.es/api
- **WebSocket**: wss://frog03-11217.wykr.es/

HTTPS is handled automatically by the server's reverse proxy.

### Future (PM2)

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start server.js --name "dart-app" --env production

# Auto-restart after reboot
pm2 startup
pm2 save

# Monitoring
pm2 status
pm2 logs dart-app
```

## 📝 Developer Notes

### Timeouts
- Game automatically ends after **6 hours** of inactivity
- WebSocket reconnection: automatic (Socket.io)
- Ping interval: 25s, timeout: 5s

### Limits
- Players: 2-8 per game
- Admins: unlimited
- History: stored indefinitely (for now)
- Pagination: 10 items per page

### Business Rules
- Bust: exceeding 0 → turn cancelled, return to score before turn
- Next leg start: loser of previous leg
- Checkout: no double out required
- Miss: treated as 0 points (but saved as null in database)

## 📄 License

Private project.

## 👨‍💻 Author

Marek - 2026

---

**Project status**: 🚧 Under construction
