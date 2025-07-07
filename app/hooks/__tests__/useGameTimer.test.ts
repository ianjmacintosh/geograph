import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGameTimer, type UseGameTimerProps } from '../useGameTimer';
import type { GameRound } from '../../types/game';

const mockCurrentRound: GameRound = {
  id: 'round1',
  city: { id: 'city1', name: 'Test City', country: 'Test Country', lat: 0, lng: 0, population: 100000, difficulty: 'easy' },
  guesses: [],
  completed: false,
  startTime: Date.now(),
};

describe('useGameTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize timeLeft to roundTimeLimit in seconds', () => {
    const { result } = renderHook(() =>
      useGameTimer({
        currentRound: mockCurrentRound,
        showResults: false,
        roundTimeLimit: 30000, // 30 seconds
        onTimerEnd: vi.fn(),
      })
    );
    expect(result.current).toBe(30);
  });

  it('should countdown timeLeft every second', () => {
    const { result } = renderHook(() =>
      useGameTimer({
        currentRound: mockCurrentRound,
        showResults: false,
        roundTimeLimit: 5000, // 5 seconds
        onTimerEnd: vi.fn(),
      })
    );
    expect(result.current).toBe(5);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(4);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(1);
  });

  it('should call onTimerEnd when timeLeft reaches 0', () => {
    const onTimerEndMock = vi.fn();
    const { result } = renderHook(() =>
      useGameTimer({
        currentRound: mockCurrentRound,
        showResults: false,
        roundTimeLimit: 2000, // 2 seconds
        onTimerEnd: onTimerEndMock,
      })
    );
    expect(result.current).toBe(2);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(0);
    expect(onTimerEndMock).toHaveBeenCalledTimes(1);
  });

  it('should not countdown if showResults is true', () => {
    const { result } = renderHook(() =>
      useGameTimer({
        currentRound: mockCurrentRound,
        showResults: true, // Results are shown
        roundTimeLimit: 5000,
        onTimerEnd: vi.fn(),
      })
    );
    const initialTime = result.current; // Should be 5 initially
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(initialTime); // Time should not have changed
  });

  it('should not countdown if currentRound is null', () => {
     const { result } = renderHook(() =>
      useGameTimer({
        currentRound: null, // No current round
        showResults: false,
        roundTimeLimit: 5000,
        onTimerEnd: vi.fn(),
      })
    );
    const initialTime = result.current; // Should be 5
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(initialTime);
  });

  it('should reset timeLeft when currentRound ID changes and not showing results', () => {
    const { result, rerender } = renderHook(
      (props: UseGameTimerProps) => useGameTimer(props),
      {
        initialProps: {
          currentRound: mockCurrentRound,
          showResults: false,
          roundTimeLimit: 10000, // 10s
          onTimerEnd: vi.fn(),
        },
      }
    );
    expect(result.current).toBe(10);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(7);

    const newRound: GameRound = { ...mockCurrentRound, id: 'round2' };
    rerender({
      currentRound: newRound,
      showResults: false,
      roundTimeLimit: 15000, // 15s for new round
      onTimerEnd: vi.fn(),
    });
    expect(result.current).toBe(15); // Should reset to new round's time limit
  });

  it('should not call onTimerEnd multiple times if already at 0', () => {
    const onTimerEndMock = vi.fn();
    const { result } = renderHook(() =>
      useGameTimer({
        currentRound: mockCurrentRound,
        showResults: false,
        roundTimeLimit: 1000, // 1 second
        onTimerEnd: onTimerEndMock,
      })
    );
    act(() => {
      vi.advanceTimersByTime(1000); // Timer reaches 0, onTimerEnd called
    });
    expect(result.current).toBe(0);
    expect(onTimerEndMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000); // Advance time again
    });
    expect(result.current).toBe(0);
    expect(onTimerEndMock).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it('should clear interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() =>
      useGameTimer({
        currentRound: mockCurrentRound,
        showResults: false,
        roundTimeLimit: 5000,
        onTimerEnd: vi.fn(),
      })
    );
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
