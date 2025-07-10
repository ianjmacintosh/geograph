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

// Mock WorldMap that allows tracking click attempts
vi.mock("../components/WorldMap", () => ({
  WorldMap: ({ onMapClick, guesses, showTarget }: any) => {
    // Track click attempts
    let clickCount = 0;

    return (
      <div data-testid="world-map">
        <button
          onClick={() => {
            clickCount++;
            console.log(`Map click attempt #${clickCount}`);
            if (onMapClick) {
              // Simulate different positions for multiple clicks
              const positions = [
                [40.7128, -74.006], // First click
                [41.0, -73.0], // Second click
                [39.0, -75.0], // Third click
                [42.0, -72.0], // Fourth click
                [38.0, -76.0], // Fifth click
              ];
              const pos = positions[clickCount - 1] || [40.7128, -74.006];
              onMapClick(pos[0], pos[1]);
            } else {
              console.log(
                "onMapClick is null/undefined - clicks should be blocked",
              );
            }
          }}
          data-testid="map-click"
          disabled={!onMapClick}
        >
          Click Map ({guesses.length} guesses)
        </button>
        <div data-testid="show-target">
          {showTarget ? "target-visible" : "target-hidden"}
        </div>
        <div data-testid="total-guesses">{guesses.length}</div>
        <div data-testid="click-enabled">
          {onMapClick ? "enabled" : "disabled"}
        </div>
        {guesses.map((guess: any, index: number) => (
          <div key={index} data-testid={`visible-guess-${index}`}>
            {guess.playerName}: {guess.lat.toFixed(4)}, {guess.lng.toFixed(4)}
          </div>
        ))}
      </div>
    );
  },
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
      if (lat1 === 40.7128 && lng1 === -74.006) return 0; // Human perfect guess
      if (lat1 === 41.0 && lng1 === -73.0) return 150; // Computer 1
      if (lat1 === 39.0 && lng1 === -75.0) return 300; // Computer 2
      return Math.random() * 1000; // Random for other clicks
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
    return accuracy === 0.5
      ? { lat: 41.0, lng: -73.0 } // Computer 1
      : { lat: 39.0, lng: -75.0 }; // Computer 2
  }),
}));

