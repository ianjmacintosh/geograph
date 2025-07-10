# Geograph

A multiplayer geography guessing game where friends can test their geography knowledge by identifying cities on a map without country labels.

## Features

- Real-time multiplayer gameplay
- WebSocket-based communication
- Interactive world map
- Scoring system with placement and distance bonuses
- Computer players for testing
- Mobile-responsive design
- QR code sharing for easy game invites

## Technology Stack

- **Frontend**: React 19, TypeScript, TailwindCSS
- **Backend**: Node.js, WebSocket, SQLite
- **Framework**: React Router 7 with SSR
- **Build**: Vite
- **Database**: SQLite with better-sqlite3

## Development

### Prerequisites

- Node.js 18+ 
- npm

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Visit `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run dev:network` - Start development server accessible on network
- `npm run build` - Build for production
- `npm run start` - Start production server (requires build)
- `npm run start:railway` - Start unified server for Railway deployment
- `npm run typecheck` - Run TypeScript type checking

## Deployment

### Railway Deployment

This project is configured for Railway deployment with a unified server approach:

1. **Build Command**: `npm run build`
2. **Start Command**: `npm run start:railway`
3. **Environment Variables**:
   - `PORT` - Server port (automatically set by Railway)
   - `NODE_ENV` - Environment mode (set to 'production')
   - `DB_PATH` - SQLite database path (defaults to './geograph.db')

The Railway deployment uses a single server process that handles both HTTP requests and WebSocket connections on the same port via the `/ws/` path.

### Traditional Deployment (Linode/Other)

For traditional VPS deployment with separate processes:

1. **Build Command**: `npm run build`
2. **Start Command**: `npm run start`
3. **Requirements**: 
   - Nginx reverse proxy configuration
   - Separate WebSocket server on port 8080
   - SQLite database setup

### Docker Deployment

To build and run using Docker:

```bash
docker build -t geograph .
docker run -p 3000:3000 geograph
```

## Architecture

### WebSocket Communication

The game uses WebSocket for real-time communication:

- **Development**: WebSocket server on port 8080
- **Railway**: WebSocket on `/ws/` path (same port as HTTP)
- **Production**: WebSocket proxied through Nginx

### Database

SQLite database stores:
- Game sessions
- Player information
- Round data and guesses
- Scoring results

### Game Flow

1. Create/join game lobby
2. Configure settings (difficulty, rounds, etc.)
3. Start game with random city selection
4. Players make guesses by clicking on map
5. Scoring based on distance and placement
6. Multiple rounds with final results

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here]
