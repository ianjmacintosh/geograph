import { describe, it, expect } from "vitest";
import {
  calculatePlacementPoints,
  calculateFinalPlacements,
} from "../utils/game";

// Helper functions to reduce complexity
function createTieTestScenario(distances: number[]) {
  return distances.map((distance, index) => ({
    playerId: `player${index + 1}`,
    distance,
  }));
}

function demonstrateTieScenario(title: string, guesses: Array<{playerId: string, distance: number}>) {
  console.log(`\n${title}`);
  const placements = calculatePlacementPoints(guesses, guesses.length);
  placements.forEach(p => {
    console.log(`${p.playerId}: ${p.distance}km → ${p.placementPoints} pts (${p.placement}${getOrdinalSuffix(p.placement)})`);
  });
  return placements;
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j == 1 && k != 11) return "st";
  if (j == 2 && k != 12) return "nd";
  if (j == 3 && k != 13) return "rd";
  return "th";
}

function calculateFinalScoresForDemo(playerScores: Array<{playerId: string, totalScore: number}>) {
  const finalPlacements = calculateFinalPlacements(playerScores);
  console.log("\n🏆 FINAL STANDINGS:");
  finalPlacements.forEach(player => {
    const medal = player.finalPlacement === 1 ? "🥇" : 
                  player.finalPlacement === 2 ? "🥈" : 
                  player.finalPlacement === 3 ? "🥉" : "🏃";
    console.log(`${medal} ${player.finalPlacement}${getOrdinalSuffix(player.finalPlacement)}: ${player.playerName} (${player.totalScore} points)`);
  });
  return finalPlacements;
}

describe("🎮 Visual Tie Handling - Round Level", () => {
  it("should demonstrate round-level tie handling", () => {
    console.log("\n" + "=".repeat(60));
    console.log("🎮 GEOGRAPH TIE HANDLING DEMONSTRATION");
    console.log("=".repeat(60));

    const roundTieGuesses = createTieTestScenario([50, 50, 150]);
    const roundPlacements = demonstrateTieScenario("📍 ROUND 1: Tied distances", roundTieGuesses);
    
    expect(roundPlacements[0].placementPoints).toBe(roundPlacements[1].placementPoints);
    expect(roundPlacements[2].placementPoints).toBeLessThan(roundPlacements[0].placementPoints);
  });

  it("should handle perfect ties", () => {
    const perfectTieGuesses = createTieTestScenario([100, 100, 100]);
    const placements = demonstrateTieScenario("📍 PERFECT TIE: All same distance", perfectTieGuesses);
    
    // All should get same points
    expect(placements[0].placementPoints).toBe(placements[1].placementPoints);
    expect(placements[1].placementPoints).toBe(placements[2].placementPoints);
  });
});

describe("🎮 Visual Tie Handling - Final Game", () => {
  it("should demonstrate final game tie handling", () => {
    const playerScores = [
      { playerId: "player1", playerName: "Alice", isComputer: false, totalScore: 15 },
      { playerId: "player2", playerName: "Bob", isComputer: false, totalScore: 15 },
      { playerId: "player3", playerName: "Computer1", isComputer: true, totalScore: 12 },
    ];

    const finalResults = calculateFinalScoresForDemo(playerScores);
    
    // Both Alice and Bob should tie for first
    expect(finalResults[0].finalPlacement).toBe(1);
    expect(finalResults[1].finalPlacement).toBe(1);
    expect(finalResults[2].finalPlacement).toBe(3); // Computer gets 3rd (skipping 2nd)
  });

  it("should handle complex tie scenarios", () => {
    const complexTieScores = [
      { playerId: "player1", playerName: "Player1", isComputer: false, totalScore: 20 },
      { playerId: "player2", playerName: "Player2", isComputer: false, totalScore: 15 },
      { playerId: "player3", playerName: "Player3", isComputer: false, totalScore: 15 },
      { playerId: "player4", playerName: "Player4", isComputer: false, totalScore: 10 },
    ];

    const results = calculateFinalPlacements(complexTieScores);
    
    expect(results[0].finalPlacement).toBe(1); // 20 points - 1st
    expect(results[1].finalPlacement).toBe(2); // 15 points - tied 2nd
    expect(results[2].finalPlacement).toBe(2); // 15 points - tied 2nd  
    expect(results[3].finalPlacement).toBe(4); // 10 points - 4th (skipping 3rd)
  });
});

describe("🎮 Visual Tie Handling - Edge Cases", () => {
  it("should handle single player scenario", () => {
    const singlePlayer = createTieTestScenario([100]);
    const placements = calculatePlacementPoints(singlePlayer, 1);
    
    expect(placements[0].placement).toBe(1);
    expect(placements[0].placementPoints).toBe(1);
  });

  it("should handle zero distance ties", () => {
    const perfectGuesses = createTieTestScenario([0, 0]);
    const placements = calculatePlacementPoints(perfectGuesses, 2);
    
    // Both should get max points for tie
    expect(placements[0].placementPoints).toBe(placements[1].placementPoints);
  });
});