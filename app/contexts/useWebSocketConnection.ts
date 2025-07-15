import { useState, useRef, useCallback, useEffect } from "react";
import type { WebSocketMessage } from "../hooks/useWebSocket";

interface UseWebSocketConnectionProps {
  wsUrl: string | undefined;
  onMessage: (message: WebSocketMessage) => void;
  dispatch: React.Dispatch<any>;
}

// Connection state helper
function useConnectionState() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectionInfo, setReconnectionInfo] = useState<{
    isReconnecting: boolean;
    attempt: number;
    maxAttempts: number;
    countdownSeconds: number;
  }>({
    isReconnecting: false,
    attempt: 0,
    maxAttempts: 10,
    countdownSeconds: 0,
  });

  return {
    connectionStatus,
    setConnectionStatus,
    isConnected,
    setIsConnected,
    reconnectionInfo,
    setReconnectionInfo,
  };
}

// Page visibility effect helper
function usePageVisibilityEffect({
  isConnected,
  wsUrl,
  connectWebSocket,
  shouldAttemptReconnect,
  stopCountdown,
  setReconnectionInfo,
  reconnectTimeoutRef,
}: {
  isConnected: boolean;
  wsUrl: string | undefined;
  connectWebSocket: () => void;
  shouldAttemptReconnect: () => boolean;
  stopCountdown: () => void;
  setReconnectionInfo: React.Dispatch<
    React.SetStateAction<{
      isReconnecting: boolean;
      attempt: number;
      maxAttempts: number;
      countdownSeconds: number;
    }>
  >;
  reconnectTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("📱 Page became visible - checking WebSocket connection");

        if (!isConnected && wsUrl && shouldAttemptReconnect()) {
          console.log("🔄 Attempting immediate reconnection on page focus");
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          stopCountdown();
          setReconnectionInfo((prev) => ({ ...prev, isReconnecting: false }));
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
  }, [
    isConnected,
    wsUrl,
    connectWebSocket,
    shouldAttemptReconnect,
    stopCountdown,
    setReconnectionInfo,
    reconnectTimeoutRef,
  ]);
}

