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

function getPlacementEmoji(index: number): string {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return "👤";
}

function getPlayerTypeLabel(isComputer: boolean): string {
  return isComputer ? "Computer" : "Human";
}

function shouldShowGuessStatus(
  showResults: boolean,
  currentRound: any,
): boolean {
  return !showResults && currentRound && !currentRound.completed;
}

function renderGuessStatus(
  playerId: string,
  hasPlayerGuessedThisRound: (playerId: string) => boolean,
) {
  const hasGuessed = hasPlayerGuessedThisRound(playerId);
  return (
    <span className="text-sm flex-shrink-0">{hasGuessed ? "✅" : "⏳"}</span>
  );
}

function renderStatusText(
  playerId: string,
  hasPlayerGuessedThisRound: (playerId: string) => boolean,
) {
  const hasGuessed = hasPlayerGuessedThisRound(playerId);
  if (hasGuessed) {
    return <span className="text-green-600 ml-1">• Guessed</span>;
  }
  return <span className="text-orange-600 ml-1">• Waiting</span>;
}

// Renders a single player's score row
export default function PlayerScoreRow({
  player,
  index,
  showResults,
  currentRound,
  hasPlayerGuessedThisRound,
}: PlayerScoreRowProps) {
  const showGuessStatus = shouldShowGuessStatus(showResults, currentRound);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <span className="text-lg flex-shrink-0">
          {getPlacementEmoji(index)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-base flex items-center gap-2">
            <span className="truncate">{player.name}</span>
            {showGuessStatus &&
              renderGuessStatus(player.id, hasPlayerGuessedThisRound)}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {getPlayerTypeLabel(player.isComputer)}
            {showGuessStatus &&
              renderStatusText(player.id, hasPlayerGuessedThisRound)}
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
