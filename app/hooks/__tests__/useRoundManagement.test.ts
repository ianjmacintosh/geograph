import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useRoundManagement,
  type UseRoundManagementProps,
} from "../useRoundManagement";
import type {
  Game,
  GameRound,
  City,
  Player,
  FinalResults,
} from "../../types/game";

// Mock modules
vi.mock("react-router");
vi.mock("../../contexts/GameContext");
vi.mock("../../data/cities");

// Create mock functions
const mockNavigate = vi.fn();
const mockFinishGameContext = vi.fn();
const mockGetRandomCity = vi.fn();

const mockCity1: City = {
  id: "city1",
  name: "City One",
  country: "C1",
  lat: 0,
  lng: 0,
  population: 1,
  difficulty: "easy",
};
const mockCity2: City = {
  id: "city2",
  name: "City Two",
  country: "C2",
  lat: 1,
  lng: 1,
  population: 1,
  difficulty: "easy",
};

const humanPlayer: Player = {
  id: "p1",
  name: "Human",
  isComputer: false,
  score: 0,
};
const mockBaseGame: Game = {
  id: "game1",
  code: "TEST",
  hostId: "p1",
  players: [humanPlayer],
  rounds: [],
  status: "playing", // Important: must be 'playing' for hook to init first round
  settings: {
    maxPlayers: 1,
    roundTimeLimit: 30000,
    totalRounds: 2,
    cityDifficulty: "easy",
  },
  createdAt: Date.now(),
};