describe("Critical Bugs", () => {
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

  it("should end round immediately when all players have guessed - EXPECTED TO FAIL", async () => {
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

    console.log("Starting round - all players need to guess");

    // Human makes guess
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
    console.log("After human guess, total guesses:", afterHumanGuess);
    expect(afterHumanGuess).toBe("1");

    // Wait for computer players to make their guesses
    console.log("Waiting for computer players to guess...");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 6000)); // Wait for computer guesses
    });

    const afterComputerGuesses =
      screen.getByTestId("total-guesses").textContent;
    console.log("After computer guesses, total guesses:", afterComputerGuesses);

    // Should have 3 total guesses now (1 human + 2 computer)
    expect(afterComputerGuesses).toBe("3");

    console.log(
      "All players have guessed (3/3) - round should end immediately",
    );

    // Wait for round to end automatically (should be immediate since all players guessed)
    const roundEndedQuickly = await Promise.race([
      // Round should end quickly since all players guessed
      waitFor(
        () => {
          const results = screen.queryByText("Round Results");
          if (results) {
            console.log("✅ Round ended with results screen");
            return true;
          }
          throw new Error("Round Results not found yet");
        },
        { timeout: 3000 },
      )
        .then(() => true)
        .catch(() => false),

      // Timeout after 3 seconds - round should have ended by now
      new Promise((resolve) =>
        setTimeout(() => {
          console.log(
            "❌ 3 second timeout - round should have ended immediately when all players guessed",
          );
          resolve(false);
        }, 3000),
      ),
    ]);

    if (!roundEndedQuickly) {
      console.error(
        "BUG: Round did not end when all players finished guessing!",
      );
      console.error(
        "Expected: Round ends immediately when all 3 players have guessed",
      );
      console.error(
        "Actual: Round continues running even though all players finished",
      );
      throw new Error(
        "Round ending bug: Round did not end when all players guessed",
      );
    }

    console.log("✅ Round ended properly when all players finished guessing");
  }, 15000);

  it("should prevent multiple guesses by checking onMapClick prop - EXPECTED TO FAIL", async () => {
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

    console.log("Testing multiple guess prevention...");

    // Check initial state - clicking should be enabled
    const initialClickState = screen.getByTestId("click-enabled").textContent;
    console.log("Initial click state:", initialClickState);
    expect(initialClickState).toBe("enabled");

    // First guess - should be allowed
    console.log("Making first guess...");
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    const afterFirstGuess = screen.getByTestId("total-guesses").textContent;
    console.log("After first guess, total guesses:", afterFirstGuess);
    expect(afterFirstGuess).toBe("1");

    // Check if clicking is now disabled
    const afterFirstClickState =
      screen.getByTestId("click-enabled").textContent;
    console.log("After first guess, click state:", afterFirstClickState);

    if (afterFirstClickState === "enabled") {
      console.error("❌ BUG: Map clicking still enabled after first guess!");
    }

    // Try to make multiple additional guesses
    console.log("Attempting multiple additional guesses...");
    for (let i = 2; i <= 5; i++) {
      console.log(`Attempting guess #${i}...`);
      await act(async () => {
        fireEvent.click(screen.getByTestId("map-click"));
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      const currentGuessCount = screen.getByTestId("total-guesses").textContent;
      console.log(`After attempt #${i}, total guesses: ${currentGuessCount}`);

      if (currentGuessCount !== "1") {
        console.error(
          `❌ BUG: Multiple guessing allowed! Guess count increased to ${currentGuessCount}`,
        );

        // Check what guesses are visible
        const humanGuesses = screen
          .queryAllByTestId(/^visible-guess-\d+$/)
          .filter((el) => el.textContent?.includes("Human Player"));

        console.error(`Human player has made ${humanGuesses.length} guesses:`);
        humanGuesses.forEach((guess, index) => {
          console.error(`  Guess ${index + 1}:`, guess.textContent);
        });

        throw new Error(
          `Multiple guessing bug: Human player made ${humanGuesses.length} guesses, should only be 1`,
        );
      }
    }

    console.log("✅ Multiple guessing properly prevented");
  }, 15000);

  it("should demonstrate the actual user experience bug", async () => {
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

    console.log("=== REPRODUCING USER EXPERIENCE ===");

    // Human makes first guess
    console.log("1. Human makes initial guess");
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    // Wait for all computer players to guess
    console.log("2. Waiting for computer players to finish...");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
    });

    const allPlayersGuessed = screen.getByTestId("total-guesses").textContent;
    console.log("3. All players have guessed:", allPlayersGuessed);

    // Check if round ended
    const roundResults = screen.queryByText("Round Results");
    if (!roundResults) {
      console.log("4. Round has NOT ended despite all players guessing");
      console.log(
        "5. User tries to make more guesses because round appears stuck...",
      );

      // User gets frustrated and tries clicking more
      for (let i = 1; i <= 3; i++) {
        console.log(`6.${i}. User clicks map again (attempt ${i})...`);
        await act(async () => {
          fireEvent.click(screen.getByTestId("map-click"));
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
        });

        const newGuessCount = screen.getByTestId("total-guesses").textContent;
        console.log(`    Result: ${newGuessCount} total guesses`);
      }

      const finalGuessCount = screen.getByTestId("total-guesses").textContent;
      console.log("7. Final state:", finalGuessCount, "total guesses");

      if (finalGuessCount !== "3") {
        console.error("❌ CONFIRMED: Both bugs present!");
        console.error("  Bug 1: Round did not end when all players guessed");
        console.error("  Bug 2: Multiple guessing was allowed");
        throw new Error(
          `User experience bugs confirmed: ${finalGuessCount} guesses instead of 3, round never ended`,
        );
      }
    } else {
      console.log("4. Round ended properly when all players finished");
    }
  }, 20000);
});