// Connection lifecycle effect helper
function useConnectionLifecycleEffect({
  wsUrl,
  connectWebSocket,
  stopHeartbeat,
  stopCountdown,
  reconnectTimeoutRef,
  wsRef,
  setConnectionStatus,
  setIsConnected,
}: {
  wsUrl: string | undefined;
  connectWebSocket: () => void;
  stopHeartbeat: () => void;
  stopCountdown: () => void;
  reconnectTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  wsRef: React.MutableRefObject<WebSocket | null>;
  setConnectionStatus: React.Dispatch<React.SetStateAction<string>>;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  useEffect(() => {
    if (wsUrl) {
      connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      stopHeartbeat();
      stopCountdown();

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnectionStatus("disconnected");
      setIsConnected(false);
    };
  }, [
    wsUrl,
    connectWebSocket,
    stopHeartbeat,
    stopCountdown,
    reconnectTimeoutRef,
    wsRef,
    setConnectionStatus,
    setIsConnected,
  ]);
}

// Network status effect helper
function useNetworkStatusEffect({
  wsRef,
  isConnected,
  wsUrl,
  shouldAttemptReconnect,
  connectWebSocket,
}: {
  wsRef: React.MutableRefObject<WebSocket | null>;
  isConnected: boolean;
  wsUrl: string | undefined;
  shouldAttemptReconnect: () => boolean;
  connectWebSocket: () => void;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => {
      console.log("🌐 Browser went offline - closing WebSocket connection");
      if (wsRef.current) {
        wsRef.current.close(1000, "Network offline");
      }
    };

    const handleOnline = () => {
      console.log("🌐 Browser came online - attempting reconnection");
      if (!isConnected && wsUrl && shouldAttemptReconnect()) {
        connectWebSocket();
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [isConnected, wsUrl, shouldAttemptReconnect, connectWebSocket, wsRef]);
}

// Connection management helper
function useConnectionManagement(
  reconnectAttemptsRef: React.MutableRefObject<number>,
  lastReconnectWindowRef: React.MutableRefObject<number>,
  heartbeatIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>,
  countdownIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>,
  wsRef: React.MutableRefObject<WebSocket | null>,
  setReconnectionInfo: React.Dispatch<
    React.SetStateAction<{
      isReconnecting: boolean;
      attempt: number;
      maxAttempts: number;
      countdownSeconds: number;
    }>
  >,
) {
  // Progressive backoff schedule
  const getReconnectDelay = useCallback((attempt: number): number => {
    const delays = [0, 100, 300, 1000, 3000, 5000, 10000];
    return delays[Math.min(attempt, delays.length - 1)];
  }, []);

  // Circuit breaker
  const shouldAttemptReconnect = useCallback((): boolean => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now - lastReconnectWindowRef.current > fiveMinutes) {
      reconnectAttemptsRef.current = 0;
      lastReconnectWindowRef.current = now;
    }

    return reconnectAttemptsRef.current < 10;
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (delayMs: number, attemptNumber: number) => {
      setReconnectionInfo({
        isReconnecting: true,
        attempt: attemptNumber,
        maxAttempts: 10,
        countdownSeconds: Math.ceil(delayMs / 1000),
      });

      let remainingSeconds = Math.ceil(delayMs / 1000);

      // Even if delay is 0ms, we want to show the reconnection attempt feedback
      // Only start countdown interval if there's actually time to count down
      if (remainingSeconds > 0) {
        countdownIntervalRef.current = setInterval(() => {
          remainingSeconds--;
          setReconnectionInfo((prev) => ({
            ...prev,
            countdownSeconds: remainingSeconds,
          }));

          if (remainingSeconds <= 0) {
            stopCountdown();
          }
        }, 1000);
      }
    },
    [stopCountdown, setReconnectionInfo],
  );

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("💓 Sending heartbeat ping");
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }, []);

  return {
    getReconnectDelay,
    shouldAttemptReconnect,
    startCountdown,
    stopCountdown,
    startHeartbeat,
    stopHeartbeat,
  };
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
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    connectionStatus,
    setConnectionStatus,
    isConnected,
    setIsConnected,
    reconnectionInfo,
    setReconnectionInfo,
  } = useConnectionState();

  const {
    getReconnectDelay,
    shouldAttemptReconnect,
    startCountdown,
    stopCountdown,
    startHeartbeat,
    stopHeartbeat,
  } = useConnectionManagement(
    reconnectAttemptsRef,
    lastReconnectWindowRef,
    heartbeatIntervalRef,
    countdownIntervalRef,
    wsRef,
    setReconnectionInfo,
  );

  const sendMessage = useCallback((type: string, payload?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.log("WebSocket not connected - message dropped:", type, payload);
    }
  }, []);

  // WebSocket event handlers
  const createWebSocketHandlers = useCallback(() => {
    const handleOpen = () => {
      console.log("🔗 WebSocket connected successfully");
      setConnectionStatus("connected");
      setIsConnected(true);

      if (reconnectAttemptsRef.current > 0) {
        setConnectionStatus("reconnected");
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "reconnected" });
        setTimeout(() => {
          setConnectionStatus("connected");
          dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
        }, 2000);
      }

      reconnectAttemptsRef.current = 0;
      setReconnectionInfo({
        isReconnecting: false,
        attempt: 0,
        maxAttempts: 10,
        countdownSeconds: 0,
      });
      stopCountdown();
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
      startHeartbeat();
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "ping") {
          console.log("💓 Server ping received, sending pong");
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "pong" }));
          }
          return;
        }
        if (message.type === "pong") {
          console.log("💓 Heartbeat pong received");
          return;
        }
        onMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    const handleClose = (event: CloseEvent) => {
      console.log(
        `🔌 WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`,
      );
      setConnectionStatus("disconnected");
      setIsConnected(false);
      stopHeartbeat();
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });

      if (shouldAttemptReconnect()) {
        const delay = getReconnectDelay(reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;

        console.log(
          `🔄 Scheduling reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current}/10)`,
        );

        startCountdown(delay, reconnectAttemptsRef.current);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      } else {
        console.error("❌ Max reconnection attempts reached");
        setConnectionStatus("error");
        setReconnectionInfo({
          isReconnecting: false,
          attempt: 0,
          maxAttempts: 10,
          countdownSeconds: 0,
        });
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
      }
    };

    const handleError = (error: Event) => {
      console.error("❌ WebSocket error occurred:", error);
      setConnectionStatus("error");
      setIsConnected(false);
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
    };

    return { handleOpen, handleMessage, handleClose, handleError };
  }, [
    onMessage,
    dispatch,
    shouldAttemptReconnect,
    getReconnectDelay,
    startHeartbeat,
    stopHeartbeat,
    startCountdown,
    stopCountdown,
    setConnectionStatus,
    setIsConnected,
    setReconnectionInfo,
  ]);

  // Enhanced WebSocket connection with progressive reconnection
  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined" || !wsUrl) return;

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
      const { handleOpen, handleMessage, handleClose, handleError } =
        createWebSocketHandlers();

      wsRef.current.onopen = handleOpen;
      wsRef.current.onmessage = handleMessage;
      wsRef.current.onclose = handleClose;
      wsRef.current.onerror = handleError;
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setConnectionStatus("error");
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
    }
  }, [wsUrl, dispatch, setConnectionStatus, createWebSocketHandlers]);

  // Custom effects for Page Visibility API and lifecycle management
  usePageVisibilityEffect({
    isConnected,
    wsUrl,
    connectWebSocket,
    shouldAttemptReconnect,
    stopCountdown,
    setReconnectionInfo,
    reconnectTimeoutRef,
  });

  useConnectionLifecycleEffect({
    wsUrl,
    connectWebSocket,
    stopHeartbeat,
    stopCountdown,
    reconnectTimeoutRef,
    wsRef,
    setConnectionStatus,
    setIsConnected,
  });

  // Custom effect for handling browser online/offline events
  useNetworkStatusEffect({
    wsRef,
    isConnected,
    wsUrl,
    shouldAttemptReconnect,
    connectWebSocket,
  });

  return {
    connectionStatus,
    isConnected,
    sendMessage,
    reconnectionInfo,
  };
}
