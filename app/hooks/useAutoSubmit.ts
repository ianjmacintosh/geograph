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

  // Helper functions to reduce complexity
  const calculateTimeRemaining = (
    currentRound: GameRound,
    currentGame: Game | null,
  ): number => {
    const timeLimit = currentGame?.settings?.roundTimeLimit || 30000;
    const startTime =
      typeof currentRound.startTime === "number"
        ? currentRound.startTime
        : Date.now();
    const elapsed = Date.now() - startTime;
    return Math.max(0, Math.ceil((timeLimit - elapsed) / 1000));
  };

  const shouldAutoSubmitGuess = (
    timeLeft: number,
    currentGame: Game | null,
    playerId: string | null,
  ): boolean => {
    const isHumanPlayer = currentGame?.players.find(
      (p) => p.id === playerId && !p.isComputer,
    );
    return (
      timeLeft <= 1 &&
      !!provisionalGuessRef.current &&
      !hasConfirmedRef.current &&
      !hasAutoSubmittedRef.current &&
      !showResults &&
      !!isHumanPlayer
    );
  };

  const logDebugInfo = (
    timeLeft: number,
    currentRound: GameRound,
    shouldAutoSubmit: boolean,
  ) => {
    if (timeLeft <= 3) {
      console.log(`Timer: ${timeLeft}s, conditions:`, {
        timeExpired: timeLeft <= 1,
        hasProvisionalGuess: !!provisionalGuessRef.current,
        notConfirmed: !hasConfirmedRef.current,
        notAutoSubmitted: !hasAutoSubmittedRef.current,
        roundCompleted: currentRound.completed,
        notShowingResults: !showResults,
        shouldAutoSubmit,
      });
    }
  };

  const performAutoSubmit = (playerId: string | null) => {
    console.log(
      `Client Timer: Auto-submitting tentative guess for player ${playerId} at 1 second remaining.`,
    );
    setHasAutoSubmitted(true);
    confirmGuessRef.current();
  };

  // Effect 2: Client-Side Interval Timer and Auto-Submit
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !currentRound ||
      showResults ||
      currentRound.completed
    ) {
      return;
    }

    const updateTimerAndAutoSubmit = () => {
      const newTimeLeft = calculateTimeRemaining(currentRound, currentGame);
      setTimeLeft(newTimeLeft);

      const shouldAutoSubmit = shouldAutoSubmitGuess(
        newTimeLeft,
        currentGame,
        playerId,
      );
      logDebugInfo(newTimeLeft, currentRound, shouldAutoSubmit);

      if (shouldAutoSubmit) {
        performAutoSubmit(playerId);
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
