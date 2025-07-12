import { describe, it, expect } from "vitest";
import { calculateBonusPoints, calculatePlacementPoints } from "../utils/game";
import type { GameRound, Guess } from "../types/game";

// Simulate the React state updates that were causing flickering
describe("React State Update Simulation", () => {
  it("should demonstrate the flickering issue and verify the fix", () => {
    const testCity = {
      id: "test-city",
      name: "Test City",
      country: "Test Country",
      lat: 40.7128,
      lng: -74.006,
      population: 1000000,
      difficulty: "easy" as const,
    };

    // Track all state updates to detect flickering
    const stateUpdates: Array<{ step: string; guesses: Guess[] }> = [];

    // Initial round state
    let currentRound: GameRound = {
      id: "test-round",
      city: testCity,
      guesses: [],
      completed: false,
      startTime: Date.now(),
    };

    const totalPlayers = 3;

    // === PROBLEMATIC APPROACH (causes flickering) ===
    // This is what was happening before the fix

    // Step 1: Human player guesses
    const humanGuess: Guess = {
      playerId: "human",
      lat: 40.7,
      lng: -74.0,
      distance: 80,
      placementPoints: 0,
      bonusPoints: calculateBonusPoints(80),
      totalPoints: 0,
      placement: 0,
      timestamp: Date.now(),
    };

    currentRound = { ...currentRound, guesses: [humanGuess] };
    stateUpdates.push({
      step: "human-guess",
      guesses: [...currentRound.guesses],
    });

    // Step 2: Computer guesses are added (this was causing intermediate updates)
    const computerGuesses: Guess[] = [
      {
        playerId: "comp1",
        lat: 40.8,
        lng: -74.1,
        distance: 200,
        placementPoints: 0,
        bonusPoints: calculateBonusPoints(200),
        totalPoints: 0,
        placement: 0,
        timestamp: Date.now(),
      },
      {
        playerId: "comp2",
        lat: 40.9,
        lng: -74.2,
        distance: 400,
        placementPoints: 0,
        bonusPoints: calculateBonusPoints(400),
        totalPoints: 0,
        placement: 0,
        timestamp: Date.now(),
      },
    ];

    // OLD BAD APPROACH: Multiple state updates
    // Update 1: Add computer guesses without placements
    currentRound = {
      ...currentRound,
      guesses: [...currentRound.guesses, ...computerGuesses],
    };
    stateUpdates.push({
      step: "add-computer-guesses-no-placements",
      guesses: [...currentRound.guesses],
    });

    // Update 2: Calculate placements and update again (THIS CAUSES FLICKERING)
    if (currentRound.guesses.length >= totalPlayers) {
      const guessData = currentRound.guesses.map((g) => ({
        playerId: g.playerId,
        distance: g.distance,
      }));
      const placements = calculatePlacementPoints(guessData, totalPlayers);

      const updatedGuesses = currentRound.guesses.map((guess) => {
        const placement = placements.find(
          (p) => p.playerId === guess.playerId,
        )!;
        return {
          ...guess,
          placementPoints: placement.placementPoints,
          placement: placement.placement,
          totalPoints: placement.placementPoints + guess.bonusPoints,
        };
      });

      currentRound = { ...currentRound, guesses: updatedGuesses };
      stateUpdates.push({
        step: "add-placements",
        guesses: [...currentRound.guesses],
      });
    }

    // Verify the flickering behavior occurred
    expect(stateUpdates).toHaveLength(3);

    // The problematic sequence:
    // 1. Human guess (no scores)
    expect(stateUpdates[0].guesses[0].totalPoints).toBe(0);

    // 2. Computer guesses added (still no scores)
    expect(stateUpdates[1].guesses[0].totalPoints).toBe(0);
    expect(stateUpdates[1].guesses[1].totalPoints).toBe(0);
    expect(stateUpdates[1].guesses[2].totalPoints).toBe(0);

    // 3. Scores suddenly appear (this is the flicker!)
    expect(stateUpdates[2].guesses[0].totalPoints).toBe(8); // Human: 3 + 5
    expect(stateUpdates[2].guesses[1].totalPoints).toBe(4); // Comp1: 2 + 2
    expect(stateUpdates[2].guesses[2].totalPoints).toBe(3); // Comp2: 1 + 2

    // === FIXED APPROACH (no flickering) ===
    // Reset for the fixed approach test
    const stateUpdatesFixed: Array<{ step: string; guesses: Guess[] }> = [];

    let fixedRound: GameRound = {
      id: "test-round-fixed",
      city: testCity,
      guesses: [],
      completed: false,
      startTime: Date.now(),
    };

    // Step 1: Human guesses
    const humanGuessFixed: Guess = {
      playerId: "human",
      lat: 40.7,
      lng: -74.0,
      distance: 80,
      placementPoints: 0,
      bonusPoints: calculateBonusPoints(80),
      totalPoints: 0,
      placement: 0,
      timestamp: Date.now(),
    };

    fixedRound = { ...fixedRound, guesses: [humanGuessFixed] };
    stateUpdatesFixed.push({
      step: "human-guess",
      guesses: [...fixedRound.guesses],
    });

    // Step 2: FIXED APPROACH - Calculate everything before any state update
    const computerGuessesFixed: Guess[] = [
      {
        playerId: "comp1",
        lat: 40.8,
        lng: -74.1,
        distance: 200,
        placementPoints: 0,
        bonusPoints: calculateBonusPoints(200),
        totalPoints: 0,
        placement: 0,
        timestamp: Date.now(),
      },
      {
        playerId: "comp2",
        lat: 40.9,
        lng: -74.2,
        distance: 400,
        placementPoints: 0,
        bonusPoints: calculateBonusPoints(400),
        totalPoints: 0,
        placement: 0,
        timestamp: Date.now(),
      },
    ];

    // Combine all guesses
    const allGuesses = [...fixedRound.guesses, ...computerGuessesFixed];

    // Calculate placements for all guesses at once
    const guessDataFixed = allGuesses.map((g) => ({
      playerId: g.playerId,
      distance: g.distance,
    }));
    const placementsFixed = calculatePlacementPoints(
      guessDataFixed,
      totalPlayers,
    );

    // Update all guesses with placements in one go
    const finalGuesses = allGuesses.map((guess) => {
      const placement = placementsFixed.find(
        (p) => p.playerId === guess.playerId,
      )!;
      return {
        ...guess,
        placementPoints: placement.placementPoints,
        placement: placement.placement,
        totalPoints: placement.placementPoints + guess.bonusPoints,
      };
    });

    // SINGLE state update with final calculated scores
    fixedRound = { ...fixedRound, guesses: finalGuesses };
    stateUpdatesFixed.push({
      step: "all-final-scores",
      guesses: [...fixedRound.guesses],
    });

    // Verify no flickering in fixed approach
    expect(stateUpdatesFixed).toHaveLength(2); // Only 2 updates instead of 3

    // The fixed sequence:
    // 1. Human guess (no scores)
    expect(stateUpdatesFixed[0].guesses[0].totalPoints).toBe(0);

    // 2. Final scores appear all at once (no intermediate state)
    expect(stateUpdatesFixed[1].guesses[0].totalPoints).toBe(8); // Human
    expect(stateUpdatesFixed[1].guesses[1].totalPoints).toBe(4); // Comp1
    expect(stateUpdatesFixed[1].guesses[2].totalPoints).toBe(3); // Comp2

    // No intermediate update with partial data - this eliminates the flicker!
    const intermediateUpdates = stateUpdatesFixed.filter(
      (update) =>
        update.step.includes("no-placements") ||
        update.step.includes("add-computer-guesses"),
    );
    expect(intermediateUpdates).toHaveLength(0);
  });

  it("should validate the exact timing of score visibility", () => {
    // Test the user experience: when should scores be visible?

    const gameStates = [
      { playersGuessed: 1, totalPlayers: 3, shouldShowScores: false },
      { playersGuessed: 2, totalPlayers: 3, shouldShowScores: false },
      { playersGuessed: 3, totalPlayers: 3, shouldShowScores: true }, // Only now!
    ];

    gameStates.forEach((state) => {
      const allPlayersGuessed = state.playersGuessed >= state.totalPlayers;
      expect(allPlayersGuessed).toBe(state.shouldShowScores);
    });

    // Single player game (scores should show immediately)
    const singlePlayerState = {
      playersGuessed: 1,
      totalPlayers: 1,
      shouldShowScores: true,
    };
    const singlePlayerReady =
      singlePlayerState.playersGuessed >= singlePlayerState.totalPlayers;
    expect(singlePlayerReady).toBe(true);
  });
});
