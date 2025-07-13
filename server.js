// Railway server entry point - unified HTTP + WebSocket with game functionality
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { createRequestListener } from "@react-router/node";
import { readFile } from "fs/promises";
import { join } from "path";
import { GameWebSocketServer } from "./server/websocket.ts";

const PORT = parseInt(process.env.PORT || "3000");

console.log("🚂 Starting Railway deployment server...");

// Set database path for Railway deployment
if (!process.env.DB_PATH) {
  process.env.DB_PATH = "./geograph.db";
}

// Create React Router request handler
const requestHandler = createRequestListener({
  build: async () => {
    return import("./server/index.js");
  },
  mode: process.env.NODE_ENV || "production",
});

// Helper function to determine if request is for WebSocket
function isWebSocketRequest(url) {
  return url?.startsWith("/ws");
}

// Helper function to determine if request is for static assets
function isStaticAssetRequest(url) {
  return (
    url?.startsWith("/assets/") ||
    url === "/favicon.ico" ||
    url === "/world-map.svg"
  );
}

// Helper function to get content type for static assets
function getContentType(url) {
  if (url.endsWith(".js")) return "application/javascript";
  if (url.endsWith(".css")) return "text/css";
  if (url.endsWith(".svg")) return "image/svg+xml";
  if (url.endsWith(".ico")) return "image/x-icon";
  return "text/plain";
}

// Helper function to handle static asset requests
async function handleStaticAsset(req, res) {
  try {
    const filePath = join(process.cwd(), "build/client", req.url);
    const content = await readFile(filePath);
    const contentType = getContentType(req.url);
    
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
    return true;
  } catch {
    res.writeHead(404);
    res.end("Not found");
    return true;
  }
}

// Create HTTP server with React Router
const httpServer = createServer(async (req, res) => {
  if (isWebSocketRequest(req.url)) {
    return; // Let WebSocket server handle this
  }

  if (isStaticAssetRequest(req.url)) {
    await handleStaticAsset(req, res);
    return;
  }

  // Handle all other requests with React Router
  requestHandler(req, res);
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({
  server: httpServer,
  path: "/ws/",
});

// Initialize GameWebSocketServer with the existing WebSocket server
new GameWebSocketServer(undefined, wss);
console.log("🎮 GameWebSocketServer initialized with Railway WebSocket server");

// Start unified server
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Railway server running on port ${PORT}`);
  console.log(`📱 WebSocket available at /ws/ path`);
  console.log(`🎮 React Router SSR enabled`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Shutting down server...");
  wss.close();
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("🛑 Shutting down server...");
  wss.close();
  httpServer.close(() => {
    process.exit(0);
  });
});
