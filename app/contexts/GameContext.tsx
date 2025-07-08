import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, type ReactNode } from 'react';
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
      const port = '8088';
      return `${protocol}//${host}:${port}`;
    } else {
      // Production: Use Nginx proxy path
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // includes port if any
      return `${protocol}//${host}/ws/`;
    }
  }, []);
  
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
        break;
        
      case 'PLAYER_GUESSED':
        // Update UI to show that a player has guessed
        // The actual game state will be updated when round results are revealed
        break;
        
      case 'ROUND_RESULTS':
        dispatch({ type: 'SET_GAME', payload: message.payload.game });
        break;
        
      case 'PLAYER_LEFT':
      case 'PLAYER_DISCONNECTED':
        // Handle player leaving/disconnecting
        break;
        
      case 'ERROR':
        dispatch({ type: 'SET_ERROR', payload: message.payload.message });
        dispatch({ type: 'SET_LOADING', payload: false });
        break;
        
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }, [dispatch]);
  
  // Debug the WebSocket URL
  console.log('🔍 WebSocket URL:', wsUrl);
  
  // Memoize callback functions to prevent re-renders
  const onConnect = useCallback(() => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
    console.log('🔗 WebSocket connected to:', wsUrl);
  }, [wsUrl, dispatch]);

  const onDisconnect = useCallback(() => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    console.log('📱 WebSocket disconnected from:', wsUrl);
  }, [wsUrl, dispatch]);

  const onError = useCallback((error: Event) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
    dispatch({ type: 'SET_ERROR', payload: 'Connection error' });
    console.error('❌ WebSocket error:', error, 'URL was:', wsUrl);
    console.error('❌ WebSocket error details:', {
      error,
      url: wsUrl,
      readyState: (error.target as WebSocket)?.readyState,
      timestamp: new Date().toISOString()
    });
  }, [wsUrl, dispatch]);

  const {
    connectionStatus,
    sendMessage,
    isConnected
  } = useWebSocket({
    url: wsUrl,
    onMessage: handleWebSocketMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect: false, // Keep disabled until we verify it works
    reconnectAttempts: 0,
    reconnectDelay: 3000
  });
  
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
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
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