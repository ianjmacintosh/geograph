// Railway server entry point - unified HTTP + WebSocket with game functionality
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createRequestListener } from '@react-router/node';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { GameWebSocketServer } from './server/websocket.ts';

const PORT = parseInt(process.env.PORT || '3000');

console.log('🚂 Starting Railway deployment server...');

// Set database path for Railway deployment
if (!process.env.DB_PATH) {
  process.env.DB_PATH = './geograph.db';
}

// Create React Router request handler
const requestHandler = createRequestListener({
  build: async () => {
    return import('./server/index.js');
  },
  mode: process.env.NODE_ENV || 'production'
});

// Create HTTP server with React Router
const httpServer = createServer(async (req, res) => {
  // Handle WebSocket upgrade requests
  if (req.url?.startsWith('/ws')) {
    return; // Let WebSocket server handle this
  }
  
  // Handle static assets
  if (req.url?.startsWith('/assets/') || req.url === '/favicon.ico' || req.url === '/world-map.svg') {
    try {
      const filePath = join(process.cwd(), 'build/client', req.url);
      const content = await readFile(filePath);
      
      // Set appropriate content type
      let contentType = 'text/plain';
      if (req.url.endsWith('.js')) contentType = 'application/javascript';
      else if (req.url.endsWith('.css')) contentType = 'text/css';
      else if (req.url.endsWith('.svg')) contentType = 'image/svg+xml';
      else if (req.url.endsWith('.ico')) contentType = 'image/x-icon';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
      return;
    } catch (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
  }
  
  // Handle all other requests with React Router
  requestHandler(req, res);
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ 
  server: httpServer,
  path: '/ws/'
});

// Initialize GameWebSocketServer with the existing WebSocket server
const gameWebSocketServer = new GameWebSocketServer(undefined, wss);
console.log('🎮 GameWebSocketServer initialized with Railway WebSocket server');

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