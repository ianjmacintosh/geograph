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

// Mock WorldMap that shows guess count and player info
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
      {guesses.map((guess: any, index: number) => (
        <div key={index} data-testid={`guess-${index}`}>
          {guess.playerName}: {guess.lat.toFixed(4)}, {guess.lng.toFixed(4)}
        </div>
      ))}
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
      if (lat1 === 40.7128 && lng1 === -74.006) return 0; // Human perfect guess
      if (lat1 === 41.0 && lng1 === -73.0) return 150; // Computer 1
      if (lat1 === 39.0 && lng1 === -75.0) return 300; // Computer 2
      if (lat1 === 42.0 && lng1 === -72.0) return 450; // Computer 3
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
    if (accuracy === 0.7) return { lat: 42.0, lng: -72.0 }; // Computer 3
    return { lat: 41.0, lng: -73.0 }; // fallback
  }),
}));

describe.skip("Computer Players First Round Bug", () => {
  let mockGame: GameType;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create game with 4 players (1 human + 3 computers) to match user's setup
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
        {
          id: "player4",
          name: "Computer3",
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

  it("should have computer players make guesses in the first round", async () => {
    console.log("=== Testing Computer Guessing in First Round (4 Players) ===");

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

    console.log("Game started, checking initial state...");
    const initialGuessCount = screen.getByTestId("total-guesses").textContent;
    console.log("Initial guess count:", initialGuessCount);
    expect(initialGuessCount).toBe("0");

    // Human makes guess in first round
    console.log("Human player making guess...");
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    const afterHumanGuess = screen.getByTestId("total-guesses").textContent;
    console.log("After human guess:", afterHumanGuess);
    expect(afterHumanGuess).toBe("1");

    // Wait for computer players to make their guesses
    console.log("Waiting for 3 computer players to make guesses...");
    console.log("Expected: 4 total guesses (1 human + 3 computers)");

    // Wait up to 10 seconds for computer guesses
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
    });

    const finalGuessCount = screen.getByTestId("total-guesses").textContent;
    console.log("Final guess count after waiting:", finalGuessCount);

    // Check what guesses are actually visible
    const allGuesses = screen.queryAllByTestId(/^guess-\d+$/);
    console.log("Visible guesses:", allGuesses.length);
    allGuesses.forEach((guess, index) => {
      console.log(`Guess ${index}:`, guess.textContent);
    });

    // THIS IS THE KEY TEST: We should have 4 guesses (1 human + 3 computers)
    if (finalGuessCount !== "4") {
      console.error(
        "❌ BUG CONFIRMED: Computer players did not all make guesses in first round!",
      );
      console.error(`Expected 4 guesses, got ${finalGuessCount}`);
      console.error("This proves the computer guessing bug exists.");

      // Check which specific players made guesses
      const playerNames = allGuesses.map((guess) => {
        const text = guess.textContent || "";
        return text.split(":")[0];
      });
      console.error("Players who made guesses:", playerNames);

      const expectedPlayers = [
        "Human Player",
        "Computer1",
        "Computer2",
        "Computer3",
      ];
      const missingPlayers = expectedPlayers.filter(
        (name) => !playerNames.includes(name),
      );
      console.error("Players who did NOT make guesses:", missingPlayers);

      throw new Error(
        `Computer guessing bug confirmed! Expected 4 guesses, got ${finalGuessCount}. Missing players: ${missingPlayers.join(", ")}`,
      );
    }

    console.log("✅ All 4 players made guesses successfully in first round");
  }, 30000);

  it("should show who has guessed in the scoreboard", async () => {
    console.log("=== Testing Scoreboard Guess Indicators ===");

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

    // Initially, no one should have guessed (all should show ⏳)
    console.log(
      'Checking initial scoreboard state - all players should show "Waiting"',
    );

    // Look for all player names and their indicators
    const players = ["Human Player", "Computer1", "Computer2", "Computer3"];

    players.forEach((playerName) => {
      expect(screen.getByText(playerName)).toBeInTheDocument();
    });

    // Check that all 4 players show waiting indicators initially
    const waitingIndicators = screen.getAllByText("⏳");
    expect(waitingIndicators).toHaveLength(4);

    console.log("✅ All 4 players visible with waiting indicators");

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

    // Now human should show ✅ and computers should still show ⏳
    console.log("Checking scoreboard after human guess...");
    const checkmarksAfterHuman = screen.getAllByText("✅");
    expect(checkmarksAfterHuman).toHaveLength(1); // Only human should have checkmark

    const waitingAfterHuman = screen.getAllByText("⏳");
    expect(waitingAfterHuman).toHaveLength(3); // 3 computers still waiting

    // Wait for computers to guess
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 8000));
    });

    // Now all players should show ✅
    console.log('Checking final scoreboard state - all should show "Guessed"');
    const checkmarks = screen.getAllByText("✅");
    console.log(`Found ${checkmarks.length} checkmarks (should be 4)`);
    expect(checkmarks.length).toBe(4); // All 4 players should have guessed

    console.log("✅ Scoreboard indicators working correctly");
  }, 20000);
});
