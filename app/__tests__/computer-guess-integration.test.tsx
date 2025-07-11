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

// Mock WorldMap that shows ALL guesses
vi.mock("../components/WorldMap", () => ({
  WorldMap: ({ onMapClick, guesses }: any) => (
    <div data-testid="world-map">
      <button
        onClick={() => onMapClick && onMapClick(40.7128, -74.006)}
        data-testid="map-click"
      >
        Click Map
      </button>
      <div data-testid="guess-count">{guesses.length}</div>
      {guesses.map((guess: any, index: number) => (
        <div key={index} data-testid={`guess-${index}-player`}>
          Player: {guess.playerName || "Unknown"}
        </div>
      ))}
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
  calculateDistance: vi.fn(
    (lat1: number, lng1: number, lat2: number, lng2: number) => {
      // Human perfect guess
      if (lat1 === 40.7128 && lng1 === -74.006) return 0;
      // Computer 1 guess
      if (lat1 === 41.0 && lng1 === -73.0) return 150;
      // Computer 2 guess
      if (lat1 === 39.0 && lng1 === -75.0) return 300;
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
      console.log(
        `calculatePlacementPoints: ${guesses.length} guesses for ${totalPlayers} players`,
      );
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
    return accuracy === 0.5
      ? { lat: 41.0, lng: -73.0 } // Computer 1
      : { lat: 39.0, lng: -75.0 }; // Computer 2
  }),
}));

describe.skip("Computer Guess Integration", () => {
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

  it("should add computer guesses to the round state", async () => {
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

    console.log("Initial state:");
    const initialGuessCount = screen.getByTestId("guess-count").textContent;
    console.log("Guess count:", initialGuessCount);
    expect(initialGuessCount).toBe("0");

    // Human makes guess
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    console.log("After human guess:");
    const afterHumanGuessCount = screen.getByTestId("guess-count").textContent;
    console.log("Guess count:", afterHumanGuessCount);
    expect(afterHumanGuessCount).toBe("1");

    // Wait for computer guesses to be generated
    console.log("Waiting for computer guesses...");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 7000)); // Wait longer than computer delay
    });

    console.log("After waiting for computer guesses:");
    const finalGuessCount = screen.getByTestId("guess-count").textContent;
    console.log("Final guess count:", finalGuessCount);

    // Check if all players have guessed
    const allGuessElements = screen.queryAllByTestId(/^guess-\d+-player$/);
    console.log("Guess elements found:", allGuessElements.length);
    allGuessElements.forEach((element, index) => {
      console.log(`Guess ${index}:`, element.textContent);
    });

    // THIS IS THE KEY TEST: We should have 3 guesses (1 human + 2 computer)
    if (finalGuessCount !== "3") {
      console.error("❌ Computer guesses were not added to round state!");
      console.error(`Expected 3 guesses, got ${finalGuessCount}`);
      throw new Error(
        `Computer guesses not integrated! Expected 3 guesses, got ${finalGuessCount}`,
      );
    }

    // Verify all players appear in the guess list
    expect(allGuessElements).toHaveLength(3);

    // Check that computer players appear in the guesses
    const guessTexts = allGuessElements.map((el) => el.textContent);
    expect(guessTexts.some((text) => text?.includes("Computer1"))).toBe(true);
    expect(guessTexts.some((text) => text?.includes("Computer2"))).toBe(true);

    console.log("✅ All computer guesses successfully integrated");
  }, 30000);

  it("should have consistent state updates for computer guesses", async () => {
    let stateSnapshots: Array<{
      time: number;
      guessCount: number;
      event: string;
    }> = [];

    const captureState = (event: string) => {
      try {
        const guessCount = parseInt(
          screen.getByTestId("guess-count").textContent || "0",
        );
        stateSnapshots.push({
          time: Date.now(),
          guessCount,
          event,
        });
        console.log(`[${event}] Guess count: ${guessCount}`);
      } catch (e) {
        console.log(`[${event}] Could not capture state`);
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

    captureState("INIT");

    // Human guess
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });
    captureState("HUMAN_GUESS");

    // Wait and check state at intervals
    for (let i = 1; i <= 8; i++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });
      captureState(`WAIT_${i}S`);
    }

    console.log("\n=== STATE PROGRESSION ===");
    stateSnapshots.forEach((snapshot) => {
      console.log(`${snapshot.event}: ${snapshot.guessCount} guesses`);
    });

    // Analyze state progression
    const finalSnapshot = stateSnapshots[stateSnapshots.length - 1];
    if (finalSnapshot.guessCount !== 3) {
      console.error("❌ State progression issue detected!");
      console.error(
        "Computer guesses are not being properly integrated into component state",
      );
      throw new Error(
        `Expected 3 final guesses, got ${finalSnapshot.guessCount}`,
      );
    }

    // Check for state regressions (guess count decreasing)
    for (let i = 1; i < stateSnapshots.length; i++) {
      const prev = stateSnapshots[i - 1];
      const curr = stateSnapshots[i];

      if (curr.guessCount < prev.guessCount) {
        console.error(
          `❌ State regression detected: ${prev.event}(${prev.guessCount}) -> ${curr.event}(${curr.guessCount})`,
        );
        throw new Error(
          `Guess count decreased from ${prev.guessCount} to ${curr.guessCount}`,
        );
      }
    }

    console.log("✅ State progression is consistent");
  }, 30000);
});
