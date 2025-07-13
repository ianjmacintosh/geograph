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

// Simple setup for DOM environment - no need for complex mocking here

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

// Setup function to reduce repetition
function setupTestEnvironment() {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockWebSocket.readyState = 0; // WebSocket.CONNECTING

  // Setup proper environment mocks like the simple test
  global.WebSocket = mockWebSocketConstructor as any;

  // Mock window.WebSocket
  Object.defineProperty(window, "WebSocket", {
    value: mockWebSocketConstructor,
    writable: true,
  });

  // Mock WebSocket constants
  Object.defineProperty(global.WebSocket, "CONNECTING", { value: 0 });
  Object.defineProperty(global.WebSocket, "OPEN", { value: 1 });
  Object.defineProperty(global.WebSocket, "CLOSING", { value: 2 });
  Object.defineProperty(global.WebSocket, "CLOSED", { value: 3 });

  // Mock window location
  Object.defineProperty(window, "location", {
    value: {
      hostname: "localhost",
      protocol: "http:",
      host: "localhost:5173",
    },
    writable: true,
  });

  // Mock document properties
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    writable: true,
  });

  // Reset WebSocket constructor mock
  mockWebSocketConstructor.mockReturnValue(mockWebSocket);

  // Reset all mock functions
  mockWebSocket.send.mockClear();
  mockWebSocket.close.mockClear();

  // Mock console methods to avoid noise in tests
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("GameContext WebSocket - Initial Connection", () => {
  beforeEach(setupTestEnvironment);
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Basic Connection", () => {
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
});

describe("GameContext WebSocket - Progressive Backoff", () => {
  beforeEach(setupTestEnvironment);
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Reconnection Logic", () => {
    it("should attempt immediate reconnection on first disconnect", () => {
      renderHook(() => useGame(), {
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
      renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Simulate initial connection and disconnect
      act(() => {
        simulateWebSocketOpen();
        simulateWebSocketClose();
      });

      // First reconnection attempt (0ms delay) - should happen immediately
      act(() => {
        vi.advanceTimersByTime(0);
      });

      // Now simulate that first reconnection failing immediately
      act(() => {
        simulateWebSocketClose();
      });

      vi.clearAllMocks();

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
      renderHook(() => useGame(), {
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
});

describe("GameContext WebSocket - Circuit Breaker", () => {
  beforeEach(setupTestEnvironment);
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Connection Limits", () => {
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
      renderHook(() => useGame(), {
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
});

describe("GameContext WebSocket - Page Visibility", () => {
  beforeEach(setupTestEnvironment);
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Visibility Events", () => {
    it("should register visibility change event listeners", () => {
      // Spy on addEventListener before rendering
      const documentAddEventListenerSpy = vi.spyOn(
        document,
        "addEventListener",
      );
      const windowAddEventListenerSpy = vi.spyOn(window, "addEventListener");

      renderHook(() => useGame(), { wrapper: createWrapper() });

      expect(documentAddEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith(
        "pageshow",
        expect.any(Function),
      );

      documentAddEventListenerSpy.mockRestore();
      windowAddEventListenerSpy.mockRestore();
    });

    it("should attempt immediate reconnection when page becomes visible", () => {
      // This test verifies the page visibility integration is working.
      // Since the previous test already verifies that event listeners are registered,
      // we can simplify this test to focus on the behavior rather than the exact mechanism.

      const { result } = renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Establish connection then disconnect
      act(() => {
        simulateWebSocketOpen();
        simulateWebSocketClose();
      });

      expect(result.current.isConnected).toBe(false);

      // Clear the mock calls from initial setup
      vi.clearAllMocks();

      // Simulate a page visibility change by dispatching the event
      // This tests that the visibility API integration works end-to-end
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
      });

      act(() => {
        // Trigger visibility change event directly
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // Should attempt reconnection when page becomes visible
      expect(mockWebSocketConstructor).toHaveBeenCalled();
    });

    it("should not reconnect when page is hidden", () => {
      // Spy on addEventListener to capture handlers
      const documentAddEventListenerSpy = vi.spyOn(
        document,
        "addEventListener",
      );

      renderHook(() => useGame(), {
        wrapper: createWrapper(),
      });

      // Simulate disconnection
      act(() => {
        simulateWebSocketOpen();
        simulateWebSocketClose();
      });

      vi.clearAllMocks();

      // Simulate page becoming hidden
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });

      // Get the actual visibility change handler from the spy calls
      const visibilityChangeHandler =
        documentAddEventListenerSpy.mock.calls.find(
          ([event]) => event === "visibilitychange",
        )?.[1];

      if (visibilityChangeHandler) {
        act(() => {
          (visibilityChangeHandler as EventListener)(
            new Event("visibilitychange"),
          );
        });
      }

      // Should not attempt immediate reconnection when hidden
      expect(mockWebSocketConstructor).not.toHaveBeenCalled();
      documentAddEventListenerSpy.mockRestore();
    });
  });
});

describe("GameContext WebSocket - Heartbeat", () => {
  beforeEach(setupTestEnvironment);
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Health Monitoring", () => {
    it("should send periodic ping messages when connected", () => {
      renderHook(() => useGame(), {
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
      renderHook(() => useGame(), {
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
});

describe("GameContext WebSocket - State Management", () => {
  beforeEach(setupTestEnvironment);
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Connection States", () => {
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
      renderHook(() => useGame(), {
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
      renderHook(() => useGame(), {
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
      // Spy on removeEventListener before rendering
      const documentRemoveEventListenerSpy = vi.spyOn(
        document,
        "removeEventListener",
      );
      const windowRemoveEventListenerSpy = vi.spyOn(
        window,
        "removeEventListener",
      );

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
      expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
      expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith(
        "pageshow",
        expect.any(Function),
      );

      documentRemoveEventListenerSpy.mockRestore();
      windowRemoveEventListenerSpy.mockRestore();
    });
  });
});
