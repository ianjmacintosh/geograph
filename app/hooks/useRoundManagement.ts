import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { GameRound, City, Game, FinalResults, Player } from '../types/game';
import { getRandomCityByDifficulty } from '../data/cities';
import { calculateFinalPlacements } from '../utils/game';
import { useGame } from '../contexts/GameContext'; // Assuming GameContext provides finishGame

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

    const city = getRandomCityByDifficulty(currentGame.settings.cityDifficulty, usedCityIds);
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newRound: GameRound = {
      id: generateId(),
      city,
      guesses: [],
      completed: false,
      startTime: Date.now(),
    };

    setUsedCityIds(prev => [...prev, city.id]);
    setCurrentRound(newRound);
    if (onRoundStart) {
      onRoundStart(newRound);
    }
  }, [currentGame, usedCityIds, onRoundStart]);

  // Initialize first round
  useEffect(() => {
    if (currentGame && currentGame.status === 'playing' && !currentRound && roundNumber === 1) {
      startNewRound();
    }
  }, [currentGame, currentRound, roundNumber, startNewRound]);

  const handleGameEnd = useCallback(() => {
    if (!currentGame) return;

    let allRounds = [...completedRounds];
    // Ensure currentRound exists and has placement points before including
    if (currentRound && currentRound.completed && currentRound.guesses.length > 0 && currentRound.guesses.some(g => g.totalPoints > 0)) {
       // If currentRound is completed, it should already have placements.
       // If not, it might need to be processed by updateRoundWithPlacements first.
       // For now, assuming if it's completed, it's processed.
      allRounds = [...allRounds, currentRound];
    } else if (currentRound && !currentRound.completed && currentRound.guesses.length > 0) {
      // If current round is not completed but has guesses, process it first
      const processedCurrentRound = updateRoundWithPlacements(currentRound);
      allRounds = [...allRounds, { ...processedCurrentRound, completed: true, endTime: Date.now() }];
    }

    const playerScores = currentGame.players.map(player => {
      let totalScore = 0;
      allRounds.forEach(round => {
        const playerGuess = round.guesses.find(g => g.playerId === player.id);
        if (playerGuess) {
          totalScore += playerGuess.totalPoints || 0; // Ensure totalPoints is defined
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

    const sortedScores = calculateFinalPlacements(playerScores);

    // Find all players who tied for first place
    const winnerIds: string[] = [];
    if (sortedScores.length > 0) {
      const topScore = sortedScores[0].totalScore;
      winnerIds.push(...sortedScores.filter(p => p.totalScore === topScore).map(p => p.playerId));
    }

    const finalResults: FinalResults = {
      playerScores: sortedScores,
      winnerId: sortedScores.length > 0 ? sortedScores[0].playerId : '', // Handle empty scores
      winnerIds,
      gameEndTime: Date.now(),
    };

    contextFinishGame(finalResults); // Use context's finishGame
    
    if (onGameEnd) {
      onGameEnd(finalResults);
    }
    
    // Small delay to ensure context state update completes before navigation
    setTimeout(() => {
      navigate("/results");
    }, 50);
  }, [currentGame, completedRounds, currentRound, contextFinishGame, navigate, onGameEnd, updateRoundWithPlacements]);

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
            endTime: roundToComplete.endTime || Date.now()
        };
        setCompletedRounds(prev => [...prev, finalCurrentRound]);
    }


    setRoundNumber(prev => prev + 1);
    // startNewRound will be called, which also calls onRoundStart
    startNewRound();
  }, [currentGame, roundNumber, currentRound, handleGameEnd, startNewRound, updateRoundWithPlacements]);


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
