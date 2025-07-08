import { createServer } from 'http';
import { createRequestListener } from '@react-router/node';
import { GameWebSocketServer } from './websocket';
import { WebSocketServer } from 'ws';
import { URL } from 'url';

// Railway expects a single server process
const PORT = parseInt(process.env.PORT || '3000');

console.log('🚂 Starting Railway deployment server...');

// Set database path for Railway deployment
if (!process.env.DB_PATH) {
  process.env.DB_PATH = './geograph.db';
}

// Set up React Router request handler
const requestHandler = createRequestListener({
  build: async () => {
    // Dynamic import of the built server
    const buildPath = new URL('../../build/server/index.js', import.meta.url).pathname;
    return import(buildPath);
  },
  mode: process.env.NODE_ENV || 'production'
});

// Create HTTP server
const server = createServer(requestHandler);

// Set up WebSocket server on the same port
const wss = new WebSocketServer({ 
  server, 
  path: '/ws/'
});

// Initialize the game WebSocket server with the existing WebSocket server
const gameWS = new GameWebSocketServer(undefined, wss);
console.log('🎮 WebSocket server initialized on /ws/ path');

// Start the unified server
server.listen(PORT, () => {
  console.log(`🚀 Railway server running on port ${PORT}`);
  console.log(`📱 WebSocket available at ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Railway server...');
  gameWS.close();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Railway server...');
  gameWS.close();
  server.close(() => {
    process.exit(0);
  });
});