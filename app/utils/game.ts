import type { Game, Player, City } from "../types/game";

export function generateGameCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function isValidGameCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateBonusPoints(distance: number): number {
  if (distance <= 100) return 5;
  if (distance <= 500) return 2;
  if (distance <= 1000) return 1;
  return 0;
}

export function calculatePlacementPoints(
  guesses: Array<{ playerId: string; distance: number }>,
  totalPlayers: number,
): Array<{ playerId: string; placementPoints: number; placement: number }> {
  // Sort by distance (closest first)
  const sortedGuesses = [...guesses].sort((a, b) => a.distance - b.distance);

  const results: Array<{
    playerId: string;
    placementPoints: number;
    placement: number;
  }> = [];
  let currentPlacement = 1;

  for (let i = 0; i < sortedGuesses.length; i++) {
    const guess = sortedGuesses[i];

    // Handle ties - if this distance equals the previous distance, use same placement
    if (i > 0 && guess.distance === sortedGuesses[i - 1].distance) {
      // Same placement as previous
      const prevResult = results[results.length - 1];
      results.push({
        playerId: guess.playerId,
        placementPoints: prevResult.placementPoints,
        placement: prevResult.placement,
      });
    } else {
      // New placement
      currentPlacement = i + 1;
      const placementPoints = Math.max(0, totalPlayers - currentPlacement + 1);
      results.push({
        playerId: guess.playerId,
        placementPoints,
        placement: currentPlacement,
      });
    }
  }

  return results;
}

export function generateComputerGuess(
  city: City,
  accuracy: number,
): { lat: number; lng: number } {
  // Make computer players much less accurate and more realistic
  const difficultyMultipliers = {
    easy: 0.8, // 80% accuracy for well-known cities
    medium: 0.5, // 50% accuracy for medium cities
    hard: 0.2, // 20% accuracy for obscure cities
    brazilian_capitals: 0.4, // 40% accuracy for Brazilian state capitals
    us_capitals: 0.4, // 40% accuracy for US state capitals
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
    lng: guessLng,
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
    accuracy: 0.3 + Math.random() * 0.6, // Random accuracy between 30-90%
  };
}

export function createHumanPlayer(name: string): Player {
  return {
    id: generateId(),
    name,
    isComputer: false,
    score: 0,
  };
}

export function calculateFinalPlacements(
  playerScores: Array<{
    playerId: string;
    playerName: string;
    isComputer: boolean;
    totalScore: number;
    finalPlacement: number;
  }>,
): Array<{
  playerId: string;
  playerName: string;
  isComputer: boolean;
  totalScore: number;
  finalPlacement: number;
}> {
  // Sort by score (highest first)
  const sortedScores = [...playerScores].sort(
    (a, b) => b.totalScore - a.totalScore,
  );

  let currentPlacement = 1;

  for (let i = 0; i < sortedScores.length; i++) {
    const player = sortedScores[i];

    // Handle ties - if this score equals the previous score, use same placement
    if (i > 0 && player.totalScore === sortedScores[i - 1].totalScore) {
      // Same placement as previous
      const prevPlayer = sortedScores[i - 1];
      player.finalPlacement = prevPlayer.finalPlacement;
    } else {
      // New placement
      currentPlacement = i + 1;
      player.finalPlacement = currentPlacement;
    }
  }

  return sortedScores;
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
    status: "waiting",
    settings: {
      maxPlayers: 8,
      roundTimeLimit: 30000,
      totalRounds: 5,
      cityDifficulty: "easy",
    },
    createdAt: Date.now(),
  };
}
