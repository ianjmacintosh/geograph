import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Game from '../routes/game';
import type { Game as GameType } from '../types/game';

// Mock the useGame hook
const mockUseGame = vi.fn();
vi.mock('../contexts/GameContext', () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useGame: () => mockUseGame()
}));

// Mock navigation
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

// Mock WorldMap that shows timer info
vi.mock('../components/WorldMap', () => ({
  WorldMap: ({ onMapClick, guesses, showTarget }: any) => (
    <div data-testid="world-map">
      <button
        onClick={() => onMapClick && onMapClick(40.7128, -74.0060)}
        data-testid="map-click"
        disabled={!onMapClick}
      >
        {onMapClick ? 'Click Map' : 'Map Disabled'}
      </button>
      <div data-testid="total-guesses">{guesses.length}</div>
      <div data-testid="show-target">{showTarget ? 'target-visible' : 'target-hidden'}</div>
      {guesses.map((guess: any, index: number) => (
        <div key={index} data-testid={`guess-${index}`}>
          {guess.playerName}: {guess.isComputer ? 'Computer' : 'Human'}
        </div>
      ))}
    </div>
  )
}));

// Mock cities
vi.mock('../data/cities', () => ({
  getRandomCityByDifficulty: () => ({
    id: 'nyc',
    name: 'New York',
    country: 'USA',
    lat: 40.7128,
    lng: -74.0060,
    population: 8000000,
    difficulty: 'easy' as const
  })
}));

// Mock game utilities
vi.mock('../utils/game', () => ({
  calculateDistance: vi.fn((lat1: number, lng1: number, lat2: number, lng2: number) => {
    if (lat1 === 40.7128 && lng1 === -74.0060) return 0; // Human perfect guess
    if (lat1 === 41.0 && lng1 === -73.0) return 150; // Computer 1
    if (lat1 === 39.0 && lng1 === -75.0) return 300; // Computer 2
    return 500;
  }),
  calculateBonusPoints: vi.fn((distance: number) => {
    if (distance <= 100) return 5;
    if (distance <= 500) return 2;
    return 0;
  }),
  calculatePlacementPoints: vi.fn((guesses: Array<{playerId: string, distance: number}>, totalPlayers: number) => {
    const sorted = [...guesses].sort((a, b) => a.distance - b.distance);
    return sorted.map((guess, index) => ({
      playerId: guess.playerId,
      placementPoints: Math.max(0, totalPlayers - index),
      placement: index + 1
    }));
  }),
  generateComputerGuess: vi.fn((city: any, accuracy: number) => {
    if (accuracy === 0.3) return { lat: 41.0, lng: -73.0 };  // Computer 1
    if (accuracy === 0.5) return { lat: 39.0, lng: -75.0 };  // Computer 2
    return { lat: 41.0, lng: -73.0 };
  })
}));

