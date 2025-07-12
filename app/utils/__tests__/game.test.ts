import { describe, it, expect } from "vitest";
import {
  calculateBonusPoints,
  calculatePlacementPoints,
  calculateDistance,
  calculateFinalPlacements,
} from "../game";

describe("Scoring System", () => {
  describe("calculateBonusPoints", () => {
    it("should give 5 points for distance <= 100km", () => {
      expect(calculateBonusPoints(50)).toBe(5);
      expect(calculateBonusPoints(100)).toBe(5);
    });

    it("should give 2 points for distance <= 500km", () => {
      expect(calculateBonusPoints(250)).toBe(2);
      expect(calculateBonusPoints(500)).toBe(2);
    });

    it("should give 1 point for distance <= 1000km", () => {
      expect(calculateBonusPoints(750)).toBe(1);
      expect(calculateBonusPoints(1000)).toBe(1);
    });

    it("should give 0 points for distance > 1000km", () => {
      expect(calculateBonusPoints(1500)).toBe(0);
      expect(calculateBonusPoints(5000)).toBe(0);
    });
  });

  describe("calculatePlacementPoints", () => {
    it("should calculate placement points correctly for 4 players", () => {
      const guesses = [
        { playerId: "player1", distance: 100 }, // 2nd place
        { playerId: "player2", distance: 50 }, // 1st place
        { playerId: "player3", distance: 200 }, // 3rd place
        { playerId: "player4", distance: 300 }, // 4th place
      ];

      const results = calculatePlacementPoints(guesses, 4);

      // Should be sorted by placement
      expect(results).toHaveLength(4);

      // 1st place (closest) gets 4 points
      const firstPlace = results.find((r) => r.playerId === "player2");
      expect(firstPlace?.placementPoints).toBe(4);
      expect(firstPlace?.placement).toBe(1);

      // 2nd place gets 3 points
      const secondPlace = results.find((r) => r.playerId === "player1");
      expect(secondPlace?.placementPoints).toBe(3);
      expect(secondPlace?.placement).toBe(2);

      // 3rd place gets 2 points
      const thirdPlace = results.find((r) => r.playerId === "player3");
      expect(thirdPlace?.placementPoints).toBe(2);
      expect(thirdPlace?.placement).toBe(3);

      // 4th place gets 1 point
      const fourthPlace = results.find((r) => r.playerId === "player4");
      expect(fourthPlace?.placementPoints).toBe(1);
      expect(fourthPlace?.placement).toBe(4);
    });

    it("should handle ties correctly", () => {
      const guesses = [
        { playerId: "player1", distance: 100 }, // tied for 1st
        { playerId: "player2", distance: 100 }, // tied for 1st
        { playerId: "player3", distance: 200 }, // 3rd place
      ];

      const results = calculatePlacementPoints(guesses, 3);

      // Both tied players should get 1st place points
      const player1 = results.find((r) => r.playerId === "player1");
      const player2 = results.find((r) => r.playerId === "player2");
      const player3 = results.find((r) => r.playerId === "player3");

      expect(player1?.placementPoints).toBe(3); // 1st place in 3-player game
      expect(player1?.placement).toBe(1);
      expect(player2?.placementPoints).toBe(3); // Same as player1
      expect(player2?.placement).toBe(1);
      expect(player3?.placementPoints).toBe(1); // 3rd place (2nd is skipped)
      expect(player3?.placement).toBe(3);
    });
  });

  describe("calculateDistance", () => {
    it("should calculate distance between two points correctly", () => {
      // Distance between London and Paris (approximately 344 km)
      const london = { lat: 51.5074, lng: -0.1278 };
      const paris = { lat: 48.8566, lng: 2.3522 };

      const distance = calculateDistance(
        london.lat,
        london.lng,
        paris.lat,
        paris.lng,
      );

      // Should be approximately 344 km (allowing 10km tolerance)
      expect(distance).toBeCloseTo(344, -1);
    });

    it("should return 0 for identical coordinates", () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBe(0);
    });
  });

  describe("calculateFinalPlacements", () => {
    it("should handle final placement ties correctly", () => {
      const playerScores = [
        {
          playerId: "player1",
          playerName: "Alice",
          isComputer: false,
          totalScore: 100,
          finalPlacement: 0,
        },
        {
          playerId: "player2",
          playerName: "Bob",
          isComputer: false,
          totalScore: 100,
          finalPlacement: 0,
        }, // tied for 1st
        {
          playerId: "player3",
          playerName: "Charlie",
          isComputer: false,
          totalScore: 80,
          finalPlacement: 0,
        },
      ];

      const results = calculateFinalPlacements(playerScores);

      // Both tied players should get 1st place
      expect(results[0].finalPlacement).toBe(1);
      expect(results[1].finalPlacement).toBe(1);
      expect(results[2].finalPlacement).toBe(3); // 3rd place (2nd is skipped due to tie)

      // Results should be sorted by score
      expect(results[0].totalScore).toBe(100);
      expect(results[1].totalScore).toBe(100);
      expect(results[2].totalScore).toBe(80);
    });

    it("should handle three-way tie for first place", () => {
      const playerScores = [
        {
          playerId: "player1",
          playerName: "Alice",
          isComputer: false,
          totalScore: 100,
          finalPlacement: 0,
        },
        {
          playerId: "player2",
          playerName: "Bob",
          isComputer: false,
          totalScore: 100,
          finalPlacement: 0,
        },
        {
          playerId: "player3",
          playerName: "Charlie",
          isComputer: false,
          totalScore: 100,
          finalPlacement: 0,
        },
        {
          playerId: "player4",
          playerName: "David",
          isComputer: false,
          totalScore: 50,
          finalPlacement: 0,
        },
      ];

      const results = calculateFinalPlacements(playerScores);

      // All three tied players should get 1st place
      expect(results[0].finalPlacement).toBe(1);
      expect(results[1].finalPlacement).toBe(1);
      expect(results[2].finalPlacement).toBe(1);
      expect(results[3].finalPlacement).toBe(4); // 4th place (2nd and 3rd are skipped)
    });

    it("should handle tie for second place", () => {
      const playerScores = [
        {
          playerId: "player1",
          playerName: "Alice",
          isComputer: false,
          totalScore: 100,
          finalPlacement: 0,
        },
        {
          playerId: "player2",
          playerName: "Bob",
          isComputer: false,
          totalScore: 80,
          finalPlacement: 0,
        },
        {
          playerId: "player3",
          playerName: "Charlie",
          isComputer: false,
          totalScore: 80,
          finalPlacement: 0,
        }, // tied for 2nd
        {
          playerId: "player4",
          playerName: "David",
          isComputer: false,
          totalScore: 50,
          finalPlacement: 0,
        },
      ];

      const results = calculateFinalPlacements(playerScores);

      expect(results[0].finalPlacement).toBe(1); // 1st place
      expect(results[1].finalPlacement).toBe(2); // tied for 2nd
      expect(results[2].finalPlacement).toBe(2); // tied for 2nd
      expect(results[3].finalPlacement).toBe(4); // 4th place (3rd is skipped)
    });
  });
});
