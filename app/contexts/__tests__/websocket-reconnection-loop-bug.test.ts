/**
 * Test for WebSocket reconnection loop bug
 *
 * This test demonstrates the specific issue where:
 * 1. GameContext useEffect triggers on connectionStatus === "connected"
 * 2. It sends RECONNECT message to server
 * 3. Server responds with RECONNECTED message
 * 4. RECONNECTED message processing causes connection status updates
 * 5. This triggers the useEffect again, creating an infinite loop
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReducer, useEffect } from "react";

// Mock the GameContext reconnection logic
function useGameReconnectionLogic(
  connectionStatus: string,
  playerId: string,
  currentGame: any,
  sendMessage: (type: string, payload?: any) => void,
) {
  const reconnectionCallsRef = { current: 0 };

  useEffect(() => {
    if (
      connectionStatus === "connected" &&
      playerId &&
      currentGame &&
      currentGame.id
    ) {
      reconnectionCallsRef.current++;
      console.log(
        `🔄 Reconnecting to game state (call #${reconnectionCallsRef.current}):`,
        currentGame.id,
        "with player:",
        playerId,
      );
      sendMessage("RECONNECT", {
        gameId: currentGame.id,
        playerId: playerId,
      });
    }
  }, [connectionStatus, playerId, currentGame, sendMessage]);

  return { reconnectionCallsRef };
}

// Mock the connection status transitions that happen in useWebSocketConnection
function _useConnectionStatusTransitions() {
  const [connectionStatus, setConnectionStatus] = useReducer(
    (state: string, action: { type: string; payload: string }) => {
      if (action.type === "SET_CONNECTION_STATUS") {
        return action.payload;
      }
      return state;
    },
    "disconnected",
  );

  const dispatch = (action: { type: string; payload: string }) => {
    setConnectionStatus(action);
  };

  return { connectionStatus, dispatch };
}

describe("WebSocket Reconnection Loop Bug", () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendMessage = vi.fn();
    vi.clearAllMocks();
  });

  it("should demonstrate the infinite reconnection loop bug", async () => {
    const gameState = {
      id: "test-game-id",
      status: "waiting",
      players: [{ id: "player-1", name: "Test Player" }],
    };

    const { rerender } = renderHook(
      ({
        connectionStatus,
        playerId,
        currentGame,
      }: {
        connectionStatus: string;
        playerId: string;
        currentGame: any;
      }) => {
        const { reconnectionCallsRef } = useGameReconnectionLogic(
          connectionStatus,
          playerId,
          currentGame,
          mockSendMessage,
        );
        return { reconnectionCallsRef };
      },
      {
        initialProps: {
          connectionStatus: "disconnected" as string,
          playerId: "" as string,
          currentGame: null as any,
        },
      },
    );

    // Initial state - no reconnection calls
    expect(mockSendMessage).not.toHaveBeenCalled();

    // Simulate game creation
    await act(async () => {
      rerender({
        connectionStatus: "connected",
        playerId: "player-1",
        currentGame: gameState,
      });
    });

    // Should trigger first reconnection call
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith("RECONNECT", {
      gameId: "test-game-id",
      playerId: "player-1",
    });

    // Simulate what happens when server responds with RECONNECTED
    // This causes connection status to change (reconnected -> connected)
    await act(async () => {
      rerender({
        connectionStatus: "reconnected",
        playerId: "player-1",
        currentGame: gameState,
      });
    });

    // Then back to connected (this is what happens in useWebSocketConnection)
    await act(async () => {
      rerender({
        connectionStatus: "connected",
        playerId: "player-1",
        currentGame: gameState,
      });
    });

    // This should trigger another reconnection call - demonstrating the loop
    expect(mockSendMessage).toHaveBeenCalledTimes(2);

    // If we simulate multiple rapid connection status changes (like in production)
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        rerender({
          connectionStatus: "reconnected",
          playerId: "player-1",
          currentGame: gameState,
        });
      });

      await act(async () => {
        rerender({
          connectionStatus: "connected",
          playerId: "player-1",
          currentGame: gameState,
        });
      });
    }

    // Should have many more reconnection calls - this is the bug!
    expect(mockSendMessage).toHaveBeenCalledTimes(7); // 1 + 1 + 5 more

    // All calls should be RECONNECT messages
    expect(mockSendMessage).toHaveBeenCalledWith("RECONNECT", {
      gameId: "test-game-id",
      playerId: "player-1",
    });
  });

  it("should show the fix prevents infinite reconnection loop", async () => {
    const gameState = {
      id: "test-game-id",
      status: "waiting",
      players: [{ id: "player-1", name: "Test Player" }],
    };

    // Fixed version - track if we've already sent a reconnect for this game
    let hasReconnected = false;

    const useFixedGameReconnectionLogic = (
      connectionStatus: string,
      playerId: string,
      currentGame: any,
      sendMessage: (type: string, payload?: any) => void,
    ) => {
      useEffect(() => {
        if (
          connectionStatus === "connected" &&
          playerId &&
          currentGame &&
          currentGame.id &&
          !hasReconnected // Only reconnect once per game
        ) {
          hasReconnected = true;
          console.log(
            "🔄 Reconnecting to game state (fixed version):",
            currentGame.id,
            "with player:",
            playerId,
          );
          sendMessage("RECONNECT", {
            gameId: currentGame.id,
            playerId: playerId,
          });
        }
      }, [connectionStatus, playerId, currentGame, sendMessage]);
    };

    const { rerender } = renderHook(
      ({
        connectionStatus,
        playerId,
        currentGame,
      }: {
        connectionStatus: string;
        playerId: string;
        currentGame: any;
      }) => {
        useFixedGameReconnectionLogic(
          connectionStatus,
          playerId,
          currentGame,
          mockSendMessage,
        );
        return {};
      },
      {
        initialProps: {
          connectionStatus: "disconnected" as string,
          playerId: "" as string,
          currentGame: null as any,
        },
      },
    );

    // Initial state - no reconnection calls
    expect(mockSendMessage).not.toHaveBeenCalled();

    // Simulate game creation
    await act(async () => {
      rerender({
        connectionStatus: "connected",
        playerId: "player-1",
        currentGame: gameState,
      });
    });

    // Should trigger first reconnection call
    expect(mockSendMessage).toHaveBeenCalledTimes(1);

    // Simulate multiple rapid connection status changes
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        rerender({
          connectionStatus: "reconnected",
          playerId: "player-1",
          currentGame: gameState,
        });
      });

      await act(async () => {
        rerender({
          connectionStatus: "connected",
          playerId: "player-1",
          currentGame: gameState,
        });
      });
    }

    // Should still only have 1 reconnection call - the fix works!
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });
});
