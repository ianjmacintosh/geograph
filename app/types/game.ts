export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Player {
  id: string;
  name: string;
  isComputer: boolean;
  score: number;
  accuracy?: number;
}

export interface Guess {
  playerId: string;
  lat: number;
  lng: number;
  distance: number;
  points: number;
  timestamp: number;
}

export interface GameRound {
  id: string;
  city: City;
  guesses: Guess[];
  completed: boolean;
  startTime: number;
  endTime?: number;
}

export interface Game {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  currentRound?: GameRound;
  rounds: GameRound[];
  status: 'waiting' | 'playing' | 'finished';
  settings: {
    maxPlayers: number;
    roundTimeLimit: number;
    totalRounds: number;
    cityDifficulty: 'easy' | 'medium' | 'hard';
  };
  createdAt: number;
}

export interface GameState {
  currentGame: Game | null;
  isLoading: boolean;
  error: string | null;
}