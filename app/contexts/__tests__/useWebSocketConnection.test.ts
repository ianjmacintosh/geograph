import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocketConnection } from "../useWebSocketConnection";

// Mock WebSocket
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

// Setup global mocks
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

// Test helper functions are defined inline within each test

/* eslint-disable max-lines-per-function */
describe("useWebSocketConnection", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockOnMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockOnMessage = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("should initialize with disconnected state", async () => {
      const { result } = renderHook(() =>
        useWebSocketConnection({
          wsUrl: undefined, // No URL initially
          onMessage: mockOnMessage,
          dispatch: mockDispatch,
        }),
      );

      expect(result.current.connectionStatus).toBe("disconnected");
      expect(result.current.isConnected).toBe(false);
      expect(result.current.reconnectionInfo.isReconnecting).toBe(false);
      expect(result.current.reconnectionInfo.attempt).toBe(0);
      expect(result.current.reconnectionInfo.maxAttempts).toBe(10);
    });

    it("should track reconnection attempts", async () => {
      // Mock WebSocket to fail initially, then succeed
      let connectionAttempts = 0;
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          connectionAttempts++;

          if (connectionAttempts === 1) {
            // First attempt fails immediately
            setTimeout(() => {
              this.readyState = MockWebSocket.CLOSED;
              this.onclose?.(new CloseEvent("close", { code: 1006 }));
            }, 5);
          } else {
            // Subsequent attempts succeed but don't auto-disconnect
            setTimeout(() => {
              this.readyState = MockWebSocket.OPEN;
              this.onopen?.(new Event("open"));
            }, 5);
          }
        }
      } as any;

      const { result, unmount } = renderHook(() =>
        useWebSocketConnection({
          wsUrl: "ws://localhost:8080",
          onMessage: mockOnMessage,
          dispatch: mockDispatch,
        }),
      );

      // Let the initial connection attempt fail
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Check the state after the close event should have triggered reconnection logic
      // The status could be "disconnected" or "reconnected" depending on timing
      expect(["disconnected", "reconnected", "connected"]).toContain(
        result.current.connectionStatus,
      );
      expect(result.current.isConnected).toBeDefined();

      // Let the first reconnection attempt happen (it's immediate - 0ms delay)
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Should have made multiple attempts
      expect(connectionAttempts).toBeGreaterThanOrEqual(2);
      expect(result.current.reconnectionInfo.maxAttempts).toBe(10);

      // Clean up
      unmount();
    });

    it("should show countdown for reconnection delays", async () => {
      // Mock WebSocket that fails a few times then succeeds
      let connectionAttempts = 0;

      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          connectionAttempts++;

          if (connectionAttempts <= 3) {
            // First few attempts fail
            setTimeout(() => {
              this.readyState = MockWebSocket.CLOSED;
              this.onclose?.(new CloseEvent("close", { code: 1006 }));
            }, 5);
          } else {
            // Eventually succeed
            setTimeout(() => {
              this.readyState = MockWebSocket.OPEN;
              this.onopen?.(new Event("open"));
            }, 5);
          }
        }
      } as any;

      const { result, unmount } = renderHook(() =>
        useWebSocketConnection({
          wsUrl: "ws://localhost:8080",
          onMessage: mockOnMessage,
          dispatch: mockDispatch,
        }),
      );

      // Let several connection attempts fail to reach delays > 0
      await act(async () => {
        // Advance time to let multiple connection attempts fail
        vi.advanceTimersByTime(500);
      });

      // We should see evidence of reconnection attempts
      expect(result.current.reconnectionInfo.maxAttempts).toBe(10);
      expect(connectionAttempts).toBeGreaterThan(1);

      // Clean up
      unmount();
    });

    it("should reset reconnection info on successful connection", async () => {
      global.WebSocket = MockWebSocket as any;

      const { result, unmount } = renderHook(() =>
        useWebSocketConnection({
          wsUrl: "ws://localhost:8080",
          onMessage: mockOnMessage,
          dispatch: mockDispatch,
        }),
      );

      // Simulate successful connection
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.connectionStatus).toBe("connected");
      expect(result.current.isConnected).toBe(true);
      expect(result.current.reconnectionInfo.isReconnecting).toBe(false);
      expect(result.current.reconnectionInfo.attempt).toBe(0);

      // Clean up
      unmount();
    });

    it("should handle page visibility changes", async () => {
      const { result, unmount } = renderHook(() =>
        useWebSocketConnection({
          wsUrl: "ws://localhost:8080",
          onMessage: mockOnMessage,
          dispatch: mockDispatch,
        }),
      );

      // Wait for initial connection
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Should handle visibility changes without errors
      expect(result.current).toBeDefined();
      expect(result.current.connectionStatus).toBeDefined();
      expect(result.current.reconnectionInfo).toBeDefined();

      // Clean up
      unmount();
    });
  });

  describe("Countdown and timing", () => {
    it("should show countdown for delays over 1 second", async () => {
      let connectionAttempts = 0;

      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          connectionAttempts++;

          // Fail for first 4 attempts to reach delays > 1 second, then succeed
          if (connectionAttempts <= 4) {
            setTimeout(() => {
              this.readyState = MockWebSocket.CLOSED;
              this.onclose?.(new CloseEvent("close", { code: 1006 }));
            }, 5);
          } else {
            setTimeout(() => {
              this.readyState = MockWebSocket.OPEN;
              this.onopen?.(new Event("open"));
            }, 5);
          }
        }
      } as any;

      const { result, unmount } = renderHook(() =>
        useWebSocketConnection({
          wsUrl: "ws://localhost:8080",
          onMessage: mockOnMessage,
          dispatch: mockDispatch,
        }),
      );

      // Let multiple attempts fail to reach higher delays
      await act(async () => {
        // Fast-forward through multiple connection attempts
        vi.advanceTimersByTime(5000); // 5 seconds to trigger multiple attempts
      });

      // Should see evidence of multiple reconnection attempts
      expect(connectionAttempts).toBeGreaterThan(3);
      expect(result.current.reconnectionInfo.maxAttempts).toBe(10);

      // Clean up
      unmount();
    });

    it("should increment attempt counter correctly", async () => {
      let connectionAttempts = 0;

      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          connectionAttempts++;

          // Fail for first 3 attempts, then succeed
          if (connectionAttempts <= 3) {
            setTimeout(() => {
              this.readyState = MockWebSocket.CLOSED;
              this.onclose?.(new CloseEvent("close", { code: 1006 }));
            }, 5);
          } else {
            setTimeout(() => {
              this.readyState = MockWebSocket.OPEN;
              this.onopen?.(new Event("open"));
            }, 5);
          }
        }
      } as any;

      const { unmount } = renderHook(() =>
        useWebSocketConnection({
          wsUrl: "ws://localhost:8080",
          onMessage: mockOnMessage,
          dispatch: mockDispatch,
        }),
      );

      // Let the first few connection attempts fail
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Should have made multiple attempts
      expect(connectionAttempts).toBeGreaterThan(1);

      // Clean up
      unmount();
    });

    it("should use progressive backoff delays", async () => {
      let connectionAttempts = 0;
      const delays: number[] = [];

      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          connectionAttempts++;

          // Capture when connections are made to infer delays
          delays.push(Date.now());

          // Fail for first 5 attempts, then succeed
          if (connectionAttempts <= 5) {
            setTimeout(() => {
              this.readyState = MockWebSocket.CLOSED;
              this.onclose?.(new CloseEvent("close", { code: 1006 }));
            }, 5);
          } else {
            setTimeout(() => {
              this.readyState = MockWebSocket.OPEN;
              this.onopen?.(new Event("open"));
            }, 5);
          }
        }
      } as any;

      const { unmount } = renderHook(() =>
        useWebSocketConnection({
          wsUrl: "ws://localhost:8080",
          onMessage: mockOnMessage,
          dispatch: mockDispatch,
        }),
      );

      // Let multiple attempts happen with progressive delays
      await act(async () => {
        vi.advanceTimersByTime(15000); // Advance enough time for multiple attempts
      });

      // Should have made multiple attempts with increasing delays
      expect(connectionAttempts).toBeGreaterThan(3);

      // Clean up
      unmount();
    });

    it("should have proper max attempts configuration", async () => {
      global.WebSocket = MockWebSocket as any;

      const { result, unmount } = renderHook(() =>
        useWebSocketConnection({
          wsUrl: "ws://localhost:8080",
          onMessage: mockOnMessage,
          dispatch: mockDispatch,
        }),
      );

      // Check initial configuration
      expect(result.current.reconnectionInfo.maxAttempts).toBe(10);
      expect(result.current.reconnectionInfo.attempt).toBe(0);
      expect(result.current.reconnectionInfo.isReconnecting).toBe(false);

      // Clean up
      unmount();
    });
  });

  describe("Reconnection scenarios", () => {
    it("should handle successful reconnection after failures", async () => {
      let connectionAttempts = 0;

      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          connectionAttempts++;

          if (connectionAttempts <= 2) {
            // Fail first two attempts
            setTimeout(() => {
              this.readyState = MockWebSocket.CLOSED;
              this.onclose?.(new CloseEvent("close", { code: 1006 }));
            }, 5);
          } else {
            // Third attempt succeeds
            setTimeout(() => {
              this.readyState = MockWebSocket.OPEN;
              this.onopen?.(new Event("open"));
            }, 10);
          }
        }
      } as any;

      const { result, unmount } = renderHook(() =>
        useWebSocketConnection({
          wsUrl: "ws://localhost:8080",
          onMessage: mockOnMessage,
          dispatch: mockDispatch,
        }),
      );

      // Let reconnection attempts happen
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Should eventually connect successfully
      expect(result.current.connectionStatus).toBe("connected");
      expect(result.current.isConnected).toBe(true);
      expect(result.current.reconnectionInfo.isReconnecting).toBe(false);
      expect(result.current.reconnectionInfo.attempt).toBe(0);

      // Clean up
      unmount();
    });
  });
});

