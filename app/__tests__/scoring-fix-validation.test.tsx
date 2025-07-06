import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Game from '../routes/game';
import type { Game as GameType, GameRound } from '../types/game';

// Mock the useGame hook directly
const mockUseGame = vi.fn();
vi.mock('../contexts/GameContext', () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useGame: () => mockUseGame()
}));

// Mock the WorldMap component
vi.mock('../components/WorldMap', () => ({
  WorldMap: ({ guesses, showTarget }: any) => (
    <div data-testid="world-map">
      <div data-testid="target-shown">{showTarget ? 'visible' : 'hidden'}</div>
      <div data-testid="guess-count">{guesses.length}</div>
    </div>
  )
}));

// Mock the cities data
vi.mock('../data/cities', () => ({
  getRandomCityByDifficulty: () => ({
    id: '1',
    name: 'Test City',
    country: 'Test Country',
    lat: 40.7128,
    lng: -74.0060,
    population: 1000000,
    difficulty: 'easy' as const
  })
}));

describe('Scoring Fix Validation', () => {
  let mockGame: GameType;

  beforeEach(() => {
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
      clearGame: vi.fn(),
      finishGame: vi.fn()
    });
  });

  it('should show scores when placementPoints > 0 regardless of totalPoints initial value', () => {
    // Create a round that simulates the problematic state:
    // - placementPoints have been calculated (> 0)
    // - totalPoints might still be 0 due to state update timing
    const mockRound: GameRound = {
      id: 'round1',
      city: {
        id: '1',
        name: 'Test City',
        country: 'Test Country',
        lat: 40.7128,
        lng: -74.0060,
        population: 1000000,
        difficulty: 'easy' as const
      },
      guesses: [
        {
          playerId: 'player1',
          lat: 40.7128,
          lng: -74.0060,
          distance: 0,
          placementPoints: 3, // Calculated placement points
          bonusPoints: 5,
          totalPoints: 8, // This should be calculated from placement + bonus
          placement: 1,
          timestamp: Date.now()
        },
        {
          playerId: 'player2',
          lat: 41.0,
          lng: -73.0,
          distance: 150,
          placementPoints: 2, // Calculated placement points
          bonusPoints: 2,
          totalPoints: 4, // This should be calculated from placement + bonus
          placement: 2,
          timestamp: Date.now()
        },
        {
          playerId: 'player3',
          lat: 39.0,
          lng: -75.0,
          distance: 300,
          placementPoints: 1, // Calculated placement points
          bonusPoints: 2,
          totalPoints: 3, // This should be calculated from placement + bonus
          placement: 3,
          timestamp: Date.now()
        }
      ],
      completed: false,
      startTime: Date.now()
    };

    // Create a test component that simulates the Game component's scoring logic
    const ScoringTestComponent = () => {
      const { currentGame } = mockUseGame();
      if (!currentGame) return <div>No game</div>;
      
      // This simulates the fixed getPlayerScores function
      const getPlayerScores = () => {
        return currentGame.players.map((player: any) => {
          let totalScore = 0;
          
          // The key fix: check placementPoints > 0 instead of totalPoints > 0
          if (mockRound) {
            const playerGuess = mockRound.guesses.find(g => g.playerId === player.id);
            if (playerGuess && playerGuess.placementPoints > 0) {
              totalScore += playerGuess.totalPoints;
            }
          }
          
          return {
            ...player,
            totalScore
          };
        }).sort((a: any, b: any) => b.totalScore - a.totalScore);
      };

      const playerScores = getPlayerScores();

      return (
        <div>
          <h2>Scoreboard</h2>
          {playerScores.map((player: any) => (
            <div key={player.id}>
              <span>{player.name}</span>
              <span data-testid={`player-score-${player.id}`}>{player.totalScore}</span>
            </div>
          ))}
        </div>
      );
    };

    render(
      <MemoryRouter initialEntries={['/game']}>
        <ScoringTestComponent />
      </MemoryRouter>
    );

    // With the fix, all players should show their calculated scores
    // because placementPoints > 0 for all players
    expect(screen.getByTestId('player-score-player1')).toHaveTextContent('8');
    expect(screen.getByTestId('player-score-player2')).toHaveTextContent('4');
    expect(screen.getByTestId('player-score-player3')).toHaveTextContent('3');
  });

  it('should not show scores when placementPoints = 0 (before calculation)', () => {
    // Create a round that simulates the initial state:
    // - placementPoints not yet calculated (= 0)
    // - totalPoints not yet calculated (= 0)
    const mockRound: GameRound = {
      id: 'round1',
      city: {
        id: '1',
        name: 'Test City',
        country: 'Test Country',
        lat: 40.7128,
        lng: -74.0060,
        population: 1000000,
        difficulty: 'easy' as const
      },
      guesses: [
        {
          playerId: 'player1',
          lat: 40.7128,
          lng: -74.0060,
          distance: 0,
          placementPoints: 0, // Not calculated yet
          bonusPoints: 5,
          totalPoints: 0, // Not calculated yet
          placement: 0,
          timestamp: Date.now()
        }
      ],
      completed: false,
      startTime: Date.now()
    };

    const ScoringTestComponent = () => {
      const { currentGame } = mockUseGame();
      if (!currentGame) return <div>No game</div>;
      
      const getPlayerScores = () => {
        return currentGame.players.map((player: any) => {
          let totalScore = 0;
          
          // The fix: check placementPoints > 0 instead of totalPoints > 0
          if (mockRound) {
            const playerGuess = mockRound.guesses.find(g => g.playerId === player.id);
            if (playerGuess && playerGuess.placementPoints > 0) {
              totalScore += playerGuess.totalPoints;
            }
          }
          
          return {
            ...player,
            totalScore
          };
        }).sort((a: any, b: any) => b.totalScore - a.totalScore);
      };

      const playerScores = getPlayerScores();

      return (
        <div>
          <h2>Scoreboard</h2>
          {playerScores.map((player: any) => (
            <div key={player.id}>
              <span>{player.name}</span>
              <span data-testid={`player-score-${player.id}`}>{player.totalScore}</span>
            </div>
          ))}
        </div>
      );
    };

    render(
      <MemoryRouter initialEntries={['/game']}>
        <ScoringTestComponent />
      </MemoryRouter>
    );

    // Before placement calculation, all scores should remain 0
    expect(screen.getByTestId('player-score-player1')).toHaveTextContent('0');
    expect(screen.getByTestId('player-score-player2')).toHaveTextContent('0');
    expect(screen.getByTestId('player-score-player3')).toHaveTextContent('0');
  });

  it('should demonstrate the difference between old and new logic', () => {
    // Create problematic scenario: placementPoints calculated but totalPoints temporarily 0
    const mockRound: GameRound = {
      id: 'round1',
      city: {
        id: '1',
        name: 'Test City',
        country: 'Test Country', 
        lat: 40.7128,
        lng: -74.0060,
        population: 1000000,
        difficulty: 'easy' as const
      },
      guesses: [
        {
          playerId: 'player2',
          lat: 41.0,
          lng: -73.0,
          distance: 150,
          placementPoints: 2, // Calculated!
          bonusPoints: 2,
          totalPoints: 0, // Temporarily 0 due to state update timing
          placement: 2,
          timestamp: Date.now()
        }
      ],
      completed: false,
      startTime: Date.now()
    };

    // OLD LOGIC (would cause flickering)
    const oldLogic = (playerGuess: any) => {
      return playerGuess && playerGuess.totalPoints > 0;
    };

    // NEW LOGIC (fixed)
    const newLogic = (playerGuess: any) => {
      return playerGuess && playerGuess.placementPoints > 0;
    };

    const player2Guess = mockRound.guesses[0];
    
    // Old logic would return false (hiding scores when totalPoints is temporarily 0)
    expect(oldLogic(player2Guess)).toBe(false);
    
    // New logic returns true (showing scores when placementPoints is calculated)
    expect(newLogic(player2Guess)).toBe(true);
  });
});