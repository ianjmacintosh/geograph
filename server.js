// Railway server entry point
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { GameWebSocketServer } from './app/server/websocket.js';

const PORT = parseInt(process.env.PORT || '3000');

console.log('🚂 Starting Railway deployment server...');

// Set database path for Railway deployment
if (!process.env.DB_PATH) {
  process.env.DB_PATH = './geograph.db';
}

// Create a simple HTTP server that serves the built files
const server = createServer((req, res) => {
  // Handle WebSocket upgrade requests
  if (req.url?.startsWith('/ws')) {
    return; // Let WebSocket server handle this
  }
  
  // For now, just serve a basic response to pass healthcheck
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>Geograph</title></head>
      <body>
        <h1>Geograph Server</h1>
        <p>Server is running on Railway</p>
        <script>
          console.log('Attempting WebSocket connection...');
          const ws = new WebSocket('ws://localhost:${PORT}/ws/');
          ws.onopen = () => console.log('WebSocket connected');
          ws.onerror = (error) => console.error('WebSocket error:', error);
        </script>
      </body>
    </html>
  `);
});

// Set up WebSocket server on the same port
const wss = new WebSocketServer({ 
  server, 
  path: '/ws/'
});

// Initialize the game WebSocket server
const gameWS = new GameWebSocketServer(undefined, wss);
console.log('🎮 WebSocket server initialized on /ws/ path');

// Start the unified server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Railway server running on port ${PORT}`);
  console.log(`📱 WebSocket available at ws://0.0.0.0:${PORT}/ws/`);
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