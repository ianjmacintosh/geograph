import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Results from "../routes/results";
import type { Game as GameType, FinalResults } from "../types/game";

// Mock the useGame hook directly
const mockUseGame = vi.fn();
vi.mock("../contexts/GameContext", () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useGame: () => mockUseGame(),
}));

describe("Final Results Screen", () => {
  let mockGame: GameType;
  let mockFinalResults: FinalResults;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllTimers();
    mockFinalResults = {
      playerScores: [
        {
          playerId: "player1",
          playerName: "Human Player",
          isComputer: false,
          totalScore: 15,
          finalPlacement: 1,
        },
        {
          playerId: "player2",
          playerName: "Computer1",
          isComputer: true,
          totalScore: 12,
          finalPlacement: 2,
        },
        {
          playerId: "player3",
          playerName: "Computer2",
          isComputer: true,
          totalScore: 8,
          finalPlacement: 3,
        },
      ],
      winnerId: "player1",
      winnerIds: ["player1"],
      gameEndTime: Date.now(),
    };

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
      status: "finished" as const,
      settings: {
        maxPlayers: 8,
        roundTimeLimit: 30000,
        totalRounds: 3,
        cityDifficulty: "easy" as const,
      },
      finalResults: mockFinalResults,
      createdAt: Date.now(),
    };

    mockUseGame.mockReturnValue({
      currentGame: mockGame,
      clearGame: vi.fn(),
      finishGame: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should display final results when available", () => {
    render(
      <MemoryRouter initialEntries={["/results"]}>
        <Results />
      </MemoryRouter>,
    );

    // Check that the winner is displayed (appears in both winner section and standings)
    expect(screen.getAllByText("Human Player")).toHaveLength(2);
    expect(screen.getByText("15 points")).toBeInTheDocument();

    // Check that all players are shown in standings
    expect(screen.getByText("Computer1")).toBeInTheDocument();
    expect(screen.getByText("Computer2")).toBeInTheDocument();

    // Check placement indicators
    expect(screen.getByText("🥇")).toBeInTheDocument();
    expect(screen.getByText("🥈")).toBeInTheDocument();
    expect(screen.getByText("🥉")).toBeInTheDocument();

    // Check game summary
    expect(screen.getByText("Rounds Played")).toBeInTheDocument();
    expect(screen.getByText("Players")).toBeInTheDocument();
    expect(screen.getByText("easy")).toBeInTheDocument(); // Difficulty
  });

  it("should show loading when no final results", () => {
    // Mock game without final results
    const gameWithoutResults = { ...mockGame, finalResults: undefined };
    mockUseGame.mockReturnValue({
      currentGame: gameWithoutResults,
      clearGame: vi.fn(),
      finishGame: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/results"]}>
        <Results />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading results...")).toBeInTheDocument();
  });

  it("should show loading when no current game", () => {
    mockUseGame.mockReturnValue({
      currentGame: null,
      clearGame: vi.fn(),
      finishGame: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/results"]}>
        <Results />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading results...")).toBeInTheDocument();
  });

  it("should display correct winner information", () => {
    render(
      <MemoryRouter initialEntries={["/results"]}>
        <Results />
      </MemoryRouter>,
    );

    // Check winner section
    expect(screen.getByText("WINNER")).toBeInTheDocument();
    expect(screen.getByText("15 points")).toBeInTheDocument();
    expect(screen.getAllByText("Human Player")).toHaveLength(2); // Winner and standings
  });

  it("should handle computer winner correctly", () => {
    // Make computer win
    const computerWinResults = {
      ...mockFinalResults,
      playerScores: [
        {
          playerId: "player2",
          playerName: "Computer1",
          isComputer: true,
          totalScore: 20,
          finalPlacement: 1,
        },
        {
          playerId: "player1",
          playerName: "Human Player",
          isComputer: false,
          totalScore: 15,
          finalPlacement: 2,
        },
        {
          playerId: "player3",
          playerName: "Computer2",
          isComputer: true,
          totalScore: 8,
          finalPlacement: 3,
        },
      ],
      winnerId: "player2",
    };

    const gameWithComputerWin = {
      ...mockGame,
      finalResults: computerWinResults,
    };
    mockUseGame.mockReturnValue({
      currentGame: gameWithComputerWin,
      clearGame: vi.fn(),
      finishGame: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/results"]}>
        <Results />
      </MemoryRouter>,
    );

    // Check that computer winner is displayed correctly
    expect(screen.getAllByText("Computer1")).toHaveLength(2); // Winner and standings
    expect(screen.getByText("20 points")).toBeInTheDocument();
    expect(screen.getByText("Computer")).toBeInTheDocument();
  });
});
