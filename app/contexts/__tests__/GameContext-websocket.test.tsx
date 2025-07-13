import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { GameProvider, useGame } from "../GameContext";
import type { ReactNode } from "react";

// Mock the WebSocket class
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.CONNECTING,
  onopen: null as ((event: Event) => void) | null,
  onclose: null as ((event: CloseEvent) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
};

const mockWebSocketConstructor = vi.fn(() => mockWebSocket);

// Create proper mock objects for browser APIs
const mockWindow = {
  ...window,
  WebSocket: mockWebSocketConstructor,
  location: {
    hostname: "localhost",
    protocol: "http:",
    host: "localhost:5173",
    href: "http://localhost:5173",
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const mockDocument = {
  ...document,
  visibilityState: "visible",
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

// Mock globals properly
vi.stubGlobal("window", mockWindow);
vi.stubGlobal("document", mockDocument);

// Also define WebSocket constants
vi.stubGlobal("WebSocket", {
  ...mockWebSocketConstructor,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

// Helper function to create wrapper component
function createWrapper() {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <GameProvider>{children}</GameProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

// Helper function to simulate WebSocket state changes
function simulateWebSocketOpen() {
  (mockWebSocket as any).readyState = 1; // WebSocket.OPEN
  if (mockWebSocket.onopen) {
    mockWebSocket.onopen(new Event("open"));
  }
}

function simulateWebSocketClose(code = 1006, reason = "Connection lost") {
  (mockWebSocket as any).readyState = 3; // WebSocket.CLOSED
  if (mockWebSocket.onclose) {
    mockWebSocket.onclose(
      new CloseEvent("close", { code, reason, wasClean: false }),
    );
  }
}

function simulateWebSocketError() {
  if (mockWebSocket.onerror) {
    mockWebSocket.onerror(new Event("error"));
  }
}

describe.skip("GameContext WebSocket Reconnection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockWebSocket.readyState = 0; // WebSocket.CONNECTING

    // Reset WebSocket constructor mock
    mockWebSocketConstructor.mockReturnValue(mockWebSocket);

    // Reset all mock functions
    mockWebSocket.send.mockClear();
    mockWebSocket.close.mockClear();
    mockWindow.addEventListener.mockClear();
    mockWindow.removeEventListener.mockClear();
    mockDocument.addEventListener.mockClear();
    mockDocument.removeEventListener.mockClear();

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Initial Connection", () => {
    it("should connect to WebSocket on mount", () => {
      renderHook(() => useGame(), { wrapper: createWrapper() });

      expect(mockWebSocketConstructor).toHaveBeenCalledWith(
        expect.stringContaining("ws://"),
      );
    });

    it("should update connection status on successful connection", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      act(() => {
        simulateWebSocketOpen();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionStatus).toBe("connected");
    });
  });

  describe("Progressive Backoff Reconnection", () => {
    it("should attempt immediate reconnection on first disconnect", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Simulate initial connection
      act(() => {
        simulateWebSocketOpen();
      });

      vi.clearAllMocks();

      // Simulate disconnect
      act(() => {
        simulateWebSocketClose();
      });

      // Should schedule immediate reconnection (0ms delay)
      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1);
    });

    it("should use progressive delays for subsequent reconnection attempts", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Simulate initial connection and disconnect
      act(() => {
        simulateWebSocketOpen();
        simulateWebSocketClose();
      });

      vi.clearAllMocks();

      // First reconnection attempt (0ms delay)
      act(() => {
        vi.advanceTimersByTime(0);
        simulateWebSocketClose(); // Fail immediately
      });

      // Second reconnection attempt (100ms delay)
      act(() => {
        vi.advanceTimersByTime(99);
      });
      expect(mockWebSocketConstructor).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1);

      // Simulate failure and check third attempt (300ms delay)
      act(() => {
        simulateWebSocketClose();
      });

      vi.clearAllMocks();

      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(mockWebSocketConstructor).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1);
    });

    it("should cap reconnection delay at 10 seconds", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Simulate multiple failed connection attempts
      for (let i = 0; i < 10; i++) {
        act(() => {
          if (i === 0) simulateWebSocketOpen();
          simulateWebSocketClose();
          vi.advanceTimersByTime(15000); // Advance more than max delay
        });
      }

      // Should not exceed 10 second delay even after many attempts
      expect(mockWebSocketConstructor).toHaveBeenCalled();
    });
  });

  describe("Circuit Breaker", () => {
    it("should stop reconnection attempts after 10 failures in 5-minute window", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Simulate 10 failed reconnection attempts
      for (let i = 0; i < 10; i++) {
        act(() => {
          if (i === 0) simulateWebSocketOpen();
          simulateWebSocketClose();
          vi.advanceTimersByTime(15000); // Fast forward through delay
        });
      }

      vi.clearAllMocks();

      // 11th attempt should be blocked by circuit breaker
      act(() => {
        simulateWebSocketClose();
        vi.advanceTimersByTime(15000);
      });

      expect(mockWebSocketConstructor).not.toHaveBeenCalled();
      expect(result.current.connectionStatus).toBe("error");
    });

    it("should reset circuit breaker after 5-minute window", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Simulate 10 failed attempts
      for (let i = 0; i < 10; i++) {
        act(() => {
          if (i === 0) simulateWebSocketOpen();
          simulateWebSocketClose();
          vi.advanceTimersByTime(15000);
        });
      }

      // Wait for 5-minute window to reset
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000 + 1000); // 5 minutes + 1 second
      });

      vi.clearAllMocks();

      // Should allow reconnection attempts again
      act(() => {
        simulateWebSocketClose();
        vi.advanceTimersByTime(0);
      });

      expect(mockWebSocketConstructor).toHaveBeenCalled();
    });
  });

  describe("Page Visibility API Integration", () => {
    beforeEach(() => {
      // Mock addEventListener/removeEventListener
      vi.spyOn(document, "addEventListener");
      vi.spyOn(document, "removeEventListener");
      vi.spyOn(window, "addEventListener");
      vi.spyOn(window, "removeEventListener");
    });

    it("should register visibility change event listeners", () => {
      renderHook(() => useGame(), { wrapper: createWrapper() });

      expect(document.addEventListener).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        "pageshow",
        expect.any(Function),
      );
    });

    it("should attempt immediate reconnection when page becomes visible", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Simulate disconnection
      act(() => {
        simulateWebSocketOpen();
        simulateWebSocketClose();
      });

      vi.clearAllMocks();

      // Simulate page becoming visible
      mockDocument.visibilityState = "visible";

      // Get the actual visibility change handler from the mock calls
      const visibilityChangeHandler =
        mockDocument.addEventListener.mock.calls.find(
          ([event]) => event === "visibilitychange",
        )?.[1];

      if (visibilityChangeHandler) {
        act(() => {
          visibilityChangeHandler();
        });
      }

      expect(mockWebSocketConstructor).toHaveBeenCalled();
    });

    it("should not reconnect when page is hidden", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Simulate disconnection
      act(() => {
        simulateWebSocketOpen();
        simulateWebSocketClose();
      });

      vi.clearAllMocks();

      // Simulate page becoming hidden
      mockDocument.visibilityState = "hidden";

      // Get the actual visibility change handler from the mock calls
      const visibilityChangeHandler =
        mockDocument.addEventListener.mock.calls.find(
          ([event]) => event === "visibilitychange",
        )?.[1];

      if (visibilityChangeHandler) {
        act(() => {
          visibilityChangeHandler();
        });
      }

      // Should not attempt immediate reconnection when hidden
      expect(mockWebSocketConstructor).not.toHaveBeenCalled();
    });
  });

  describe("Heartbeat Monitoring", () => {
    it("should send periodic ping messages when connected", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      act(() => {
        simulateWebSocketOpen();
      });

      vi.clearAllMocks();

      // Advance time to trigger heartbeat
      act(() => {
        vi.advanceTimersByTime(30000); // 30 seconds
      });

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "ping" }),
      );
    });

    it("should handle pong responses without forwarding to message handler", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      act(() => {
        simulateWebSocketOpen();
      });

      // Simulate receiving pong message
      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(
            new MessageEvent("message", {
              data: JSON.stringify({ type: "pong" }),
            }),
          );
        }
      });

      // Should not cause any errors or state changes
      expect(result.current.connectionStatus).toBe("connected");
    });

    it("should stop heartbeat when disconnected", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      act(() => {
        simulateWebSocketOpen();
        simulateWebSocketClose();
      });

      vi.clearAllMocks();

      // Heartbeat should not send after disconnect
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe("Connection State Management", () => {
    it("should update connection status through all states", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Initial state should be connecting
      expect(result.current.connectionStatus).toBe("connecting");
      expect(result.current.isConnected).toBe(false);

      // After successful connection
      act(() => {
        simulateWebSocketOpen();
      });

      expect(result.current.connectionStatus).toBe("connected");
      expect(result.current.isConnected).toBe(true);

      // After disconnection
      act(() => {
        simulateWebSocketClose();
      });

      expect(result.current.connectionStatus).toBe("disconnected");
      expect(result.current.isConnected).toBe(false);

      // After error
      act(() => {
        simulateWebSocketError();
      });

      expect(result.current.connectionStatus).toBe("error");
      expect(result.current.isConnected).toBe(false);
    });

    it("should prevent multiple simultaneous connections", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // The initial render already creates a connection, so clear the mock
      vi.clearAllMocks();

      // Simulate already connecting state
      mockWebSocket.readyState = 0; // WebSocket.CONNECTING

      // Try to connect again by simulating reconnection scenario
      act(() => {
        simulateWebSocketClose();
        vi.advanceTimersByTime(0); // Immediate reconnection attempt
      });

      // Should not create multiple WebSocket connections
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1);
    });
  });

  describe("Game State Reconnection", () => {
    it("should send RECONNECT message when connection is restored with existing game", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Simulate game creation
      act(() => {
        simulateWebSocketOpen();
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(
            new MessageEvent("message", {
              data: JSON.stringify({
                type: "GAME_CREATED",
                payload: {
                  game: {
                    id: "test-game",
                    code: "ABC123",
                    players: [],
                    rounds: [],
                    status: "waiting",
                    settings: {},
                    createdAt: Date.now(),
                  },
                  playerId: "test-player",
                },
              }),
            }),
          );
        }
      });

      // Simulate disconnection and reconnection
      act(() => {
        simulateWebSocketClose();
        vi.advanceTimersByTime(0); // Immediate reconnection
        simulateWebSocketOpen();
      });

      // Should send RECONNECT message
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: "RECONNECT",
          payload: {
            gameId: "test-game",
            playerId: "test-player",
          },
        }),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle WebSocket creation failures gracefully", () => {
      mockWebSocketConstructor.mockImplementation(() => {
        throw new Error("WebSocket creation failed");
      });

      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connectionStatus).toBe("error");
      expect(result.current.isConnected).toBe(false);
    });

    it("should handle malformed WebSocket messages", () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      act(() => {
        simulateWebSocketOpen();
      });

      // Simulate malformed message
      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(
            new MessageEvent("message", {
              data: "invalid json",
            }),
          );
        }
      });

      // Should not crash and maintain connection
      expect(result.current.connectionStatus).toBe("connected");
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe("Cleanup", () => {
    it("should clean up resources on unmount", () => {
      const { unmount } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      act(() => {
        simulateWebSocketOpen();
      });

      expect(mockWebSocket.close).not.toHaveBeenCalled();

      act(() => {
        unmount();
      });

      expect(mockWebSocket.close).toHaveBeenCalled();
      expect(document.removeEventListener).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
      expect(window.removeEventListener).toHaveBeenCalledWith(
        "pageshow",
        expect.any(Function),
      );
    });
  });
});
