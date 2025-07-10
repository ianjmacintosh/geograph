import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Game from "../routes/game";
import type { Game as GameType } from "../types/game";

// Mock the useGame hook
const mockUseGame = vi.fn();
vi.mock("../contexts/GameContext", () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useGame: () => mockUseGame(),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock WorldMap
vi.mock("../components/WorldMap", () => ({
  WorldMap: ({ onMapClick, guesses }: any) => (
    <div data-testid="world-map">
      <button
        onClick={() => onMapClick && onMapClick(40.7128, -74.006)}
        data-testid="map-click"
      >
        Click Map ({guesses.length} guesses)
      </button>
    </div>
  ),
}));

// Mock cities
vi.mock("../data/cities", () => ({
  getRandomCityByDifficulty: () => ({
    id: "1",
    name: "New York",
    country: "USA",
    lat: 40.7128,
    lng: -74.006,
    population: 8000000,
    difficulty: "easy" as const,
  }),
}));

// Mock game utilities with logging
vi.mock("../utils/game", () => ({
  calculateDistance: vi.fn(
    (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const distance =
        lat1 === 40.7128 && lng1 === -74.006 ? 0 : lat1 === 41.0 ? 150 : 300;
      console.log(
        `calculateDistance(${lat1}, ${lng1}, ${lat2}, ${lng2}) = ${distance}`,
      );
      return distance;
    },
  ),
  calculateBonusPoints: vi.fn((distance: number) => {
    const bonus = distance <= 100 ? 5 : distance <= 500 ? 2 : 0;
    console.log(`calculateBonusPoints(${distance}) = ${bonus}`);
    return bonus;
  }),
  calculatePlacementPoints: vi.fn(
    (
      guesses: Array<{ playerId: string; distance: number }>,
      totalPlayers: number,
    ) => {
      console.log(
        `calculatePlacementPoints called with:`,
        guesses,
        `totalPlayers: ${totalPlayers}`,
      );
      const sorted = [...guesses].sort((a, b) => a.distance - b.distance);
      const result = sorted.map((guess, index) => ({
        playerId: guess.playerId,
        placementPoints: Math.max(0, totalPlayers - index),
        placement: index + 1,
      }));
      console.log(`calculatePlacementPoints result:`, result);
      return result;
    },
  ),
  generateComputerGuess: vi.fn((city: any, accuracy: number) => {
    const guess =
      accuracy === 0.5 ? { lat: 41.0, lng: -73.0 } : { lat: 39.0, lng: -75.0 };
    console.log(
      `generateComputerGuess(${city.name}, ${accuracy}) = ${JSON.stringify(guess)}`,
    );
    return guess;
  }),
}));

describe("Debug Scoring State", () => {
  let mockGame: GameType;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGame = {
      id: "1",
      code: "123456",
      hostId: "player1",
      players: [
        { id: "player1", name: "Human Player", isComputer: false, score: 0 },
        {
          id: "player2",
          name: "Computer1",
          isComputer: true,
          score: 0,
          accuracy: 0.5,
        },
        {
          id: "player3",
          name: "Computer2",
          isComputer: true,
          score: 0,
          accuracy: 0.7,
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

    mockUseGame.mockReturnValue({
      currentGame: mockGame,
      clearGame: vi.fn(),
      finishGame: vi.fn(),
    });
  });

  it("should debug the scoring calculation process", async () => {
    const scoreTracker: Array<{
      time: number;
      event: string;
      scores: Record<string, string>;
      guessCount: number;
    }> = [];

    const trackScores = (event: string) => {
      try {
        const mapElement = document.querySelector('[data-testid="map-click"]');
        const guessCount = mapElement
          ? parseInt(
              mapElement.textContent?.match(/\((\d+) guesses\)/)?.[1] || "0",
            )
          : 0;

        const scores = {
          player1:
            document.querySelector('[data-testid="player-score-player1"]')
              ?.textContent || "0",
          player2:
            document.querySelector('[data-testid="player-score-player2"]')
              ?.textContent || "0",
          player3:
            document.querySelector('[data-testid="player-score-player3"]')
              ?.textContent || "0",
        };

        scoreTracker.push({
          time: Date.now(),
          event,
          scores,
          guessCount,
        });

        console.log(`[${event}] Guesses: ${guessCount}, Scores:`, scores);
      } catch (e) {
        console.log(`[${event}] Could not track scores:`, e);
      }
    };

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/game"]}>
          <Game />
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("map-click")).toBeInTheDocument();
    });

    trackScores("INITIAL");

    // Human makes guess
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    trackScores("AFTER_HUMAN_GUESS");

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    trackScores("HUMAN_GUESS_CONFIRMED");

    // Wait for computer guesses to be generated
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    trackScores("AFTER_WAIT_3S");

    // Wait longer for all processing
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    });

    trackScores("AFTER_WAIT_8S_TOTAL");

    // Check if round results are shown
    const roundResults = screen.queryByText("Round Results");
    if (roundResults) {
      trackScores("ROUND_RESULTS_VISIBLE");
    } else {
      console.log("Round Results not visible yet");
    }

    // Print complete timeline
    console.log("\n=== SCORING TIMELINE ===");
    scoreTracker.forEach((entry) => {
      console.log(
        `${entry.event}: Guesses=${entry.guessCount}, Scores=${JSON.stringify(entry.scores)}`,
      );
    });

    // Import the mocked functions to check call counts
    const {
      calculateDistance,
      calculateBonusPoints,
      calculatePlacementPoints,
      generateComputerGuess,
    } = await import("../utils/game");

    // Print mock call logs
    console.log("\n=== MOCK FUNCTION CALLS ===");
    console.log(
      "calculateDistance calls:",
      vi.mocked(calculateDistance).mock.calls.length,
    );
    console.log(
      "calculateBonusPoints calls:",
      vi.mocked(calculateBonusPoints).mock.calls.length,
    );
    console.log(
      "calculatePlacementPoints calls:",
      vi.mocked(calculatePlacementPoints).mock.calls.length,
    );
    console.log(
      "generateComputerGuess calls:",
      vi.mocked(generateComputerGuess).mock.calls.length,
    );

    // Analyze the issue
    const finalEntry = scoreTracker[scoreTracker.length - 1];
    const finalScores = finalEntry.scores;

    console.log("\n=== ANALYSIS ===");
    console.log("Final scores:", finalScores);
    console.log("Expected: All players should have > 0 scores");

    if (vi.mocked(calculatePlacementPoints).mock.calls.length === 0) {
      console.log("❌ ISSUE: calculatePlacementPoints was NEVER called!");
      throw new Error(
        "calculatePlacementPoints was never called - this is the root cause",
      );
    }

    if (finalScores.player2 === "0" || finalScores.player3 === "0") {
      console.log(
        "❌ ISSUE: Computer players have 0 scores after all processing",
      );
      console.log("This indicates that either:");
      console.log("1. Computer guesses were not generated");
      console.log("2. Placement calculation failed");
      console.log("3. Score display logic is broken");

      // Check if computer guesses were generated
      if (vi.mocked(generateComputerGuess).mock.calls.length === 0) {
        console.log("❌ Computer guesses were NOT generated");
      } else {
        console.log("✅ Computer guesses were generated");
      }

      throw new Error(
        `Computer players missing scores: ${JSON.stringify(finalScores)}`,
      );
    }

    console.log("✅ All players have scores - bug appears to be fixed");
  }, 30000);
});
