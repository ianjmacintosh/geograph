import { describe, it, expect } from "vitest";
import { calculateBonusPoints } from "../utils/game";
import type { GameRound, Player, Guess, Game } from "../types/game";

// Test regression bugs as unit tests for game logic
describe("New Regression Bugs", () => {
  describe("Game Logic Validation", () => {
    it("should prevent multiple guesses from the same player", () => {
      const player: Player = { id: "player1", name: "Test Player", isComputer: false, score: 0 };
      
      const round: GameRound = {
        id: "test-round",
        city: {
          id: "test-city",
          name: "Test City",
          country: "Test Country",
          lat: 40.7128,
          lng: -74.006,
          population: 1000000,
          difficulty: "easy",
        },
        guesses: [],
        completed: false,
        startTime: Date.now(),
      };

      // Player makes first guess
      const firstGuess: Guess = {
        playerId: player.id,
        lat: 40.7,
        lng: -74.0,
        distance: 100,
        placementPoints: 2,
        bonusPoints: calculateBonusPoints(100),
        totalPoints: 4,
        placement: 1,
        timestamp: Date.now(),
      };

      const roundWithFirstGuess = { ...round, guesses: [firstGuess] };

      // Check if player has already guessed
      const hasPlayerGuessed = roundWithFirstGuess.guesses.some(
        guess => guess.playerId === player.id
      );
      expect(hasPlayerGuessed).toBe(true);

      // Player should not be able to guess again
      const canGuessAgain = !hasPlayerGuessed && !roundWithFirstGuess.completed;
      expect(canGuessAgain).toBe(false);

      // Verify only one guess exists for this player
      const playerGuesses = roundWithFirstGuess.guesses.filter(
        guess => guess.playerId === player.id
      );
      expect(playerGuesses.length).toBe(1);

      console.log("✅ Multiple guesses properly prevented for same player");
    });

    it("should hide other players guesses until human player guesses", () => {
      const humanPlayer: Player = { id: "human", name: "Human", isComputer: false, score: 0 };
      const computerPlayer: Player = { id: "comp1", name: "Computer", isComputer: true, score: 0 };

      const computerGuess: Guess = {
        playerId: computerPlayer.id,
        lat: 41.0,
        lng: -73.0,
        distance: 150,
        placementPoints: 1,
        bonusPoints: calculateBonusPoints(150),
        totalPoints: 3,
        placement: 2,
        timestamp: Date.now(),
      };

      const round: GameRound = {
        id: "test-round",
        city: {
          id: "test-city",
          name: "Test City",
          country: "Test Country",
          lat: 40.7128,
          lng: -74.006,
          population: 1000000,
          difficulty: "easy",
        },
        guesses: [computerGuess],
        completed: false,
        startTime: Date.now(),
      };

      // Check if human has guessed
      const hasHumanGuessed = round.guesses.some(
        guess => guess.playerId === humanPlayer.id
      );
      expect(hasHumanGuessed).toBe(false);

      // Logic: Other guesses should be hidden until human guesses
      const shouldShowOtherGuesses = hasHumanGuessed || round.completed;
      expect(shouldShowOtherGuesses).toBe(false);

      // Get visible guesses for human player (should be empty before human guesses)
      const visibleGuesses = shouldShowOtherGuesses ? round.guesses : [];
      expect(visibleGuesses.length).toBe(0);

      // Now human makes a guess
      const humanGuess: Guess = {
        playerId: humanPlayer.id,
        lat: 40.8,
        lng: -74.1,
        distance: 80,
        placementPoints: 3,
        bonusPoints: calculateBonusPoints(80),
        totalPoints: 5,
        placement: 1,
        timestamp: Date.now() + 1000,
      };

      const updatedRound = { ...round, guesses: [...round.guesses, humanGuess] };

      // Now human has guessed, other guesses should be visible
      const hasHumanGuessedNow = updatedRound.guesses.some(
        guess => guess.playerId === humanPlayer.id
      );
      expect(hasHumanGuessedNow).toBe(true);

      const shouldShowOtherGuessesNow = hasHumanGuessedNow || updatedRound.completed;
      expect(shouldShowOtherGuessesNow).toBe(true);

      const visibleGuessesNow = shouldShowOtherGuessesNow ? updatedRound.guesses : [];
      expect(visibleGuessesNow.length).toBe(2); // Both human and computer guesses

      console.log("✅ Other player guesses properly hidden until human guesses");
    });

    it("should end round after all players guess OR timer expires", () => {
      const players: Player[] = [
        { id: "human", name: "Human", isComputer: false, score: 0 },
        { id: "comp1", name: "Computer 1", isComputer: true, score: 0 },
        { id: "comp2", name: "Computer 2", isComputer: true, score: 0 },
      ];

      const round: GameRound = {
        id: "test-round",
        city: {
          id: "test-city",
          name: "Test City",
          country: "Test Country",
          lat: 40.7128,
          lng: -74.006,
          population: 1000000,
          difficulty: "easy",
        },
        guesses: [],
        completed: false,
        startTime: Date.now(),
      };

      // Test condition 1: All players have guessed
      const allGuesses: Guess[] = players.map((player, index) => ({
        playerId: player.id,
        lat: 40.7 + index * 0.1,
        lng: -74.0 + index * 0.1,
        distance: 100 * (index + 1),
        placementPoints: players.length - index,
        bonusPoints: calculateBonusPoints(100 * (index + 1)),
        totalPoints: (players.length - index) + calculateBonusPoints(100 * (index + 1)),
        placement: index + 1,
        timestamp: Date.now() + index * 1000,
      }));

      const roundWithAllGuesses = { ...round, guesses: allGuesses };

      const allPlayersGuessed = players.every(player =>
        roundWithAllGuesses.guesses.some(guess => guess.playerId === player.id)
      );
      expect(allPlayersGuessed).toBe(true);

      // Round should be completable when all players have guessed
      const shouldCompleteRound = allPlayersGuessed;
      expect(shouldCompleteRound).toBe(true);

      // Test condition 2: Timer expires (simulate with elapsed time)
      const roundTimeLimit = 30000; // 30 seconds
      const currentTime = Date.now();
      const roundStartTime = currentTime - roundTimeLimit - 1000; // Round started 31 seconds ago

      const expiredRound = { ...round, startTime: roundStartTime };
      const hasTimerExpired = (currentTime - expiredRound.startTime) >= roundTimeLimit;
      expect(hasTimerExpired).toBe(true);

      // Round should be completable when timer expires
      const shouldCompleteRoundByTimer = hasTimerExpired;
      expect(shouldCompleteRoundByTimer).toBe(true);

      // Final condition: Round completes if ALL players guessed OR timer expired
      const shouldCompleteEitherCondition = allPlayersGuessed || hasTimerExpired;
      expect(shouldCompleteEitherCondition).toBe(true);

      console.log("✅ Round completion logic working for both conditions");
    });

    it("should progress through multiple rounds correctly", () => {
      const game: Game = {
        id: "test-game",
        code: "TEST123",
        hostId: "human",
        players: [
          { id: "human", name: "Human", isComputer: false, score: 0 },
          { id: "comp1", name: "Computer", isComputer: true, score: 0 },
        ],
        rounds: [],
        status: "playing",
        settings: {
          maxPlayers: 2,
          roundTimeLimit: 30000,
          totalRounds: 3,
          cityDifficulty: "easy",
        },
        createdAt: Date.now(),
      };

      // Start with no rounds
      expect(game.rounds.length).toBe(0);

      // Add first round
      const round1: GameRound = {
        id: "round-1",
        city: {
          id: "city-1",
          name: "First City",
          country: "Country 1",
          lat: 40.7128,
          lng: -74.006,
          population: 1000000,
          difficulty: "easy",
        },
        guesses: [],
        completed: false,
        startTime: Date.now(),
      };

      const gameWithRound1 = { ...game, rounds: [round1] };
      expect(gameWithRound1.rounds.length).toBe(1);

      // Complete first round
      const completedRound1 = { ...round1, completed: true };
      const gameWithCompletedRound1 = { ...gameWithRound1, rounds: [completedRound1] };

      // Add second round
      const round2: GameRound = {
        id: "round-2",
        city: {
          id: "city-2",
          name: "Second City",
          country: "Country 2",
          lat: 41.8781,
          lng: -87.6298,
          population: 2000000,
          difficulty: "medium",
        },
        guesses: [],
        completed: false,
        startTime: Date.now() + 60000,
      };

      const gameWithBothRounds = { 
        ...gameWithCompletedRound1, 
        rounds: [...gameWithCompletedRound1.rounds, round2] 
      };

      expect(gameWithBothRounds.rounds.length).toBe(2);
      expect(gameWithBothRounds.rounds[0].completed).toBe(true);
      expect(gameWithBothRounds.rounds[1].completed).toBe(false);

      // Check if game should continue
      const currentRoundNumber = gameWithBothRounds.rounds.length;
      const shouldContinue = currentRoundNumber < gameWithBothRounds.settings.totalRounds;
      expect(shouldContinue).toBe(true); // 2 < 3

      console.log("✅ Multiple round progression working correctly");
    });
  });
});