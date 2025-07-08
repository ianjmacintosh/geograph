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

## Additional Client-Side Fix

After resolving the server-side ES module issue, a **client-side JavaScript error** was discovered that was still causing WebSocket disconnections:

### **Problem**: Variable Reference Before Declaration
The `game.tsx` component was referencing variables from the `usePlayerInteraction` hook in a `useEffect` **before** those variables were declared:

```typescript
// ❌ BROKEN: useEffect runs before variables are declared
useEffect(() => {
  // References isAwaitingConfirmation, confirmCurrentGuess, etc.
  if (isAwaitingConfirmation && confirmCurrentGuess) { /* ... */ }
}, [isAwaitingConfirmation, confirmCurrentGuess]);

// Variables declared AFTER the useEffect that uses them
const { isAwaitingConfirmation, confirmCurrentGuess } = usePlayerInteraction();
```

### **Solution**: Reorder Hook Calls
Moved the `usePlayerInteraction` hook call **before** the `useEffect` that references its variables:

```typescript
// ✅ FIXED: Variables declared first
const { isAwaitingConfirmation, confirmCurrentGuess } = usePlayerInteraction();

// useEffect can now safely reference the variables
useEffect(() => {
  if (isAwaitingConfirmation && confirmCurrentGuess) { /* ... */ }
}, [isAwaitingConfirmation, confirmCurrentGuess]);
```

This **ReferenceError** was causing the React component to crash when processing the `GAME_STARTED` WebSocket message, leading to automatic WebSocket disconnection.

## Additional Two-Stage Guess UX Fix

After fixing the crashes, a **user experience issue** was discovered with the two-stage guess confirmation feature:

### **Problem**: Provisional Marker Persisted After Confirmation
The yellow provisional marker (pulsing circle) remained visible and interactive even after the player confirmed their guess and after the round ended.

### **Root Cause**: 
1. **Incomplete State Cleanup**: The `confirmCurrentGuess` function wasn't clearing the `provisionalGuessLocation` state
2. **Incorrect Disable Logic**: Map was disabled during confirmation phase, preventing users from adjusting their provisional guess

### **Solution**: 
1. **Clear Provisional Marker**: Added `setProvisionalGuessLocation(null)` when guess is confirmed
2. **Fixed Interaction Logic**: Removed `isAwaitingConfirmation` from `isGuessDisabled` condition

```typescript
// ✅ FIXED: Clear provisional marker when confirmed
const confirmCurrentGuess = useCallback(() => {
  makeGuess(provisionalGuessLocation.lat, provisionalGuessLocation.lng);
  setHasConfirmedGuessForRound(true);
  setIsAwaitingConfirmation(false);
  setProvisionalGuessLocation(null); // Clear the yellow marker
}, []);

// ✅ FIXED: Allow repositioning during confirmation
isGuessDisabled={showResults || hasConfirmedGuessForRound} // Removed isAwaitingConfirmation
```

### **Improved User Experience**:
- **During confirmation**: Users can still click the map to reposition their provisional guess
- **After confirmation**: Yellow marker disappears, map becomes non-interactive
- **After round ends**: No provisional markers visible, only final results

## UI Simplification

**Final refinement**: Simplified the confirmation interface for better user experience:

- **Removed**: "Cancel/Adjust" button (redundant since users can click elsewhere to reposition)
- **Updated**: Tooltip text from "Your guess (click map to change, or confirm)" to "Confirm your guess"
- **Result**: Cleaner interface with single "Confirm Guess" button and clearer messaging

## Testing

- ✅ Project builds successfully with `npm run build`
- ✅ No TypeScript compilation errors
- ✅ Server starts without module import errors
- ✅ Client-side variable reference errors resolved
- ✅ WebSocket communication functions properly
- ✅ Two-stage guess confirmation feature works correctly:
  - Click map → provisional yellow marker appears with "Confirm your guess" tooltip
  - Click elsewhere → provisional marker moves (repositioning allowed) 
  - Click "Confirm Guess" button → provisional marker disappears, map disabled
  - Round ends → no provisional markers visible, only final results

## Branch Information

**Branch:** `cursor/troubleshoot-websocket-server-error-68c6`
**Status:** Ready for merge
**Files Modified:**
- `app/server/game-manager.ts` - Implemented dependency injection pattern
- `app/server/websocket.ts` - Added GameManager injection in constructor  
- `app/routes/game.tsx` - Fixed variable reference order + improved map disable logic + simplified UI
- `app/hooks/usePlayerInteraction.ts` - Fixed provisional marker cleanup after confirmation
- `app/components/WorldMap.tsx` - Updated provisional marker tooltip text

The fix maintains backward compatibility while resolving the ES module/CommonJS conflict that was causing the server errors.