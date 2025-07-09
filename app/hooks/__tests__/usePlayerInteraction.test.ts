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
  let mockHasPlayerAlreadyGuessedInRound: boolean;

  beforeEach(() => {
    mockHasPlayerAlreadyGuessedInRound = false;
  });

  it('should initialize with hasConfirmedGuessForRound as false', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        hasPlayerAlreadyGuessedInRound: mockHasPlayerAlreadyGuessedInRound,
      })
    );
    expect(result.current.hasConfirmedGuessForRound).toBe(false);
  });

  it('should set provisionalGuessLocation on valid map click', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        hasPlayerAlreadyGuessedInRound: mockHasPlayerAlreadyGuessedInRound,
      })
    );

    act(() => {
      result.current.handleSetProvisionalGuess(10, 10);
    });

    expect(result.current.provisionalGuessLocation).toEqual({ lat: 10, lng: 10 });
    expect(result.current.isAwaitingConfirmation).toBe(true);
  });

  it('should not allow provisional guess if hasConfirmedGuessForRound is true', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        hasPlayerAlreadyGuessedInRound: true, // Player has already guessed
      })
    );

    act(() => {
      result.current.handleSetProvisionalGuess(10, 10);
    });

    expect(result.current.provisionalGuessLocation).toBeNull();
    expect(result.current.isAwaitingConfirmation).toBe(false);
  });

  it('should not allow provisional guess if round is completed', () => {
    const completedRound = { ...mockInitialRound, completed: true };
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: completedRound,
        hasPlayerAlreadyGuessedInRound: mockHasPlayerAlreadyGuessedInRound,
      })
    );

    act(() => {
      result.current.handleSetProvisionalGuess(10, 10);
    });

    expect(result.current.provisionalGuessLocation).toBeNull();
    expect(result.current.isAwaitingConfirmation).toBe(false);
  });

  it('should confirm guess and set hasConfirmedGuessForRound to true', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        hasPlayerAlreadyGuessedInRound: mockHasPlayerAlreadyGuessedInRound,
      })
    );

    // First set a provisional guess
    act(() => {
      result.current.handleSetProvisionalGuess(10, 10);
    });

    // Then confirm it
    act(() => {
      result.current.confirmCurrentGuess();
    });

    expect(result.current.hasConfirmedGuessForRound).toBe(true);
    expect(result.current.provisionalGuessLocation).toBeNull();
    expect(result.current.isAwaitingConfirmation).toBe(false);
  });

  it('should cancel provisional guess', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        hasPlayerAlreadyGuessedInRound: mockHasPlayerAlreadyGuessedInRound,
      })
    );

    // First set a provisional guess
    act(() => {
      result.current.handleSetProvisionalGuess(10, 10);
    });

    // Then cancel it
    act(() => {
      result.current.cancelProvisionalGuess();
    });

    expect(result.current.provisionalGuessLocation).toBeNull();
    expect(result.current.isAwaitingConfirmation).toBe(false);
    expect(result.current.hasConfirmedGuessForRound).toBe(false);
  });

  it('should reset player guess state', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        hasPlayerAlreadyGuessedInRound: mockHasPlayerAlreadyGuessedInRound,
      })
    );

    // Set up some state
    act(() => {
      result.current.handleSetProvisionalGuess(10, 10);
    });

    // Reset everything
    act(() => {
      result.current.resetPlayerGuessState();
    });

    expect(result.current.provisionalGuessLocation).toBeNull();
    expect(result.current.isAwaitingConfirmation).toBe(false);
    expect(result.current.hasConfirmedGuessForRound).toBe(false);
  });

  it('should not allow confirmation without provisional guess', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        hasPlayerAlreadyGuessedInRound: mockHasPlayerAlreadyGuessedInRound,
      })
    );

    act(() => {
      result.current.confirmCurrentGuess();
    });

    expect(result.current.hasConfirmedGuessForRound).toBe(false);
  });

  it('should not allow confirmation if already confirmed', () => {
    const { result } = renderHook(() =>
      usePlayerInteraction({
        currentGame: mockCurrentGame,
        currentRound: mockInitialRound,
        hasPlayerAlreadyGuessedInRound: mockHasPlayerAlreadyGuessedInRound,
      })
    );

    // Set and confirm a guess
    act(() => {
      result.current.handleSetProvisionalGuess(10, 10);
      result.current.confirmCurrentGuess();
    });

    // Try to confirm again
    act(() => {
      result.current.handleSetProvisionalGuess(20, 20);
      result.current.confirmCurrentGuess();
    });

    expect(result.current.provisionalGuessLocation).toBeNull();
    expect(result.current.isAwaitingConfirmation).toBe(false);
  });
});
