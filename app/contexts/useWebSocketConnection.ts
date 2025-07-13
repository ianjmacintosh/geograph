import { useState, useRef, useCallback, useEffect } from "react";
import type { WebSocketMessage } from "../hooks/useWebSocket";

interface UseWebSocketConnectionProps {
  wsUrl: string | undefined;
  onMessage: (message: WebSocketMessage) => void;
  dispatch: React.Dispatch<any>;
}

export function useWebSocketConnection({
  wsUrl,
  onMessage,
  dispatch,
}: UseWebSocketConnectionProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastReconnectWindowRef = useRef<number>(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isConnected, setIsConnected] = useState(false);

  // Progressive backoff schedule: 0ms → 100ms → 300ms → 1s → 3s → 5s → 10s (capped)
  const getReconnectDelay = useCallback((attempt: number): number => {
    const delays = [0, 100, 300, 1000, 3000, 5000, 10000];
    return delays[Math.min(attempt, delays.length - 1)];
  }, []);

  // Circuit breaker: max 10 attempts per 5-minute window
  const shouldAttemptReconnect = useCallback((): boolean => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Reset attempts if we're in a new window
    if (now - lastReconnectWindowRef.current > fiveMinutes) {
      reconnectAttemptsRef.current = 0;
      lastReconnectWindowRef.current = now;
    }

    return reconnectAttemptsRef.current < 10;
  }, []);

  // Heartbeat to detect stale connections
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("💓 Sending heartbeat ping");
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Ping every 30 seconds
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((type: string, payload?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.log("WebSocket not connected - message dropped:", type, payload);
    }
  }, []);

  // Enhanced WebSocket connection with progressive reconnection
  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined" || !wsUrl) return;

    // Don't connect if already connected or connecting
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    console.log(
      `🔍 Connecting to WebSocket (attempt ${reconnectAttemptsRef.current + 1}):`,
      wsUrl,
    );
    setConnectionStatus("connecting");
    dispatch({ type: "SET_CONNECTION_STATUS", payload: "connecting" });

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("🔗 WebSocket connected successfully");
        setConnectionStatus("connected");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
        startHeartbeat();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Handle heartbeat responses
          if (message.type === "pong") {
            console.log("💓 Heartbeat pong received");
            return;
          }
          onMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(
          `🔌 WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`,
        );
        setConnectionStatus("disconnected");
        setIsConnected(false);
        stopHeartbeat();
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });

        // Attempt reconnection with progressive backoff
        if (shouldAttemptReconnect()) {
          const delay = getReconnectDelay(reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;

          console.log(
            `🔄 Scheduling reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current}/10)`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          console.error(
            "❌ Max reconnection attempts reached in current window",
          );
          setConnectionStatus("error");
          dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket error occurred:", error);
        setConnectionStatus("error");
        setIsConnected(false);
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setConnectionStatus("error");
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
    }
  }, [
    wsUrl,
    onMessage,
    dispatch,
    shouldAttemptReconnect,
    getReconnectDelay,
    startHeartbeat,
    stopHeartbeat,
  ]);

  // Page Visibility API integration for tab switching
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("📱 Page became visible - checking WebSocket connection");

        // If disconnected when page becomes visible, attempt immediate reconnection
        if (!isConnected && wsUrl && shouldAttemptReconnect()) {
          console.log("🔄 Attempting immediate reconnection on page focus");
          // Clear any pending reconnection and connect immediately
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          connectWebSocket();
        }
      } else {
        console.log("📱 Page became hidden");
      }
    };

    const handlePageShow = () => {
      console.log("📱 Page show event - checking connection");
      if (!isConnected && wsUrl) {
        connectWebSocket();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [isConnected, wsUrl, connectWebSocket, shouldAttemptReconnect]);

  // Initial connection and cleanup
  useEffect(() => {
    if (wsUrl) {
      connectWebSocket();
    }

    return () => {
      // Cleanup timeouts and intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      stopHeartbeat();

      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnectionStatus("disconnected");
      setIsConnected(false);
    };
  }, [wsUrl, connectWebSocket, stopHeartbeat]);

  return {
    connectionStatus,
    isConnected,
    sendMessage,
  };
}
