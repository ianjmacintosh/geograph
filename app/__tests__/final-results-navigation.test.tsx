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
const mockUseGame = vi.fn();
vi.mock("../contexts/GameContext", () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useGame: () => mockUseGame(),
}));

// Mock navigation to capture navigate calls
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
        disabled={!onMapClick}
      >
        Click Map
      </button>
      <div data-testid="total-guesses">{guesses.length}</div>
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
  calculatePlacementPoints: vi.fn((guesses: any[], totalPlayers: number) => {
    return guesses.map((guess, index) => ({
      playerId: guess.playerId,
      placementPoints: totalPlayers - index,
      placement: index + 1,
    }));
  }),
  generateComputerGuess: vi.fn(() => ({ lat: 41.0, lng: -73.0 })),
}));

describe.skip("Final Results Navigation", () => {
  let mockGame: GameType;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a game with only 1 round for faster testing
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
        totalRounds: 1, // Only 1 round for testing
        cityDifficulty: "easy" as const,
      },
      createdAt: Date.now(),
    };

    mockUseGame.mockReturnValue({
      currentGame: mockGame,
      clearGame: vi.fn(),
      finishGame: mockFinishGame,
    });
  });

  it('should show "Final Results" button on last round and navigate correctly', async () => {
    console.log("=== Testing Final Results Navigation ===");

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

    console.log("Game started, this is the last round (1 of 1)");

    // Make human guess to start the round
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    // Wait for computer to guess and round to complete
    await waitFor(
      () => {
        expect(screen.getByText("Round Results")).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    console.log("Round completed, looking for Final Results button...");

    // Since this is round 1 of 1 (last round), button should say "Final Results"
    const finalResultsButton = screen.getByText("Final Results");
    expect(finalResultsButton).toBeInTheDocument();

    console.log('✅ Found "Final Results" button (not "Finish Game")');

    // Click the Final Results button
    console.log("Clicking Final Results button...");
    await act(async () => {
      fireEvent.click(finalResultsButton);
    });

    // Wait a moment for any async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    // Check that finishGame was called
    expect(mockFinishGame).toHaveBeenCalledTimes(1);
    console.log("✅ finishGame() was called with final results");

    // Check that navigation to /results was attempted
    expect(mockNavigate).toHaveBeenCalledWith("/results");
    console.log("✅ Navigation to /results was called");

    // Check what data was passed to finishGame
    const finishGameCall = mockFinishGame.mock.calls[0][0];
    console.log("Final results passed to finishGame:", finishGameCall);

    expect(finishGameCall).toHaveProperty("playerScores");
    expect(finishGameCall).toHaveProperty("winnerId");
    expect(finishGameCall.playerScores).toHaveLength(2); // Human + Computer

    console.log("✅ Final Results navigation flow working correctly");
  }, 20000);

  it('should show "Next Round" button on non-final rounds', async () => {
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

    console.log("Multi-round game started, this is round 1 of 3");

    // Make human guess
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
        expect(screen.getByText("Round Results")).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    console.log("Round 1 completed, checking button text...");

    // Since this is round 1 of 3 (not last round), button should say "Next Round"
    const nextRoundButton = screen.getByText("Next Round");
    expect(nextRoundButton).toBeInTheDocument();

    console.log('✅ Found "Next Round" button (not "Final Results")');

    // finishGame should NOT have been called yet
    expect(mockFinishGame).toHaveBeenCalledTimes(0);
    console.log("✅ finishGame() was not called (round not finished)");
  }, 20000);
});