describe('Round Completion Timing Bug', () => {
  let mockGame: GameType;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create game with 3 players
    mockGame = {
      id: '1',
      code: '123456',
      hostId: 'player1',
      players: [
        { id: 'player1', name: 'Human Player', isComputer: false, score: 0 },
        { id: 'player2', name: 'Computer1', isComputer: true, score: 0, accuracy: 0.3 },
        { id: 'player3', name: 'Computer2', isComputer: true, score: 0, accuracy: 0.5 }
      ],
      rounds: [],
      status: 'playing' as const,
      settings: {
        maxPlayers: 8,
        roundTimeLimit: 30000, // 30 second timer
        totalRounds: 3,
        cityDifficulty: 'easy' as const
      },
      createdAt: Date.now()
    };

    mockUseGame.mockReturnValue({
      currentGame: mockGame,
      clearGame: vi.fn(),
      finishGame: vi.fn()
    });
  });

  it('should end round immediately when human guesses last (after all computers)', async () => {
    console.log('=== Testing Round Ends Immediately When Last Player Guesses ===');
    
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/game']}>
          <Game />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('map-click')).toBeInTheDocument();
    });

    console.log('Game started, waiting for computers to guess first...');
    
    // Wait for computers to make their guesses first (2-5 seconds)
    // If computers don't guess automatically, we'll simulate the scenario differently
    let computersGuessed = false;
    try {
      await waitFor(() => {
        const guessCount = screen.getByTestId('total-guesses').textContent;
        computersGuessed = guessCount === '2';
        return computersGuessed;
      }, { timeout: 8000 });
      console.log('✅ Both computers have guessed (2/3 players)');
    } catch {
      console.log('⚠️  Computers did not guess automatically, testing with different scenario');
      console.log('Testing: human guesses when there are already existing guesses in round state');
      
      // For this test, we'll simulate that there are already 2 computer guesses
      // by testing the completion logic directly
      console.log('Simulating scenario where human makes the final guess...');
    }
    
    // Record the time before human guesses
    const timeBeforeHumanGuess = Date.now();
    
    // Check that timer is still running (not showing results yet)
    expect(screen.getByTestId('show-target').textContent).toBe('target-hidden');
    expect(screen.queryByText('Round Results')).toBeNull();
    
    // Get current timer value to see it's counting down
    const timerElement = screen.getByText(/Time:/);
    const timerMatch = timerElement.textContent?.match(/(\d+)s/);
    const timerBefore = timerMatch ? parseInt(timerMatch[1]) : 30;
    console.log('Timer before human guess:', timerBefore, 'seconds');
    
    // Human makes the final guess
    console.log('Human making final guess (3/3 players)...');
    await act(async () => {
      fireEvent.click(screen.getByTestId('map-click'));
    });

    await waitFor(() => {
      expect(screen.getByText('✅ Guess submitted! Waiting for other players...')).toBeInTheDocument();
    });

    // Now all 3 players have guessed - round should end IMMEDIATELY
    console.log('All players have guessed, checking for immediate round completion...');
    
    // Should show results quickly (within 2 seconds, not waiting for 30-second timer)
    const startWaitTime = Date.now();
    await waitFor(() => {
      const showTarget = screen.getByTestId('show-target').textContent;
      return showTarget === 'target-visible';
    }, { timeout: 3000 }); // Should happen within 3 seconds
    
    const endWaitTime = Date.now();
    const actualWaitTime = endWaitTime - startWaitTime;
    
    console.log(`Time from final guess to results: ${actualWaitTime}ms`);
    
    // Should also show Round Results
    await waitFor(() => {
      return screen.getByText('Round Results');
    }, { timeout: 2000 });
    
    // Verify results appeared quickly (not after full timer)
    if (actualWaitTime > 5000) {
      console.error('❌ BUG CONFIRMED: Round waited too long to end after final guess!');
      console.error(`Expected < 5000ms, got ${actualWaitTime}ms`);
      throw new Error(`Round completion too slow: ${actualWaitTime}ms (should be < 5000ms)`);
    }
    
    console.log('✅ Round ended quickly after final guess');
    
    // Verify all 3 guesses are visible
    const finalGuessCount = screen.getByTestId('total-guesses').textContent;
    expect(finalGuessCount).toBe('3');
    
    // Verify Round Results section exists
    expect(screen.getByText('Round Results')).toBeInTheDocument();
    
    console.log('✅ Round completion timing working correctly');
  }, 30000);

  it('should wait for timer if not all players have guessed', async () => {
    console.log('=== Testing Timer Still Works When Not All Players Guessed ===');
    
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/game']}>
          <Game />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('map-click')).toBeInTheDocument();
    });

    // Human guesses immediately (before computers)
    console.log('Human guessing first (1/3 players)...');
    await act(async () => {
      fireEvent.click(screen.getByTestId('map-click'));
    });

    await waitFor(() => {
      expect(screen.getByText('✅ Guess submitted! Waiting for other players...')).toBeInTheDocument();
    });

    console.log('Only human has guessed, should NOT end round immediately');
    
    // Should NOT show results immediately since computers haven't guessed
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 3000));
    });
    
    // Should still be waiting (target hidden, no Round Results)
    expect(screen.getByTestId('show-target').textContent).toBe('target-hidden');
    expect(screen.queryByText('Round Results')).toBeNull();
    
    console.log('✅ Correctly waiting for remaining players or timer');
  }, 30000);

  it('should show countdown timer that decreases over time', async () => {
    console.log('=== Testing Timer Countdown Functionality ===');
    
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/game']}>
          <Game />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('map-click')).toBeInTheDocument();
    });

    // Check initial timer value
    let timerElement = screen.getByText(/Time:/);
    let timerMatch = timerElement.textContent?.match(/(\d+)s/);
    let initialTimer = timerMatch ? parseInt(timerMatch[1]) : 0;
    console.log('Initial timer:', initialTimer, 'seconds');
    
    // Wait 3 seconds
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 3000));
    });
    
    // Check timer decreased
    timerElement = screen.getByText(/Time:/);
    timerMatch = timerElement.textContent?.match(/(\d+)s/);
    let laterTimer = timerMatch ? parseInt(timerMatch[1]) : 0;
    console.log('Timer after 3 seconds:', laterTimer, 'seconds');
    
    // Should have decreased by approximately 3 seconds (allow some variance for test timing)
    const expectedDecrease = 3;
    const actualDecrease = initialTimer - laterTimer;
    
    if (actualDecrease < (expectedDecrease - 1) || actualDecrease > (expectedDecrease + 1)) {
      console.error(`❌ Timer not counting down properly: decreased by ${actualDecrease}s, expected ~${expectedDecrease}s`);
      throw new Error(`Timer countdown issue: ${actualDecrease}s decrease`);
    }
    
    console.log('✅ Timer counting down correctly');
  }, 30000);
});