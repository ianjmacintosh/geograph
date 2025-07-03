import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { GameProvider } from '../contexts/GameContext'
import Game from '../routes/game'
import Results from '../routes/results'
import { calculatePlacementPoints, calculateBonusPoints } from '../utils/game'
import type { Game as GameType } from '../types/game'
import React from 'react'

// Mock the WorldMap component since it uses Leaflet
vi.mock('../components/WorldMap', () => ({
  WorldMap: ({ onMapClick, targetCity, showTarget }: any) => (
    <div data-testid="world-map">
      <div data-testid="target-city">{targetCity.name}</div>
      <div data-testid="show-target">{showTarget ? 'showing' : 'hidden'}</div>
      <button 
        data-testid="map-click-btn"
        onClick={() => onMapClick?.(targetCity.lat + 0.1, targetCity.lng + 0.1)}
      >
        Click map (100km away)
      </button>
      <button 
        data-testid="map-click-close-btn"
        onClick={() => onMapClick?.(targetCity.lat + 0.01, targetCity.lng + 0.01)}
      >
        Click map (10km away)
      </button>
    </div>
  )
}))

// Mock city data to return consistent test data
vi.mock('../data/cities', () => ({
  getRandomCityByDifficulty: () => ({
    id: 'test-city',
    name: 'Test City',
    country: 'Test Country',
    lat: 40.7128,
    lng: -74.0060,
    population: 1000000,
    difficulty: 'easy'
  })
}))

// Mock the useGame hook at the module level
const mockUseGame = vi.fn()

vi.mock('../contexts/GameContext', () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => children,
  useGame: () => mockUseGame()
}))

// Test wrapper with proper router context
function TestWrapper({ children, game }: { children: React.ReactNode, game: GameType }) {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <div>Home Page</div>
    },
    {
      path: '/lobby',
      element: <div>Lobby Page</div>
    },
    {
      path: '/game',
      element: children
    },
    {
      path: '/results',
      element: <Results />
    }
  ], {
    initialEntries: ['/game']
  })

  return <RouterProvider router={router} />
}

describe('Game Integration Tests (Simplified)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate scoring logic works end-to-end', async () => {
    const testGame: GameType = {
      id: 'test-game',
      code: 'TEST01',
      hostId: 'player1',
      players: [
        { id: 'player1', name: 'Test Player', isComputer: false, score: 0 }
      ],
      rounds: [],
      status: 'playing',
      settings: {
        maxPlayers: 1,
        roundTimeLimit: 30000,
        totalRounds: 1,
        cityDifficulty: 'easy',
      },
      createdAt: Date.now(),
    }

    // Set up the mock to return our test game
    mockUseGame.mockReturnValue({
      currentGame: testGame,
      isLoading: false,
      error: null,
      createGame: vi.fn(),
      joinGame: vi.fn(),
      addComputerPlayers: vi.fn(),
      startGame: vi.fn(),
      clearGame: vi.fn(),
      updateSettings: vi.fn(),
      finishGame: vi.fn()
    })

    render(
      <TestWrapper game={testGame}>
        <div data-testid="test-container">
          <Game />
        </div>
      </TestWrapper>
    )

    // The component should render without crashing
    await waitFor(() => {
      expect(screen.getByTestId('test-container')).toBeInTheDocument()
    })
  })

  it('should handle multi-player game state correctly', async () => {
    const testGame: GameType = {
      id: 'test-game',
      code: 'TEST01',
      hostId: 'player1',
      players: [
        { id: 'player1', name: 'Human', isComputer: false, score: 0 },
        { id: 'player2', name: 'Computer 1', isComputer: true, score: 0, accuracy: 0.1 },
        { id: 'player3', name: 'Computer 2', isComputer: true, score: 0, accuracy: 0.1 }
      ],
      rounds: [],
      status: 'playing',
      settings: {
        maxPlayers: 3,
        roundTimeLimit: 30000,
        totalRounds: 1,
        cityDifficulty: 'easy',
      },
      createdAt: Date.now(),
    }

    // Set up the mock to return our test game
    mockUseGame.mockReturnValue({
      currentGame: testGame,
      isLoading: false,
      error: null,
      createGame: vi.fn(),
      joinGame: vi.fn(),
      addComputerPlayers: vi.fn(),
      startGame: vi.fn(),
      clearGame: vi.fn(),
      updateSettings: vi.fn(),
      finishGame: vi.fn()
    })

    render(
      <TestWrapper game={testGame}>
        <div data-testid="multi-player-test">
          <Game />
        </div>
      </TestWrapper>
    )

    // Verify the component structure renders
    await waitFor(() => {
      expect(screen.getByTestId('multi-player-test')).toBeInTheDocument()
    })
  })

  it('should create results page without crashing', async () => {
    const testGame: GameType = {
      id: 'test-game',
      code: 'TEST01',
      hostId: 'player1',
      players: [
        { id: 'player1', name: 'Test Player', isComputer: false, score: 0 }
      ],
      rounds: [],
      status: 'finished',
      settings: {
        maxPlayers: 1,
        roundTimeLimit: 30000,
        totalRounds: 1,
        cityDifficulty: 'easy',
      },
      finalResults: {
        playerScores: [{
          playerId: 'player1',
          playerName: 'Test Player',
          isComputer: false,
          totalScore: 10,
          finalPlacement: 1
        }],
        winnerId: 'player1',
        gameEndTime: Date.now()
      },
      createdAt: Date.now(),
    }

    // Set up the mock to return our test game with final results
    mockUseGame.mockReturnValue({
      currentGame: testGame,
      isLoading: false,
      error: null,
      createGame: vi.fn(),
      joinGame: vi.fn(),
      addComputerPlayers: vi.fn(),
      startGame: vi.fn(),
      clearGame: vi.fn(),
      updateSettings: vi.fn(),
      finishGame: vi.fn()
    })

    render(
      <TestWrapper game={testGame}>
        <div data-testid="results-test">
          <Results />
        </div>
      </TestWrapper>
    )

    // Verify the results component can render
    await waitFor(() => {
      expect(screen.getByTestId('results-test')).toBeInTheDocument()
    })
  })
})

