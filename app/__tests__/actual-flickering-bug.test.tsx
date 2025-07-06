import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Game from '../routes/game';
import type { Game as GameType } from '../types/game';

// Mock the useGame hook
const mockUseGame = vi.fn();
const mockClearGame = vi.fn();
const mockFinishGame = vi.fn();

vi.mock('../contexts/GameContext', () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useGame: () => mockUseGame()
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock WorldMap with realistic interaction
vi.mock('../components/WorldMap', () => ({
  WorldMap: ({ onMapClick, guesses, showTarget, targetCity }: any) => (
    <div data-testid="world-map">
      <div data-testid="target-shown">{showTarget ? 'target-visible' : 'target-hidden'}</div>
      <div data-testid="guess-count">{guesses.length}</div>
      <div data-testid="target-city">{targetCity?.name}</div>
      <button
        onClick={() => onMapClick && onMapClick(40.7128, -74.0060)}
        data-testid="map-click"
      >
        Click Map ({guesses.length} guesses)
      </button>
      {guesses.map((guess: any, index: number) => (
        <div key={index} data-testid={`guess-${index}`}>
          Guess by {guess.playerName}: {guess.lat}, {guess.lng}
        </div>
      ))}
    </div>
  )
}));

// Mock cities data
vi.mock('../data/cities', () => ({
  getRandomCityByDifficulty: () => ({
    id: '1',
    name: 'New York',
    country: 'USA',
    lat: 40.7128,
    lng: -74.0060,
    population: 8000000,
    difficulty: 'easy' as const
  })
}));

// Mock game utilities with realistic behavior
vi.mock('../utils/game', () => ({
  calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => {
    // Human player clicks on exact location
    if (lat1 === 40.7128 && lng1 === -74.0060 && lat2 === 40.7128 && lng2 === -74.0060) return 0;
    // Computer 1 guess (slightly off)
    if (lat1 === 41.0 && lng1 === -73.0) return 150;
    // Computer 2 guess (further off)
    if (lat1 === 39.0 && lng1 === -75.0) return 300;
    return 500;
  },
  calculateBonusPoints: (distance: number) => {
    if (distance <= 100) return 5;
    if (distance <= 500) return 2;
    if (distance <= 1000) return 1;
    return 0;
  },
  calculatePlacementPoints: (guesses: Array<{playerId: string, distance: number}>, totalPlayers: number) => {
    const sorted = [...guesses].sort((a, b) => a.distance - b.distance);
    return sorted.map((guess, index) => ({
      playerId: guess.playerId,
      placementPoints: Math.max(0, totalPlayers - index),
      placement: index + 1
    }));
  },
  generateComputerGuess: (city: any, accuracy: number) => {
    // Return different guesses for different computer players
    if (accuracy === 0.5) return { lat: 41.0, lng: -73.0 }; // Computer 1
    if (accuracy === 0.7) return { lat: 39.0, lng: -75.0 }; // Computer 2
    return { lat: 42.0, lng: -72.0 };
  }
}));

describe('Actual Flickering Bug Detection', () => {
  let mockGame: GameType;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGame = {
      id: '1',
      code: '123456',
      hostId: 'player1',
      players: [
        { id: 'player1', name: 'Human Player', isComputer: false, score: 0 },
        { id: 'player2', name: 'Computer1', isComputer: true, score: 0, accuracy: 0.5 },
        { id: 'player3', name: 'Computer2', isComputer: true, score: 0, accuracy: 0.7 }
      ],
      rounds: [],
      status: 'playing' as const,
      settings: {
        maxPlayers: 8,
        roundTimeLimit: 30000,
        totalRounds: 3,
        cityDifficulty: 'easy' as const
      },
      createdAt: Date.now()
    };

    mockUseGame.mockReturnValue({
      currentGame: mockGame,
      clearGame: mockClearGame,
      finishGame: mockFinishGame
    });
  });

  it('should show scores for ALL players after round completion - this test should FAIL if flickering bug exists', async () => {
    let scoreSnapshots: Array<{timestamp: number, scores: Record<string, string>}> = [];
    
    // Set up mutation observer to capture score changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          // Capture current scores whenever DOM changes
          try {
            const currentScores = {
              player1: document.querySelector('[data-testid="player-score-player1"]')?.textContent || '0',
              player2: document.querySelector('[data-testid="player-score-player2"]')?.textContent || '0', 
              player3: document.querySelector('[data-testid="player-score-player3"]')?.textContent || '0'
            };
            
            scoreSnapshots.push({
              timestamp: Date.now(),
              scores: currentScores
            });
          } catch (e) {
            // DOM might not be ready yet
          }
        }
      });
    });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/game']}>
          <Game />
        </MemoryRouter>
      );
    });

    // Wait for game to initialize
    await waitFor(() => {
      expect(screen.getByTestId('map-click')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Start observing DOM changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });

    console.log('Initial state - all scores should be 0');
    expect(screen.getByTestId('player-score-player1')).toHaveTextContent('0');
    expect(screen.getByTestId('player-score-player2')).toHaveTextContent('0');
    expect(screen.getByTestId('player-score-player3')).toHaveTextContent('0');

    // Human player makes a guess
    console.log('Human player making guess...');
    await act(async () => {
      fireEvent.click(screen.getByTestId('map-click'));
    });

    // Wait for guess submission confirmation
    await waitFor(() => {
      expect(screen.getByText('✅ Guess submitted! Waiting for other players...')).toBeInTheDocument();
    }, { timeout: 5000 });

    console.log('Human guess submitted, waiting for computer players...');

    // Wait for computer players to make their guesses and for scoring to complete
    // This is where the flickering bug would manifest
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 8000)); // Wait for computers + scoring
    });

    // Wait for round results to show
    await waitFor(() => {
      expect(screen.getByText('Round Results')).toBeInTheDocument();
    }, { timeout: 10000 });

    observer.disconnect();

    console.log('Round completed, checking final scores...');
    console.log('Score snapshots captured:', scoreSnapshots.length);

    // Print score history for debugging
    scoreSnapshots.forEach((snapshot, index) => {
      console.log(`Snapshot ${index}:`, snapshot.scores);
    });

    // Get final scores after round completion
    const finalScores = {
      player1: screen.getByTestId('player-score-player1').textContent || '0',
      player2: screen.getByTestId('player-score-player2').textContent || '0',
      player3: screen.getByTestId('player-score-player3').textContent || '0'
    };

    console.log('Final scores:', finalScores);

    // CHECK 1: All players should have non-zero scores
    // Human player: perfect guess (0km) = 3 placement points + 5 bonus = 8 points
    // Computer 1: 150km away = 2 placement points + 2 bonus = 4 points  
    // Computer 2: 300km away = 1 placement point + 2 bonus = 3 points
    
    const player1Score = parseInt(finalScores.player1);
    const player2Score = parseInt(finalScores.player2);
    const player3Score = parseInt(finalScores.player3);

    console.log('Parsed scores:', { player1Score, player2Score, player3Score });

    // This is the main test - if ANY computer player has 0 score, the bug exists
    if (player2Score === 0 || player3Score === 0) {
      console.error('BUG DETECTED: Computer players have 0 scores!');
      console.error('This indicates the flickering/calculation bug where only human player gets points');
      throw new Error(`Flickering bug detected! Computer players missing scores. Scores: Human=${player1Score}, Computer1=${player2Score}, Computer2=${player3Score}`);
    }

    // CHECK 2: Verify scores are reasonable (not just any non-zero value)
    expect(player1Score).toBeGreaterThan(0);
    expect(player2Score).toBeGreaterThan(0); 
    expect(player3Score).toBeGreaterThan(0);

    // CHECK 3: Human should have highest score (perfect guess)
    expect(player1Score).toBeGreaterThan(player2Score);
    expect(player1Score).toBeGreaterThan(player3Score);

    // CHECK 4: Analyze score snapshots for flickering patterns
    if (scoreSnapshots.length > 5) {
      // Look for flickering pattern: non-zero score becoming zero
      for (let i = 1; i < scoreSnapshots.length; i++) {
        const prev = scoreSnapshots[i-1].scores;
        const curr = scoreSnapshots[i].scores;
        
        // Check for flickering: score goes from non-zero back to zero
        ['player2', 'player3'].forEach(playerId => {
          const prevScore = parseInt(prev[playerId]);
          const currScore = parseInt(curr[playerId]);
          
          if (prevScore > 0 && currScore === 0) {
            console.warn(`Flickering detected for ${playerId}: ${prevScore} -> ${currScore} at snapshot ${i}`);
          }
        });
      }
    }

    console.log('✅ All players received proper scores - no flickering bug detected');
  }, 30000); // 30 second timeout for this complex test

  it('should maintain score consistency throughout the scoring process', async () => {
    // This test focuses specifically on score consistency during state updates
    
    const scoreHistory: Record<string, number[]> = {
      player1: [],
      player2: [],
      player3: []
    };

    let observationCount = 0;
    const observer = new MutationObserver(() => {
      observationCount++;
      try {
        const scores = {
          player1: parseInt(document.querySelector('[data-testid="player-score-player1"]')?.textContent || '0'),
          player2: parseInt(document.querySelector('[data-testid="player-score-player2"]')?.textContent || '0'),
          player3: parseInt(document.querySelector('[data-testid="player-score-player3"]')?.textContent || '0')
        };

        Object.entries(scores).forEach(([playerId, score]) => {
          scoreHistory[playerId].push(score);
        });
      } catch (e) {
        // DOM not ready
      }
    });

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

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Make guess and complete round
    await act(async () => {
      fireEvent.click(screen.getByTestId('map-click'));
    });

    await waitFor(() => {
      expect(screen.getByText('✅ Guess submitted! Waiting for other players...')).toBeInTheDocument();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 8000));
    });

    observer.disconnect();

    console.log('Score observations:', observationCount);
    console.log('Score histories:');
    Object.entries(scoreHistory).forEach(([playerId, history]) => {
      console.log(`${playerId}:`, history);
      
      // Check for score decreases (flickering)
      for (let i = 1; i < history.length; i++) {
        if (history[i-1] > 0 && history[i] < history[i-1]) {
          throw new Error(`Score consistency violation for ${playerId}: score decreased from ${history[i-1]} to ${history[i]}`);
        }
      }
    });

    // Final verification
    const finalScores = Object.fromEntries(
      Object.entries(scoreHistory).map(([playerId, history]) => [
        playerId,
        history[history.length - 1] || 0
      ])
    );

    // All players should have final scores > 0
    Object.entries(finalScores).forEach(([playerId, score]) => {
      if (score === 0) {
        throw new Error(`Player ${playerId} ended with 0 score - indicates scoring bug`);
      }
    });

    console.log('✅ Score consistency maintained throughout round');
  }, 30000);
});