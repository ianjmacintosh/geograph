import type { Game, FinalResults } from "../types/game";

interface GameSummaryProps {
  currentGame: Game;
  finalResults: FinalResults;
}

export function GameSummary({ currentGame, finalResults }: GameSummaryProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
      <h3 className="text-xl font-bold text-gray-800 mb-4">🎮 Game Summary</h3>
      <div className="grid md:grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {currentGame.settings.totalRounds}
          </div>
          <div className="text-sm text-gray-600">Rounds Played</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {finalResults.playerScores.length}
          </div>
          <div className="text-sm text-gray-600">Players</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600 capitalize">
            {currentGame.settings.cityDifficulty}
          </div>
          <div className="text-sm text-gray-600">Difficulty</div>
        </div>
      </div>
    </div>
  );
}