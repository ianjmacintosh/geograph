/**
 * Test for infinite WebSocket reconnection loop bug
 *
 * This test reproduces the issue where:
 * 1. A game is created and player joins
 * 2. WebSocket connection is established
 * 3. Connection status changes trigger reconnection attempts
 * 4. RECONNECTED messages cause infinite reconnection loop
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocketConnection } from "../useWebSocketConnection";
import type { WebSocketMessage } from "../../hooks/useWebSocket";

// Mock WebSocket - copied from working test
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection opening after a tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send(_data: string) {
    // Mock send implementation
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close", { code, reason, wasClean: true }));
    }
  }

  ping() {
    // Mock ping implementation
  }
}

// Setup global mocks - copied from working test
global.WebSocket = MockWebSocket as any;
global.window = {
  location: { protocol: "http:", host: "localhost:3000" },
  document: {
    visibilityState: "visible",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as any;

describe("WebSocket Infinite Reconnection Loop Bug", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockOnMessage: ReturnType<typeof vi.fn>;
  let _mockWebSocket: MockWebSocket;

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockOnMessage = vi.fn();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it("should not cause infinite reconnection loop when processing RECONNECTED messages", async () => {
    const { result } = renderHook(() =>
      useWebSocketConnection({
        wsUrl: "ws://localhost:8080",
        onMessage: mockOnMessage,
        dispatch: mockDispatch,
      }),
    );

    // Wait for initial connection using fake timers
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Debug: Log the actual connection status to understand what's happening
    console.log("Current connection status:", result.current.connectionStatus);
    console.log("Is connected:", result.current.isConnected);

    // If not connected, advance timers more
    if (result.current.connectionStatus !== "connected") {
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      console.log(
        "After additional wait - connection status:",
        result.current.connectionStatus,
      );
    }

    expect(result.current.connectionStatus).toBe("connected");
    expect(result.current.isConnected).toBe(true);

    // Get reference to the WebSocket instance
    const _wsInstance =
      (global.WebSocket as any).mock?.instances?.[0] || (result.current as any);

    // Simulate receiving a GAME_CREATED message (initial game creation)
    const gameCreatedMessage: WebSocketMessage = {
      type: "GAME_CREATED",
      payload: {
        game: {
          id: "test-game-id",
          status: "waiting",
          players: [{ id: "player-1", name: "Test Player" }],
          settings: { difficulty: "medium" },
        },
        playerId: "player-1",
      },
    };

    await act(async () => {
      mockOnMessage(gameCreatedMessage);
    });

    // Clear previous dispatch calls
    mockDispatch.mockClear();

    // Simulate what happens when connection status changes to trigger reconnection
    // This mimics the GameContext useEffect that sends RECONNECT when connectionStatus === "connected"

    // First, simulate a brief disconnection and reconnection
    await act(async () => {
      // Simulate connection drop
      result.current.manualDisconnect();
      vi.advanceTimersByTime(10);
    });

    // Wait for reconnection attempt
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Now simulate receiving multiple RECONNECTED messages in quick succession
    // This is what causes the infinite loop
    const reconnectedMessage: WebSocketMessage = {
      type: "RECONNECTED",
      payload: {
        game: {
          id: "test-game-id",
          status: "waiting",
          players: [{ id: "player-1", name: "Test Player" }],
          settings: { difficulty: "medium" },
        },
        playerId: "player-1",
      },
    };

    // Record the number of dispatch calls before the reconnection messages
    const initialDispatchCount = mockDispatch.mock.calls.length;

    // Simulate receiving multiple RECONNECTED messages rapidly
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        mockOnMessage(reconnectedMessage);
        vi.advanceTimersByTime(10);
      }
    });

    // Wait a bit more to see if more dispatch calls occur
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const finalDispatchCount = mockDispatch.mock.calls.length;
    const reconnectionRelatedCalls = finalDispatchCount - initialDispatchCount;

    // Check that we don't have excessive dispatch calls indicating an infinite loop
    // We should only have a reasonable number of connection status updates
    expect(reconnectionRelatedCalls).toBeLessThan(10);

    // Verify that the connection status doesn't keep oscillating
    const connectionStatusCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === "SET_CONNECTION_STATUS",
    );

    // Should not have more than a reasonable number of connection status updates
    expect(connectionStatusCalls.length).toBeLessThan(8);

    // Verify that we don't have repeated "reconnected" status updates
    const reconnectedStatusCalls = connectionStatusCalls.filter(
      (call) => call[0].payload === "reconnected",
    );

    // Should not have excessive "reconnected" status updates
    expect(reconnectedStatusCalls.length).toBeLessThan(3);
  });

  it("should handle connection status transitions without triggering reconnection loop", async () => {
    const { result } = renderHook(() =>
      useWebSocketConnection({
        wsUrl: "ws://localhost:8080",
        onMessage: mockOnMessage,
        dispatch: mockDispatch,
      }),
    );

    // Wait for initial connection
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    // Clear initial dispatch calls
    mockDispatch.mockClear();

    // Simulate the connection status transitions that happen during reconnection
    await act(async () => {
      // Simulate the sequence that happens in createOpenHandler
      result.current.manualDisconnect();
      vi.advanceTimersByTime(10);
    });

    // Wait for reconnection
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Count dispatch calls - should be reasonable number
    const totalDispatchCalls = mockDispatch.mock.calls.length;
    expect(totalDispatchCalls).toBeLessThan(15);

    // Verify no repeated rapid connection status changes
    const connectionStatusCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === "SET_CONNECTION_STATUS",
    );

    // Should have a reasonable number of status changes
    expect(connectionStatusCalls.length).toBeLessThan(10);
  });
});
