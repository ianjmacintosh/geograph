import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useComputerPlayers } from "../useComputerPlayers";
import type { Game, GameRound, City, Player, Guess } from "../../types/game";

const mockCity: City = {
  id: "city1",
  name: "Test City",
  country: "Test Country",
  lat: 0,
  lng: 0,
  population: 100000,
  difficulty: "easy",
};
const humanPlayer: Player = {
  id: "player1",
  name: "Human Player",
  isComputer: false,
  score: 0,
};
const computerPlayer1: Player = {
  id: "cpu1",
  name: "CPU 1",
  isComputer: true,
  score: 0,
  accuracy: 0.7,
};
const computerPlayer2: Player = {
  id: "cpu2",
  name: "CPU 2",
  isComputer: true,
  score: 0,
  accuracy: 0.5,
};

const mockCurrentGameTwoComputers: Game = {
  id: "game1",
  code: "TEST",
  hostId: "player1",
  players: [humanPlayer, computerPlayer1, computerPlayer2],
  rounds: [],
  status: "playing",
  settings: {
    maxPlayers: 3,
    roundTimeLimit: 30000,
    totalRounds: 5,
    cityDifficulty: "easy",
  },
  createdAt: Date.now(),
};

const mockCurrentGameOneComputer: Game = {
  ...mockCurrentGameTwoComputers,
  players: [humanPlayer, computerPlayer1],
  settings: { ...mockCurrentGameTwoComputers.settings, maxPlayers: 2 },
};

const mockInitialRound: GameRound = {
  id: "round1",
  city: mockCity,
  guesses: [],
  completed: false,
  startTime: Date.now(),
};

