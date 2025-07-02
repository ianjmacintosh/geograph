import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Game, GameState, Player } from '../types/game';
import { createComputerPlayer } from '../utils/game';

type GameAction =
  | { type: 'SET_GAME'; payload: Game }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'REMOVE_PLAYER'; payload: string }
  | { type: 'START_GAME' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_GAME' };

const initialState: GameState = {
  currentGame: null,
  isLoading: false,
  error: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
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
      return initialState;
    default:
      return state;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }

  const { state, dispatch } = context;

  const createGame = (game: Game) => {
    dispatch({ type: 'SET_GAME', payload: game });
  };

  const joinGame = (gameCode: string, playerName: string) => {
    // TODO: Implement actual game joining logic
    // For now, simulate joining a game
    dispatch({ type: 'SET_LOADING', payload: true });
    
    setTimeout(() => {
      // Simulate finding/creating a game
      const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
      const hostId = generateId();
      const mockGame: Game = {
        id: generateId(),
        code: gameCode,
        hostId: hostId,
        players: [
          { id: hostId, name: 'Host Player', isComputer: false, score: 0 },
          { id: generateId(), name: playerName, isComputer: false, score: 0 },
        ],
        rounds: [],
        status: 'waiting',
        settings: {
          maxPlayers: 8,
          roundTimeLimit: 30000,
          totalRounds: 5,
        },
        createdAt: Date.now(),
      };
      
      dispatch({ type: 'SET_GAME', payload: mockGame });
      dispatch({ type: 'SET_LOADING', payload: false });
    }, 1000);
  };

  const addComputerPlayers = (count: number = 3) => {
    if (!state.currentGame) return;
    
    const computerNames = ['Alex', 'Sam', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Sage'];
    
    // Get all currently used names
    const usedNames = state.currentGame.players.map(p => p.name);
    
    // Filter out already used names
    const availableNames = computerNames.filter(name => !usedNames.includes(name));
    
    // Limit count to available names
    const actualCount = Math.min(count, availableNames.length);
    
    // Create players with unique names
    const newPlayers: Player[] = [];
    for (let i = 0; i < actualCount; i++) {
      const name = availableNames[i]; // Take names in order to ensure uniqueness
      const computerPlayer = createComputerPlayer(name);
      newPlayers.push(computerPlayer);
    }
    
    // Add all players at once
    newPlayers.forEach(player => {
      dispatch({ type: 'ADD_PLAYER', payload: player });
    });
  };

  const startGame = () => {
    if (state.currentGame && state.currentGame.players.length >= 2) {
      dispatch({ type: 'START_GAME' });
    }
  };

  const clearGame = () => {
    dispatch({ type: 'CLEAR_GAME' });
  };

  return {
    ...state,
    createGame,
    joinGame,
    addComputerPlayers,
    startGame,
    clearGame,
  };
}