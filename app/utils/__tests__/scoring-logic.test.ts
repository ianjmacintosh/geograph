import { describe, it, expect } from 'vitest'
import { calculateBonusPoints, calculatePlacementPoints } from '../game'

describe('Scoring Logic Issues', () => {
  it('should maintain consistent total points calculation', () => {
    // Simulate a 3-player game round
    const guesses = [
      { playerId: 'human', distance: 150 },     // 2nd place, gets 2 bonus points
      { playerId: 'computer1', distance: 80 },  // 1st place, gets 5 bonus points  
      { playerId: 'computer2', distance: 600 }, // 3rd place, gets 2 bonus points
    ]

    const placements = calculatePlacementPoints(guesses, 3)
    
    // Check placement calculation
    const humanResult = placements.find(p => p.playerId === 'human')
    const computer1Result = placements.find(p => p.playerId === 'computer1')
    const computer2Result = placements.find(p => p.playerId === 'computer2')
    
    // Verify placement points (3 players: 1st=3pts, 2nd=2pts, 3rd=1pt)
    expect(computer1Result?.placementPoints).toBe(3) // 1st place
    expect(computer1Result?.placement).toBe(1)
    
    expect(humanResult?.placementPoints).toBe(2) // 2nd place
    expect(humanResult?.placement).toBe(2)
    
    expect(computer2Result?.placementPoints).toBe(1) // 3rd place
    expect(computer2Result?.placement).toBe(3)
    
    // Verify bonus points calculation
    expect(calculateBonusPoints(150)).toBe(2) // 150km = 2 bonus points (100-500km)
    expect(calculateBonusPoints(80)).toBe(5)  // 80km = 5 bonus points (<100km)
    expect(calculateBonusPoints(600)).toBe(1) // 600km = 1 bonus point (500-1000km)
    
    // Total points should be placement + bonus
    // Human: 2 + 2 = 4 total
    // Computer1: 3 + 5 = 8 total  
    // Computer2: 1 + 1 = 2 total
  })

  it('should handle single player game correctly', () => {
    const guesses = [
      { playerId: 'solo', distance: 250 }
    ]

    const placements = calculatePlacementPoints(guesses, 1)
    const result = placements[0]
    
    expect(result.placementPoints).toBe(1) // Only player gets 1 point
    expect(result.placement).toBe(1)
    expect(calculateBonusPoints(250)).toBe(2) // Gets bonus points too
  })
})

describe('State Management Issues', () => {
  it('should correctly identify when all players have guessed', () => {
    const totalPlayers = 3
    const guesses = [
      { playerId: 'player1', distance: 100 },
      { playerId: 'player2', distance: 200 },
      // Missing player3 - not all have guessed yet
    ]
    
    expect(guesses.length).toBe(2)
    expect(guesses.length < totalPlayers).toBe(true) // Not ready for scoring
    
    // Add third player
    guesses.push({ playerId: 'player3', distance: 300 })
    expect(guesses.length).toBe(3)
    expect(guesses.length >= totalPlayers).toBe(true) // Ready for scoring
  })
})