describe("useComputerPlayers", () => {
  let mockSetCurrentRound: ReturnType<typeof vi.fn>;
  let mockOnComputerGuessesCompleteRound: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSetCurrentRound = vi.fn();
    mockOnComputerGuessesCompleteRound = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not do anything if currentRound is null", () => {
    renderHook(() =>
      useComputerPlayers({
        currentGame: mockCurrentGameOneComputer,
        currentRound: null,
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockSetCurrentRound).not.toHaveBeenCalled();
  });

  it("should not do anything if currentRound is completed", () => {
    renderHook(() =>
      useComputerPlayers({
        currentGame: mockCurrentGameOneComputer,
        currentRound: { ...mockInitialRound, completed: true },
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockSetCurrentRound).not.toHaveBeenCalled();
  });

  it("should not do anything if isHumanPlayerTurnOrResultsShown is true", () => {
    renderHook(() =>
      useComputerPlayers({
        currentGame: mockCurrentGameOneComputer,
        currentRound: mockInitialRound,
        isHumanPlayerTurnOrResultsShown: true,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockSetCurrentRound).not.toHaveBeenCalled();
  });

  it("should not do anything if no computer players in game", () => {
    renderHook(() =>
      useComputerPlayers({
        currentGame: { ...mockCurrentGameOneComputer, players: [humanPlayer] },
        currentRound: mockInitialRound,
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockSetCurrentRound).not.toHaveBeenCalled();
  });

  it("should make a single computer player guess after a delay", () => {
    renderHook(() =>
      useComputerPlayers({
        currentGame: mockCurrentGameOneComputer,
        currentRound: mockInitialRound,
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(5000); // Advance past typical computer guess delay
    });

    expect(mockSetCurrentRound).toHaveBeenCalledTimes(1);
    const functionalUpdate = mockSetCurrentRound.mock.calls[0][0];
    const newRound = functionalUpdate(mockInitialRound);
    expect(newRound.guesses.length).toBe(1);
    expect(newRound.guesses[0].playerId).toBe(computerPlayer1.id);
  });

  it("should make multiple computer players guess", () => {
    renderHook(() =>
      useComputerPlayers({
        currentGame: mockCurrentGameTwoComputers, // Has two computer players
        currentRound: mockInitialRound,
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockSetCurrentRound).toHaveBeenCalledTimes(1);
    const functionalUpdate = mockSetCurrentRound.mock.calls[0][0];
    const newRound = functionalUpdate(mockInitialRound);
    expect(newRound.guesses.length).toBe(2); // Both computers should have guessed
    expect(
      newRound.guesses.some((g: Guess) => g.playerId === computerPlayer1.id),
    ).toBe(true);
    expect(
      newRound.guesses.some((g: Guess) => g.playerId === computerPlayer2.id),
    ).toBe(true);
  });

  it("should call onComputerGuessesCompleteRound if computer guesses complete the round", () => {
    renderHook(() =>
      useComputerPlayers({
        currentGame: mockCurrentGameOneComputer, // 1 human, 1 computer. Total 2 players.
        currentRound: {
          ...mockInitialRound,
          guesses: [
            {
              playerId: humanPlayer.id,
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
        }, // Human has guessed
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockSetCurrentRound).toHaveBeenCalledTimes(1);
    // Simulate the functional update to check the logic inside it
    const functionalUpdate = mockSetCurrentRound.mock.calls[0][0];
    act(() => {
      const roundBeforeUpdate = {
        ...mockInitialRound,
        guesses: [
          {
            playerId: humanPlayer.id,
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
      const updatedRound = functionalUpdate(roundBeforeUpdate);
      // If this was the last guess, the callback should be called
      if (
        updatedRound.guesses.length ===
        mockCurrentGameOneComputer.players.length
      ) {
        // The hook calls this internally via onComputerGuessesCompleteRound
      }
    });
    expect(mockOnComputerGuessesCompleteRound).toHaveBeenCalledTimes(1);
  });

  it("should not call onComputerGuessesCompleteRound if computer guesses do not complete the round", () => {
    // 3 players: 1 human, 2 computers. Human has not guessed yet.
    renderHook(() =>
      useComputerPlayers({
        currentGame: mockCurrentGameTwoComputers,
        currentRound: mockInitialRound, // No guesses yet
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(5000); // Computers guess
    });

    expect(mockSetCurrentRound).toHaveBeenCalledTimes(1);
    const functionalUpdate = mockSetCurrentRound.mock.calls[0][0];
    act(() => {
      functionalUpdate(mockInitialRound); // This will add the 2 computer guesses
    });
    expect(mockOnComputerGuessesCompleteRound).not.toHaveBeenCalled(); // Human still needs to guess
  });

  it("should clear timeout on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const { unmount } = renderHook(() =>
      useComputerPlayers({
        currentGame: mockCurrentGameOneComputer,
        currentRound: mockInitialRound,
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      }),
    );
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("should not guess if all computers have already guessed in the current round", () => {
    const roundWithComputerGuess: GameRound = {
      ...mockInitialRound,
      guesses: [
        {
          playerId: computerPlayer1.id,
          lat: 1,
          lng: 1,
          distance: 0,
          bonusPoints: 0,
          totalPoints: 0,
          placement: 0,
          placementPoints: 0,
          timestamp: 0,
        },
      ],
    };
    renderHook(() =>
      useComputerPlayers({
        currentGame: mockCurrentGameOneComputer, // Only computerPlayer1
        currentRound: roundWithComputerGuess,
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockSetCurrentRound).not.toHaveBeenCalled();
  });

  it("should handle stale closure for currentRound correctly in setCurrentRound callback", () => {
    const { rerender } = renderHook((props) => useComputerPlayers(props), {
      initialProps: {
        currentGame: mockCurrentGameOneComputer,
        currentRound: mockInitialRound, // round1
        isHumanPlayerTurnOrResultsShown: false,
        setCurrentRound: mockSetCurrentRound,
        onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
      },
    });

    // Let the timer be set for round1
    act(() => {
      vi.advanceTimersByTime(50); // Timer is set but not fired
    });

    // Simulate round changing before timer fires (e.g. human player action caused next round)
    const newRound = { ...mockInitialRound, id: "round2", guesses: [] };
    rerender({
      currentGame: mockCurrentGameOneComputer,
      currentRound: newRound, // Now it's round2
      isHumanPlayerTurnOrResultsShown: false,
      setCurrentRound: mockSetCurrentRound,
      onComputerGuessesCompleteRound: mockOnComputerGuessesCompleteRound,
    });

    // Now let the original timer (for round1) fire
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // The setCurrentRound from the original timer should receive prevRoundState for 'round2'
    // OR it should bail out due to prevRoundState.id !== currentRound.id (where currentRound is 'round1' from closure)
    // The important part is that it doesn't incorrectly modify 'round2' based on 'round1' logic or add guesses to a stale round.

    if (mockSetCurrentRound.mock.calls.length > 0) {
      const functionalUpdate = mockSetCurrentRound.mock.calls[0][0];
      // Simulate react calling it with the *actual* current state (newRound / round2)
      const resultOfStaleTimer = functionalUpdate(newRound);
      // If the stale check `prevRoundState.id !== currentRound.id` (from effect closure) works,
      // it should return `prevRoundState` (i.e., newRound) without modification.
      expect(resultOfStaleTimer.guesses.length).toBe(0); // No guess should have been added to round2 by round1's timer
    } else {
      // It's also possible no call to setCurrentRound happened if the initial checks of the hook
      // (e.g. newRound.completed or new isHumanPlayerTurnOrResultsShown for round2) caused an early exit
      // after rerender and before the stale timer fired. This is also acceptable.
      expect(mockSetCurrentRound).not.toHaveBeenCalled();
    }
  });
});