describe("useRoundManagement", () => {
  let mockUpdateRoundWithPlacements: ReturnType<typeof vi.fn>;

  const setupHook = async (
    gameProps: Partial<Game> = {},
    initialRoundNumber = 1,
  ) => {
    const currentGameData = { ...mockBaseGame, ...gameProps };

    // Reset mocks for each test run using this setup
    vi.clearAllMocks();
    mockUpdateRoundWithPlacements = vi.fn((round) => ({
      ...round,
      completed: true,
      guesses: round.guesses.map((g: any) => ({ ...g, totalPoints: 10 })),
    }));

    // Import and mock the modules
    const { useNavigate } = await import("react-router");
    const { useGame } = await import("../../contexts/GameContext");
    const { getRandomCityByDifficulty } = await import("../../data/cities");

    // Setup mocks
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useGame).mockReturnValue({
      currentGame: currentGameData,
      finishGame: mockFinishGameContext,
      clearGame: vi.fn(),
    } as any);
    vi.mocked(getRandomCityByDifficulty).mockImplementation(mockGetRandomCity);
    
    mockGetRandomCity
      .mockReturnValueOnce(mockCity1)
      .mockReturnValueOnce(mockCity2);

    const hook = renderHook(
      (props: UseRoundManagementProps) => useRoundManagement(props),
      {
        initialProps: {
          currentGame: currentGameData,
          onRoundStart: vi.fn(),
          onGameEnd: vi.fn(),
          updateRoundWithPlacements: mockUpdateRoundWithPlacements,
          // Manually set initial roundNumber if needed, though hook initializes to 1
        },
      },
    );

    // If initialRoundNumber is not 1, we need to advance state. This is tricky.
    // For simplicity, this setup assumes tests start from round 1 or check initial state.
    // If a test needs to start at a specific round > 1, it should call handleNextRound.

    return hook;
  };

  beforeEach(async () => {
    // Mocks are reset in setupHook, but good to ensure clean state
    vi.clearAllMocks();
  });

  it("should initialize first round if game is playing and no currentRound", async () => {
    const { result } = await setupHook();
    // getRandomCity should be called for the first round initialization
    expect(mockGetRandomCity).toHaveBeenCalledTimes(1);
    expect(result.current.currentRound).not.toBeNull();
    expect(result.current.currentRound?.city.id).toBe(mockCity1.id);
    expect(result.current.roundNumber).toBe(1);
  });

  it("should not initialize first round if game status is not playing", async () => {
    const { result } = await setupHook({ status: "waiting" });
    expect(mockGetRandomCity).not.toHaveBeenCalled();
    expect(result.current.currentRound).toBeNull();
  });

  it("handleNextRound should advance to next round", async () => {
    const { result } = await setupHook();

    // Initial round
    expect(result.current.roundNumber).toBe(1);
    expect(result.current.currentRound?.city.id).toBe(mockCity1.id);
    const firstRound = result.current.currentRound!;
    act(() => {
      // Simulate current round being completed before next round
      result.current.setCurrentRound({
        ...firstRound,
        completed: true,
        guesses: [
          {
            playerId: "p1",
            lat: 0,
            lng: 0,
            distance: 0,
            bonusPoints: 0,
            placement: 1,
            placementPoints: 1,
            timestamp: 0,
            totalPoints: 1,
          },
        ],
      });
    });

    act(() => {
      result.current.handleNextRound();
    });

    expect(result.current.roundNumber).toBe(2);
    expect(mockGetRandomCity).toHaveBeenCalledTimes(2); // Called for 1st and 2nd round
    expect(result.current.currentRound?.city.id).toBe(mockCity2.id);
    expect(result.current.completedRounds.length).toBe(1);
    expect(result.current.completedRounds[0].id).toBe(firstRound.id);
    expect(result.current.completedRounds[0].completed).toBe(true); // from mockUpdateRoundWithPlacements
  });

  it("handleNextRound should call handleGameEnd if last round is completed", async () => {
    const gameSettings = {
      settings: { ...mockBaseGame.settings, totalRounds: 1 },
    }; // Only 1 round
    const { result } = await setupHook(gameSettings);

    const firstRound = result.current.currentRound!;
    act(() => {
      // Simulate current round being completed before next round
      result.current.setCurrentRound({
        ...firstRound,
        completed: true,
        guesses: [
          {
            playerId: "p1",
            lat: 0,
            lng: 0,
            distance: 0,
            bonusPoints: 0,
            placement: 1,
            placementPoints: 1,
            timestamp: 0,
            totalPoints: 1,
          },
        ],
      });
    });

    act(() => {
      result.current.handleNextRound();
    });

    expect(mockFinishGameContext).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/results");
  });

  it("handleGameEnd should calculate final results and navigate", async () => {
    const { result } = await setupHook();
    const testRound: GameRound = {
      id: "r1",
      city: mockCity1,
      guesses: [
        {
          playerId: "p1",
          lat: 0,
          lng: 0,
          distance: 10,
          bonusPoints: 5,
          totalPoints: 15,
          placement: 1,
          placementPoints: 10,
          timestamp: Date.now(),
        },
      ],
      completed: true,
      startTime: Date.now(),
      endTime: Date.now(),
    };
    act(() => {
      result.current.setCurrentRound(testRound); // Set a completed round
      // Note: setCompletedRounds is not exposed from the hook, using internal state
    });

    act(() => {
      result.current.handleGameEnd();
    });

    expect(mockFinishGameContext).toHaveBeenCalledTimes(1);
    const finalResults = mockFinishGameContext.mock.calls[0][0] as FinalResults;
    expect(finalResults.playerScores.length).toBe(1);
    expect(finalResults.playerScores[0].playerId).toBe("p1");
    expect(finalResults.playerScores[0].totalScore).toBe(15); // Based on the testRound data
    expect(mockNavigate).toHaveBeenCalledWith("/results");
  });

  it("should use updateRoundWithPlacements when adding current round to completedRounds in handleNextRound", async () => {
    const { result } = await setupHook();
    const firstRound = result.current.currentRound!;

    // Simulate some guesses in the current round, but it's not marked 'completed' yet
    const roundWithGuesses: GameRound = {
      ...firstRound,
      guesses: [
        {
          playerId: "p1",
          lat: 0,
          lng: 0,
          distance: 0,
          bonusPoints: 0,
          placement: 0,
          placementPoints: 0,
          timestamp: 0,
          totalPoints: 0,
        },
      ],
    };
    act(() => {
      result.current.setCurrentRound(roundWithGuesses);
    });

    act(() => {
      result.current.handleNextRound();
    });

    // updateRoundWithPlacements should have been called for the round being completed
    expect(mockUpdateRoundWithPlacements).toHaveBeenCalledWith(
      expect.objectContaining({ id: firstRound.id }),
    );
    expect(result.current.completedRounds.length).toBe(1);
    expect(result.current.completedRounds[0].id).toBe(firstRound.id);
    // Check if points were applied by mockUpdateRoundWithPlacements
    expect(result.current.completedRounds[0].guesses[0].totalPoints).toBe(10);
  });

  it("should correctly include a non-completed current round in handleGameEnd if it has guesses", async () => {
    const { result } = await setupHook({
      settings: { ...mockBaseGame.settings, totalRounds: 1 },
    }); // Game ends after 1 round

    const currentRoundInProgress = result.current.currentRound!;
    const roundWithGuessNotCompleted: GameRound = {
      ...currentRoundInProgress,
      guesses: [
        {
          playerId: "p1",
          lat: 0,
          lng: 0,
          distance: 50,
          bonusPoints: 2,
          placement: 0,
          placementPoints: 0,
          timestamp: 0,
          totalPoints: 0,
        },
      ], // No total points yet
      completed: false, // Explicitly not completed
    };
    act(() => {
      result.current.setCurrentRound(roundWithGuessNotCompleted);
    });

    act(() => {
      result.current.handleGameEnd(); // Trigger game end directly
    });

    expect(mockUpdateRoundWithPlacements).toHaveBeenCalledWith(
      expect.objectContaining({ id: currentRoundInProgress.id }),
    );
    expect(mockFinishGameContext).toHaveBeenCalledTimes(1);
    const finalResults = mockFinishGameContext.mock.calls[0][0] as FinalResults;
    // mockUpdateRoundWithPlacements assigns 10 points
    expect(finalResults.playerScores[0].totalScore).toBe(10);
  });
});
