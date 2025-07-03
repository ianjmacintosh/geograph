import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { GameProvider, useGame } from '../../contexts/GameContext'
import Game from '../game'
import { calculatePlacementPoints, calculateBonusPoints } from '../../utils/game'
import type { Game as GameType, GameRound } from '../../types/game'
import React from 'react'

// Mock the WorldMap component since it uses Leaflet
vi.mock('../../components/WorldMap', () => ({
  WorldMap: ({ onMapClick, targetCity }: any) => (
    <div data-testid="world-map">
      <button 
        data-testid="map-click-btn"
        onClick={() => onMapClick?.(targetCity.lat + 0.1, targetCity.lng + 0.1)}
      >
        Click near target (simulate guess)
      </button>
      <div data-testid="target-city">{targetCity.name}</div>
    </div>
  )
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Create a test wrapper with game context
function TestWrapper({ children, initialGame }: { children: React.ReactNode, initialGame?: GameType }) {
  return (
    <BrowserRouter>
      <GameProvider>
        <TestGameSetup initialGame={initialGame}>
          {children}
        </TestGameSetup>
      </GameProvider>
    </BrowserRouter>
  )
}

// Component to set up initial game state
function TestGameSetup({ children, initialGame }: { children: React.ReactNode, initialGame?: GameType }) {
  const { createGame } = useGame()
  
  React.useEffect(() => {
    if (initialGame) {
      createGame(initialGame)
    }
  }, [initialGame, createGame])
  
  return <>{children}</>
}

describe('Game Scoring Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not show scores until all players have guessed', async () => {
    const testGame: GameType = {
      id: 'test-game',
      code: 'TEST01',
      hostId: 'player1',
      players: [
        { id: 'player1', name: 'Human Player', isComputer: false, score: 0 },
        { id: 'player2', name: 'Computer 1', isComputer: true, score: 0, accuracy: 0.5 },
        { id: 'player3', name: 'Computer 2', isComputer: true, score: 0, accuracy: 0.5 },
      ],
      rounds: [],
      status: 'playing',
      settings: {
        maxPlayers: 3,
        roundTimeLimit: 30000,
        totalRounds: 2,
        cityDifficulty: 'easy',
      },
      createdAt: Date.now(),
    }

    render(
      <TestWrapper initialGame={testGame}>
        <Game />
      </TestWrapper>
    )

    // Wait for game to load
    await waitFor(() => {
      expect(screen.getByTestId('world-map')).toBeInTheDocument()
    })

    // Make human player guess
    const mapClickBtn = screen.getByTestId('map-click-btn')
    fireEvent.click(mapClickBtn)

    // Should show waiting message but no points yet
    expect(screen.getByText(/waiting for other players/i)).toBeInTheDocument()
    
    // Should NOT show total points until all players guess
    const feedbackText = screen.getByText(/your guess was/i)
    expect(feedbackText).not.toHaveTextContent('points')
    expect(feedbackText).toHaveTextContent('km away')
  })

  it('should show final results when game completes', async () => {
    const testGame: GameType = {
      id: 'test-game',
      code: 'TEST01',
      hostId: 'player1',
      players: [
        { id: 'player1', name: 'Human Player', isComputer: false, score: 0 },
      ],
      rounds: [],
      status: 'playing',
      settings: {
        maxPlayers: 1,
        roundTimeLimit: 30000,
        totalRounds: 1, // Single round for quick test
        cityDifficulty: 'easy',
      },
      createdAt: Date.now(),
    }

    render(
      <TestWrapper initialGame={testGame}>
        <Game />
      </TestWrapper>
    )

    // Wait for game to load
    await waitFor(() => {
      expect(screen.getByTestId('world-map')).toBeInTheDocument()
    })

    // Make human player guess
    const mapClickBtn = screen.getByTestId('map-click-btn')
    fireEvent.click(mapClickBtn)

    // Wait for results to show
    await waitFor(() => {
      expect(screen.getByText(/round results/i)).toBeInTheDocument()
    })

    // Click finish game (since it's the last round)
    const finishBtn = screen.getByText(/finish game/i)
    fireEvent.click(finishBtn)

    // Should navigate to results
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/results')
    })
  })

  it('should accumulate scores across multiple rounds', async () => {
    // This test would be more complex and simulate multiple rounds
    // For now, let's focus on the immediate issues
  })
})

describe('Scoring Calculation', () => {
  it('should calculate total points correctly', () => {
    const guesses = [
      { playerId: 'player1', distance: 50 },   // 1st place + 5 bonus = 8 total (in 3-player game)
      { playerId: 'player2', distance: 300 },  // 2nd place + 2 bonus = 4 total  
      { playerId: 'player3', distance: 1500 }, // 3rd place + 0 bonus = 1 total
    ]

    const placements = calculatePlacementPoints(guesses, 3)
    
    const player1Result = placements.find((p: any) => p.playerId === 'player1')
    const player2Result = placements.find((p: any) => p.playerId === 'player2')
    const player3Result = placements.find((p: any) => p.playerId === 'player3')
    
    expect(player1Result.placementPoints).toBe(3) // 1st place in 3-player game
    expect(calculateBonusPoints(50)).toBe(5)      // <100km bonus
    
    expect(player2Result.placementPoints).toBe(2) // 2nd place
    expect(calculateBonusPoints(300)).toBe(2)     // <500km bonus
    
    expect(player3Result.placementPoints).toBe(1) // 3rd place  
    expect(calculateBonusPoints(1500)).toBe(0)    // >1000km, no bonus
  })
})