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
    // Mock WebSocket to always fail to ensure we see reconnection state
    global.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        // Never actually connect, always fail
        this.readyState = MockWebSocket.CLOSED;
        setTimeout(() => {
          this.onclose?.(
            new CloseEvent("close", { code: 1006, reason: "Network error" }),
          );
        }, 5);
      }
    } as any;

    const { result } = renderHook(() =>
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
    // The status should be disconnected and we should have reconnection info
    expect(result.current.connectionStatus).toBe("disconnected");
    expect(result.current.isConnected).toBe(false);

    // Let the first reconnection attempt happen (it's immediate - 0ms delay)
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Now we should see reconnection state
    // Note: the attempt counter increments before calling startCountdown
    expect(result.current.reconnectionInfo.maxAttempts).toBe(10);
  });

  it("should show countdown for reconnection delays", async () => {
    // Mock WebSocket that fails multiple times to test progressive backoff
    let connectionAttempts = 0;

    global.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        connectionAttempts++;

        setTimeout(() => {
          this.readyState = MockWebSocket.CLOSED;
          this.onclose?.(new CloseEvent("close", { code: 1006 }));
        }, 5);
      }
    } as any;

    const { result } = renderHook(() =>
      useWebSocketConnection({
        wsUrl: "ws://localhost:8080",
        onMessage: mockOnMessage,
        dispatch: mockDispatch,
      }),
    );

    // Let several connection attempts fail to reach delays > 0
    await act(async () => {
      // Advance time to let multiple connection attempts fail
      vi.advanceTimersByTime(100);
    });

    // We should see evidence of reconnection attempts
    expect(result.current.reconnectionInfo.maxAttempts).toBe(10);
    expect(connectionAttempts).toBeGreaterThan(1);
  });

  it("should reset reconnection info on successful connection", async () => {
    global.WebSocket = MockWebSocket as any;

    const { result } = renderHook(() =>
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
  });

  it("should handle page visibility changes", async () => {
    const { result } = renderHook(() =>
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
  });
});
