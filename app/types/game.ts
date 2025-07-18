export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
  difficulty:
    | "easy"
    | "medium"
    | "hard"
    | "brazilian_capitals"
    | "us_capitals"
    | "us_states";
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
  placementPoints: number;
  bonusPoints: number;
  totalPoints: number;
  placement: number;
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

export interface FinalResults {
  playerScores: Array<{
    playerId: string;
    playerName: string;
    isComputer: boolean;
    totalScore: number;
    finalPlacement: number;
  }>;
  winnerId: string; // If tie, this is the first winner ID
  winnerIds: string[]; // All players who tied for first place
  gameEndTime: number;
}

export interface Game {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  currentRound?: GameRound;
  rounds: GameRound[];
  status: "waiting" | "playing" | "finished";
  settings: {
    maxPlayers: number;
    roundTimeLimit: number;
    totalRounds: number;
    cityDifficulty:
      | "easy"
      | "medium"
      | "hard"
      | "brazilian_capitals"
      | "us_capitals"
      | "us_states";
  };
  finalResults?: FinalResults;
  createdAt: number;
}

export interface GameState {
  currentGame: Game | null;
  isLoading: boolean;
  error: string | null;
}
