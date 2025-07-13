import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Game, GameState, Player, FinalResults } from "../types/game";
// Note: useWebSocket import preserved for future development
// import { useWebSocket, type WebSocketMessage } from "../hooks/useWebSocket";
import type { WebSocketMessage } from "../hooks/useWebSocket";

type GameAction =
  | { type: "SET_GAME"; payload: Game }
  | { type: "ADD_PLAYER"; payload: Player }
  | { type: "REMOVE_PLAYER"; payload: string }
  | { type: "START_GAME" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_GAME" }
  | { type: "UPDATE_SETTINGS"; payload: Partial<Game["settings"]> }
  | { type: "FINISH_GAME"; payload: FinalResults }
  | { type: "SET_CONNECTION_STATUS"; payload: string }
  | { type: "SET_PLAYER_ID"; payload: string };

const initialState: GameState = {
  currentGame: null,
  isLoading: false,
  error: null,
};

interface ExtendedGameState extends GameState {
  connectionStatus: string;
  playerId: string;
}

const initialExtendedState: ExtendedGameState = {
  ...initialState,
  connectionStatus: "disconnected",
  playerId: "",
};

// Helper functions to reduce reducer complexity
function addPlayerToGame(
  state: ExtendedGameState,
  player: any,
): ExtendedGameState {
  if (!state.currentGame) return state;
  return {
    ...state,
    currentGame: {
      ...state.currentGame,
      players: [...state.currentGame.players, player],
    },
  };
}

function removePlayerFromGame(
  state: ExtendedGameState,
  playerId: string,
): ExtendedGameState {
  if (!state.currentGame) return state;
  return {
    ...state,
    currentGame: {
      ...state.currentGame,
      players: state.currentGame.players.filter((p) => p.id !== playerId),
    },
  };
}

function updateGameSettings(
  state: ExtendedGameState,
  settings: any,
): ExtendedGameState {
  if (!state.currentGame) return state;
  return {
    ...state,
    currentGame: {
      ...state.currentGame,
      settings: {
        ...state.currentGame.settings,
        ...settings,
      },
    },
  };
}

function finishGame(
  state: ExtendedGameState,
  finalResults: any,
): ExtendedGameState {
  if (!state.currentGame) return state;
  return {
    ...state,
    currentGame: {
      ...state.currentGame,
      status: "finished" as const,
      finalResults,
    },
  };
}

// Handle game-related actions
function handleGameActions(
  state: ExtendedGameState,
  action: GameAction,
): ExtendedGameState | null {
  switch (action.type) {
    case "SET_GAME":
      return { ...state, currentGame: action.payload, error: null };
    case "ADD_PLAYER":
      return addPlayerToGame(state, action.payload);
    case "REMOVE_PLAYER":
      return removePlayerFromGame(state, action.payload);
    case "START_GAME":
      if (!state.currentGame) return state;
      return {
        ...state,
        currentGame: { ...state.currentGame, status: "playing" },
      };
    case "UPDATE_SETTINGS":
      return updateGameSettings(state, action.payload);
    case "FINISH_GAME":
      return finishGame(state, action.payload);
    case "CLEAR_GAME":
      return {
        ...initialExtendedState,
        connectionStatus: state.connectionStatus,
        playerId: "",
      };
    default:
      return null; // Not handled by this function
  }
}

// Handle state-related actions
function handleStateActions(
  state: ExtendedGameState,
  action: GameAction,
): ExtendedGameState | null {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };
    case "SET_PLAYER_ID":
      return { ...state, playerId: action.payload };
    default:
      return null; // Not handled by this function
  }
}

function gameReducer(
  state: ExtendedGameState,
  action: GameAction,
): ExtendedGameState {
  const gameResult = handleGameActions(state, action);
  if (gameResult) return gameResult;

  const stateResult = handleStateActions(state, action);
  if (stateResult) return stateResult;

  return state; // Default case
}

