import { useEffect } from "react";
import type { Game, GameRound, Guess, City } from "../types/game";
import {
  generateComputerGuess,
  calculateDistance,
  calculateBonusPoints,
} from "../utils/game";

interface UseComputerPlayersProps {
  currentGame: Game | null;
  currentRound: GameRound | null;
  isHumanPlayerTurnOrResultsShown: boolean; // True if human just guessed, or results are shown
  setCurrentRound: React.Dispatch<React.SetStateAction<GameRound | null>>;
  onComputerGuessesCompleteRound: () => void; // Callback if computer guesses complete the round
}

export function useComputerPlayers({
  currentGame,
  currentRound,
  isHumanPlayerTurnOrResultsShown,
  setCurrentRound,
  onComputerGuessesCompleteRound,
}: UseComputerPlayersProps) {
  useEffect(() => {
    if (
      !currentRound ||
      currentRound.completed ||
      !currentGame ||
      isHumanPlayerTurnOrResultsShown // If true, computer waits or doesn't act
    ) {
      return;
    }

    const computerPlayers = currentGame.players.filter((p) => p.isComputer);
    if (computerPlayers.length === 0) {
      return;
    }

    const currentGuesses = currentRound.guesses || [];
    const computersWhoHaventGuessed = computerPlayers.filter(
      (player) => !currentGuesses.some((guess) => guess.playerId === player.id),
    );

    if (computersWhoHaventGuessed.length === 0) {
      return;
    }

    const computerGuessTimer = setTimeout(
      () => {
        setCurrentRound((prevRoundState) => {
          // Stale closure/state check: ensure this update is for the intended round & game state
          if (
            !prevRoundState ||
            prevRoundState.id !== currentRound.id || // Check against the currentRound from effect closure
            prevRoundState.completed ||
            !currentGame // currentGame might have changed (e.g., game cleared)
          ) {
            return prevRoundState;
          }

          // Re-check which computers haven't guessed using the most up-to-date prevRoundState
          // to avoid issues if another computer guessed while this timeout was pending (less likely with current structure but good practice)
          const latestRoundGuesses = prevRoundState.guesses || [];
          const stillNeedToGuess = currentGame.players.filter(
            (p) =>
              p.isComputer &&
              !latestRoundGuesses.some((guess) => guess.playerId === p.id),
          );

          if (stillNeedToGuess.length === 0) {
            return prevRoundState;
          }

          const newComputerGuesses: Guess[] = stillNeedToGuess.map((player) => {
            const cityToGuess = prevRoundState.city as City; // Should always be a city here
            const guessDetails = generateComputerGuess(
              cityToGuess,
              player.accuracy || 0.5,
            );
            const distance = calculateDistance(
              cityToGuess.lat,
              cityToGuess.lng,
              guessDetails.lat,
              guessDetails.lng,
            );
            const bonus = calculateBonusPoints(distance);
            return {
              playerId: player.id,
              lat: guessDetails.lat,
              lng: guessDetails.lng,
              distance,
              placementPoints: 0,
              bonusPoints: bonus,
              totalPoints: 0, // Will be sum of placement + bonus
              placement: 0,
              timestamp: Date.now() + Math.random() * 1000, // Slight random offset for timestamp
            };
          });

          const updatedGuesses = [...latestRoundGuesses, ...newComputerGuesses];
          const roundWithNewComputerGuesses = {
            ...prevRoundState,
            guesses: updatedGuesses,
          };

          const totalPlayers = currentGame.players.length;
          const totalGuessesMade = roundWithNewComputerGuesses.guesses.length;

          if (totalGuessesMade >= totalPlayers) {
            onComputerGuessesCompleteRound();
          }

          return roundWithNewComputerGuesses;
        });
      },
      2000 + Math.random() * 3000,
    ); // Computers guess between 2-5 seconds

    return () => clearTimeout(computerGuessTimer);
  }, [
    currentRound, // Full object for initial checks and id
    currentGame,
    isHumanPlayerTurnOrResultsShown,
    setCurrentRound,
    onComputerGuessesCompleteRound,
  ]);
}
