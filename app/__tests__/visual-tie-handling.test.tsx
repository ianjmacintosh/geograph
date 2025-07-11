import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { GameProvider } from "../contexts/GameContext";
// Note: Game import preserved for future test development
// import Game from "../routes/game";
import Results from "../routes/results";
// Note: calculateFinalPlacements import preserved for future test development
// import { calculateFinalPlacements } from "../utils/game";

// Mock WebSocket
vi.mock("../hooks/useWebSocket", () => ({
  useWebSocket: () => ({
    sendMessage: vi.fn(),
    lastMessage: null,
    connectionStatus: "Connected",
    disconnect: vi.fn(),
  }),
}));

// Mock cities data
vi.mock("../data/cities", () => ({
  getRandomCityByDifficulty: vi.fn(() => ({
    id: "paris",
    name: "Paris",
    country: "France",
    lat: 48.8566,
    lng: 2.3522,
    population: 2161000,
    difficulty: "easy" as const,
  })),
}));

// Mock game utilities
vi.mock("../utils/game", () => ({
  calculateDistance: vi.fn(() => 100), // Always return 100km for predictable ties
  calculateBonusPoints: vi.fn(() => 5),
  calculatePlacementPoints: vi.fn((guesses: any[], totalPlayers: number) => {
    // Mock round-level tie handling
    return guesses.map((guess, index) => ({
      playerId: guess.playerId,
      placementPoints: totalPlayers - index,
      placement: index + 1,
    }));
  }),
  calculateFinalPlacements: vi.fn((playerScores: any[]) => {
    // Create a predictable tie scenario
    const sorted = [...playerScores].sort(
      (a, b) => b.totalScore - a.totalScore,
    );

    // Simulate tie: first two players have same score
    if (sorted.length >= 2) {
      sorted[0].totalScore = 15;
      sorted[1].totalScore = 15; // Same as first player
      sorted[0].finalPlacement = 1;
      sorted[1].finalPlacement = 1; // Tied for first
      if (sorted[2]) {
        sorted[2].finalPlacement = 3; // Third place (2nd is skipped)
      }
    }

    return sorted;
  }),
  generateGameCode: vi.fn(() => "1234"),
  createHumanPlayer: vi.fn((name: string) => ({
    id: `player-${name}`,
    name,
    isComputer: false,
    score: 0,
  })),
  createComputerPlayer: vi.fn((name: string) => ({
    id: `computer-${name}`,
    name,
    isComputer: true,
    score: 0,
    accuracy: 0.5,
  })),
}));

// Mock leaflet
vi.mock("leaflet", () => ({
  map: vi.fn(() => ({
    setView: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn(),
  })),
  marker: vi.fn(() => ({
    addTo: vi.fn(),
    bindPopup: vi.fn(),
    remove: vi.fn(),
  })),
  icon: vi.fn(() => ({})),
}));

// Create a mock game with tie scenario
const createTieGame = () => ({
  id: "test-game",
  code: "1234",
  hostId: "player-alice",
  players: [
    { id: "player-alice", name: "Alice", isComputer: false, score: 0 },
    { id: "player-bob", name: "Bob", isComputer: false, score: 0 },
    {
      id: "computer-charlie",
      name: "Charlie",
      isComputer: true,
      score: 0,
      accuracy: 0.5,
    },
  ],
  rounds: [
    {
      id: "round-1",
      city: {
        id: "paris",
        name: "Paris",
        country: "France",
        lat: 48.8566,
        lng: 2.3522,
        population: 2161000,
        difficulty: "easy" as const,
      },
      guesses: [
        {
          playerId: "player-alice",
          lat: 48.8566,
          lng: 2.3522,
          distance: 100,
          placementPoints: 3,
          bonusPoints: 5,
          totalPoints: 8,
          placement: 1,
          timestamp: Date.now(),
        },
        {
          playerId: "player-bob",
          lat: 48.8566,
          lng: 2.3522,
          distance: 100,
          placementPoints: 3,
          bonusPoints: 5,
          totalPoints: 8,
          placement: 1,
          timestamp: Date.now(),
        },
        {
          playerId: "computer-charlie",
          lat: 48.8566,
          lng: 2.3522,
          distance: 200,
          placementPoints: 1,
          bonusPoints: 2,
          totalPoints: 3,
          placement: 3,
          timestamp: Date.now(),
        },
      ],
      completed: true,
      startTime: Date.now(),
      endTime: Date.now(),
    },
  ],
  status: "finished" as const,
  settings: {
    maxPlayers: 8,
    roundTimeLimit: 30000,
    totalRounds: 1,
    cityDifficulty: "easy" as const,
  },
  finalResults: {
    playerScores: [
      {
        playerId: "player-alice",
        playerName: "Alice",
        isComputer: false,
        totalScore: 15,
        finalPlacement: 1,
      },
      {
        playerId: "player-bob",
        playerName: "Bob",
        isComputer: false,
        totalScore: 15,
        finalPlacement: 1,
      }, // Tied with Alice
      {
        playerId: "computer-charlie",
        playerName: "Charlie",
        isComputer: true,
        totalScore: 10,
        finalPlacement: 3,
      }, // 3rd place (2nd skipped)
    ],
    winnerId: "player-alice",
    winnerIds: ["player-alice", "player-bob"], // Both winners
    gameEndTime: Date.now(),
  },
  createdAt: Date.now(),
});

