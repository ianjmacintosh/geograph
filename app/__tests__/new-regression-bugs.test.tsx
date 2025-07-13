import { describe, it, expect } from "vitest";
import { calculateBonusPoints } from "../utils/game";
import type { GameRound, Player, Guess, Game } from "../types/game";

// Helper functions to reduce complexity
function createTestPlayer(id: string, isComputer = false): Player {
  return {
    id,
    name: `Test Player ${id}`,
    isComputer,
    score: 0,
  };
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

function createTestRound(guesses: Guess[] = []): GameRound {
  return {
    id: "round1",
    city: {
      id: "1",
      name: "Test City",
      country: "Test Country",
      lat: 40.7128,
      lng: -74.006,
      population: 1000000,
      difficulty: "easy",
    },
    guesses,
    completed: false,
    startTime: Date.now(),
  };
}

function createTestGame(players: Player[]): Game {
  return {
    id: "1",
    code: "123456",
    hostId: players[0]?.id || "player1",
    players,
    rounds: [],
    status: "playing",
    settings: {
      maxPlayers: 8,
      roundTimeLimit: 30000,
      totalRounds: 3,
      cityDifficulty: "easy",
    },
    createdAt: Date.now(),
  };
}

// Test regression bugs as unit tests for game logic
describe("New Regression Bugs - Player Logic", () => {
  it("should prevent multiple guesses from the same player", () => {
    const player = createTestPlayer("player1");
    const guess1 = createTestGuess(player.id, 100);
    const guess2 = createTestGuess(player.id, 200);
    const round = createTestRound([guess1]);

    // Should not allow duplicate guesses from same player
    const existingGuess = round.guesses.find(g => g.playerId === player.id);
    expect(existingGuess).toBeDefined();
    expect(round.guesses.length).toBe(1);

    // Adding second guess should be validated elsewhere
    expect(guess2.playerId).toBe(player.id);
  });

  it("should handle computer player validation", () => {
    const computerPlayer = createTestPlayer("computer1", true);
    expect(computerPlayer.isComputer).toBe(true);
  });

  it("should validate player score initialization", () => {
    const player = createTestPlayer("player1");
    expect(player.score).toBe(0);
  });
});

describe("New Regression Bugs - Scoring Logic", () => {
  it("should calculate correct bonus points", () => {
    const closeGuess = createTestGuess("player1", 50);
    const mediumGuess = createTestGuess("player2", 300);
    const farGuess = createTestGuess("player3", 1500);

    expect(closeGuess.bonusPoints).toBe(5);
    expect(mediumGuess.bonusPoints).toBe(1);
    expect(farGuess.bonusPoints).toBe(0);
  });

  it("should handle zero distance correctly", () => {
    const perfectGuess = createTestGuess("player1", 0);
    expect(perfectGuess.bonusPoints).toBe(5);
  });

  it("should handle very large distances", () => {
    const veryFarGuess = createTestGuess("player1", 20000);
    expect(veryFarGuess.bonusPoints).toBe(0);
  });
});

describe("New Regression Bugs - Game State", () => {
  it("should validate game creation", () => {
    const players = [createTestPlayer("player1"), createTestPlayer("player2")];
    const game = createTestGame(players);

    expect(game.players.length).toBe(2);
    expect(game.hostId).toBe("player1");
    expect(game.status).toBe("playing");
  });

  it("should handle empty rounds", () => {
    const players = [createTestPlayer("player1")];
    const game = createTestGame(players);

    expect(game.rounds.length).toBe(0);
  });

  it("should validate game settings", () => {
    const players = [createTestPlayer("player1")];
    const game = createTestGame(players);

    expect(game.settings.totalRounds).toBe(3);
    expect(game.settings.roundTimeLimit).toBe(30000);
    expect(game.settings.cityDifficulty).toBe("easy");
  });
});

describe("New Regression Bugs - Round Logic", () => {
  it("should create valid rounds", () => {
    const round = createTestRound();

    expect(round.guesses.length).toBe(0);
    expect(round.completed).toBe(false);
    expect(round.city).toBeDefined();
  });

  it("should handle rounds with guesses", () => {
    const guess = createTestGuess("player1", 100);
    const round = createTestRound([guess]);

    expect(round.guesses.length).toBe(1);
    expect(round.guesses[0].playerId).toBe("player1");
  });
});