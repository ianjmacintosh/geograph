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

// Mock WorldMap that shows round info
vi.mock("../components/WorldMap", () => ({
  WorldMap: ({ onMapClick, guesses }: any) => (
    <div data-testid="world-map">
      <button
        onClick={() => onMapClick && onMapClick(40.7128, -74.006)}
        data-testid="map-click"
        disabled={!onMapClick}
      >
        Click Map ({guesses.length} guesses)
      </button>
      <div data-testid="guess-count">{guesses.length}</div>
      <div data-testid="map-clickable">
        {onMapClick ? "clickable" : "not-clickable"}
      </div>
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

// Mock game utilities
vi.mock("../utils/game", () => ({
  calculateDistance: vi.fn(() => 150),
  calculateBonusPoints: vi.fn(() => 2),
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
  generateComputerGuess: vi.fn((city: any, accuracy: number) => {
    return accuracy === 0.5
      ? { lat: 41.0, lng: -73.0 } // Computer 1
      : { lat: 39.0, lng: -75.0 }; // Computer 2
  }),
}));

describe.skip("Round Progression Debug", () => {
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

  it("should debug round progression issue", async () => {
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

    console.log("=== ROUND 1 ===");

    // Check initial state
    const round1Text = screen.queryAllByText(/Round 1 of 3/);
    console.log("Round 1 text found:", round1Text.length);

    const initialClickable = screen.getByTestId("map-clickable").textContent;
    console.log("Initial map clickable:", initialClickable);

    // Human makes guess in Round 1
    console.log("Human making guess in Round 1...");
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    const afterHumanGuess = screen.getByTestId("guess-count").textContent;
    console.log("After human guess in Round 1:", afterHumanGuess);

    const afterGuessClickable = screen.getByTestId("map-clickable").textContent;
    console.log("After guess, map clickable:", afterGuessClickable);

    // Wait for Round 1 to complete
    await waitFor(
      () => {
        expect(screen.getByText("Round Results")).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    console.log("Round 1 completed, checking final guess count...");
    const round1FinalGuesses = screen.getByTestId("guess-count").textContent;
    console.log("Round 1 final guesses:", round1FinalGuesses);

    // Click Next Round
    const nextRoundButton = await waitFor(
      () => {
        const button = screen.getByText("Next Round");
        expect(button).toBeInTheDocument();
        return button;
      },
      { timeout: 5000 },
    );

    console.log("Clicking Next Round button...");
    await act(async () => {
      fireEvent.click(nextRoundButton);
    });

    console.log("=== ROUND 2 ===");

    // Wait a moment for state to update
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    // Check Round 2 state
    const round2Text = screen.queryAllByText(/Round 2 of 3/);
    console.log("Round 2 text found:", round2Text.length);

    const round2Clickable = screen.getByTestId("map-clickable").textContent;
    console.log("Round 2 map clickable:", round2Clickable);

    const round2InitialGuesses = screen.getByTestId("guess-count").textContent;
    console.log("Round 2 initial guesses:", round2InitialGuesses);

    // Try to make human guess in Round 2
    if (round2Clickable === "clickable") {
      console.log("Human making guess in Round 2...");
      await act(async () => {
        fireEvent.click(screen.getByTestId("map-click"));
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      const afterRound2HumanGuess =
        screen.getByTestId("guess-count").textContent;
      console.log("After human guess in Round 2:", afterRound2HumanGuess);

      // Wait for computer guesses
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 6000));
      });

      const round2FinalGuesses = screen.getByTestId("guess-count").textContent;
      console.log("Round 2 final guesses:", round2FinalGuesses);

      if (round2FinalGuesses === "3") {
        console.log("✅ Round 2 working correctly - all 3 players guessed");
      } else {
        console.error(
          "❌ Round 2 issue - expected 3 guesses, got:",
          round2FinalGuesses,
        );
      }
    } else {
      console.error("❌ Round 2 map not clickable after Next Round button");
    }

    console.log("=== ANALYSIS ===");
    console.log("Round 1 final guesses:", round1FinalGuesses);
    console.log("Round 2 initial guesses:", round2InitialGuesses);
    console.log("Round 2 clickable:", round2Clickable);
  }, 30000);
});
