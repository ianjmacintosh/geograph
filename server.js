// Railway server entry point - simplified for healthcheck
import { createServer } from 'http';

const PORT = parseInt(process.env.PORT || '3000');

console.log('🚂 Starting Railway deployment server...');

// Set database path for Railway deployment
if (!process.env.DB_PATH) {
  process.env.DB_PATH = './geograph.db';
}

// Create a simple HTTP server that passes healthcheck
const server = createServer((req, res) => {
  // For now, just serve a basic response to pass healthcheck
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>Geograph</title></head>
      <body>
        <h1>Geograph Server</h1>
        <p>Server is running on Railway - Step 1: Basic HTTP server working!</p>
        <p>Next step: Add WebSocket functionality</p>
        <p>Port: ${PORT}</p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
      </body>
    </html>
  `);
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Railway server running on port ${PORT}`);
  console.log(`📱 Basic HTTP server started - healthcheck should pass`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Railway server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Railway server...');
  server.close(() => {
    process.exit(0);
  });
});