import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useComputerPlayers } from "../useComputerPlayers";
import type { Game, GameRound, City } from "../../types/game";

// Mock the game utilities
vi.mock("../../utils/game", () => ({
  generateComputerGuess: vi.fn(() => ({
    lat: 40.0,
    lng: -74.0,
  })),
  calculateDistance: vi.fn(() => 50),
  calculateBonusPoints: vi.fn(() => 5),
}));

// Mock data setup (extracted for reusability)
const mockCity: City = {
  id: "1",
  name: "New York",
  country: "USA",
  lat: 40.7128,
  lng: -74.006,
  population: 8000000,
  difficulty: "easy",
};

const mockCurrentGameOneComputer: Game = {
  id: "1",
  code: "123456",
  hostId: "player1",
  players: [
    { id: "player1", name: "Human Player", isComputer: false, score: 0 },
    {
      id: "computer1",
      name: "Computer 1",
      isComputer: true,
      score: 0,
      accuracy: 0.5,
    },
  ],
  rounds: [],
  status: "playing",
  settings: {
    maxPlayers: 8,
    roundTimeLimit: 30000,
    totalRounds: 3,
    cityDifficulty: "easy",
  },
  createdAt: Date.now(),
};

const mockInitialRound: GameRound = {
  id: "round1",
  city: mockCity,
  guesses: [],
  completed: false,
  startTime: Date.now(),
};

// Helper function to setup common test mocks
function setupTestMocks() {
  vi.useFakeTimers();
  const mockSetCurrentRound = vi.fn();
  const mockOnComputerGuessesCompleteRound = vi.fn();
  return { mockSetCurrentRound, mockOnComputerGuessesCompleteRound };
}

// Helper function to create useComputerPlayers props
function createUseComputerPlayersProps(overrides: any = {}) {
  const { mockSetCurrentRound, mockOnComputerGuessesCompleteRound } =
    setupTestMocks();
  return {
    currentGame: mockCurrentGameOneComputer,
    currentRound: mockInitialRound,
    isHumanPlayerTurnOrResultsShown: false,
    setCurrentRound: mockSetCurrentRound,
    onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
    ...overrides,
  };
}

describe("useComputerPlayers - Basic Validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not do anything if currentRound is null", () => {
    const props = createUseComputerPlayersProps({ currentRound: null });
    renderHook(() => useComputerPlayers(props));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(props.setCurrentRound).not.toHaveBeenCalled();
  });

  it("should not do anything if currentRound is completed", () => {
    const props = createUseComputerPlayersProps({
      currentRound: { ...mockInitialRound, completed: true },
    });
    renderHook(() => useComputerPlayers(props));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(props.setCurrentRound).not.toHaveBeenCalled();
  });

  it("should not do anything if isHumanPlayerTurnOrResultsShown is true", () => {
    const props = createUseComputerPlayersProps({
      isHumanPlayerTurnOrResultsShown: true,
    });
    renderHook(() => useComputerPlayers(props));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(props.setCurrentRound).not.toHaveBeenCalled();
  });
});

describe("useComputerPlayers - Computer Guess Logic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should make a single computer player guess after a delay", () => {
    const props = createUseComputerPlayersProps();
    renderHook(() => useComputerPlayers(props));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(props.setCurrentRound).toHaveBeenCalledTimes(1);
    const functionalUpdate = props.setCurrentRound.mock.calls[0][0];
    const newRound = functionalUpdate(mockInitialRound);
    expect(newRound.guesses.length).toBe(1);
    expect(newRound.guesses[0].playerId).toBe("computer1");
  });

  it("should handle multiple computer players", () => {
    const gameWithTwoComputers = {
      ...mockCurrentGameOneComputer,
      players: [
        ...mockCurrentGameOneComputer.players,
        {
          id: "computer2",
          name: "Computer 2",
          isComputer: true,
          score: 0,
          accuracy: 0.7,
        },
      ],
    };

    const props = createUseComputerPlayersProps({
      currentGame: gameWithTwoComputers,
    });
    renderHook(() => useComputerPlayers(props));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(props.setCurrentRound).toHaveBeenCalled();
  });
});

describe("useComputerPlayers - Round Completion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.skip("should call onComputerGuessesCompleteRound when all computers have guessed", () => {
    vi.useFakeTimers();

    try {
      // Create mocks once and reuse them
      const mockSetCurrentRound = vi.fn();
      const mockOnComputerGuessesCompleteRound = vi.fn();

      // Create a round that already has a human guess, so computer guess will complete the round
      const roundWithHumanGuess: GameRound = {
        ...mockInitialRound,
        guesses: [
          {
            playerId: "player1", // Human player guess
            lat: 40.0,
            lng: -74.0,
            distance: 100,
            placementPoints: 0,
            bonusPoints: 5,
            totalPoints: 0,
            placement: 0,
            timestamp: Date.now(),
          },
        ],
      };

      const props = {
        currentGame: mockCurrentGameOneComputer,
        currentRound: roundWithHumanGuess,
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      };

      renderHook(() => useComputerPlayers(props));

      act(() => {
        vi.advanceTimersByTime(10000); // Advance enough time for all computers
      });

      // Should call the completion callback since all players will have guessed
      expect(mockOnComputerGuessesCompleteRound).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
