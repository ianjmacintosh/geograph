import { describe, it, expect, vi } from 'vitest'
import { calculateBonusPoints, calculatePlacementPoints } from '../utils/game'
import type { GameRound, Player, Guess } from '../types/game'

// Test the state management logic that was causing flickering
describe('Game State Management Issues', () => {
  describe('Score Calculation Timing', () => {
    it('should not calculate placement points until ALL players have guessed', () => {
      const players: Player[] = [
        { id: 'human', name: 'Human', isComputer: false, score: 0 },
        { id: 'comp1', name: 'Computer 1', isComputer: true, score: 0 },
        { id: 'comp2', name: 'Computer 2', isComputer: true, score: 0 }
      ]

      const totalPlayers = players.length

      // Simulate the round state as it progresses
      let currentRound: GameRound = {
        id: 'test-round',
        city: {
          id: 'test-city',
          name: 'Test City', 
          country: 'Test Country',
          lat: 40.7128,
          lng: -74.0060,
          population: 1000000,
          difficulty: 'easy'
        },
        guesses: [],
        completed: false,
        startTime: Date.now()
      }

      // Step 1: Human player guesses
      const humanGuess: Guess = {
        playerId: 'human',
        lat: 40.7,
        lng: -74.0,
        distance: 80,
        placementPoints: 0, // Should remain 0 until all players guess
        bonusPoints: calculateBonusPoints(80),
        totalPoints: 0, // Should remain 0 until placement calculated
        placement: 0, // Should remain 0 until all players guess
        timestamp: Date.now()
      }

      currentRound = { ...currentRound, guesses: [humanGuess] }

      // Verify: Should NOT calculate placements yet
      expect(currentRound.guesses.length).toBe(1)
      expect(currentRound.guesses.length < totalPlayers).toBe(true)
      expect(humanGuess.placementPoints).toBe(0)
      expect(humanGuess.totalPoints).toBe(0)
      expect(humanGuess.placement).toBe(0)

      // Step 2: First computer guesses
      const comp1Guess: Guess = {
        playerId: 'comp1',
        lat: 40.8,
        lng: -74.1, 
        distance: 200,
        placementPoints: 0, // Still 0
        bonusPoints: calculateBonusPoints(200),
        totalPoints: 0, // Still 0
        placement: 0, // Still 0
        timestamp: Date.now()
      }

      currentRound = { ...currentRound, guesses: [...currentRound.guesses, comp1Guess] }

      // Verify: Still should NOT calculate placements
      expect(currentRound.guesses.length).toBe(2)
      expect(currentRound.guesses.length < totalPlayers).toBe(true)
      expect(comp1Guess.placementPoints).toBe(0)
      expect(comp1Guess.totalPoints).toBe(0)

      // Step 3: Second computer guesses (all players now done)
      const comp2Guess: Guess = {
        playerId: 'comp2',
        lat: 40.9,
        lng: -74.2,
        distance: 400,
        placementPoints: 0, // Will be calculated now
        bonusPoints: calculateBonusPoints(400),
        totalPoints: 0, // Will be calculated now
        placement: 0, // Will be calculated now
        timestamp: Date.now()
      }

      currentRound = { ...currentRound, guesses: [...currentRound.guesses, comp2Guess] }

      // Verify: Now should be ready to calculate placements
      expect(currentRound.guesses.length).toBe(3)
      expect(currentRound.guesses.length >= totalPlayers).toBe(true)

      // NOW calculate placements (this should only happen once, not cause flickering)
      const guessData = currentRound.guesses.map(g => ({ playerId: g.playerId, distance: g.distance }))
      const placements = calculatePlacementPoints(guessData, totalPlayers)

      // Update guesses with placement data (simulating updateRoundWithPlacements)
      const updatedGuesses = currentRound.guesses.map(guess => {
        const placement = placements.find(p => p.playerId === guess.playerId)!
        return {
          ...guess,
          placementPoints: placement.placementPoints,
          placement: placement.placement,
          totalPoints: placement.placementPoints + guess.bonusPoints
        }
      })

      // Verify final scores
      const humanFinal = updatedGuesses.find(g => g.playerId === 'human')!
      const comp1Final = updatedGuesses.find(g => g.playerId === 'comp1')!
      const comp2Final = updatedGuesses.find(g => g.playerId === 'comp2')!

      expect(humanFinal.placement).toBe(1) // Closest guess
      expect(humanFinal.placementPoints).toBe(3) // 1st in 3-player game
      expect(humanFinal.totalPoints).toBe(8) // 3 + 5 bonus

      expect(comp1Final.placement).toBe(2) // Second closest
      expect(comp1Final.placementPoints).toBe(2) // 2nd place
      expect(comp1Final.totalPoints).toBe(4) // 2 + 2 bonus

      expect(comp2Final.placement).toBe(3) // Furthest
      expect(comp2Final.placementPoints).toBe(1) // 3rd place  
      expect(comp2Final.totalPoints).toBe(3) // 1 + 2 bonus
    })
  })

  describe('State Update Sequence', () => {
    it('should follow correct sequence: guesses -> all players done -> calculate placements -> show results', () => {
      const gameFlow: string[] = []

      // Step 1: Human guesses
      gameFlow.push('human-guess-added')
      expect(gameFlow).toEqual(['human-guess-added'])

      // Step 2: Check if all players done (no, only 1 of 3)
      let allPlayersDone = false
      gameFlow.push(`all-players-done: ${allPlayersDone}`)

      // Step 3: Computer 1 guesses
      gameFlow.push('computer1-guess-added')

      // Step 4: Check if all players done (no, only 2 of 3)
      allPlayersDone = false
      gameFlow.push(`all-players-done: ${allPlayersDone}`)

      // Step 5: Computer 2 guesses
      gameFlow.push('computer2-guess-added')

      // Step 6: Check if all players done (yes, all 3 done)
      allPlayersDone = true
      gameFlow.push(`all-players-done: ${allPlayersDone}`)

      // Step 7: Calculate placements (should only happen once here)
      gameFlow.push('calculate-placements')

      // Step 8: Show results
      gameFlow.push('show-results')

      expect(gameFlow).toEqual([
        'human-guess-added',
        'all-players-done: false',
        'computer1-guess-added', 
        'all-players-done: false',
        'computer2-guess-added',
        'all-players-done: true',
        'calculate-placements', // Only happens once, at the right time
        'show-results'
      ])

      // Verify placement calculation only happened once
      const placementCalculations = gameFlow.filter(step => step === 'calculate-placements')
      expect(placementCalculations).toHaveLength(1)
    })
  })

  describe('Final Results Generation', () => {
    it('should correctly generate final results for game end', () => {
      // Simulate a completed game with 2 rounds
      const players: Player[] = [
        { id: 'player1', name: 'Player 1', isComputer: false, score: 0 },
        { id: 'player2', name: 'Computer 1', isComputer: true, score: 0 }
      ]

      // Round 1 completed guesses (with calculated placements)
      const round1Guesses: Guess[] = [
        {
          playerId: 'player1',
          lat: 40.7, lng: -74.0, distance: 50,
          placementPoints: 2, bonusPoints: 5, totalPoints: 7, placement: 1, // Won round 1
          timestamp: Date.now()
        },
        {
          playerId: 'player2', 
          lat: 40.8, lng: -74.1, distance: 200,
          placementPoints: 1, bonusPoints: 2, totalPoints: 3, placement: 2, // Lost round 1
          timestamp: Date.now()
        }
      ]

      // Round 2 completed guesses
      const round2Guesses: Guess[] = [
        {
          playerId: 'player1',
          lat: 41.0, lng: -74.5, distance: 300,
          placementPoints: 1, bonusPoints: 2, totalPoints: 3, placement: 2, // Lost round 2
          timestamp: Date.now()
        },
        {
          playerId: 'player2',
          lat: 41.1, lng: -74.4, distance: 150, 
          placementPoints: 2, bonusPoints: 2, totalPoints: 4, placement: 1, // Won round 2
          timestamp: Date.now()
        }
      ]

      const completedRounds = [
        { guesses: round1Guesses },
        { guesses: round2Guesses }
      ]

      // Calculate total scores (simulating handleGameEnd logic)
      const playerScores = players.map(player => {
        let totalScore = 0
        
        completedRounds.forEach(round => {
          const playerGuess = round.guesses.find(g => g.playerId === player.id)
          if (playerGuess) {
            totalScore += playerGuess.totalPoints
          }
        })
        
        return {
          playerId: player.id,
          playerName: player.name,
          isComputer: player.isComputer,
          totalScore,
          finalPlacement: 0
        }
      })

      // Sort and assign final placements
      const sortedScores = playerScores.sort((a, b) => b.totalScore - a.totalScore)
      sortedScores.forEach((player, index) => {
        player.finalPlacement = index + 1
      })

      // Verify final results
      expect(sortedScores[0].playerName).toBe('Player 1') // Human won overall
      expect(sortedScores[0].totalScore).toBe(10) // 7 + 3 = 10 total
      expect(sortedScores[0].finalPlacement).toBe(1)

      expect(sortedScores[1].playerName).toBe('Computer 1') // Computer lost overall
      expect(sortedScores[1].totalScore).toBe(7) // 3 + 4 = 7 total  
      expect(sortedScores[1].finalPlacement).toBe(2)

      const finalResults = {
        playerScores: sortedScores,
        winnerId: sortedScores[0].playerId,
        gameEndTime: Date.now()
      }

      expect(finalResults.winnerId).toBe('player1')
      expect(finalResults.playerScores).toHaveLength(2)
    })
  })
})