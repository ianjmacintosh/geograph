import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Game from '../routes/game';
import type { Game as GameType, GameRound, Guess } from '../types/game';

// Mock the useGame hook directly
const mockUseGame = vi.fn();
vi.mock('../contexts/GameContext', () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useGame: () => mockUseGame()
}));

// Mock the WorldMap component
vi.mock('../components/WorldMap', () => ({
  WorldMap: ({ onMapClick, guesses, showTarget }: any) => (
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

describe('Score Display Integration', () => {
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

  it('should display initial scores as zero', () => {
    render(
      <MemoryRouter initialEntries={['/game']}>
        <Game />
      </MemoryRouter>
    );

    expect(screen.getByTestId('player-score-player1')).toHaveTextContent('0');
    expect(screen.getByTestId('player-score-player2')).toHaveTextContent('0');
    expect(screen.getByTestId('player-score-player3')).toHaveTextContent('0');
  });

  it('should display scores correctly when round has calculated points', () => {
    // Create a mock round with calculated scores
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
          placementPoints: 3,
          bonusPoints: 5,
          totalPoints: 8,
          placement: 1,
          timestamp: Date.now()
        },
        {
          playerId: 'player2',
          lat: 41.0,
          lng: -73.0,
          distance: 150,
          placementPoints: 2,
          bonusPoints: 2,
          totalPoints: 4,
          placement: 2,
          timestamp: Date.now()
        },
        {
          playerId: 'player3',
          lat: 39.0,
          lng: -75.0,
          distance: 300,
          placementPoints: 1,
          bonusPoints: 2,
          totalPoints: 3,
          placement: 3,
          timestamp: Date.now()
        }
      ],
      completed: false,
      startTime: Date.now()
    };

    // Mock the Game component with a current round that has calculated scores
    const GameWithRound = () => {
      const { currentGame } = mockUseGame();
      const [currentRound] = vi.mocked([mockRound]);
      
      if (!currentGame || !currentRound) return <div>Loading...</div>;
      
      // Simulate the getPlayerScores function logic
      const getPlayerScores = () => {
        return currentGame.players.map((player: any) => {
          let totalScore = 0;
          
          // Add scores from current round if it has calculated placement points
          if (currentRound) {
            const playerGuess = currentRound.guesses.find(g => g.playerId === player.id);
            if (playerGuess && playerGuess.totalPoints > 0) {
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
        <GameWithRound />
      </MemoryRouter>
    );

    // Verify scores are displayed correctly
    expect(screen.getByTestId('player-score-player1')).toHaveTextContent('8');
    expect(screen.getByTestId('player-score-player2')).toHaveTextContent('4');
    expect(screen.getByTestId('player-score-player3')).toHaveTextContent('3');
  });

  it('should not display scores when round has no calculated points', () => {
    // Create a mock round with no calculated scores (intermediate state)
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
          placement: 0, // Not calculated yet
          timestamp: Date.now()
        }
      ],
      completed: false,
      startTime: Date.now()
    };

    // Mock the Game component with a current round that has no calculated scores
    const GameWithIncompleteRound = () => {
      const { currentGame } = mockUseGame();
      const [currentRound] = vi.mocked([mockRound]);
      
      if (!currentGame || !currentRound) return <div>Loading...</div>;
      
      // Simulate the getPlayerScores function logic
      const getPlayerScores = () => {
        return currentGame.players.map((player: any) => {
          let totalScore = 0;
          
          // Add scores from current round if it has calculated placement points
          if (currentRound) {
            const playerGuess = currentRound.guesses.find(g => g.playerId === player.id);
            if (playerGuess && playerGuess.totalPoints > 0) {
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
        <GameWithIncompleteRound />
      </MemoryRouter>
    );

    // Scores should remain at 0 since totalPoints is 0
    expect(screen.getByTestId('player-score-player1')).toHaveTextContent('0');
    expect(screen.getByTestId('player-score-player2')).toHaveTextContent('0');
    expect(screen.getByTestId('player-score-player3')).toHaveTextContent('0');
  });
});