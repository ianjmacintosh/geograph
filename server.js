// Railway server entry point - unified HTTP + WebSocket on same port
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT = parseInt(process.env.PORT || '3000');

console.log('🚂 Starting Railway deployment server...');

// Set database path for Railway deployment
if (!process.env.DB_PATH) {
  process.env.DB_PATH = './geograph.db';
}

// Create HTTP server
const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>Geograph</title></head>
      <body>
        <h1>Geograph Server</h1>
        <p>Unified HTTP + WebSocket server on port: ${PORT}</p>
        <p>Testing single-port approach...</p>
        <script>
          console.log('Testing WebSocket connection...');
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const ws = new WebSocket(protocol + '//' + window.location.host + '/ws');
          
          ws.onopen = () => {
            console.log('WebSocket connected!');
            document.body.innerHTML += '<p style="color: green;">✅ WebSocket connected successfully!</p>';
            ws.send('Hello from client!');
          };
          
          ws.onmessage = (event) => {
            console.log('Received:', event.data);
            document.body.innerHTML += '<p style="color: blue;">📩 Received: ' + event.data + '</p>';
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

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ 
  server: httpServer,
  path: '/ws'
});

wss.on('connection', (ws) => {
  console.log('📱 WebSocket client connected');
  ws.send('Hello from Railway WebSocket server!');
  
  ws.on('message', (message) => {
    console.log('📩 Received:', message.toString());
    ws.send('Echo: ' + message.toString());
  });
  
  ws.on('close', () => {
    console.log('📱 WebSocket client disconnected');
  });
});

// Start unified server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Unified HTTP + WebSocket server running on port ${PORT}`);
  console.log(`📱 WebSocket available at /ws path`);
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