import { useState, useEffect, useRef } from "react";
import type { Game, GameRound } from "../types/game";

interface UseAutoSubmitProps {
  currentRound: GameRound | null;
  currentGame: Game | null;
  showResults: boolean;
  playerId: string | null;
  provisionalGuessLocation: { lat: number; lng: number } | null;
  hasConfirmedGuess: boolean;
  onConfirmGuess: () => void;
}

export function useAutoSubmit({
  currentRound,
  currentGame,
  showResults,
  playerId,
  provisionalGuessLocation,
  hasConfirmedGuess,
  onConfirmGuess,
}: UseAutoSubmitProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  // Use refs to access current values without causing effect restarts
  const provisionalGuessRef = useRef(provisionalGuessLocation);
  const hasConfirmedRef = useRef(hasConfirmedGuess);
  const hasAutoSubmittedRef = useRef(hasAutoSubmitted);
  const confirmGuessRef = useRef(onConfirmGuess);

  // Update refs when values change
  useEffect(() => {
    provisionalGuessRef.current = provisionalGuessLocation;
    hasConfirmedRef.current = hasConfirmedGuess;
    hasAutoSubmittedRef.current = hasAutoSubmitted;
    confirmGuessRef.current = onConfirmGuess;
  });

  // Reset auto-submit state when round changes
  useEffect(() => {
    if (currentRound) {
      setHasAutoSubmitted(false);
    }
  }, [currentRound?.id]);

  // Effect 1: Initial Time Calculation (SSR + Client)
  useEffect(() => {
    if (!currentRound || showResults) {
      setTimeLeft(0);
      return;
    }
    const calculateInitialTime = () => {
      const timeLimit = currentGame?.settings?.roundTimeLimit || 30000;
      const startTime =
        typeof currentRound.startTime === "number"
          ? currentRound.startTime
          : Date.now();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((timeLimit - elapsed) / 1000));
      setTimeLeft(remaining);
    };
    calculateInitialTime();
  }, [currentRound, currentGame, showResults]);

  // Effect 2: Client-Side Interval Timer and Auto-Submit
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!currentRound || showResults || currentRound.completed) {
      return;
    }

    const updateTimerAndAutoSubmit = () => {
      const timeLimit = currentGame?.settings?.roundTimeLimit || 30000;
      const startTime =
        typeof currentRound.startTime === "number"
          ? currentRound.startTime
          : Date.now();
      const elapsed = Date.now() - startTime;
      const newRemaining = Math.max(0, Math.ceil((timeLimit - elapsed) / 1000));
      setTimeLeft(newRemaining);

      // Auto-submit tentative guess when timer reaches 1 second (to beat server timer race)
      const shouldAutoSubmit =
        newRemaining <= 1 &&
        provisionalGuessRef.current &&
        !hasConfirmedRef.current &&
        !hasAutoSubmittedRef.current &&
        !showResults &&
        currentGame &&
        currentGame.players.find((p) => p.id === playerId && !p.isComputer);

      // Debug logs (remove after testing)
      if (newRemaining <= 3) {
        console.log(`Timer: ${newRemaining}s, conditions:`, {
          timeExpired: newRemaining <= 1,
          hasProvisionalGuess: !!provisionalGuessRef.current,
          notConfirmed: !hasConfirmedRef.current,
          notAutoSubmitted: !hasAutoSubmittedRef.current,
          roundCompleted: currentRound.completed,
          notShowingResults: !showResults,
          isHumanPlayer: !!(
            currentGame &&
            currentGame.players.find((p) => p.id === playerId && !p.isComputer)
          ),
          shouldAutoSubmit,
        });
      }

      if (shouldAutoSubmit) {
        console.log(
          `Client Timer: Auto-submitting tentative guess for player ${playerId} at 1 second remaining.`,
        );
        setHasAutoSubmitted(true);
        confirmGuessRef.current();
      }
    };

    const intervalId = setInterval(updateTimerAndAutoSubmit, 250);
    return () => clearInterval(intervalId);
  }, [currentRound, currentGame, showResults, playerId]);

  return {
    timeLeft,
    hasAutoSubmitted,
  };
}
