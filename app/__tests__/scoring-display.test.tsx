import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Game from '../routes/game';
import type { Game as GameType } from '../types/game';

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
      <div data-testid="target-shown">{showTarget ? 'target-visible' : 'target-hidden'}</div>
      <div data-testid="guess-count">{guesses.length}</div>
      <button
        onClick={() => onMapClick && onMapClick(40.7128, -74.0060)}
        data-testid="map-click"
      >
        Click Map
      </button>
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

// Mock the game utils
vi.mock('../utils/game', () => ({
  calculateDistance: vi.fn(),
  calculateBonusPoints: vi.fn(),
  calculatePlacementPoints: vi.fn(),
  generateComputerGuess: vi.fn()
}));

describe('Scoring Display', () => {
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show initial scoreboard with zero scores', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/game']}>
          <Game />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Human Player')).toBeInTheDocument();
      expect(screen.getByText('Computer1')).toBeInTheDocument();
      expect(screen.getByText('Computer2')).toBeInTheDocument();
    });

    // All players should start with 0 points
    expect(screen.getByTestId('player-score-player1')).toHaveTextContent('0');
    expect(screen.getByTestId('player-score-player2')).toHaveTextContent('0');
    expect(screen.getByTestId('player-score-player3')).toHaveTextContent('0');
  });

  it('should display placement indicators correctly', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/game']}>
          <Game />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Scoreboard')).toBeInTheDocument();
    });

    // Check for placement emojis (gold, silver, bronze medals)
    const goldMedal = screen.getByText('🥇');
    const silverMedal = screen.getByText('🥈');
    const bronzeMedal = screen.getByText('🥉');

    expect(goldMedal).toBeInTheDocument();
    expect(silverMedal).toBeInTheDocument();
    expect(bronzeMedal).toBeInTheDocument();
  });

  it('should show game progress correctly', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/game']}>
          <Game />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('Round 1 of 3')).toHaveLength(2); // Main header and progress section
    });

    // Check for timer display
    expect(screen.getByText(/Time:/)).toBeInTheDocument();
    expect(screen.getByText(/30s/)).toBeInTheDocument();

    // Check for game code display
    expect(screen.getByText('Game Code: 123456')).toBeInTheDocument();
  });

  it('should handle map click interaction', async () => {
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

    // Make human guess
    await act(async () => {
      fireEvent.click(screen.getByTestId('map-click'));
    });

    // Should show guess submitted message
    await waitFor(() => {
      expect(screen.getByText('✅ Guess submitted! Waiting for other players...')).toBeInTheDocument();
    });
  });

  it('should display player information correctly', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/game']}>
          <Game />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Human Player')).toBeInTheDocument();
    });

    // Check player types are displayed
    const humanLabels = screen.getAllByText('Human');
    const computerLabels = screen.getAllByText('Computer');
    
    expect(humanLabels.length).toBeGreaterThan(0);
    expect(computerLabels.length).toBeGreaterThan(0);
  });

  it('should show correct instruction text based on game state', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/game']}>
          <Game />
        </MemoryRouter>
      );
    });

    // Initially should show instruction to click map
    await waitFor(() => {
      expect(screen.getByText(/Click on the map to guess where/)).toBeInTheDocument();
    });

    // After clicking, should show waiting message
    await act(async () => {
      fireEvent.click(screen.getByTestId('map-click'));
    });

    await waitFor(() => {
      expect(screen.getByText('✅ Guess submitted! Waiting for other players...')).toBeInTheDocument();
    });
  });
});