import { describe, it, expect } from "vitest";
import { calculateBonusPoints, calculatePlacementPoints } from "../utils/game";
import type { Player, Guess } from "../types/game";

// Helper functions to reduce complexity
function createTestPlayers(): Player[] {
  return [
    { id: "human", name: "Human", isComputer: false, score: 0 },
    { id: "comp1", name: "Computer 1", isComputer: true, score: 0 },
    { id: "comp2", name: "Computer 2", isComputer: true, score: 0 },
  ];
}

function createTestGuess(playerId: string, distance: number): Guess {
  return {
    playerId,
    lat: 40.0,
    lng: -74.0,
    distance,
    placementPoints: 0,
    bonusPoints: calculateBonusPoints(distance),
    totalPoints: 0,
    placement: 0,
    timestamp: Date.now(),
  };
}

function createIncompleteGuessSet(players: Player[]): Guess[] {
  // Only first two players have guessed
  return [
    createTestGuess(players[0].id, 100),
    createTestGuess(players[1].id, 150),
  ];
}

function createCompleteGuessSet(players: Player[]): Guess[] {
  return [
    createTestGuess(players[0].id, 100),
    createTestGuess(players[1].id, 150),
    createTestGuess(players[2].id, 200),
  ];
}

function simulateStateUpdate(guesses: Guess[], totalPlayers: number) {
  if (guesses.length === totalPlayers) {
    const placements = calculatePlacementPoints(
      guesses.map(g => ({ playerId: g.playerId, distance: g.distance })),
      totalPlayers
    );
    
    // Update guesses with placement points
    guesses.forEach(guess => {
      const placement = placements.find(p => p.playerId === guess.playerId);
      if (placement) {
        guess.placementPoints = placement.placementPoints;
        guess.totalPoints = guess.bonusPoints + guess.placementPoints;
      }
    });
  }
  return guesses;
}

// Test the state management logic that was causing flickering
describe("Game State Management - Score Calculation Timing", () => {
  it("should not calculate placement points until ALL players have guessed", () => {
    const players = createTestPlayers();
    const totalPlayers = players.length;
    
    const incompleteGuesses = createIncompleteGuessSet(players);
    const updatedIncomplete = simulateStateUpdate(incompleteGuesses, totalPlayers);
    
    // Should not have placement points yet
    expect(updatedIncomplete.every(g => g.placementPoints === 0)).toBe(true);
    expect(updatedIncomplete.every(g => g.totalPoints === 0)).toBe(true);
  });

  it("should calculate placement points when all players have guessed", () => {
    const players = createTestPlayers();
    const totalPlayers = players.length;
    
    const completeGuesses = createCompleteGuessSet(players);
    const updatedComplete = simulateStateUpdate(completeGuesses, totalPlayers);
    
    // Should now have placement points
    expect(updatedComplete.every(g => g.placementPoints > 0)).toBe(true);
    expect(updatedComplete.every(g => g.totalPoints > 0)).toBe(true);
  });

  it("should maintain score visibility during intermediate states", () => {
    const players = createTestPlayers();
    const incompleteGuesses = createIncompleteGuessSet(players);
    
    // Even without placement points, should show bonus points
    incompleteGuesses.forEach(guess => {
      const shouldShowScore = guess.bonusPoints > 0 || guess.placementPoints > 0;
      expect(shouldShowScore).toBe(true);
    });
  });
});

describe("Game State Management - Score Visibility Logic", () => {
  it("should show scores based on bonus points when placement not calculated", () => {
    const guess = createTestGuess("player1", 50);
    
    // Should be visible due to bonus points
    const isVisible = guess.bonusPoints > 0 || guess.totalPoints > 0;
    expect(isVisible).toBe(true);
  });

  it("should handle zero bonus points correctly", () => {
    const farGuess = createTestGuess("player1", 2000);
    
    expect(farGuess.bonusPoints).toBe(0);
    
    // Should still be trackable even with 0 bonus
    const canTrack = farGuess.playerId && farGuess.distance >= 0;
    expect(canTrack).toBe(true);
  });

  it("should validate placement point distribution", () => {
    const players = createTestPlayers();
    const guesses = createCompleteGuessSet(players);
    const updated = simulateStateUpdate(guesses, players.length);
    
    // Check placement points are distributed correctly
    const totalPlacementPoints = updated.reduce((sum, g) => sum + g.placementPoints, 0);
    const expectedTotal = (players.length * (players.length + 1)) / 2; // Sum of 1+2+3...n
    expect(totalPlacementPoints).toBe(expectedTotal);
  });
});

describe("Game State Management - Edge Cases", () => {
  it("should handle single player scenario", () => {
    const singlePlayer = [createTestPlayers()[0]];
    const singleGuess = [createTestGuess(singlePlayer[0].id, 100)];
    const updated = simulateStateUpdate(singleGuess, 1);
    
    expect(updated[0].placementPoints).toBe(1);
    expect(updated[0].totalPoints).toBeGreaterThan(0);
  });

  it("should handle tied distances", () => {
    const players = createTestPlayers();
    const tiedGuesses = [
      createTestGuess(players[0].id, 100),
      createTestGuess(players[1].id, 100),
      createTestGuess(players[2].id, 200),
    ];
    
    const updated = simulateStateUpdate(tiedGuesses, players.length);
    
    // First two should have same placement points
    expect(updated[0].placementPoints).toBe(updated[1].placementPoints);
    expect(updated[2].placementPoints).toBeLessThan(updated[0].placementPoints);
  });
});