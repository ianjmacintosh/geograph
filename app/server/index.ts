import { createServer } from "http";
import { getWebSocketServer } from "./websocket";

// Start WebSocket server
const WS_PORT = parseInt(process.env.WS_PORT || "8080");
const wsServer = getWebSocketServer(WS_PORT);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Shutting down WebSocket server...");
  wsServer.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🛑 Shutting down WebSocket server...");
  wsServer.close();
  process.exit(0);
});

console.log(`🚀 WebSocket server running on port ${WS_PORT}`);

export { wsServer };