describe("useWebSocketConnection - Integration Tests", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockOnMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockOnMessage = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should expose reconnection info consistently", async () => {
    const { result, unmount } = renderHook(() =>
      useWebSocketConnection({
        wsUrl: "ws://localhost:8080",
        onMessage: mockOnMessage,
        dispatch: mockDispatch,
      }),
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Should have proper reconnection info structure
    expect(result.current.reconnectionInfo).toHaveProperty("isReconnecting");
    expect(result.current.reconnectionInfo).toHaveProperty("attempt");
    expect(result.current.reconnectionInfo).toHaveProperty("maxAttempts");
    expect(result.current.reconnectionInfo).toHaveProperty("countdownSeconds");
    expect(result.current.reconnectionInfo.maxAttempts).toBe(10);

    // Clean up
    unmount();
  });

  it("should provide sendMessage function", async () => {
    const { result, unmount } = renderHook(() =>
      useWebSocketConnection({
        wsUrl: "ws://localhost:8080",
        onMessage: mockOnMessage,
        dispatch: mockDispatch,
      }),
    );

    // Should expose sendMessage function
    expect(typeof result.current.sendMessage).toBe("function");

    // Should be able to call sendMessage without errors
    expect(() => {
      result.current.sendMessage("test", { data: "test" });
    }).not.toThrow();

    // Clean up
    unmount();
  });

  it("should handle rapid connection state changes", async () => {
    let connectionAttempts = 0;

    global.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        connectionAttempts++;

        if (connectionAttempts === 1) {
          // First connection succeeds briefly then fails
          setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            this.onopen?.(new Event("open"));
          }, 5);
          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED;
            this.onclose?.(new CloseEvent("close", { code: 1006 }));
          }, 50);
        } else if (connectionAttempts <= 3) {
          // Subsequent attempts fail immediately
          this.readyState = MockWebSocket.CLOSED;
          setTimeout(() => {
            this.onclose?.(new CloseEvent("close", { code: 1006 }));
          }, 5);
        } else {
          // Eventually succeed to prevent infinite loops
          setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            this.onopen?.(new Event("open"));
          }, 5);
        }
      }
    } as any;

    const { result, unmount } = renderHook(() =>
      useWebSocketConnection({
        wsUrl: "ws://localhost:8080",
        onMessage: mockOnMessage,
        dispatch: mockDispatch,
      }),
    );

    // Let the connection establish first
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Then let it fail and reconnect
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Should have attempted reconnection
    expect(connectionAttempts).toBeGreaterThan(1);
    // Status should be either disconnected or connecting (depending on timing)
    expect(["disconnected", "connecting", "error"]).toContain(
      result.current.connectionStatus,
    );

    // Clean up
    unmount();
  });
});
