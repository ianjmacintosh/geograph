import { createServer } from "http";
// Note: readFileSync import preserved for future development
// import { readFileSync } from "fs";
import { WebSocketServer } from "ws";
import { GameWebSocketServer } from "./websocket.js";
// import { fileURLToPath } from "url";
// import { dirname } from "path";
// Note: join import preserved for future development
// import { join } from "path";

const PORT = parseInt(process.env.PORT || "3000");
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename); // Not currently used but may be needed for file paths

console.log("🚂 Starting Railway deployment server...");

// Set database path for Railway deployment
if (!process.env.DB_PATH) {
  process.env.DB_PATH = "./geograph.db";
}

// Create a simple HTTP server that serves the built files
const server = createServer((req, res) => {
  // Handle WebSocket upgrade requests
  if (req.url?.startsWith("/ws")) {
    return; // Let WebSocket server handle this
  }

  // For now, just serve a basic response to pass healthcheck
  res.writeHead(200, { "Content-Type": "text/html" });
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
  path: "/ws/",
});

// Initialize the game WebSocket server
const gameWS = new GameWebSocketServer(undefined, wss);
console.log("🎮 WebSocket server initialized on /ws/ path");

// Start the unified server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Railway server running on port ${PORT}`);
  console.log(`📱 WebSocket available at ws://0.0.0.0:${PORT}/ws/`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Shutting down Railway server...");
  gameWS.close();
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("🛑 Shutting down Railway server...");
  gameWS.close();
  server.close(() => {
    process.exit(0);
  });
});
