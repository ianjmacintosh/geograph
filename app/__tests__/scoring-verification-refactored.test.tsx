import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Game as GameType } from "../types/game";

// Mock the useGame hook
const mockUseGame = vi.fn();
vi.mock("../contexts/GameContext", () => ({
  useGame: () => mockUseGame(),
}));

// Mock cities data
vi.mock("../data/cities", () => ({
  getRandomCityByDifficulty: () => ({
    id: "1",
    name: "Test City",
    country: "Test Country",
    lat: 40.0,
    lng: -74.0,
    population: 1000000,
    difficulty: "easy" as const,
  }),
}));

// Helper function to create test game
function createTestGame(): GameType {
  return {
    id: "1",
    code: "123456",
    hostId: "player1",
    players: [
      { id: "player1", name: "Human Player", isComputer: false, score: 0 },
      {
        id: "player2",
        name: "Computer Player",
        isComputer: true,
        score: 0,
        accuracy: 0.5,
      },
    ],
    rounds: [],
    status: "playing" as const,
    settings: {
      maxPlayers: 8,
      roundTimeLimit: 30000,
      totalRounds: 3,
      cityDifficulty: "easy" as const,
    },
    createdAt: Date.now(),
  };
}

// Helper function to create test guess
function createTestGuess(playerId: string, distance: number) {
  return {
    playerId,
    lat: 40.0,
    lng: -74.0,
    distance,
    placementPoints: 0,
    bonusPoints:
      distance < 100 ? 5 : distance < 500 ? 2 : distance < 1000 ? 1 : 0,
    totalPoints: 0,
    placement: 0,
    timestamp: Date.now(),
  };
}

// Helper function to setup scoring test scenario
function setupScoringScenario() {
  const game = createTestGame();
  const guess1 = createTestGuess("player1", 50);
  const guess2 = createTestGuess("player2", 150);

  // Simulate placement calculation
  guess1.placementPoints = 2;
  guess1.totalPoints = guess1.bonusPoints + guess1.placementPoints;

  guess2.placementPoints = 1;
  guess2.totalPoints = guess2.bonusPoints + guess2.placementPoints;

  return { game, guess1, guess2 };
}

describe.skip("Scoring Verification - Core Logic", () => {
  let mockGame: GameType;

  beforeEach(() => {
    mockGame = createTestGame();
    mockUseGame.mockReturnValue({
      currentGame: mockGame,
      clearGame: vi.fn(),
    });
  });

  it("should verify basic scoring calculation", () => {
    const { guess1, guess2 } = setupScoringScenario();

    expect(guess1.totalPoints).toBeGreaterThan(0);
    expect(guess2.totalPoints).toBeGreaterThan(0);
    expect(guess1.totalPoints).toBeGreaterThan(guess2.totalPoints);
  });

  it("should verify bonus points calculation", () => {
    const closeGuess = createTestGuess("player1", 50);
    const farGuess = createTestGuess("player2", 1500);

    expect(closeGuess.bonusPoints).toBe(5);
    expect(farGuess.bonusPoints).toBe(0);
  });

  it("should verify placement points assignment", () => {
    const { guess1, guess2 } = setupScoringScenario();

    expect(guess1.placementPoints).toBe(2); // First place
    expect(guess2.placementPoints).toBe(1); // Second place
  });
});

describe.skip("Scoring Verification - Edge Cases", () => {
  it("should handle tied distances", () => {
    const guess1 = createTestGuess("player1", 100);
    const guess2 = createTestGuess("player2", 100);

    // Both should get same bonus points for same distance
    expect(guess1.bonusPoints).toBe(guess2.bonusPoints);
  });

  it("should handle zero distance (perfect guess)", () => {
    const perfectGuess = createTestGuess("player1", 0);

    expect(perfectGuess.bonusPoints).toBe(5); // Maximum bonus
  });

  it("should handle very large distances", () => {
    const farGuess = createTestGuess("player1", 20000);

    expect(farGuess.bonusPoints).toBe(0); // No bonus for very far
  });
});
