import { useCallback } from "react";
import type { Game, GameRound } from "../types/game";

export function useGameScoring(currentGame: Game | null, currentRound: GameRound | null) {
  // Check if a player (human or computer) has made a guess in the current round
  const hasPlayerGuessedThisRound = useCallback(
    (playerId: string): boolean => {
      if (!currentRound || !currentRound.guesses) return false;
      return currentRound.guesses.some((guess) => guess.playerId === playerId);
    },
    [currentRound],
  );

  // Calculate cumulative scores for display on the scoreboard
  const getPlayerScores = useCallback(() => {
    if (!currentGame) return [];

    const playerScoresMap = new Map<string, number>();
    currentGame.players.forEach((p) => playerScoresMap.set(p.id, 0));

    // Calculate scores from all completed rounds
    currentGame.rounds.forEach((round) => {
      if (round.completed) {
        round.guesses.forEach((guess) => {
          if (guess.totalPoints && playerScoresMap.has(guess.playerId)) {
            playerScoresMap.set(
              guess.playerId,
              (playerScoresMap.get(guess.playerId) || 0) + guess.totalPoints,
            );
          }
        });
      }
    });

    return currentGame.players
      .map((player) => ({
        ...player,
        totalScore: playerScoresMap.get(player.id) || 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [currentGame]);

  // Calculate leader information for persistent header
  const getLeaderInfo = useCallback(() => {
    const playerScores = getPlayerScores();
    const leader = playerScores[0];
    
    return {
      playerScores,
      leader,
      leaderName: leader?.name || "",
      leaderScore: leader?.totalScore || 0,
    };
  }, [getPlayerScores]);

  return {
    hasPlayerGuessedThisRound,
    getPlayerScores,
    getLeaderInfo,
  };
}