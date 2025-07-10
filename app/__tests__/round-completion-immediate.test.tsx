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
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock WorldMap
vi.mock("../components/WorldMap", () => ({
  WorldMap: ({ onMapClick, guesses, showTarget }: any) => (
    <div data-testid="world-map">
      <button
        onClick={() => onMapClick && onMapClick(40.7128, -74.006)}
        data-testid="map-click"
        disabled={!onMapClick}
      >
        {onMapClick ? "Click Map" : "Map Disabled"}
      </button>
      <div data-testid="total-guesses">{guesses.length}</div>
      <div data-testid="show-target">
        {showTarget ? "target-visible" : "target-hidden"}
      </div>
    </div>
  ),
}));

// Mock cities
vi.mock("../data/cities", () => ({
  getRandomCityByDifficulty: () => ({
    id: "nyc",
    name: "New York",
    country: "USA",
    lat: 40.7128,
    lng: -74.006,
    population: 8000000,
    difficulty: "easy" as const,
  }),
}));

// Mock game utilities
vi.mock("../utils/game", () => ({
  calculateDistance: vi.fn(() => 100),
  calculateBonusPoints: vi.fn(() => 5),
  calculatePlacementPoints: vi.fn(
    (
      guesses: Array<{ playerId: string; distance: number }>,
      totalPlayers: number,
    ) => {
      const sorted = [...guesses].sort((a, b) => a.distance - b.distance);
      return sorted.map((guess, index) => ({
        playerId: guess.playerId,
        placementPoints: Math.max(0, totalPlayers - index),
        placement: index + 1,
      }));
    },
  ),
  generateComputerGuess: vi.fn(() => ({ lat: 41.0, lng: -73.0 })),
}));

describe("Round Completion Immediate Test", () => {
  let mockGame: GameType;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a 2-player game for simpler testing
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

  it("should end round immediately when human makes final guess", async () => {
    console.log("=== Testing Immediate Round Completion (2 players) ===");

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

    console.log("Game started with 2 players (1 human + 1 computer)");

    // Wait for computer to guess first
    await waitFor(
      () => {
        const guessCount = screen.getByTestId("total-guesses").textContent;
        return guessCount === "1"; // Computer guessed
      },
      { timeout: 10000 },
    );

    console.log("✅ Computer has guessed (1/2 players)");

    // Verify results are not showing yet
    expect(screen.getByTestId("show-target").textContent).toBe("target-hidden");
    expect(screen.queryByText("Round Results")).toBeNull();

    console.log("Round not completed yet, as expected");

    // Record time before human makes final guess
    const startTime = Date.now();

    // Human makes the final guess (2/2 players)
    console.log("Human making final guess...");
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    console.log("Human guessed, all players have now guessed (2/2)");

    // Round should complete IMMEDIATELY (within 2-3 seconds, not 30 seconds)
    await waitFor(
      () => {
        const showTarget = screen.getByTestId("show-target").textContent;
        return showTarget === "target-visible";
      },
      { timeout: 5000 },
    );

    const endTime = Date.now();
    const completionTime = endTime - startTime;

    console.log(`Round completion time: ${completionTime}ms`);

    // Should complete quickly (within 3 seconds), not wait for full timer
    if (completionTime > 6000) {
      console.error(
        "❌ BUG CONFIRMED: Round took too long to complete after final guess!",
      );
      console.error(`Expected < 6000ms, got ${completionTime}ms`);
      throw new Error(`Round completion too slow: ${completionTime}ms`);
    }

    // Should show Round Results
    await waitFor(
      () => {
        return screen.getByText("Round Results");
      },
      { timeout: 2000 },
    );

    console.log("✅ Round completed immediately after final guess");

    // Verify all guesses are visible
    const finalGuessCount = screen.getByTestId("total-guesses").textContent;
    expect(finalGuessCount).toBe("2");

    console.log("✅ Round completion timing working correctly");
  }, 30000);

  it("should still work with timer when not all players have guessed", async () => {
    console.log("=== Testing Timer Still Works When Incomplete ===");

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

    // Human guesses immediately (before computer)
    console.log("Human guessing first (1/2 players)...");
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    console.log("Only human has guessed, should wait for computer or timer");

    // Should NOT complete immediately since only 1/2 players guessed
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    // Should still be waiting (not completed)
    expect(screen.getByTestId("show-target").textContent).toBe("target-hidden");
    expect(screen.queryByText("Round Results")).toBeNull();

    console.log("✅ Correctly waiting for remaining players or timer");
  }, 30000);
});
