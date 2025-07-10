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

// Mock WorldMap that allows multiple clicks and shows all guesses
vi.mock("../components/WorldMap", () => ({
  WorldMap: ({ onMapClick, guesses, showTarget }: any) => (
    <div data-testid="world-map">
      <button
        onClick={() => onMapClick && onMapClick(40.7128, -74.006)}
        data-testid="map-click"
        disabled={!onMapClick}
      >
        Click Map ({guesses.length} guesses)
      </button>
      <div data-testid="show-target">
        {showTarget ? "target-visible" : "target-hidden"}
      </div>
      <div data-testid="total-guesses">{guesses.length}</div>
      {guesses.map((guess: any, index: number) => (
        <div key={index} data-testid={`visible-guess-${index}`}>
          {guess.playerName}: {guess.lat.toFixed(4)}, {guess.lng.toFixed(4)}
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

// Mock game utilities with realistic behavior
vi.mock("../utils/game", () => ({
  calculateDistance: vi.fn(
    (lat1: number, lng1: number, lat2: number, lng2: number) => {
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
    return accuracy === 0.5
      ? { lat: 41.0, lng: -73.0 } // Computer 1
      : { lat: 39.0, lng: -75.0 }; // Computer 2
  }),
}));

describe("New Regression Bugs", () => {
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

  it("should prevent multiple guesses from the same player - EXPECTED TO FAIL", async () => {
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

    console.log("Initial state - no guesses yet");
    const initialGuessCount = screen.getByTestId("total-guesses").textContent;
    expect(initialGuessCount).toBe("0");

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

    // Try to make a second guess - THIS SHOULD BE PREVENTED
    console.log("Attempting second guess (should be prevented)...");
    const mapButton = screen.getByTestId("map-click");

    // Check if button is disabled
    if (!mapButton.hasAttribute("disabled")) {
      console.log("❌ BUG: Map button is still enabled after first guess!");
    }

    // Try clicking anyway
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    // Wait a moment to see if the guess count increased
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    const afterSecondClick = screen.getByTestId("total-guesses").textContent;
    console.log("After second click attempt, total guesses:", afterSecondClick);

    // Check for human player guesses specifically
    const humanGuesses = screen
      .queryAllByTestId(/^visible-guess-\d+$/)
      .filter((el) => el.textContent?.includes("Human Player"));

    console.log("Human player guesses found:", humanGuesses.length);
    humanGuesses.forEach((guess, index) => {
      console.log(`Human guess ${index}:`, guess.textContent);
    });

    if (humanGuesses.length > 1) {
      throw new Error(
        `Multiple guessing bug detected! Human player made ${humanGuesses.length} guesses, should only be 1`,
      );
    }

    if (afterSecondClick !== "1" && !afterSecondClick?.startsWith("1")) {
      throw new Error(
        `Multiple guessing bug detected! Total guesses increased from 1 to ${afterSecondClick} after second click`,
      );
    }

    console.log("✅ Multiple guessing is properly prevented");
  }, 15000);

  it("should hide other players guesses until human player guesses - EXPECTED TO FAIL", async () => {
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

    console.log("Waiting for computer players to make their guesses...");

    // Wait for computer players to make guesses (before human guesses)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 4000)); // Wait for computer guesses
    });

    const beforeHumanGuess = screen.getByTestId("total-guesses").textContent;
    console.log("Before human guess, total guesses visible:", beforeHumanGuess);

    // Check what guesses are visible before human guesses
    const visibleGuessesBefore = screen.queryAllByTestId(/^visible-guess-\d+$/);
    console.log(
      "Visible guesses before human guess:",
      visibleGuessesBefore.length,
    );

    visibleGuessesBefore.forEach((guess, index) => {
      console.log(`Visible guess ${index}:`, guess.textContent);
    });

    // Check for computer player guesses showing before human guesses
    const computerGuessesVisible = visibleGuessesBefore.filter(
      (el) =>
        el.textContent?.includes("Computer1") ||
        el.textContent?.includes("Computer2"),
    );

    if (computerGuessesVisible.length > 0) {
      console.log(
        "❌ BUG: Computer guesses are visible before human player guesses!",
      );
      throw new Error(
        `Guess visibility bug detected! ${computerGuessesVisible.length} computer guesses visible before human guess`,
      );
    }

    // Now make human guess
    console.log("Human player making guess...");
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    // Wait for all guesses to be visible
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    const afterHumanGuess = screen.getByTestId("total-guesses").textContent;
    console.log("After human guess, total guesses visible:", afterHumanGuess);

    const visibleGuessesAfter = screen.queryAllByTestId(/^visible-guess-\d+$/);
    console.log(
      "Visible guesses after human guess:",
      visibleGuessesAfter.length,
    );

    // Now all guesses should be visible
    if (visibleGuessesAfter.length === 0) {
      throw new Error("No guesses visible after human player guesses");
    }

    console.log("✅ Guess visibility is properly controlled");
  }, 15000);

  it("should end round after all players guess OR timer expires - EXPECTED TO FAIL", async () => {
    // Test the round ending logic with a shorter timer
    const shortTimerMockGame = {
      ...mockGame,
      settings: {
        ...mockGame.settings,
        roundTimeLimit: 5000, // 5 second timer for testing
      },
    };

    mockUseGame.mockReturnValue({
      currentGame: shortTimerMockGame,
      clearGame: vi.fn(),
      finishGame: vi.fn(),
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

    console.log("Testing round ending logic...");

    // Check initial timer
    const timerElement = screen.getByText(/Time:/);
    console.log("Initial timer text:", timerElement.textContent);

    // Make human guess
    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("✅ Guess submitted! Waiting for other players..."),
      ).toBeInTheDocument();
    });

    console.log("Human guess made, waiting for round to end...");

    // Wait for either all players to guess or timer to expire
    const roundEndedWithAllGuesses = await Promise.race([
      // Wait for round results to appear (indicating round ended)
      waitFor(
        () => {
          const results = screen.queryByText("Round Results");
          if (results) {
            console.log("✅ Round ended with results screen");
            return true;
          }
          throw new Error("Not found yet");
        },
        { timeout: 10000 },
      )
        .then(() => "results")
        .catch(() => null),

      // Wait for timer to run out
      waitFor(
        () => {
          const timer = screen.getByText(/Time:/);
          if (timer.textContent?.includes("0s")) {
            console.log("⏰ Timer reached 0");
            return true;
          }
          throw new Error("Timer not at 0 yet");
        },
        { timeout: 10000 },
      )
        .then(() => "timer")
        .catch(() => null),

      // Timeout after reasonable wait
      new Promise((resolve) =>
        setTimeout(() => {
          console.log("❌ Timeout - round never ended");
          resolve("timeout");
        }, 12000),
      ),
    ]);

    console.log("Round ending result:", roundEndedWithAllGuesses);

    if (roundEndedWithAllGuesses === "timeout") {
      throw new Error(
        "Round ending bug detected! Round did not end within reasonable time",
      );
    }

    if (roundEndedWithAllGuesses === "timer") {
      // Timer expired, check if round properly ended
      await waitFor(
        () => {
          expect(screen.getByText("Round Results")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    }

    // Verify round actually ended by checking for results
    const roundResults = screen.queryByText("Round Results");
    if (!roundResults) {
      throw new Error(
        "Round ending bug detected! No round results shown after round should have ended",
      );
    }

    console.log("✅ Round properly ended");
  }, 20000);

  it("should progress through multiple rounds correctly", async () => {
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

    // Verify we're in round 1
    expect(screen.getAllByText("Round 1 of 3").length).toBeGreaterThan(0);
    console.log("✅ Started in Round 1");

    // Complete first round
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

    console.log("✅ Round 1 completed, looking for Next Round button...");

    // Click Next Round button
    const nextRoundButton = await waitFor(
      () => {
        const button = screen.getByText("Next Round");
        expect(button).toBeInTheDocument();
        return button;
      },
      { timeout: 5000 },
    );

    await act(async () => {
      fireEvent.click(nextRoundButton);
    });

    console.log("Clicked Next Round button, waiting for Round 2...");

    // Wait for round 2 to start (check both possible locations for round text)
    console.log("Waiting for Round 2 text to appear...");
    await waitFor(
      () => {
        const round2Texts = screen.queryAllByText("Round 2 of 3");
        console.log("Found Round 2 texts:", round2Texts.length);
        if (round2Texts.length > 0) {
          console.log("✅ Round 2 started");
          return true;
        }
        throw new Error("Round 2 text not found yet");
      },
      { timeout: 15000 },
    );

    // Make human guess in Round 2
    console.log("Making human guess in Round 2...");

    // Check if map is clickable
    const mapButton = screen.getByTestId("map-click");
    console.log("Map button disabled?", mapButton.hasAttribute("disabled"));
    console.log("Map button text:", mapButton.textContent);

    await act(async () => {
      fireEvent.click(screen.getByTestId("map-click"));
    });

    console.log("Clicked map in Round 2, waiting for guess confirmation...");

    try {
      await waitFor(
        () => {
          expect(
            screen.getByText(
              "✅ Guess submitted! Waiting for other players...",
            ),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
      console.log("✅ Human guess confirmed in Round 2");
    } catch (error) {
      console.error("❌ Human guess NOT confirmed in Round 2");
      const currentText = screen.getByText(
        /Click on the map to guess where|✅ Guess submitted!/,
      );
      console.log("Current text after click:", currentText.textContent);
      throw error;
    }

    // Wait for computer players to complete their guesses in Round 2
    console.log("Waiting for computer players to complete Round 2 guesses...");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 8000)); // Wait longer for computer guesses
    });

    // Wait for Round 2 to complete
    await waitFor(
      () => {
        expect(screen.getByText("Round Results")).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    console.log("✅ Round 2 completed successfully");
    console.log("✅ Round progression working correctly");
  }, 25000);
});
