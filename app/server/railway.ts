import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { GameWebSocketServer } from './websocket';
import { spawn } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Railway expects a single server process
const PORT = parseInt(process.env.PORT || '3000');
const REACT_ROUTER_PORT = PORT + 1000; // Use a different port for React Router

console.log('🚂 Starting Railway deployment server...');

// Set database path for Railway deployment
if (!process.env.DB_PATH) {
  process.env.DB_PATH = './geograph.db';
}

// Function to wait for React Router server to be ready
function waitForReactRouter(): Promise<void> {
  return new Promise((resolve, reject) => {
    const checkServer = async () => {
      try {
        const response = await fetch(`http://localhost:${REACT_ROUTER_PORT}/`);
        if (response.ok) {
          console.log('✅ React Router server is ready');
          resolve();
        } else {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (error) {
        // Server not ready, wait and try again
        setTimeout(checkServer, 500);
      }
    };
    
    // Start checking after a brief delay
    setTimeout(checkServer, 1000);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('React Router server failed to start within 30 seconds'));
    }, 30000);
  });
}

// Start React Router server on a different port
const reactRouterServer = spawn('npx', ['react-router-serve', './build/server/index.js'], {
  env: {
    ...process.env,
    PORT: REACT_ROUTER_PORT.toString(),
    NODE_ENV: 'production'
  },
  stdio: 'pipe'
});

// Log React Router server output
reactRouterServer.stdout?.on('data', (data) => {
  console.log(`[React Router] ${data.toString().trim()}`);
});

reactRouterServer.stderr?.on('data', (data) => {
  console.error(`[React Router Error] ${data.toString().trim()}`);
});

// Handle React Router server events
reactRouterServer.on('error', (error) => {
  console.error('❌ React Router server error:', error);
  process.exit(1);
});

reactRouterServer.on('exit', (code) => {
  console.log(`React Router server exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Wait for React Router server to be ready, then start main server
waitForReactRouter().then(() => {
  // Create main HTTP server
  const server = createServer();

  // Set up WebSocket server on the main port
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/'
  });

  // Initialize the game WebSocket server
  const gameWS = new GameWebSocketServer(undefined, wss);
  console.log('🎮 WebSocket server initialized on /ws/ path');

  // Create proxy middleware for React Router
  const reactRouterProxy = createProxyMiddleware({
    target: `http://localhost:${REACT_ROUTER_PORT}`,
    changeOrigin: true,
    logLevel: 'silent',
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Handle HTTP requests
  server.on('request', (req, res) => {
    // Check if this is a WebSocket upgrade request
    if (req.url?.startsWith('/ws/')) {
      // WebSocket server will handle this
      return;
    }
    
    // Proxy all other requests to React Router server
    reactRouterProxy(req, res);
  });

  // Start the main server
  server.listen(PORT, () => {
    console.log(`🚀 Railway server running on port ${PORT}`);
    console.log(`📱 WebSocket available at ws://localhost:${PORT}/ws/`);
    console.log(`🔄 Proxying HTTP requests to React Router on port ${REACT_ROUTER_PORT}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down Railway server...');
    gameWS.close();
    reactRouterServer.kill('SIGINT');
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down Railway server...');
    gameWS.close();
    reactRouterServer.kill('SIGTERM');
    server.close(() => {
      process.exit(0);
    });
  });

}).catch((error) => {
  console.error('❌ Failed to start Railway server:', error);
  reactRouterServer.kill();
  process.exit(1);
});