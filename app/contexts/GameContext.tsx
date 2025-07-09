import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Game, GameState, Player, FinalResults } from '../types/game';
import { useWebSocket, type WebSocketMessage } from '../hooks/useWebSocket';

type GameAction =
  | { type: 'SET_GAME'; payload: Game }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'REMOVE_PLAYER'; payload: string }
  | { type: 'START_GAME' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_GAME' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Game['settings']> }
  | { type: 'FINISH_GAME'; payload: FinalResults }
  | { type: 'SET_CONNECTION_STATUS'; payload: string }
  | { type: 'SET_PLAYER_ID'; payload: string };

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
  connectionStatus: 'disconnected',
  playerId: '',
};

function gameReducer(state: ExtendedGameState, action: GameAction): ExtendedGameState {
  switch (action.type) {
    case 'SET_GAME':
      return {
        ...state,
        currentGame: action.payload,
        error: null,
      };
    case 'ADD_PLAYER':
      if (!state.currentGame) return state;
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          players: [...state.currentGame.players, action.payload],
        },
      };
    case 'REMOVE_PLAYER':
      if (!state.currentGame) return state;
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          players: state.currentGame.players.filter(p => p.id !== action.payload),
        },
      };
    case 'START_GAME':
      if (!state.currentGame) return state;
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          status: 'playing',
        },
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'CLEAR_GAME':
      return {
        ...initialExtendedState,
        connectionStatus: state.connectionStatus,
        playerId: '',
      };
    case 'UPDATE_SETTINGS':
      if (!state.currentGame) return state;
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          settings: {
            ...state.currentGame.settings,
            ...action.payload,
          },
        },
      };
    case 'FINISH_GAME':
      if (!state.currentGame) return state;
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          status: 'finished' as const,
          finalResults: action.payload,
        },
      };
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
      };
    case 'SET_PLAYER_ID':
      return {
        ...state,
        playerId: action.payload,
      };
    default:
      return state;
  }
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
    if (typeof window === 'undefined') return undefined; // SSR guard
    
    // Check if we're in development (localhost or explicit dev env)
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');
    
    if (isDevelopment) {
      // Development: Direct connection to WebSocket server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = '8080';
      return `${protocol}//${host}:${port}`;
    } else {
      // Production: Use Nginx proxy path
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // includes port if any
      return `${protocol}//${host}/ws/`;
    }
  }, []);
  
  // Prevent multiple WebSocket connections
  const wsInitializedRef = useRef(false);
  
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('📩 Received WebSocket message:', message.type, message.payload);
    
    switch (message.type) {
      case 'GAME_CREATED':
      case 'GAME_JOINED':
      case 'RECONNECTED':
        dispatch({ type: 'SET_GAME', payload: message.payload.game });
        dispatch({ type: 'SET_PLAYER_ID', payload: message.payload.playerId });
        dispatch({ type: 'SET_LOADING', payload: false });
        break;
        
      case 'PLAYER_JOINED':
      case 'COMPUTER_PLAYERS_ADDED':
        dispatch({ type: 'SET_GAME', payload: message.payload.game });
        break;
        
      case 'SETTINGS_UPDATED':
        dispatch({ type: 'SET_GAME', payload: message.payload.game });
        break;
        
      case 'GAME_STARTED':
      case 'ROUND_STARTED':
        dispatch({ type: 'SET_GAME', payload: message.payload.game });
        break;
        
      case 'GAME_FINISHED':
        dispatch({ type: 'SET_GAME', payload: message.payload.game });
        break;
        
      case 'GUESS_MADE':
        // Confirmation that our guess was received and processed
        console.log('✅ Guess confirmed:', message.payload.guess);
        // The server will send updated game state via other messages
        break;
        
      case 'PLAYER_GUESSED':
        // A player has made a guess - update the game state to show it
        console.log('👤 Player guessed:', message.payload.playerName);
        if (message.payload.game) {
          dispatch({ type: 'SET_GAME', payload: message.payload.game });
        }
        break;
        
      case 'ROUND_RESULTS':
        dispatch({ type: 'SET_GAME', payload: message.payload.game });
        break;
        
      case 'PLAYER_LEFT':
      case 'PLAYER_DISCONNECTED':
        // Handle player leaving/disconnecting
        break;
        
      case 'ERROR':
        // Don't show error for "Round is already completed" - this is expected when auto-submit races with server timer
        if (message.payload.message !== 'Round is already completed') {
          dispatch({ type: 'SET_ERROR', payload: message.payload.message });
        }
        dispatch({ type: 'SET_LOADING', payload: false });
        break;
        
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }, [dispatch]);
  
  // Debug the WebSocket URL (only log once per URL change)
  useEffect(() => {
    console.log('🔍 WebSocket URL:', wsUrl);
    console.log('🔍 Window location:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  }, [wsUrl]);
  
  // Memoize callback functions to prevent re-renders

  const onDisconnect = useCallback(() => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    console.log('📱 WebSocket disconnected');
  }, [dispatch]);

  const onError = useCallback((error: Event) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
    dispatch({ type: 'SET_ERROR', payload: 'Connection error' });
    console.error('❌ WebSocket error:', error);
  }, [dispatch]);

  // Create a simple WebSocket connection without complex React hooks
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  
  const sendMessage = useCallback((type: string, payload?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.log('WebSocket not connected - queuing:', type, payload);
    }
  }, []);
  
  // Simple WebSocket connection management
  useEffect(() => {
    if (typeof window === 'undefined' || !wsUrl) return;
    
    console.log('🔍 Setting up WebSocket connection to:', wsUrl);
    
    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('🔗 WebSocket connected');
        setConnectionStatus('connected');
        setIsConnected(true);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setConnectionStatus('disconnected');
        setIsConnected(false);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
        setIsConnected(false);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
      };
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [wsUrl, handleWebSocketMessage, dispatch]);
  
  // TODO: Implement proper reconnection logic with server support
  // Handle reconnection logic separately to avoid circular dependencies
  // useEffect(() => {
  //   if (connectionStatus === 'connected' && state.playerId && state.currentGame && state.currentGame.id) {
  //     console.log('🔄 Attempting to reconnect to game:', state.currentGame.id, 'with player:', state.playerId);
  //     sendMessage('RECONNECT', { 
  //       gameId: state.currentGame.id, 
  //       playerId: state.playerId 
  //     });
  //   }
  // }, [connectionStatus, state.playerId, state.currentGame, sendMessage]);
  
  useEffect(() => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: connectionStatus });
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
    throw new Error('useGame must be used within a GameProvider');
  }
  
  if (!wsContext) {
    throw new Error('useGame must be used within a GameProvider with WebSocket context');
  }

  const { state, dispatch } = context;
  const { sendMessage, isConnected } = wsContext;

  const createGame = (playerName: string) => {
    if (!isConnected) {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
      return;
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    sendMessage('CREATE_GAME', { playerName });
  };

  const joinGame = (gameCode: string, playerName: string) => {
    if (!isConnected) {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
      return;
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    sendMessage('JOIN_GAME', { gameCode, playerName });
  };

  const addComputerPlayers = (count: number = 3) => {
    if (!isConnected) {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
      return;
    }
    
    sendMessage('ADD_COMPUTER_PLAYERS', { count });
  };

  const startGame = () => {
    if (!isConnected) {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
      return;
    }
    
    sendMessage('START_GAME');
  };

  const makeGuess = (lat: number, lng: number) => {
    if (!isConnected) {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
      return;
    }
    
    sendMessage('MAKE_GUESS', { lat, lng });
  };

  const nextRound = () => {
    if (!isConnected) {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
      return;
    }
    
    sendMessage('NEXT_ROUND');
  };

  const leaveGame = () => {
    if (!isConnected) return;
    
    sendMessage('LEAVE_GAME');
    dispatch({ type: 'CLEAR_GAME' });
  };

  const clearGame = () => {
    dispatch({ type: 'CLEAR_GAME' });
    dispatch({ type: 'SET_PLAYER_ID', payload: '' });
  };

  const updateSettings = (settings: Partial<Game['settings']>) => {
    if (!isConnected) {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
      return;
    }
    
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    sendMessage('UPDATE_SETTINGS', { settings });
  };

  const finishGame = (finalResults: FinalResults) => {
    dispatch({ type: 'FINISH_GAME', payload: finalResults });
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