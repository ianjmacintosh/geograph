import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlayerInteraction } from '../usePlayerInteraction';
import type { Game, GameRound, City, Player } from '../../types/game';

const mockCity: City = { id: 'city1', name: 'Test City', country: 'Test Country', lat: 0, lng: 0, population: 100000, difficulty: 'easy' };
const humanPlayer: Player = { id: 'player1', name: 'Human Player', isComputer: false, score: 0 };
const computerPlayer: Player = { id: 'player2', name: 'Computer Player', isComputer: true, score: 0 };

const mockCurrentGame: Game = {
  id: 'game1',
  code: 'TEST',
  hostId: 'player1',
  players: [humanPlayer, computerPlayer],
  rounds: [],
  status: 'playing',
  settings: { maxPlayers: 2, roundTimeLimit: 30000, totalRounds: 5, cityDifficulty: 'easy' },
  createdAt: Date.now(),
};

const mockInitialRound: GameRound = {
  id: 'round1',
  city: mockCity,
  guesses: [],
  completed: false,
  startTime: Date.now(),
};

describe('usePlayerInteraction', () => {
  let mockSetCurrentRound: ReturnType<typeof vi.fn>;
  let mockOnPlayerGuessCompletesRound: ReturnType<typeof vi.fn>;
  let mockIsViewOnly: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetCurrentRound = vi.fn();
    mockOnPlayerGuessCompletesRound = vi.fn();
    mockIsViewOnly = vi.fn(() => false); // Default to not view only
  });

  it('should initialize with hasGuessed as false', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        setCurrentRound: mockSetCurrentRound,
        onPlayerGuessCompletesRound: mockOnPlayerGuessCompletesRound,
        isViewOnly: mockIsViewOnly,
      })
    );
    expect(result.current.hasGuessed).toBe(false);
  });

  it('should set hasGuessed to true and update currentRound on valid map click', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        setCurrentRound: mockSetCurrentRound,
        onPlayerGuessCompletesRound: mockOnPlayerGuessCompletesRound,
        isViewOnly: mockIsViewOnly,
      })
    );

    act(() => {
      result.current.handleMapClick(10, 10);
    });

    expect(result.current.hasGuessed).toBe(true);
    expect(mockSetCurrentRound).toHaveBeenCalledTimes(1);
    expect(mockSetCurrentRound).toHaveBeenCalledWith(expect.any(Function));

    // Simulate functional update of setCurrentRound
    const functionalUpdate = mockSetCurrentRound.mock.calls[0][0];
    const newRound = functionalUpdate(mockInitialRound);
    expect(newRound.guesses.length).toBe(1);
    expect(newRound.guesses[0].playerId).toBe(humanPlayer.id);
  });

  it('should not allow guess if isViewOnly returns true', () => {
    mockIsViewOnly = vi.fn(() => true);
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        setCurrentRound: mockSetCurrentRound,
        onPlayerGuessCompletesRound: mockOnPlayerGuessCompletesRound,
        isViewOnly: mockIsViewOnly,
      })
    );

    act(() => {
      result.current.handleMapClick(10, 10);
    });

    expect(result.current.hasGuessed).toBe(false);
    expect(mockSetCurrentRound).not.toHaveBeenCalled();
  });

  it('should not allow guess if hasGuessed is already true', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        setCurrentRound: mockSetCurrentRound,
        onPlayerGuessCompletesRound: mockOnPlayerGuessCompletesRound,
        isViewOnly: mockIsViewOnly,
      })
    );

    act(() => {
      result.current.handleMapClick(10, 10); // First guess
    });
    expect(result.current.hasGuessed).toBe(true);
    mockSetCurrentRound.mockClear();

    act(() => {
      result.current.handleMapClick(20, 20); // Second guess attempt
    });
    expect(mockSetCurrentRound).not.toHaveBeenCalled();
  });

  it('should call onPlayerGuessCompletesRound if human guess completes all guesses', () => {
    // Game with only one human player for simplicity of this test case
    const singlePlayerGame = { ...mockCurrentGame, players: [humanPlayer] };
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: singlePlayerGame,
        currentRound: mockInitialRound,
        setCurrentRound: mockSetCurrentRound,
        onPlayerGuessCompletesRound: mockOnPlayerGuessCompletesRound,
        isViewOnly: mockIsViewOnly,
      })
    );

    act(() => {
      result.current.handleMapClick(10, 10);
    });

    // Simulate the functional update for setCurrentRound to check the logic inside it
    const functionalUpdate = mockSetCurrentRound.mock.calls[0][0];
    act(() => {
        const updatedRound = functionalUpdate(mockInitialRound);
         // If this was the last guess, the callback should be called
        if (updatedRound.guesses.length === singlePlayerGame.players.length) {
            // The hook calls this internally
        }
    });

    expect(mockOnPlayerGuessCompletesRound).toHaveBeenCalledTimes(1);
  });


  it('should not call onPlayerGuessCompletesRound if human guess does not complete all guesses', () => {
    // Game with two players, human guesses first
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame, // Has 2 players: human, computer
        currentRound: mockInitialRound, // Starts with 0 guesses
        setCurrentRound: mockSetCurrentRound,
        onPlayerGuessCompletesRound: mockOnPlayerGuessCompletesRound,
        isViewOnly: mockIsViewOnly,
      })
    );

    act(() => {
      result.current.handleMapClick(10, 10); // Human player guesses
    });

    // Simulate the functional update of setCurrentRound
     const functionalUpdate = mockSetCurrentRound.mock.calls[0][0];
     act(() => {
        functionalUpdate(mockInitialRound); // This will add the guess
     });

    expect(mockOnPlayerGuessCompletesRound).not.toHaveBeenCalled();
  });

  it('should reset hasGuessed to false when resetPlayerGuessState is called', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        setCurrentRound: mockSetCurrentRound,
        onPlayerGuessCompletesRound: mockOnPlayerGuessCompletesRound,
        isViewOnly: mockIsViewOnly,
      })
    );

    act(() => {
      result.current.handleMapClick(10, 10);
    });
    expect(result.current.hasGuessed).toBe(true);

    act(() => {
      result.current.resetPlayerGuessState();
    });
    expect(result.current.hasGuessed).toBe(false);
  });

   it('should not allow guess if currentRound is null', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: null, // No current round
        setCurrentRound: mockSetCurrentRound,
        onPlayerGuessCompletesRound: mockOnPlayerGuessCompletesRound,
        isViewOnly: mockIsViewOnly,
      })
    );
    act(() => {
      result.current.handleMapClick(10, 10);
    });
    expect(mockSetCurrentRound).not.toHaveBeenCalled();
  });

  it('should not allow guess if currentGame is null', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: null, // No current game
        currentRound: mockInitialRound,
        setCurrentRound: mockSetCurrentRound,
        onPlayerGuessCompletesRound: mockOnPlayerGuessCompletesRound,
        isViewOnly: mockIsViewOnly,
      })
    );
    act(() => {
      result.current.handleMapClick(10, 10);
    });
    expect(mockSetCurrentRound).not.toHaveBeenCalled();
  });

  it('should correctly apply functional update to setCurrentRound to prevent stale state', () => {
    const { result } = renderHook(() =>
        usePlayerInteraction({
            currentGame: mockCurrentGame,
            currentRound: mockInitialRound,
            setCurrentRound: mockSetCurrentRound,
            onPlayerGuessCompletesRound: mockOnPlayerGuessCompletesRound,
            isViewOnly: mockIsViewOnly,
        })
    );

    // Initial state of mockInitialRound.guesses is []

    // First click
    act(() => {
        result.current.handleMapClick(10, 10);
    });

    // Get the functional update passed to setCurrentRound
    const firstFunctionalUpdate = mockSetCurrentRound.mock.calls[0][0];

    // Simulate React calling the functional update with the initial round state
    let roundStateAfterFirstClick: GameRound | null = null;
    act(() => {
        roundStateAfterFirstClick = firstFunctionalUpdate(mockInitialRound);
    });

    expect(roundStateAfterFirstClick).not.toBeNull();
    expect(roundStateAfterFirstClick!.guesses.length).toBe(1);
    expect(roundStateAfterFirstClick!.guesses[0].lat).toBe(10);

    // Simulate a scenario where the round object in the hook's closure might be stale,
    // but the functional update should receive the *actual* current state from React.
    // For this test, we manually create a "later" state for the round.
    const laterRoundStateWithOneGuess: GameRound = {
        ...mockInitialRound,
        guesses: [{ playerId: humanPlayer.id, lat: 10, lng: 10, distance: 0, bonusPoints: 0, totalPoints: 0, placement: 0, placementPoints: 0, timestamp: 0 }],
    };

    // If handleMapClick were called again *without* hasGuessed being true (e.g., due to some complex async issue or re-render logic not tested here)
    // and it used a stale `currentRound` in its closure, the functional update pattern is designed to prevent issues.
    // This specific test is more about asserting the call to `setCurrentRound(fn)` than simulating staleness perfectly.
    // The hook's internal logic `prevRoundState.id !== currentRound.id` is also a guard.

    // For this test, let's assume `hasGuessed` was reset and a second click happens.
    // This isn't a perfect simulation of staleness but shows the functional update is used.
     act(() => {
       result.current.resetPlayerGuessState(); // Allow another guess
     });
     mockSetCurrentRound.mockClear(); // Clear previous calls

     act(() => {
       result.current.handleMapClick(20, 20); // Second click
     });

     const secondFunctionalUpdate = mockSetCurrentRound.mock.calls[0][0];
     let roundStateAfterSecondClick: GameRound | null = null;
     act(() => {
        // IMPORTANT: React would pass the *actual* current state here.
        // For testing, we pass the state as it would be after the first guess.
        roundStateAfterSecondClick = secondFunctionalUpdate(laterRoundStateWithOneGuess);
     });

     expect(roundStateAfterSecondClick).not.toBeNull();
     expect(roundStateAfterSecondClick!.guesses.length).toBe(2);
     expect(roundStateAfterSecondClick!.guesses[1].lat).toBe(20);
  });

});
