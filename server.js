// Railway server entry point - testing multi-port approach
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT = parseInt(process.env.PORT || '3000');
const WS_PORT = PORT + 1; // Try WebSocket on different port

console.log('🚂 Starting Railway deployment server...');

// Set database path for Railway deployment
if (!process.env.DB_PATH) {
  process.env.DB_PATH = './geograph.db';
}

// Create HTTP server for healthcheck
const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>Geograph</title></head>
      <body>
        <h1>Geograph Server</h1>
        <p>HTTP Server on port: ${PORT}</p>
        <p>WebSocket Server on port: ${WS_PORT}</p>
        <p>Testing multi-port approach...</p>
        <script>
          console.log('Testing WebSocket connection...');
          const ws = new WebSocket('ws://localhost:${WS_PORT}');
          ws.onopen = () => {
            console.log('WebSocket connected!');
            document.body.innerHTML += '<p style="color: green;">✅ WebSocket connected successfully!</p>';
          };
          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            document.body.innerHTML += '<p style="color: red;">❌ WebSocket connection failed</p>';
          };
        </script>
      </body>
    </html>
  `);
});

// Create WebSocket server on different port
const wss = new WebSocketServer({ 
  port: WS_PORT,
  host: '0.0.0.0'
});

wss.on('connection', (ws) => {
  console.log('📱 WebSocket client connected');
  ws.send('Hello from Railway WebSocket server!');
  
  ws.on('message', (message) => {
    console.log('📩 Received:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('📱 WebSocket client disconnected');
  });
});

// Start HTTP server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HTTP server running on port ${PORT}`);
});

// WebSocket server starts automatically on port
console.log(`🎮 WebSocket server running on port ${WS_PORT}`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down servers...');
  wss.close();
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down servers...');
  wss.close();
  httpServer.close(() => {
    process.exit(0);
  });
});