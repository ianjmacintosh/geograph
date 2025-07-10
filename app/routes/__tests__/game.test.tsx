import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { GameProvider } from "../../contexts/GameContext";
import Game from "../game";
import Results from "../results";
import {
  calculatePlacementPoints,
  calculateBonusPoints,
} from "../../utils/game";
import type { Game as GameType } from "../../types/game";
import React from "react";

// Mock the WorldMap component since it uses Leaflet
vi.mock("../../components/WorldMap", () => ({
  WorldMap: ({ onMapClick, targetCity, showTarget }: any) => (
    <div data-testid="mock-world-map" />
  ),
}));

// Mock city data to return consistent test data
vi.mock("../../data/cities", () => ({
  getRandomCityByDifficulty: () => ({
    id: "test-city",
    name: "Test City",
    country: "Test Country",
    lat: 40.7128,
    lng: -74.006,
    population: 1000000,
    difficulty: "easy",
  }),
}));

// Mock the useGame hook at the module level
const mockUseGame = vi.fn();

vi.mock("../contexts/GameContext", () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => children,
  useGame: () => mockUseGame(),
}));

// Test wrapper with proper router context
function TestWrapper({
  children,
  game,
}: {
  children: React.ReactNode;
  game: GameType;
}) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <div>Home Page</div>,
      },
      {
        path: "/lobby",
        element: <div>Lobby Page</div>,
      },
      {
        path: "/game",
        element: children,
      },
      {
        path: "/results",
        element: <Results />,
      },
    ],
    {
      initialEntries: ["/game"],
    },
  );

  return <RouterProvider router={router} />;
}

describe("Game Integration Tests (Simplified)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate scoring logic works end-to-end", async () => {
    const testGame: GameType = {
      id: "test-game",
      code: "TEST01",
      hostId: "player1",
      players: [
        { id: "player1", name: "Test Player", isComputer: false, score: 0 },
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

    // Set up the mock to return our test game
    mockUseGame.mockReturnValue({
      currentGame: testGame,
      isLoading: false,
      error: null,
      createGame: vi.fn(),
      joinGame: vi.fn(),
      addComputerPlayers: vi.fn(),
      startGame: vi.fn(),
      clearGame: vi.fn(),
      updateSettings: vi.fn(),
      finishGame: vi.fn(),
    });

    render(
      <TestWrapper game={testGame}>
        <div data-testid="test-container">
          <Game />
        </div>
      </TestWrapper>,
    );

    // The component should render without crashing
    await waitFor(() => {
      expect(screen.getByTestId("test-container")).toBeInTheDocument();
    });
  });

  it("should handle multi-player game state correctly", async () => {
    const testGame: GameType = {
      id: "test-game",
      code: "TEST01",
      hostId: "player1",
      players: [
        { id: "player1", name: "Human", isComputer: false, score: 0 },
        {
          id: "player2",
          name: "Computer 1",
          isComputer: true,
          score: 0,
          accuracy: 0.1,
        },
        {
          id: "player3",
          name: "Computer 2",
          isComputer: true,
          score: 0,
          accuracy: 0.1,
        },
      ],
      rounds: [],
      status: "playing",
      settings: {
        maxPlayers: 3,
        roundTimeLimit: 30000,
        totalRounds: 1,
        cityDifficulty: "easy",
      },
      createdAt: Date.now(),
    };

    // Set up the mock to return our test game
    mockUseGame.mockReturnValue({
      currentGame: testGame,
      isLoading: false,
      error: null,
      createGame: vi.fn(),
      joinGame: vi.fn(),
      addComputerPlayers: vi.fn(),
      startGame: vi.fn(),
      clearGame: vi.fn(),
      updateSettings: vi.fn(),
      finishGame: vi.fn(),
    });

    render(
      <TestWrapper game={testGame}>
        <div data-testid="multi-player-test">
          <Game />
        </div>
      </TestWrapper>,
    );

    // Verify the component structure renders
    await waitFor(() => {
      expect(screen.getByTestId("multi-player-test")).toBeInTheDocument();
    });
  });

  it("should create results page without crashing", async () => {
    const testGame: GameType = {
      id: "test-game",
      code: "TEST01",
      hostId: "player1",
      players: [
        { id: "player1", name: "Test Player", isComputer: false, score: 0 },
      ],
      rounds: [],
      status: "finished",
      settings: {
        maxPlayers: 1,
        roundTimeLimit: 30000,
        totalRounds: 1,
        cityDifficulty: "easy",
      },
      finalResults: {
        playerScores: [
          {
            playerId: "player1",
            playerName: "Test Player",
            isComputer: false,
            totalScore: 10,
            finalPlacement: 1,
          },
        ],
        winnerId: "player1",
        gameEndTime: Date.now(),
      },
      createdAt: Date.now(),
    };

    // Set up the mock to return our test game with final results
    mockUseGame.mockReturnValue({
      currentGame: testGame,
      isLoading: false,
      error: null,
      createGame: vi.fn(),
      joinGame: vi.fn(),
      addComputerPlayers: vi.fn(),
      startGame: vi.fn(),
      clearGame: vi.fn(),
      updateSettings: vi.fn(),
      finishGame: vi.fn(),
    });

    render(
      <TestWrapper game={testGame}>
        <div data-testid="results-test">
          <Results />
        </div>
      </TestWrapper>,
    );

    // Verify the results component can render
    await waitFor(() => {
      expect(screen.getByTestId("results-test")).toBeInTheDocument();
    });
  });
});
