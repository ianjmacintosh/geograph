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
const mockFinishGame = vi.fn();
const mockNavigate = vi.fn();
const mockUseGame = vi.fn();

vi.mock("../contexts/GameContext", () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useGame: () => mockUseGame(),
}));

// Mock navigation to capture navigate calls
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock WorldMap that tracks guesses
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
      <div data-testid="guess-list">
        {guesses.map((guess: any, index: number) => (
          <div key={index} data-testid={`guess-${index}`}>
            {guess.playerName}: {guess.isComputer ? "Computer" : "Human"}
          </div>
        ))}
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
  calculateDistance: vi.fn(
    (lat1: number, lng1: number, _lat2: number, _lng2: number) => {
      if (lat1 === 40.7128 && lng1 === -74.006) return 0; // Human perfect guess
      if (lat1 === 41.0 && lng1 === -73.0) return 150; // Computer 1
      return 500;
    },
  ),
  calculateBonusPoints: vi.fn((distance: number) => {
    if (distance <= 100) return 5;
    if (distance <= 500) return 2;
    return 0;
  }),
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

// Test helper functions to reduce complexity
function createSingleRoundGame(): GameType {
  return {
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
      totalRounds: 1,
      cityDifficulty: "easy" as const,
    },
    createdAt: Date.now(),
  };
}

function setupMockGame(game: GameType) {
  mockUseGame.mockReturnValue({
    currentGame: game,
    clearGame: vi.fn(),
    finishGame: mockFinishGame,
  });
}


describe.skip("Final Results Screen Navigation Bug", () => {
  let mockGame: GameType;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGame = createSingleRoundGame();
    setupMockGame(mockGame);
  });

  it("should navigate to final results screen after completing all rounds", async () => {
    console.log("=== Testing Complete Game Flow to Results Screen ===");

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

    console.log("Game started - this is round 1 of 1 (final round)");

    // Verify it's the final round - use getAllByText since text appears in multiple places
    const roundTexts = screen.getAllByText("Round 1 of 1");
    expect(roundTexts.length).toBeGreaterThan(0);

    // Human makes guess
    console.log("Human making guess...");
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    console.log("Human guessed, waiting for computer and round completion...");

    // Wait for computer to guess first
    console.log("Waiting for computer to make guess...");
    await waitFor(
      () => {
        const guessCount = screen.getByTestId("total-guesses").textContent;
        console.log("Current guess count:", guessCount);
        return guessCount === "2"; // Human + Computer
      },
      { timeout: 15000 },
    );

    console.log("Computer has guessed, waiting for results to show...");

    // Now wait for results to appear
    await waitFor(
      () => {
        const showTarget = screen.getByTestId("show-target").textContent;
        console.log("Show target status:", showTarget);
        return showTarget === "target-visible";
      },
      { timeout: 5000 },
    );

    console.log("Results are showing, waiting for Final Results button...");

    // Wait for Final Results button
    await waitFor(
      () => {
        const button = screen.queryByText("Final Results");
        return button !== null;
      },
      { timeout: 5000 },
    );

    console.log("Round completed, checking for Final Results button...");

    // Should show "Final Results" button (not "Next Round") since this is the last round
    const finalResultsButton = screen.getByText("Final Results");
    expect(finalResultsButton).toBeInTheDocument();

    // Should show round results
    expect(screen.getByText("Round Results")).toBeInTheDocument();

    console.log("✅ Final Results button found, clicking it...");

    // Click Final Results button
    await act(async () => {
      fireEvent.click(finalResultsButton);
    });

    // Wait a moment for async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    console.log("Checking what happened after clicking Final Results...");

    // Verify finishGame was called
    expect(mockFinishGame).toHaveBeenCalledTimes(1);
    console.log("✅ finishGame() was called");

    // Verify navigation to results was called
    expect(mockNavigate).toHaveBeenCalledWith("/results");
    console.log('✅ navigate("/results") was called');

    // Check the data passed to finishGame
    const finishGameData = mockFinishGame.mock.calls[0][0];
    console.log("Data passed to finishGame:", finishGameData);

    expect(finishGameData).toHaveProperty("playerScores");
    expect(finishGameData).toHaveProperty("winnerId");
    expect(finishGameData.playerScores).toHaveLength(2);

    console.log("✅ Final results navigation flow completed successfully");
  }, 30000);

  it("should not navigate to results on non-final rounds", async () => {
    console.log("=== Testing Non-Final Round Does Not Navigate ===");

    // Create a multi-round game
    const multiRoundGame = {
      ...mockGame,
      settings: {
        ...mockGame.settings,
        totalRounds: 3, // 3 rounds total
      },
    };

    mockUseGame.mockReturnValue({
      currentGame: multiRoundGame,
      clearGame: vi.fn(),
      finishGame: mockFinishGame,
    });

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

    console.log("Multi-round game started - this is round 1 of 3");

    // Verify it's NOT the final round
    const roundTexts = screen.getAllByText("Round 1 of 3");
    expect(roundTexts.length).toBeGreaterThan(0);

    // Human makes guess
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    // Wait for round to complete
    await waitFor(
      () => {
        const button = screen.queryByText("Next Round");
        return button !== null;
      },
      { timeout: 15000 },
    );

    console.log("Round 1 completed, checking button text...");

    // Should show "Next Round" button (not "Final Results") since this is not the last round
    const nextRoundButton = screen.getByText("Next Round");
    expect(nextRoundButton).toBeInTheDocument();

    // Should NOT have called finishGame or navigate to results
    expect(mockFinishGame).toHaveBeenCalledTimes(0);
    expect(mockNavigate).not.toHaveBeenCalledWith("/results");

    console.log(
      "✅ Correctly shows Next Round button and does not navigate to results",
    );
  }, 30000);

  it("should handle game completion when all players have guessed", async () => {
    console.log("=== Testing Automatic Game Completion ===");

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

    // Make human guess
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    // Wait for both players to guess (human + computer)
    await waitFor(
      () => {
        const guessCount = screen.getByTestId("total-guesses").textContent;
        return guessCount === "2"; // Both players guessed
      },
      { timeout: 15000 },
    );

    console.log("Both players have guessed, waiting for results...");

    // Should automatically show results since all players guessed
    await waitFor(
      () => {
        return screen.queryByText("Round Results") !== null;
      },
      { timeout: 5000 },
    );

    const showTarget = screen.getByTestId("show-target").textContent;
    expect(showTarget).toBe("target-visible");

    console.log("✅ Results shown automatically when all players guessed");

    // Since it's the final round, should show Final Results button
    const finalResultsButton = await waitFor(
      () => {
        return screen.getByText("Final Results");
      },
      { timeout: 5000 },
    );

    expect(finalResultsButton).toBeInTheDocument();
    console.log("✅ Final Results button appears for last round");
  }, 30000);
});