describe.skip("Visual Tie Handling Test", () => {
  let mockGame: any;

  beforeEach(() => {
    mockGame = createTieGame();
    vi.clearAllMocks();
  });

  it("should visually demonstrate tie handling in game results", async () => {
    console.log("\n🎮 === VISUAL TIE HANDLING TEST ===");
    console.log(
      "This test demonstrates how ties are handled in the game interface\n",
    );

    // Create router with Results component
    const router = createMemoryRouter(
      [
        {
          path: "/results",
          element: <Results />,
        },
      ],
      {
        initialEntries: ["/results"],
      },
    );

    // Mock GameContext to provide our tie game
    const MockGameProvider = ({ children }: { children: React.ReactNode }) => {
      const mockContextValue = {
        currentGame: mockGame,
        finalResults: mockGame.finalResults,
        isLoading: false,
        error: null,
        createGame: vi.fn(),
        joinGame: vi.fn(),
        startGame: vi.fn(),
        makeGuess: vi.fn(),
        nextRound: vi.fn(),
        finishGame: vi.fn(),
        resetGame: vi.fn(),
        addComputerPlayers: vi.fn(),
        updateGameSettings: vi.fn(),
        removePlayer: vi.fn(),
        setCurrentGame: vi.fn(),
      };

      return <GameProvider value={mockContextValue}>{children}</GameProvider>;
    };

    // Render the Results component
    render(
      <MockGameProvider>
        <RouterProvider router={router} />
      </MockGameProvider>,
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText("Game Results")).toBeInTheDocument();
    });

    console.log("✅ Results screen rendered successfully");

    // Check that tie handling is working
    const aliceElement = screen.getByText("Alice");
    const bobElement = screen.getByText("Bob");
    const charlieElement = screen.getByText("Charlie");

    expect(aliceElement).toBeInTheDocument();
    expect(bobElement).toBeInTheDocument();
    expect(charlieElement).toBeInTheDocument();

    console.log("✅ All players are displayed");

    // Check for placement indicators
    const placementElements = screen.getAllByText(/#[0-9]+/);
    console.log(
      "📊 Placement indicators found:",
      placementElements.map((el) => el.textContent),
    );

    // Look for tied players (both should show #1)
    const firstPlaceElements = screen.getAllByText(/#1/);
    expect(firstPlaceElements).toHaveLength(2); // Alice and Bob tied for 1st

    console.log("🏆 Found 2 players tied for 1st place");

    // Look for 3rd place (Charlie should skip 2nd place)
    const thirdPlaceElements = screen.getAllByText(/#3/);
    expect(thirdPlaceElements).toHaveLength(1); // Charlie in 3rd

    console.log(
      "🥉 Found 1 player in 3rd place (2nd place skipped due to tie)",
    );

    // Test the actual tie handling logic
    const playerScores = [
      {
        playerId: "alice",
        playerName: "Alice",
        isComputer: false,
        totalScore: 15,
        finalPlacement: 0,
      },
      {
        playerId: "bob",
        playerName: "Bob",
        isComputer: false,
        totalScore: 15,
        finalPlacement: 0,
      },
      {
        playerId: "charlie",
        playerName: "Charlie",
        isComputer: true,
        totalScore: 10,
        finalPlacement: 0,
      },
    ];

    // Use the real calculateFinalPlacements function (not mocked)
    const { calculateFinalPlacements: realCalculateFinalPlacements } =
      (await vi.importActual("../utils/game")) as any;
    const results = realCalculateFinalPlacements(playerScores);

    console.log("🔍 Testing actual tie handling logic:");
    console.log(
      "Input scores:",
      playerScores.map((p) => `${p.playerName}: ${p.totalScore}`),
    );
    console.log(
      "Output placements:",
      results.map(
        (p) => `${p.playerName}: #${p.finalPlacement} (${p.totalScore} points)`,
      ),
    );

    expect(results[0].finalPlacement).toBe(1);
    expect(results[1].finalPlacement).toBe(1);
    expect(results[2].finalPlacement).toBe(3);

    console.log("✅ Tie handling logic works correctly!");
    console.log("🎉 === TEST COMPLETED SUCCESSFULLY ===\n");
  });

  it("should demonstrate round-level tie handling", async () => {
    console.log("\n🎯 === ROUND-LEVEL TIE TEST ===");

    // Test round guesses with ties
    const roundGuesses = [
      { playerId: "alice", distance: 100 },
      { playerId: "bob", distance: 100 }, // Same distance as Alice
      { playerId: "charlie", distance: 200 },
    ];

    const { calculatePlacementPoints: realCalculatePlacementPoints } =
      (await vi.importActual("../utils/game")) as any;
    const roundResults = realCalculatePlacementPoints(roundGuesses, 3);

    console.log("🔍 Round tie handling:");
    console.log(
      "Input distances:",
      roundGuesses.map((g) => `${g.playerId}: ${g.distance}km`),
    );
    console.log(
      "Output placements:",
      roundResults.map(
        (r) => `${r.playerId}: #${r.placement} (${r.placementPoints} points)`,
      ),
    );

    expect(roundResults[0].placement).toBe(1);
    expect(roundResults[1].placement).toBe(1);
    expect(roundResults[2].placement).toBe(3);

    console.log("✅ Round-level ties handled correctly!");
    console.log("🎉 === ROUND TEST COMPLETED ===\n");
  });
});
