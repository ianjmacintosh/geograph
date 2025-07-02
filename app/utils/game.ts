import type { Game, Player, City, Guess } from '../types/game';

export function generateGameCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isValidGameCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculatePoints(distance: number, maxDistance: number = 20000): number {
  if (distance === 0) return 1000;
  if (distance >= maxDistance) return 0;
  
  // Exponential decay scoring
  const score = Math.max(0, Math.round(1000 * Math.exp(-distance / (maxDistance / 4))));
  return score;
}

export function generateComputerGuess(city: City, accuracy: number): { lat: number; lng: number } {
  // Make computer players much less accurate and more realistic
  const difficultyMultipliers = {
    'easy': 0.8,    // 80% accuracy for well-known cities
    'medium': 0.5,  // 50% accuracy for medium cities  
    'hard': 0.2     // 20% accuracy for obscure cities
  };
  
  const difficultyMultiplier = difficultyMultipliers[city.difficulty];
  const effectiveAccuracy = accuracy * difficultyMultiplier;
  
  // Much larger potential errors - up to 30 degrees off for worst accuracy
  const maxOffsetDegrees = (1 - effectiveAccuracy) * 30;
  
  // Add base randomness even for high accuracy
  const baseRandomness = 2 + Math.random() * 8; // 2-10 degrees base error
  const totalMaxOffset = maxOffsetDegrees + baseRandomness;
  
  const latOffset = (Math.random() - 0.5) * 2 * totalMaxOffset;
  const lngOffset = (Math.random() - 0.5) * 2 * totalMaxOffset;
  
  // Clamp to valid lat/lng ranges
  const guessLat = Math.max(-90, Math.min(90, city.lat + latOffset));
  const guessLng = Math.max(-180, Math.min(180, city.lng + lngOffset));
  
  return {
    lat: guessLat,
    lng: guessLng
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function createComputerPlayer(name: string): Player {
  return {
    id: generateId(),
    name,
    isComputer: true,
    score: 0,
    accuracy: 0.3 + Math.random() * 0.6 // Random accuracy between 30-90%
  };
}

export function createHumanPlayer(name: string): Player {
  return {
    id: generateId(),
    name,
    isComputer: false,
    score: 0
  };
}

export function createNewGame(hostName: string): Game {
  const code = generateGameCode();
  const hostPlayer = createHumanPlayer(hostName);
  
  return {
    id: generateId(),
    code,
    hostId: hostPlayer.id,
    players: [hostPlayer],
    rounds: [],
    status: 'waiting',
    settings: {
      maxPlayers: 8,
      roundTimeLimit: 30000, // 30 seconds
      totalRounds: 5
    },
    createdAt: Date.now()
  };
}