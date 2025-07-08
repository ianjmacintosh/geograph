# WebSocket Server Error Fix Summary

## Issue Description

The server was experiencing a critical error when implementing the two-stage guess confirmation feature ([PR #29](https://github.com/ianjmacintosh/geograph/pull/29) / [Issue #5](https://github.com/ianjmacintosh/geograph/issues/5)):

**Client Error:** "Oops!" error message displayed to users
**Server Error:** 
```
WebSocket server not available: ReferenceError: require is not defined
    at GameManager.getWebSocketServer (/app/build/server/game-manager.ts:33:38)
    at GameManager.endRound (/app/build/server/game-manager.ts:347:27)
    at Timeout.<anonymous> (/app/build/server/game-manager.ts:489:12)
```

## Root Cause

The issue was caused by a module system incompatibility:

1. **ES Module Environment**: The project is configured as an ES module (`"type": "module"` in package.json)
2. **CommonJS Require**: The `GameManager.getWebSocketServer()` method was using CommonJS `require()` syntax
3. **Circular Dependency**: Attempting to import the WebSocket module created a circular dependency issue

The problematic code was:
```typescript
private getWebSocketServer() {
  try {
    const { getWebSocketServer } = require('./websocket'); // ❌ CommonJS in ES module
    return getWebSocketServer();
  } catch (error) {
    console.warn('WebSocket server not available:', error);
    return null;
  }
}
```

## Solution Implemented

The fix used **Dependency Injection** to eliminate the circular dependency and module import issues:

### 1. GameManager Changes (`app/server/game-manager.ts`)

**Added dependency injection pattern:**
```typescript
export class GameManager {
  private wsServerInstance: GameWebSocketServerType | null = null;

  public setWebSocketServer(server: GameWebSocketServerType): void {
    this.wsServerInstance = server;
  }
  
  // Updated endRound method to use injected instance
  private endRound(gameId: string, roundId: string) {
    // ... game logic ...
    
    // Use injected WebSocket server instance
    if (this.wsServerInstance) {
      const updatedGame = this.db.getGameById(gameId);
      if (updatedGame) {
        this.wsServerInstance.revealRoundResults(gameId, {
          game: updatedGame,
          round: round,
          completed: true
        });
      }
    } else {
      console.warn('GameManager: WebSocket server instance not set.');
    }
  }
}
```

### 2. WebSocket Server Changes (`app/server/websocket.ts`)

**Implemented dependency injection in constructor:**
```typescript
export class GameWebSocketServer {
  constructor(port?: number, existingWss?: WebSocketServer) {
    // ... setup code ...
    
    this.gameManager = new GameManager();
    this.gameManager.setWebSocketServer(this); // ✅ Inject WebSocket server
    
    // ... rest of setup ...
  }
}
```

### 3. Type Safety

**Added proper TypeScript import:**
```typescript
import type { GameWebSocketServer as GameWebSocketServerType } from './websocket.js';
```

## Benefits of This Solution

1. **Eliminates Circular Dependencies**: No need to import modules that depend on each other
2. **ES Module Compatible**: No CommonJS `require()` statements needed
3. **Better Testability**: Easy to inject mock WebSocket servers for testing
4. **Cleaner Architecture**: Clear separation of concerns with explicit dependency management
5. **Type Safety**: Full TypeScript support with proper type checking

## Testing

- ✅ Project builds successfully with `npm run build`
- ✅ No TypeScript compilation errors
- ✅ Server starts without module import errors
- ✅ WebSocket communication functions properly
- ✅ Two-stage guess confirmation feature works as expected

## Branch Information

**Branch:** `cursor/troubleshoot-websocket-server-error-68c6`
**Status:** Ready for merge
**Files Modified:**
- `app/server/game-manager.ts` - Implemented dependency injection pattern
- `app/server/websocket.ts` - Added GameManager injection in constructor

The fix maintains backward compatibility while resolving the ES module/CommonJS conflict that was causing the server errors.