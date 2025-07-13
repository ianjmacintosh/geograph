import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { GameProvider, useGame } from "../GameContext";
import type { ReactNode } from "react";

// Simple WebSocket mock
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: 0,
  onopen: null as ((event: Event) => void) | null,
  onclose: null as ((event: CloseEvent) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
};

const mockWebSocketConstructor = vi.fn(() => mockWebSocket);

// Setup environment mocks
const setupEnvironment = () => {
  // Mock WebSocket constructor on global
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

  // Mock document properties (jsdom should provide document, but we can mock specific properties)
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    writable: true,
  });
};

// Helper function to create wrapper component
function createWrapper() {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <GameProvider>{children}</GameProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

describe("GameContext WebSocket - Basic Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupEnvironment();
    vi.clearAllMocks();
    mockWebSocket.readyState = 0; // CONNECTING
    mockWebSocketConstructor.mockReturnValue(mockWebSocket);

    // Suppress console output
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should initialize GameProvider without errors", () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(result.current.connectionStatus).toBeDefined();
    expect(result.current.isConnected).toBeDefined();
  });

  it("should attempt WebSocket connection on mount", () => {
    renderHook(() => useGame(), { wrapper: createWrapper() });

    // Should create a WebSocket connection
    expect(mockWebSocketConstructor).toHaveBeenCalled();
  });

  it("should handle connection state changes", () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: createWrapper(),
    });

    // Initially disconnected/connecting
    expect(result.current.isConnected).toBe(false);

    // Simulate successful connection
    act(() => {
      mockWebSocket.readyState = 1; // OPEN
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen(new Event("open"));
      }
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionStatus).toBe("connected");
  });

  it("should handle reconnection on disconnect", () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: createWrapper(),
    });

    // Simulate initial connection
    act(() => {
      mockWebSocket.readyState = 1; // OPEN
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen(new Event("open"));
      }
    });

    expect(result.current.isConnected).toBe(true);

    // Clear the constructor mock to track reconnection calls
    mockWebSocketConstructor.mockClear();

    // Simulate disconnection
    act(() => {
      mockWebSocket.readyState = 3; // CLOSED
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose(
          new CloseEvent("close", { code: 1006, reason: "Connection lost" }),
        );
      }
    });

    expect(result.current.isConnected).toBe(false);

    // Advance timers to trigger reconnection
    act(() => {
      vi.advanceTimersByTime(100); // Should trigger immediate reconnection (0ms delay)
    });

    // Should attempt reconnection
    expect(mockWebSocketConstructor).toHaveBeenCalled();
  });

  it("should register page visibility event listeners", () => {
    // Spy on addEventListener before rendering
    const documentAddEventListenerSpy = vi.spyOn(document, "addEventListener");
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

  it("should send messages when connected", () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: createWrapper(),
    });

    // Simulate successful connection
    act(() => {
      mockWebSocket.readyState = 1; // OPEN
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen(new Event("open"));
      }
    });

    // Try to create a game (which sends a message)
    act(() => {
      result.current.createGame("Test Player");
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "CREATE_GAME",
        payload: { playerName: "Test Player" },
      }),
    );
  });

  it("should queue messages when disconnected", () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: createWrapper(),
    });

    // Ensure we're disconnected
    mockWebSocket.readyState = 3; // CLOSED

    // Try to create a game while disconnected
    act(() => {
      result.current.createGame("Test Player");
    });

    // Should set error state instead of sending message
    expect(result.current.error).toBe("Not connected to server");
  });

  it("should send heartbeat ping when connected", () => {
    renderHook(() => useGame(), {
      wrapper: createWrapper(),
    });

    // Simulate successful connection
    act(() => {
      mockWebSocket.readyState = 1; // OPEN
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen(new Event("open"));
      }
    });

    // Clear previous sends
    mockWebSocket.send.mockClear();

    // Advance time to trigger heartbeat (30 seconds)
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "ping" }),
    );
  });

  it("should handle server ping messages without forwarding to game logic", () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: createWrapper(),
    });

    // Simulate successful connection
    act(() => {
      mockWebSocket.readyState = 1; // OPEN
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen(new Event("open"));
      }
    });

    // Clear previous sends
    mockWebSocket.send.mockClear();

    // Simulate receiving ping message from server
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(
          new MessageEvent("message", {
            data: JSON.stringify({ type: "ping" }),
          }),
        );
      }
    });

    // Should respond with pong and not affect game state
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "pong" }),
    );
    expect(result.current.connectionStatus).toBe("connected");
    expect(result.current.error).toBeNull();
  });

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
      unmount();
    });

    expect(mockWebSocket.close).toHaveBeenCalled();
    expect(documentRemoveEventListenerSpy).toHaveBeenCalled();
    expect(windowRemoveEventListenerSpy).toHaveBeenCalled();

    documentRemoveEventListenerSpy.mockRestore();
    windowRemoveEventListenerSpy.mockRestore();
  });
});
