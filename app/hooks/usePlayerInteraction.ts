import { useState, useCallback, useEffect } from 'react';
import type { Game, GameRound } from '../types/game';
import { useGame } from '../contexts/GameContext';

interface UsePlayerInteractionProps {
  currentGame: Game | null;
  currentRound: GameRound | null;
  // isViewOnly is effectively replaced by hasGuessedOrConfirmed and conditions in game.tsx
  // We'll use a simpler `isDisabled` prop controlled by the parent component.
  // Or, more accurately, the conditions within handleSetProvisionalGuess will manage interactability.
  hasPlayerAlreadyGuessedInRound: boolean;
}

export function usePlayerInteraction({
  currentGame,
  currentRound,
  hasPlayerAlreadyGuessedInRound,
}: UsePlayerInteractionProps) {
  const [provisionalGuessLocation, setProvisionalGuessLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  // 'hasGuessed' now means the player has *confirmed* a guess for the current round.
  // This will be derived from `hasPlayerAlreadyGuessedInRound` passed from game.tsx initially,
  // and then set true after confirmation.
  const [hasConfirmedGuessForRound, setHasConfirmedGuessForRound] = useState(false);

  const { makeGuess, playerId } = useGame();

  const resetPlayerGuessState = useCallback(() => {
    setProvisionalGuessLocation(null);
    setIsAwaitingConfirmation(false);
    setHasConfirmedGuessForRound(false);
  }, []);

  // This function is called when the player clicks on the map.
  // It sets the provisional guess.
  const handleSetProvisionalGuess = useCallback((lat: number, lng: number) => {
    // Do not allow setting a new provisional guess if:
    // - Player has already confirmed a guess for this round.
    // - It's not a valid game/round context.
    // - There's no player ID.
    // - The round is already completed (showing results).
    if (hasConfirmedGuessForRound || hasPlayerAlreadyGuessedInRound || !currentRound || !currentGame || !playerId || currentRound.completed) {
      return;
    }

    setProvisionalGuessLocation({ lat, lng });
    setIsAwaitingConfirmation(true);
  }, [hasConfirmedGuessForRound, hasPlayerAlreadyGuessedInRound, currentRound, currentGame, playerId]);

  const confirmCurrentGuess = useCallback(() => {
    if (!provisionalGuessLocation || !currentRound || !currentGame || !playerId || hasConfirmedGuessForRound || hasPlayerAlreadyGuessedInRound) {
      return;
    }

    makeGuess(provisionalGuessLocation.lat, provisionalGuessLocation.lng);
    setHasConfirmedGuessForRound(true); // Player has now officially guessed for this round.
    setIsAwaitingConfirmation(false);
    setProvisionalGuessLocation(null); // Clear provisional marker once guess is confirmed
  }, [provisionalGuessLocation, currentRound, currentGame, playerId, makeGuess, hasConfirmedGuessForRound, hasPlayerAlreadyGuessedInRound]);

  const cancelProvisionalGuess = useCallback(() => {
    setProvisionalGuessLocation(null);
    setIsAwaitingConfirmation(false);
    // hasConfirmedGuessForRound remains as is, as they haven't un-confirmed a guess, just cancelled a provisional one.
  }, []);

  // Effect to synchronize hasConfirmedGuessForRound with external hasPlayerAlreadyGuessedInRound
  // This is important if the guess was made on another client/tab or if rejoining.
  useEffect(() => {
    if (hasPlayerAlreadyGuessedInRound) {
      setHasConfirmedGuessForRound(true);
    }
  }, [hasPlayerAlreadyGuessedInRound]);


  return {
    provisionalGuessLocation,
    isAwaitingConfirmation,
    hasConfirmedGuessForRound, // This now reflects if the current player has locked in their guess
    handleSetProvisionalGuess, // Renamed from handleMapClick for clarity
    confirmCurrentGuess,
    cancelProvisionalGuess,
    resetPlayerGuessState,
  };
}
