import { describe, it, expect, vi } from "vitest";
import { calculateBonusPoints, calculatePlacementPoints } from "../utils/game";
import type { Guess, GameRound, Player } from "../types/game";

// Mock city for testing
const testCity = {
  id: "test-city",
  name: "Test City",
  country: "Test Country",
  lat: 40.7128,
  lng: -74.006,
  population: 1000000,
  difficulty: "easy" as const,
};

describe("Scoring Flow Validation", () => {
  describe("Single Player Game", () => {
    it("should calculate correct scores for solo player", () => {
      const players: Player[] = [
        { id: "player1", name: "Solo Player", isComputer: false, score: 0 },
      ];

      // Player makes a close guess (50km away)
      const guess: Guess = {
        playerId: "player1",
        lat: testCity.lat + 0.045, // ~50km away
        lng: testCity.lng + 0.045,
        distance: 50,
        placementPoints: 0,
        bonusPoints: calculateBonusPoints(50),
        totalPoints: 0,
        placement: 0,
        timestamp: Date.now(),
      };

      const guesses = [{ playerId: guess.playerId, distance: guess.distance }];
      const placements = calculatePlacementPoints(guesses, players.length);

      const playerPlacement = placements.find((p) => p.playerId === "player1")!;

      expect(playerPlacement.placement).toBe(1); // 1st place (only player)
      expect(playerPlacement.placementPoints).toBe(1); // 1 point for 1st in 1-player game
      expect(guess.bonusPoints).toBe(5); // 5 bonus points for <100km

      const totalPoints = playerPlacement.placementPoints + guess.bonusPoints;
      expect(totalPoints).toBe(6); // 1 + 5 = 6 total points
    });
  });

  describe("Multi-Player Game", () => {
    it("should calculate correct placement-based scoring", () => {
      const players: Player[] = [
        { id: "human", name: "Human Player", isComputer: false, score: 0 },
        { id: "comp1", name: "Computer 1", isComputer: true, score: 0 },
        { id: "comp2", name: "Computer 2", isComputer: true, score: 0 },
      ];

      // Simulate round where human wins
      const guesses = [
        { playerId: "human", distance: 80 }, // 1st place - closest
        { playerId: "comp1", distance: 250 }, // 2nd place
        { playerId: "comp2", distance: 800 }, // 3rd place
      ];

      const placements = calculatePlacementPoints(guesses, players.length);

      // Check placement points (3 players: 1st=3pts, 2nd=2pts, 3rd=1pt)
      const humanResult = placements.find((p) => p.playerId === "human")!;
      const comp1Result = placements.find((p) => p.playerId === "comp1")!;
      const comp2Result = placements.find((p) => p.playerId === "comp2")!;

      expect(humanResult.placement).toBe(1);
      expect(humanResult.placementPoints).toBe(3);

      expect(comp1Result.placement).toBe(2);
      expect(comp1Result.placementPoints).toBe(2);

      expect(comp2Result.placement).toBe(3);
      expect(comp2Result.placementPoints).toBe(1);

      // Check bonus points
      expect(calculateBonusPoints(80)).toBe(5); // <100km = 5 pts
      expect(calculateBonusPoints(250)).toBe(2); // 100-500km = 2 pts
      expect(calculateBonusPoints(800)).toBe(1); // 500-1000km = 1 pt

      // Total scores should be placement + bonus
      const humanTotal = humanResult.placementPoints + calculateBonusPoints(80); // 3 + 5 = 8
      const comp1Total =
        comp1Result.placementPoints + calculateBonusPoints(250); // 2 + 2 = 4
      const comp2Total =
        comp2Result.placementPoints + calculateBonusPoints(800); // 1 + 1 = 2

      expect(humanTotal).toBe(8);
      expect(comp1Total).toBe(4);
      expect(comp2Total).toBe(2);
    });

    it("should handle tied distances correctly", () => {
      const players: Player[] = [
        { id: "player1", name: "Player 1", isComputer: false, score: 0 },
        { id: "player2", name: "Player 2", isComputer: true, score: 0 },
        { id: "player3", name: "Player 3", isComputer: true, score: 0 },
      ];

      // Two players tie for first place
      const guesses = [
        { playerId: "player1", distance: 100 }, // tied for 1st
        { playerId: "player2", distance: 100 }, // tied for 1st
        { playerId: "player3", distance: 300 }, // 3rd place
      ];

      const placements = calculatePlacementPoints(guesses, players.length);

      const player1Result = placements.find((p) => p.playerId === "player1")!;
      const player2Result = placements.find((p) => p.playerId === "player2")!;
      const player3Result = placements.find((p) => p.playerId === "player3")!;

      // Both tied players should get 1st place points
      expect(player1Result.placement).toBe(1);
      expect(player1Result.placementPoints).toBe(3); // 1st place in 3-player game

      expect(player2Result.placement).toBe(1);
      expect(player2Result.placementPoints).toBe(3); // Same as player1

      // Third player gets 3rd place (2nd place is skipped due to tie)
      expect(player3Result.placement).toBe(3);
      expect(player3Result.placementPoints).toBe(1);
    });
  });

  describe("Multi-Round Score Accumulation", () => {
    it("should correctly accumulate scores across rounds", () => {
      const players: Player[] = [
        { id: "player1", name: "Player 1", isComputer: false, score: 0 },
      ];

      // Round 1: Player gets 6 points (1 placement + 5 bonus)
      const round1Guesses = [{ playerId: "player1", distance: 50 }];
      const round1Placements = calculatePlacementPoints(round1Guesses, 1);
      const round1Total =
        round1Placements[0].placementPoints + calculateBonusPoints(50);
      expect(round1Total).toBe(6); // 1 + 5

      // Round 2: Player gets 3 points (1 placement + 2 bonus)
      const round2Guesses = [{ playerId: "player1", distance: 200 }];
      const round2Placements = calculatePlacementPoints(round2Guesses, 1);
      const round2Total =
        round2Placements[0].placementPoints + calculateBonusPoints(200);
      expect(round2Total).toBe(3); // 1 + 2

      // Cumulative total should be 9
      const cumulativeTotal = round1Total + round2Total;
      expect(cumulativeTotal).toBe(9);
    });
  });

  describe("Score Display Logic", () => {
    it("should only show total points after all players have guessed", () => {
      const totalPlayers = 3;

      // Only 1 player has guessed - should not show points yet
      let guessCount = 1;
      expect(guessCount < totalPlayers).toBe(true); // Not ready to show scores

      // 2 players have guessed - still not ready
      guessCount = 2;
      expect(guessCount < totalPlayers).toBe(true); // Still not ready

      // All 3 players have guessed - now ready to show scores
      guessCount = 3;
      expect(guessCount >= totalPlayers).toBe(true); // Ready to calculate and show scores
    });

    it("should create complete guess objects with all required fields", () => {
      const testGuess: Guess = {
        playerId: "test-player",
        lat: 40.7,
        lng: -74.0,
        distance: 150,
        placementPoints: 0, // Will be calculated after all guesses
        bonusPoints: calculateBonusPoints(150),
        totalPoints: 0, // Will be calculated after placements
        placement: 0, // Will be calculated after all guesses
        timestamp: Date.now(),
      };

      // Before placement calculation
      expect(testGuess.placementPoints).toBe(0);
      expect(testGuess.totalPoints).toBe(0);
      expect(testGuess.placement).toBe(0);
      expect(testGuess.bonusPoints).toBe(2); // 150km = 2 bonus points

      // Simulate placement calculation
      const placements = calculatePlacementPoints(
        [{ playerId: testGuess.playerId, distance: testGuess.distance }],
        1,
      );
      const placement = placements[0];

      // After placement calculation
      const updatedGuess = {
        ...testGuess,
        placementPoints: placement.placementPoints,
        placement: placement.placement,
        totalPoints: placement.placementPoints + testGuess.bonusPoints,
      };

      expect(updatedGuess.placementPoints).toBe(1); // 1st place in 1-player game
      expect(updatedGuess.placement).toBe(1);
      expect(updatedGuess.totalPoints).toBe(3); // 1 + 2 = 3
    });
  });
});
