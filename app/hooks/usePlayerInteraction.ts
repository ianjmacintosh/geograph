import { useState, useCallback } from 'react';
import type { Game, GameRound, Guess } from '../types/game';
import { useGame } from '../contexts/GameContext';

interface UsePlayerInteractionProps {
  currentGame: Game | null;
  currentRound: GameRound | null;
  isViewOnly: () => boolean; // Function to check if map interaction should be disabled (e.g. showResults is true)
}

export function usePlayerInteraction({
  currentGame,
  currentRound,
  isViewOnly,
}: UsePlayerInteractionProps) {
  const [hasGuessed, setHasGuessed] = useState(false);
  const { makeGuess, playerId } = useGame();

  const resetPlayerGuessState = useCallback(() => {
    setHasGuessed(false);
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (hasGuessed || !currentRound || !currentGame || isViewOnly() || !playerId) {
      return;
    }

    // Check if current player has already guessed
    const currentGuesses = currentRound.guesses || [];
    const existingGuess = currentGuesses.find(g => g.playerId === playerId);
    if (existingGuess) {
      return;
    }

    // Send guess to server via WebSocket
    makeGuess(lat, lng);
    setHasGuessed(true);
  }, [hasGuessed, currentRound, currentGame, isViewOnly, playerId, makeGuess]);

  return {
    hasGuessed,
    handleMapClick,
    resetPlayerGuessState,
  };
}
