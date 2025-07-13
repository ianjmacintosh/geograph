import React from "react";
import PlayerScoreRow from "./PlayerScoreRow";

interface ScoreboardListProps {
  playerScores: Array<{
    id: string;
    name: string;
    isComputer: boolean;
    totalScore: number;
  }>;
  showResults: boolean;
  currentRound: any;
  hasPlayerGuessedThisRound: (playerId: string) => boolean;
}

// Renders the list of player scores
export default function ScoreboardList({
  playerScores,
  showResults,
  currentRound,
  hasPlayerGuessedThisRound,
}: ScoreboardListProps) {
  return (
    <div className="space-y-2 mb-4">
      {playerScores.map((player, index) => (
        <PlayerScoreRow
          key={player.id}
          player={player}
          index={index}
          showResults={showResults}
          currentRound={currentRound}
          hasPlayerGuessedThisRound={hasPlayerGuessedThisRound}
        />
      ))}
    </div>
  );
}
