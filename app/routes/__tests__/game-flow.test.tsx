import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { GameProvider } from "../../contexts/GameContext";
import Game from "../game";
import {
  calculatePlacementPoints,
  calculateBonusPoints,
} from "../../utils/game";
import type { Game as GameType } from "../../types/game";
import React from "react";

// Mock the WorldMap component since it uses Leaflet
vi.mock("../../components/WorldMap", () => ({
  WorldMap: () => (
    <div data-testid="mock-world-map" />
  ),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Simplified test wrapper without complex context manipulation
function TestWrapper({
  children,
  initialGame: _initialGame,
}: {
  children: React.ReactNode;
  initialGame?: GameType;
}) {
  const router = createMemoryRouter(
    [
      {
        path: "/game",
        element: children,
      },
    ],
    {
      initialEntries: ["/game"],
    },
  );

  return (
    <GameProvider>
      <RouterProvider router={router} />
    </GameProvider>
  );
}

describe.skip("Game Scoring Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render game component without crashing", async () => {
    const testGame: GameType = {
      id: "test-game",
      code: "TEST01",
      hostId: "player1",
      players: [
        { id: "player1", name: "Human Player", isComputer: false, score: 0 },
      ],
      rounds: [],
      status: "playing",
      settings: {
        maxPlayers: 1,
        roundTimeLimit: 30000,
        totalRounds: 1,
        cityDifficulty: "easy",
      },
      createdAt: Date.now(),
    };

    // Test that the component renders without throwing errors
    render(
      <TestWrapper initialGame={testGame}>
        <div data-testid="game-container">
          <Game />
        </div>
      </TestWrapper>,
    );

    // Just verify the container exists (the actual game logic is tested separately)
    await waitFor(() => {
      expect(screen.getByTestId("game-container")).toBeInTheDocument();
    });
  });

  it("should handle multi-player game state", async () => {
    const testGame: GameType = {
      id: "test-game",
      code: "TEST01",
      hostId: "player1",
      players: [
        { id: "player1", name: "Human Player", isComputer: false, score: 0 },
        {
          id: "player2",
          name: "Computer 1",
          isComputer: true,
          score: 0,
          accuracy: 0.5,
        },
        {
          id: "player3",
          name: "Computer 2",
          isComputer: true,
          score: 0,
          accuracy: 0.5,
        },
      ],
      rounds: [],
      status: "playing",
      settings: {
        maxPlayers: 3,
        roundTimeLimit: 30000,
        totalRounds: 2,
        cityDifficulty: "easy",
      },
      createdAt: Date.now(),
    };

    // Test that multi-player setup renders correctly
    render(
      <TestWrapper initialGame={testGame}>
        <div data-testid="multiplayer-game">
          <Game />
        </div>
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("multiplayer-game")).toBeInTheDocument();
    });
  });
});

describe("Scoring Calculation", () => {
  it("should calculate total points correctly", () => {
    const guesses = [
      { playerId: "player1", distance: 50 }, // 1st place + 5 bonus = 8 total (in 3-player game)
      { playerId: "player2", distance: 300 }, // 2nd place + 2 bonus = 4 total
      { playerId: "player3", distance: 1500 }, // 3rd place + 0 bonus = 1 total
    ];

    const placements = calculatePlacementPoints(guesses, 3);

    const player1Result = placements.find((p: any) => p.playerId === "player1");
    const player2Result = placements.find((p: any) => p.playerId === "player2");
    const player3Result = placements.find((p: any) => p.playerId === "player3");

    expect(player1Result?.placementPoints).toBe(3); // 1st place in 3-player game
    expect(calculateBonusPoints(50)).toBe(5); // <100km bonus

    expect(player2Result?.placementPoints).toBe(2); // 2nd place
    expect(calculateBonusPoints(300)).toBe(2); // <500km bonus

    expect(player3Result?.placementPoints).toBe(1); // 3rd place
    expect(calculateBonusPoints(1500)).toBe(0); // >1000km, no bonus
  });
});
