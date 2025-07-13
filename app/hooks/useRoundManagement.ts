import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import type {
  GameRound,
  // Note: City and Player types preserved for future development
  // City,
  Game,
  FinalResults,
  Player,
} from "../types/game";
import { getRandomCityByDifficulty } from "../data/cities";
import { calculateFinalPlacements } from "../utils/game";
import { useGame } from "../contexts/GameContext"; // Assuming GameContext provides finishGame

export interface UseRoundManagementProps {
  currentGame: Game | null;
  onRoundStart?: (newRound: GameRound) => void; // Callback when a new round starts
  onGameEnd?: (finalResults: FinalResults) => void; // Callback when game ends
  updateRoundWithPlacements: (round: GameRound) => GameRound; // Passed from game.tsx
}

export function useRoundManagement({
  currentGame,
  onRoundStart,
  onGameEnd,
  updateRoundWithPlacements,
}: UseRoundManagementProps) {
  const { finishGame: contextFinishGame } = useGame(); // Get finishGame from context
  const navigate = useNavigate();

  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [completedRounds, setCompletedRounds] = useState<GameRound[]>([]);
  const [usedCityIds, setUsedCityIds] = useState<string[]>([]);

  const startNewRound = useCallback(() => {
    if (!currentGame) return;

    const city = getRandomCityByDifficulty(
      currentGame.settings.cityDifficulty,
      usedCityIds,
    );
    const generateId = () =>
      Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newRound: GameRound = {
      id: generateId(),
      city,
      guesses: [],
      completed: false,
      startTime: Date.now(),
    };

    setUsedCityIds((prev) => [...prev, city.id]);
    setCurrentRound(newRound);
    if (onRoundStart) {
      onRoundStart(newRound);
    }
  }, [currentGame, usedCityIds, onRoundStart]);

  // Initialize first round
  useEffect(() => {
    if (
      currentGame &&
      currentGame.status === "playing" &&
      !currentRound &&
      roundNumber === 1
    ) {
      startNewRound();
    }
  }, [currentGame, currentRound, roundNumber, startNewRound]);

  // Helper function to process all rounds for final scoring
  const prepareAllRounds = useCallback(() => {
    let allRounds = [...completedRounds];

    if (!currentRound || currentRound.guesses.length === 0) {
      return allRounds;
    }

    if (
      currentRound.completed &&
      currentRound.guesses.some((g) => g.totalPoints > 0)
    ) {
      allRounds = [...allRounds, currentRound];
    } else if (!currentRound.completed) {
      const processedCurrentRound = updateRoundWithPlacements(currentRound);
      allRounds = [
        ...allRounds,
        { ...processedCurrentRound, completed: true, endTime: Date.now() },
      ];
    }

    return allRounds;
  }, [completedRounds, currentRound, updateRoundWithPlacements]);

  // Helper function to calculate player scores from all rounds
  const calculatePlayerScores = useCallback(
    (allRounds: GameRound[], players: Player[]) => {
      return players.map((player) => {
        let totalScore = 0;
        allRounds.forEach((round) => {
          const playerGuess = round.guesses.find(
            (g) => g.playerId === player.id,
          );
          if (playerGuess) {
            totalScore += playerGuess.totalPoints || 0;
          }
        });
        return {
          playerId: player.id,
          playerName: player.name,
          isComputer: player.isComputer,
          totalScore,
          finalPlacement: 0,
        };
      });
    },
    [],
  );

  // Helper function to find winner IDs
  const findWinnerIds = useCallback(
    (
      sortedScores: Array<{
        playerId: string;
        playerName: string;
        isComputer: boolean;
        totalScore: number;
        finalPlacement: number;
      }>,
    ) => {
      if (sortedScores.length === 0) return [];

      const topScore = sortedScores[0].totalScore;
      return sortedScores
        .filter((p) => p.totalScore === topScore)
        .map((p) => p.playerId);
    },
    [],
  );

  const handleGameEnd = useCallback(() => {
    if (!currentGame) return;

    const allRounds = prepareAllRounds();
    const playerScores = calculatePlayerScores(allRounds, currentGame.players);
    const sortedScores = calculateFinalPlacements(playerScores);
    const winnerIds = findWinnerIds(sortedScores);

    const finalResults: FinalResults = {
      playerScores: sortedScores,
      winnerId: sortedScores.length > 0 ? sortedScores[0].playerId : "",
      winnerIds,
      gameEndTime: Date.now(),
    };

    contextFinishGame(finalResults);
    if (onGameEnd) {
      onGameEnd(finalResults);
    }

    setTimeout(() => navigate("/results"), 50);
  }, [
    currentGame,
    prepareAllRounds,
    calculatePlayerScores,
    findWinnerIds,
    contextFinishGame,
    navigate,
    onGameEnd,
  ]);

  const handleNextRound = useCallback(() => {
    if (!currentGame) return;

    if (roundNumber >= currentGame.settings.totalRounds) {
      handleGameEnd();
      return;
    }

    // Save the current round to completed rounds (must be processed with placements)
    if (currentRound) {
      // Ensure the round is processed for placements before adding to completedRounds
      const roundToComplete = currentRound.completed
        ? currentRound
        : updateRoundWithPlacements(currentRound);

      // Ensure it's marked completed if it wasn't already (e.g. if round ended by all players guessing but not by timer)
      const finalCurrentRound = {
        ...roundToComplete,
        completed: true,
        endTime: roundToComplete.endTime || Date.now(),
      };
      setCompletedRounds((prev) => [...prev, finalCurrentRound]);
    }

    setRoundNumber((prev) => prev + 1);
    // startNewRound will be called, which also calls onRoundStart
    startNewRound();
  }, [
    currentGame,
    roundNumber,
    currentRound,
    handleGameEnd,
    startNewRound,
    updateRoundWithPlacements,
  ]);

  return {
    currentRound,
    setCurrentRound, // Expose setCurrentRound for direct updates (e.g., adding guesses)
    roundNumber,
    completedRounds,
    startNewRound, // Could be called externally if needed, e.g. for a reset button
    handleNextRound,
    handleGameEnd, // Could be called externally (e.g. by a "quit and show results" button)
    usedCityIds, // For preventing city reuse, might be needed by other hooks
  };
}
