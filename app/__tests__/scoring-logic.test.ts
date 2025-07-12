import { describe, it, expect } from "vitest";
import { calculatePlacementPoints, calculateBonusPoints } from "../utils/game";

describe("Scoring Logic", () => {
  it("should calculate placement points correctly", () => {
    const guesses = [
      { playerId: "player1", distance: 50 }, // 1st place
      { playerId: "player2", distance: 150 }, // 2nd place
      { playerId: "player3", distance: 300 }, // 3rd place
    ];

    const results = calculatePlacementPoints(guesses, 3);

    expect(results).toEqual([
      { playerId: "player1", placementPoints: 3, placement: 1 },
      { playerId: "player2", placementPoints: 2, placement: 2 },
      { playerId: "player3", placementPoints: 1, placement: 3 },
    ]);
  });

  it("should calculate bonus points correctly", () => {
    expect(calculateBonusPoints(50)).toBe(5); // Within 100km
    expect(calculateBonusPoints(100)).toBe(5); // Exactly 100km
    expect(calculateBonusPoints(150)).toBe(2); // Within 500km
    expect(calculateBonusPoints(500)).toBe(2); // Exactly 500km
    expect(calculateBonusPoints(800)).toBe(1); // Within 1000km
    expect(calculateBonusPoints(1000)).toBe(1); // Exactly 1000km
    expect(calculateBonusPoints(1500)).toBe(0); // Over 1000km
  });

  it("should handle tie scenarios correctly", () => {
    const guesses = [
      { playerId: "player1", distance: 100 },
      { playerId: "player2", distance: 100 }, // Same distance as player1
      { playerId: "player3", distance: 200 },
    ];

    const results = calculatePlacementPoints(guesses, 3);

    // Both players with distance 100 should get 1st place points
    expect(results).toEqual([
      { playerId: "player1", placementPoints: 3, placement: 1 },
      { playerId: "player2", placementPoints: 3, placement: 1 },
      { playerId: "player3", placementPoints: 1, placement: 3 },
    ]);
  });

  it("should calculate total points correctly", () => {
    // Player with 50km distance in 3-player game
    const distance = 50;
    const placementPoints = 3; // 1st place
    const bonusPoints = calculateBonusPoints(distance);
    const totalPoints = placementPoints + bonusPoints;

    expect(bonusPoints).toBe(5);
    expect(totalPoints).toBe(8);
  });

  it("should handle empty guesses array", () => {
    const results = calculatePlacementPoints([], 3);
    expect(results).toEqual([]);
  });

  it("should handle single player", () => {
    const guesses = [{ playerId: "player1", distance: 100 }];
    const results = calculatePlacementPoints(guesses, 1);

    expect(results).toEqual([
      { playerId: "player1", placementPoints: 1, placement: 1 },
    ]);
  });
});
