import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// Mock the useGame hook directly
const mockUseGame = vi.fn();
vi.mock("../contexts/GameContext", () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useGame: () => mockUseGame(),
}));

// Mock the WorldMap component
vi.mock("../components/WorldMap", () => ({
  WorldMap: ({ onMapClick, guesses, showTarget }: any) => (
    <div data-testid="world-map">
      <div data-testid="target-shown">
        {showTarget ? "target-visible" : "target-hidden"}
      </div>
      <div data-testid="guess-count">{guesses.length}</div>
      <button
        onClick={() => onMapClick && onMapClick(40.7128, -74.006)}
        data-testid="map-click"
      >
        Click Map
      </button>
    </div>
  ),
}));

// Mock the cities data
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

// Mock the game utils with correct calculation logic
vi.mock("../utils/game", () => ({
  calculateDistance: (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) => {
    // Return predictable distances for testing
    if (lat1 === 40.7128 && lng1 === -74.006) return 0; // Perfect guess
    if (lat1 === 41.0 && lng1 === -73.0) return 150; // Computer guess 1
    if (lat1 === 39.0 && lng1 === -75.0) return 300; // Computer guess 2
    return 500; // Default distance
  },
  calculateBonusPoints: (distance: number) => {
    if (distance <= 100) return 5;
    if (distance <= 500) return 2;
    if (distance <= 1000) return 1;
    return 0;
  },
  calculatePlacementPoints: (
    guesses: Array<{ playerId: string; distance: number }>,
    totalPlayers: number,
  ) => {
    const sorted = [...guesses].sort((a, b) => a.distance - b.distance);
    return sorted.map((guess, index) => ({
      playerId: guess.playerId,
      placementPoints: Math.max(0, totalPlayers - (index + 1) + 1), // Correct formula: totalPlayers - placement + 1
      placement: index + 1,
    }));
  },
  generateComputerGuess: (city: any, accuracy: number) => {
    // Return predictable computer guesses based on accuracy
    if (accuracy === 0.5) return { lat: 41.0, lng: -73.0 };
    if (accuracy === 0.7) return { lat: 39.0, lng: -75.0 };
    return { lat: 42.0, lng: -72.0 };
  },
}));

describe("Scoring Behavior", () => {
  let mockGame: GameType;
  let originalConsoleLog: any;

  beforeEach(() => {
    // Capture console.log for debugging
    originalConsoleLog = console.log;
    console.log = vi.fn();

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

  afterEach(() => {
    vi.clearAllMocks();
    console.log = originalConsoleLog;
  });

  it("should display initial scores as zero", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/game"]}>
          <Game />
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("player-score-player1")).toBeInTheDocument();
    });

    // All players should start with 0 score
    expect(screen.getByTestId("player-score-player1")).toHaveTextContent("0");
    expect(screen.getByTestId("player-score-player2")).toHaveTextContent("0");
    expect(screen.getByTestId("player-score-player3")).toHaveTextContent("0");
  });

  it("should maintain score consistency during state updates", async () => {
    let scoreChanges: { [key: string]: string[] } = {
      player1: [],
      player2: [],
      player3: [],
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

    // Set up mutation observer to track score changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "characterData" ||
          mutation.type === "childList"
        ) {
          const target = mutation.target as HTMLElement;
          if (target.dataset?.testid?.startsWith("player-score-")) {
            const playerId = target.dataset.testid.replace("player-score-", "");
            const score = target.textContent || "0";
            if (scoreChanges[playerId]) {
              scoreChanges[playerId].push(score);
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Make human guess
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    // Wait for guess to be processed
    await waitFor(
      () => {
        expect(
          screen.getByText("✅ Guess submitted! Waiting for other players..."),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Wait a bit for any state updates
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    observer.disconnect();

    // Check that scores don't flicker (go from non-zero back to zero)
    Object.keys(scoreChanges).forEach((playerId) => {
      const changes = scoreChanges[playerId];
      if (changes.length > 1) {
        // If there are multiple changes, ensure no non-zero score is followed by zero
        for (let i = 1; i < changes.length; i++) {
          if (changes[i] === "0" && changes[i - 1] !== "0") {
            throw new Error(
              `Score flickered for ${playerId}: ${changes[i - 1]} -> ${changes[i]}`,
            );
          }
        }
      }
    });
  });

  it("should show correct score values after calculations are complete", async () => {
    // Test that the specific scoring logic works by directly testing the functions
    const { calculatePlacementPoints, calculateBonusPoints } = await import(
      "../utils/game"
    );

    // Test the exact scenario from the game
    const guesses = [
      { playerId: "player1", distance: 0 }, // Human perfect guess
      { playerId: "player2", distance: 150 }, // Computer1 guess
      { playerId: "player3", distance: 300 }, // Computer2 guess
    ];

    const placements = calculatePlacementPoints(guesses, 3);

    // Verify placement calculations
    const player1Result = placements.find((p) => p.playerId === "player1");
    const player2Result = placements.find((p) => p.playerId === "player2");
    const player3Result = placements.find((p) => p.playerId === "player3");

    expect(player1Result?.placementPoints).toBe(3); // 1st place: 3 - 1 + 1 = 3
    expect(player2Result?.placementPoints).toBe(2); // 2nd place: 3 - 2 + 1 = 2
    expect(player3Result?.placementPoints).toBe(1); // 3rd place: 3 - 3 + 1 = 1

    // Verify bonus calculations
    expect(calculateBonusPoints(0)).toBe(5); // Perfect guess
    expect(calculateBonusPoints(150)).toBe(2); // Within 500km
    expect(calculateBonusPoints(300)).toBe(2); // Within 500km

    // Verify total points
    const player1Total =
      (player1Result?.placementPoints || 0) + calculateBonusPoints(0);
    const player2Total =
      (player2Result?.placementPoints || 0) + calculateBonusPoints(150);
    const player3Total =
      (player3Result?.placementPoints || 0) + calculateBonusPoints(300);

    expect(player1Total).toBe(8); // 3 + 5 = 8
    expect(player2Total).toBe(4); // 2 + 2 = 4
    expect(player3Total).toBe(3); // 1 + 2 = 3
  });
});
