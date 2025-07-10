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

// Mock WorldMap that shows guess count and detailed guess info
vi.mock("../components/WorldMap", () => ({
  WorldMap: ({ onMapClick, guesses }: any) => (
    <div data-testid="world-map">
      <button
        onClick={() => onMapClick && onMapClick(40.7128, -74.006)}
        data-testid="map-click"
        disabled={!onMapClick}
      >
        Click Map (Human Guess)
      </button>
      <div data-testid="total-guesses">{guesses.length}</div>
      <div data-testid="guess-details">
        {guesses.map((guess: any, index: number) => (
          <div key={index} data-testid={`guess-detail-${index}`}>
            Player: {guess.playerName} | Type:{" "}
            {guess.isComputer ? "Computer" : "Human"} | Coords:{" "}
            {guess.lat.toFixed(4)}, {guess.lng.toFixed(4)}
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
    (lat1: number, lng1: number, lat2: number, lng2: number) => {
      // Different distances for different players to test sorting
      if (lat1 === 40.7128 && lng1 === -74.006) return 0; // Human perfect guess
      if (lat1 === 41.0 && lng1 === -73.0) return 150; // Computer 1
      if (lat1 === 39.0 && lng1 === -75.0) return 300; // Computer 2
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
  generateComputerGuess: vi.fn((city: any, accuracy: number) => {
    // Return different positions for different accuracy values
    if (accuracy === 0.3) return { lat: 41.0, lng: -73.0 }; // Computer 1
    if (accuracy === 0.5) return { lat: 39.0, lng: -75.0 }; // Computer 2
    return { lat: 41.0, lng: -73.0 }; // fallback
  }),
}));

describe("Computer Guess Persistence Bug", () => {
  let mockGame: GameType;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create game with 3 players (1 human + 2 computers) for easier tracking
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
          accuracy: 0.3,
        },
        {
          id: "player3",
          name: "Computer2",
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

  it("should preserve computer guesses when human makes a guess", async () => {
    console.log("=== Testing Computer Guess Persistence Issue ===");

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

    console.log("Game started, waiting for computers to guess first...");

    // Wait for computers to make initial guesses (they should guess within 2-5 seconds)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
    });

    const guessesAfterComputerGuesses =
      screen.getByTestId("total-guesses").textContent;
    console.log(
      "Guesses after computer auto-guesses:",
      guessesAfterComputerGuesses,
    );

    // Check if computers made guesses
    const guessDetails = screen.getByTestId("guess-details").textContent;
    console.log("Guess details after computers guess:", guessDetails);

    if (guessesAfterComputerGuesses !== "0") {
      console.log(
        "✅ Computers made initial guesses:",
        guessesAfterComputerGuesses,
      );

      // Now human makes a guess
      console.log("Human making guess...");
      await act(async () => {
        fireEvent.click(screen.getByTestId("map-click"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("✅ Guess submitted! Waiting for other players..."),
        ).toBeInTheDocument();
      });

      // Check if computer guesses are still there
      const guessesAfterHumanGuess =
        screen.getByTestId("total-guesses").textContent;
      console.log("Guesses after human guess:", guessesAfterHumanGuess);

      const newGuessDetails = screen.getByTestId("guess-details").textContent;
      console.log("Guess details after human guess:", newGuessDetails);

      if (
        parseInt(guessesAfterHumanGuess || "0") <
        parseInt(guessesAfterComputerGuesses || "0")
      ) {
        console.error(
          "❌ BUG CONFIRMED: Computer guesses DISAPPEARED after human guess!",
        );
        console.error(
          `Before human guess: ${guessesAfterComputerGuesses} guesses`,
        );
        console.error(`After human guess: ${guessesAfterHumanGuess} guesses`);
        console.error("Computer guesses should persist when human guesses!");
        throw new Error(
          `Computer guess persistence bug! Guesses went from ${guessesAfterComputerGuesses} to ${guessesAfterHumanGuess}`,
        );
      }

      console.log("✅ Computer guesses persisted after human guess");

      // Should have original computer guesses PLUS human guess
      const expectedTotal = parseInt(guessesAfterComputerGuesses || "0") + 1;
      expect(parseInt(guessesAfterHumanGuess || "0")).toBe(expectedTotal);
    } else {
      console.log(
        "⚠️  Computers did not make initial guesses - different issue",
      );

      // Human makes guess first
      console.log("Human making guess first...");
      await act(async () => {
        fireEvent.click(screen.getByTestId("map-click"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("✅ Guess submitted! Waiting for other players..."),
        ).toBeInTheDocument();
      });

      const afterHuman = screen.getByTestId("total-guesses").textContent;
      console.log("After human guess:", afterHuman);
      expect(afterHuman).toBe("1");

      // Wait for computers to guess
      console.log("Waiting for computers to guess after human...");
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 8000));
      });

      const finalCount = screen.getByTestId("total-guesses").textContent;
      console.log("Final guess count:", finalCount);

      if (finalCount === "1") {
        console.error(
          "❌ BUG CONFIRMED: Computers never made guesses after human!",
        );
        throw new Error("Computers did not make guesses after human guessed");
      }

      console.log("✅ Computers made guesses after human");
    }
  }, 30000);

  it("should show all guesses persistently during round", async () => {
    console.log("=== Testing Guess Visibility Throughout Round ===");

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

    // Track guess counts at each step
    const trackGuesses = () => {
      const count = screen.getByTestId("total-guesses").textContent;
      const details = screen.getByTestId("guess-details").textContent;
      console.log(`Guess count: ${count}, Details: ${details}`);
      return { count, details };
    };

    console.log("Initial state:");
    trackGuesses();

    // Wait 3 seconds
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    });
    console.log("After 3 seconds:");
    trackGuesses();

    // Human guesses
    console.log("Human making guess...");
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    console.log("After human guess:");
    const afterHuman = trackGuesses();

    // Wait more time for computers
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 8000));
    });

    console.log("After waiting for computers:");
    const afterComputers = trackGuesses();

    // Should have all 3 guesses by now
    expect(parseInt(afterComputers.count || "0")).toBe(3);
    expect(afterComputers.details).toContain("Human Player");
    expect(afterComputers.details).toContain("Computer1");
    expect(afterComputers.details).toContain("Computer2");

    console.log("✅ All guesses visible and persistent");
  }, 30000);
});
