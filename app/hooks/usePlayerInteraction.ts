import { useState, useCallback } from 'react';
import type { Game, GameRound, Guess } from '../types/game';
import { calculateDistance, calculateBonusPoints } from '../utils/game';

interface UsePlayerInteractionProps {
  currentGame: Game | null;
  currentRound: GameRound | null;
  setCurrentRound: React.Dispatch<React.SetStateAction<GameRound | null>>;
  onPlayerGuessCompletesRound: () => void; // Callback when human player's guess completes all guesses
  isViewOnly: () => boolean; // Function to check if map interaction should be disabled (e.g. showResults is true)
}

export function usePlayerInteraction({
  currentGame,
  currentRound,
  setCurrentRound,
  onPlayerGuessCompletesRound,
  isViewOnly,
}: UsePlayerInteractionProps) {
  const [hasGuessed, setHasGuessed] = useState(false);

  const resetPlayerGuessState = useCallback(() => {
    setHasGuessed(false);
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (hasGuessed || !currentRound || !currentGame || isViewOnly()) {
      return;
    }

    const humanPlayer = currentGame.players.find(p => !p.isComputer);
    if (!humanPlayer) {
      return;
    }

    // Ensure currentRound.guesses is accessed safely
    const currentGuesses = currentRound.guesses || [];
    const existingGuess = currentGuesses.find(g => g.playerId === humanPlayer.id);
    if (existingGuess) {
      return;
    }

    const distance = calculateDistance(currentRound.city.lat, currentRound.city.lng, lat, lng);
    const bonusPoints = calculateBonusPoints(distance);

    const guess: Guess = {
      playerId: humanPlayer.id,
      lat,
      lng,
      distance,
      placementPoints: 0,
      bonusPoints,
      totalPoints: 0,
      placement: 0,
      timestamp: Date.now(),
    };

    setCurrentRound(prevRoundState => {
      if (!prevRoundState || prevRoundState.id !== currentRound.id) {
        // Stale closure or round changed for the human player's action
        return prevRoundState;
      }

      const prevGuesses = prevRoundState.guesses || [];
      // Defensive check again inside functional update
      const existingHumanGuessInPrev = prevGuesses.find(g => g.playerId === humanPlayer.id);
      if (existingHumanGuessInPrev) {
        return prevRoundState; // Already guessed in this exact state
      }

      const updatedGuesses = [...prevGuesses, guess];
      const updatedRound = { ...prevRoundState, guesses: updatedGuesses };

      const totalPlayers = currentGame.players.length;
      const totalGuessesMade = updatedRound.guesses.length;

      if (totalGuessesMade >= totalPlayers) {
        onPlayerGuessCompletesRound();
      }
      return updatedRound;
    });

    setHasGuessed(true);
  }, [hasGuessed, currentRound, currentGame, setCurrentRound, onPlayerGuessCompletesRound, isViewOnly]);

  return {
    hasGuessed,
    handleMapClick,
    resetPlayerGuessState,
  };
}