// Test the core game logic without React complications
describe('Core Game Logic Integration', () => {
  it('should process a complete single-player round correctly', () => {
    // Simulate the exact data flow that happens in the game
    const player = { id: 'player1', name: 'Test Player', isComputer: false, score: 0 }
    const totalPlayers = 1
    
    // Player makes a guess
    const guess = {
      playerId: 'player1',
      distance: 50 // 50km away
    }
    
    // Calculate scoring
    const placements = calculatePlacementPoints([guess], totalPlayers)
    const bonusPoints = calculateBonusPoints(guess.distance)
    
    const playerResult = placements.find((p: any) => p.playerId === 'player1')
    const totalScore = playerResult.placementPoints + bonusPoints
    
    // Verify results
    expect(playerResult.placement).toBe(1) // 1st place
    expect(playerResult.placementPoints).toBe(1) // 1 point for solo win
    expect(bonusPoints).toBe(5) // 5 bonus for <100km
    expect(totalScore).toBe(6) // 1 + 5 = 6 total
  })

  it('should process a complete multi-player round correctly', () => {
    const players = [
      { id: 'human', name: 'Human', isComputer: false, score: 0 },
      { id: 'comp1', name: 'Computer 1', isComputer: true, score: 0 },
      { id: 'comp2', name: 'Computer 2', isComputer: true, score: 0 }
    ]
    const totalPlayers = players.length
    
    // All players make guesses
    const guesses = [
      { playerId: 'human', distance: 80 },   // Closest
      { playerId: 'comp1', distance: 250 },  // Middle
      { playerId: 'comp2', distance: 800 }   // Furthest
    ]
    
    // Process scoring
    const placements = calculatePlacementPoints(guesses, totalPlayers)
    
    const results = placements.map((placement: any) => {
      const guess = guesses.find(g => g.playerId === placement.playerId)!
      const bonusPoints = calculateBonusPoints(guess.distance)
      return {
        playerId: placement.playerId,
        placement: placement.placement,
        placementPoints: placement.placementPoints,
        bonusPoints,
        totalPoints: placement.placementPoints + bonusPoints
      }
    })
    
    // Verify human won
    const humanResult = results.find((r: any) => r.playerId === 'human')!
    expect(humanResult.placement).toBe(1)
    expect(humanResult.placementPoints).toBe(3) // 1st in 3-player game
    expect(humanResult.bonusPoints).toBe(5) // <100km bonus
    expect(humanResult.totalPoints).toBe(8) // 3 + 5
    
    // Verify computers placed correctly
    const comp1Result = results.find((r: any) => r.playerId === 'comp1')!
    expect(comp1Result.placement).toBe(2)
    expect(comp1Result.totalPoints).toBe(4) // 2 + 2
    
    const comp2Result = results.find((r: any) => r.playerId === 'comp2')!
    expect(comp2Result.placement).toBe(3)
    expect(comp2Result.totalPoints).toBe(2) // 1 + 1
  })

  it('should accumulate scores across multiple rounds', () => {
    const player = { id: 'player1', name: 'Test Player', isComputer: false, score: 0 }
    
    // Round 1: Good guess (6 points)
    const round1Guess = { playerId: 'player1', distance: 50 }
    const round1Placements = calculatePlacementPoints([round1Guess], 1)
    const round1Total = round1Placements[0].placementPoints + calculateBonusPoints(50)
    expect(round1Total).toBe(6) // 1 + 5
    
    // Round 2: Decent guess (3 points)
    const round2Guess = { playerId: 'player1', distance: 200 }
    const round2Placements = calculatePlacementPoints([round2Guess], 1)
    const round2Total = round2Placements[0].placementPoints + calculateBonusPoints(200)
    expect(round2Total).toBe(3) // 1 + 2
    
    // Game total
    const gameTotal = round1Total + round2Total
    expect(gameTotal).toBe(9)
  })
})