import type { Game, GameRound } from "../types/game";

interface GameScoreboardProps {
  currentGame: Game;
  currentRound: GameRound | null;
  showResults: boolean;
  roundNumber: number;
  getPlayerScores: () => Array<{
    id: string;
    name: string;
    isComputer: boolean;
    totalScore: number;
  }>;
  hasPlayerGuessedThisRound: (playerId: string) => boolean;
}

function getPlacementEmoji(index: number): string {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return "👤";
}

function PlayerRow({
  player,
  index,
  showResults,
  currentRound,
  hasPlayerGuessedThisRound,
}: {
  player: { id: string; name: string; isComputer: boolean; totalScore: number };
  index: number;
  showResults: boolean;
  currentRound: GameRound | null;
  hasPlayerGuessedThisRound: (playerId: string) => boolean;
}) {
  const showGuessStatus = !showResults && currentRound && !currentRound.completed;
  const hasGuessed = hasPlayerGuessedThisRound(player.id);

  return (
    <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded">
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <span className="text-base sm:text-lg flex-shrink-0">
          {getPlacementEmoji(index)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm sm:text-base flex items-center gap-1 sm:gap-2">
            <span className="truncate">{player.name}</span>
            {showGuessStatus && (
              <span className="text-sm flex-shrink-0">
                {hasGuessed ? "✅" : "⏳"}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {player.isComputer ? "Computer" : "Human"}
            {showGuessStatus && hasGuessed && (
              <span className="text-green-600 ml-1">• Guessed</span>
            )}
            {showGuessStatus && !hasGuessed && (
              <span className="text-orange-600 ml-1">• Waiting</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div
          className="font-bold text-blue-600"
          data-testid={`player-score-${player.id}`}
        >
          {player.totalScore}
        </div>
        <div className="text-xs text-gray-500">pts</div>
      </div>
    </div>
  );
}

export function GameScoreboard({
  currentGame,
  currentRound,
  showResults,
  roundNumber,
  getPlayerScores,
  hasPlayerGuessedThisRound,
}: GameScoreboardProps) {
  return (
    <div className="hidden lg:block lg:col-span-1">
      <div className="bg-white rounded-lg shadow-xl p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
          Scoreboard
        </h2>
        <div className="space-y-2">
          {getPlayerScores().map((player, index) => (
            <PlayerRow
              key={player.id}
              player={player}
              index={index}
              showResults={showResults}
              currentRound={currentRound}
              hasPlayerGuessedThisRound={hasPlayerGuessedThisRound}
            />
          ))}
        </div>

        {/* Round Progress */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 mb-2">
            Round {roundNumber} of {currentGame.settings.totalRounds}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(roundNumber / currentGame.settings.totalRounds) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}