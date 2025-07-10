import React from "react";

interface PlayerScoreRowProps {
  player: {
    id: string;
    name: string;
    isComputer: boolean;
    totalScore: number;
  };
  index: number;
  showResults: boolean;
  currentRound: any;
  hasPlayerGuessedThisRound: (playerId: string) => boolean;
}

// Renders a single player's score row
export default function PlayerScoreRow({
  player,
  index,
  showResults,
  currentRound,
  hasPlayerGuessedThisRound,
}: PlayerScoreRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <span className="text-lg flex-shrink-0">
          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "👤"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-base flex items-center gap-2">
            <span className="truncate">{player.name}</span>
            {!showResults && currentRound && !currentRound.completed && (
              <span className="text-sm flex-shrink-0">
                {hasPlayerGuessedThisRound(player.id) ? "✅" : "⏳"}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {player.isComputer ? "Computer" : "Human"}
            {!showResults &&
              currentRound &&
              !currentRound.completed &&
              hasPlayerGuessedThisRound(player.id) && (
                <span className="text-green-600 ml-1">• Guessed</span>
              )}
            {!showResults &&
              currentRound &&
              !currentRound.completed &&
              !hasPlayerGuessedThisRound(player.id) && (
                <span className="text-orange-600 ml-1">• Waiting</span>
              )}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-blue-600 text-lg">
          {player.totalScore}
        </div>
        <div className="text-xs text-gray-500">pts</div>
      </div>
    </div>
  );
}