const GameContext = createContext<{
  state: ExtendedGameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

const GameWebSocketContext = createContext<{
  sendMessage: (type: string, payload?: any) => void;
  isConnected: boolean;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialExtendedState);

  // Memoize WebSocket URL to prevent recalculation on every render
  const wsUrl = useMemo(() => {
    if (typeof window === "undefined") return undefined; // SSR guard

    // Check if we're in development (localhost or explicit dev env)
    const isDevelopment =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      (typeof process !== "undefined" &&
        process.env?.NODE_ENV === "development");

    if (isDevelopment) {
      // Development: Direct connection to WebSocket server
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = "8080";
      return `${protocol}//${host}:${port}`;
    } else {
      // Production: Use Nginx proxy path
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host; // includes port if any
      return `${protocol}//${host}/ws/`;
    }
  }, []);

  // Prevent multiple WebSocket connections
  const _wsInitializedRef = useRef(false);

  // Helper functions for WebSocket message handling
  const handleGameCreationMessages = useCallback(
    (message: WebSocketMessage) => {
      dispatch({ type: "SET_GAME", payload: message.payload.game });
      dispatch({ type: "SET_PLAYER_ID", payload: message.payload.playerId });
      dispatch({ type: "SET_LOADING", payload: false });
    },
    [dispatch],
  );

  const handleGameUpdateMessages = useCallback(
    (message: WebSocketMessage) => {
      dispatch({ type: "SET_GAME", payload: message.payload.game });
    },
    [dispatch],
  );

  const handlePlayerGuessedMessage = useCallback(
    (message: WebSocketMessage) => {
      console.log("👤 Player guessed:", message.payload.playerName);
      if (message.payload.game) {
        dispatch({ type: "SET_GAME", payload: message.payload.game });
      }
    },
    [dispatch],
  );

  const handleErrorMessage = useCallback(
    (message: WebSocketMessage) => {
      // Don't show error for "Round is already completed" - this is expected when auto-submit races with server timer
      if (message.payload.message !== "Round is already completed") {
        dispatch({ type: "SET_ERROR", payload: message.payload.message });
      }
      dispatch({ type: "SET_LOADING", payload: false });
    },
    [dispatch],
  );

  // Message type categorization helpers
  const isGameCreationMessage = (type: string) =>
    ["GAME_CREATED", "GAME_JOINED", "RECONNECTED"].includes(type);

  const isGameUpdateMessage = (type: string) =>
    [
      "PLAYER_JOINED",
      "COMPUTER_PLAYERS_ADDED",
      "SETTINGS_UPDATED",
      "GAME_STARTED",
      "ROUND_STARTED",
      "GAME_FINISHED",
      "ROUND_RESULTS",
    ].includes(type);

  const isPlayerAction = (type: string) =>
    ["PLAYER_LEFT", "PLAYER_DISCONNECTED"].includes(type);

  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      console.log(
        "📩 Received WebSocket message:",
        message.type,
        message.payload,
      );

      if (isGameCreationMessage(message.type)) {
        handleGameCreationMessages(message);
      } else if (isGameUpdateMessage(message.type)) {
        handleGameUpdateMessages(message);
      } else if (message.type === "GUESS_MADE") {
        console.log("✅ Guess confirmed:", message.payload.guess);
      } else if (message.type === "PLAYER_GUESSED") {
        handlePlayerGuessedMessage(message);
      } else if (isPlayerAction(message.type)) {
        // Handle player leaving/disconnecting
      } else if (message.type === "ERROR") {
        handleErrorMessage(message);
      } else {
        console.warn("Unknown WebSocket message type:", message.type);
      }
    },
    [
      handleGameCreationMessages,
      handleGameUpdateMessages,
      handlePlayerGuessedMessage,
      handleErrorMessage,
    ],
  );

  // Debug the WebSocket URL (only log once per URL change)
  useEffect(() => {
    console.log("🔍 WebSocket URL:", wsUrl);
    console.log(
      "🔍 Window location:",
      typeof window !== "undefined" ? window.location.href : "SSR",
    );
  }, [wsUrl]);

  // Memoize callback functions to prevent re-renders

  const _onDisconnect = useCallback(() => {
    dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });
    console.log("📱 WebSocket disconnected");
  }, [dispatch]);

  const _onError = useCallback(
    (_error: Event) => {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
      dispatch({ type: "SET_ERROR", payload: "Connection error" });
      console.error("❌ WebSocket error:", _error);
    },
    [dispatch],
  );

  // Enhanced WebSocket connection with robust reconnection
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
          handleWebSocketMessage(message);
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
    handleWebSocketMessage,
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

  // Game state reconnection after WebSocket reconnection
  useEffect(() => {
    if (
      connectionStatus === "connected" &&
      state.playerId &&
      state.currentGame &&
      state.currentGame.id
    ) {
      console.log(
        "🔄 Reconnecting to game state:",
        state.currentGame.id,
        "with player:",
        state.playerId,
      );
      sendMessage("RECONNECT", {
        gameId: state.currentGame.id,
        playerId: state.playerId,
      });
    }
  }, [connectionStatus, state.playerId, state.currentGame, sendMessage]);

  useEffect(() => {
    dispatch({ type: "SET_CONNECTION_STATUS", payload: connectionStatus });
  }, [connectionStatus]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      <GameWebSocketContext.Provider value={{ sendMessage, isConnected }}>
        {children}
      </GameWebSocketContext.Provider>
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  const wsContext = useContext(GameWebSocketContext);

  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }

  if (!wsContext) {
    throw new Error(
      "useGame must be used within a GameProvider with WebSocket context",
    );
  }

  const { state, dispatch } = context;
  const { sendMessage, isConnected } = wsContext;

  const createGame = (playerName: string) => {
    if (!isConnected) {
      dispatch({ type: "SET_ERROR", payload: "Not connected to server" });
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    sendMessage("CREATE_GAME", { playerName });
  };

  const joinGame = (gameCode: string, playerName: string) => {
    if (!isConnected) {
      dispatch({ type: "SET_ERROR", payload: "Not connected to server" });
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    sendMessage("JOIN_GAME", { gameCode, playerName });
  };

  const addComputerPlayers = (count: number = 3) => {
    if (!isConnected) {
      dispatch({ type: "SET_ERROR", payload: "Not connected to server" });
      return;
    }

    sendMessage("ADD_COMPUTER_PLAYERS", { count });
  };

  const startGame = () => {
    if (!isConnected) {
      dispatch({ type: "SET_ERROR", payload: "Not connected to server" });
      return;
    }

    sendMessage("START_GAME");
  };

  const makeGuess = (lat: number, lng: number) => {
    if (!isConnected) {
      dispatch({ type: "SET_ERROR", payload: "Not connected to server" });
      return;
    }

    sendMessage("MAKE_GUESS", { lat, lng });
  };

  const nextRound = () => {
    if (!isConnected) {
      dispatch({ type: "SET_ERROR", payload: "Not connected to server" });
      return;
    }

    sendMessage("NEXT_ROUND");
  };

  const leaveGame = () => {
    if (!isConnected) return;

    sendMessage("LEAVE_GAME");
    dispatch({ type: "CLEAR_GAME" });
  };

  const clearGame = () => {
    dispatch({ type: "CLEAR_GAME" });
    dispatch({ type: "SET_PLAYER_ID", payload: "" });
  };

  const updateSettings = (settings: Partial<Game["settings"]>) => {
    if (!isConnected) {
      dispatch({ type: "SET_ERROR", payload: "Not connected to server" });
      return;
    }

    dispatch({ type: "UPDATE_SETTINGS", payload: settings });
    sendMessage("UPDATE_SETTINGS", { settings });
  };

  const finishGame = (finalResults: FinalResults) => {
    dispatch({ type: "FINISH_GAME", payload: finalResults });
  };

  return {
    ...state,
    createGame,
    joinGame,
    addComputerPlayers,
    startGame,
    makeGuess,
    nextRound,
    leaveGame,
    clearGame,
    updateSettings,
    finishGame,
    connectionStatus: state.connectionStatus,
    playerId: state.playerId,
    isConnected,
  };
}
