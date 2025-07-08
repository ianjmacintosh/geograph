// Railway server entry point - unified HTTP + WebSocket with game functionality
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createRequestListener } from '@react-router/node';

const PORT = parseInt(process.env.PORT || '3000');

console.log('🚂 Starting Railway deployment server...');

// Set database path for Railway deployment
if (!process.env.DB_PATH) {
  process.env.DB_PATH = './geograph.db';
}

// Create React Router request handler
const requestHandler = createRequestListener({
  build: async () => {
    return import('./build/server/index.js');
  },
  mode: process.env.NODE_ENV || 'production'
});

// Create HTTP server with React Router
const httpServer = createServer((req, res) => {
  // Handle WebSocket upgrade requests
  if (req.url?.startsWith('/ws')) {
    return; // Let WebSocket server handle this
  }
  
  // Handle all other requests with React Router
  requestHandler(req, res);
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ 
  server: httpServer,
  path: '/ws/'
});

// Simple WebSocket handling for now - will integrate GameWebSocketServer next
wss.on('connection', (ws) => {
  console.log('📱 WebSocket client connected');
  ws.send(JSON.stringify({ type: 'CONNECTION_ESTABLISHED', payload: { message: 'Connected to Railway WebSocket server!' } }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📩 Received message:', data.type);
      
      // Echo back for testing
      ws.send(JSON.stringify({ 
        type: 'ECHO', 
        payload: { 
          original: data,
          message: 'Echo from Railway server'
        }
      }));
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('📱 WebSocket client disconnected');
  });
});

// Start unified server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Railway server running on port ${PORT}`);
  console.log(`📱 WebSocket available at /ws/ path`);
  console.log(`🎮 React Router SSR enabled`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  wss.close();
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  wss.close();
  httpServer.close(() => {
    process.exit(0);
  });
});