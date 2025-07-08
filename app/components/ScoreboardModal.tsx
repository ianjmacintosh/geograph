import { memo } from 'react';
import type { Game } from '../types/game';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGame: Game;
  playerScores: Array<{
    id: string;
    name: string;
    isComputer: boolean;
    totalScore: number;
  }>;
  roundNumber: number;
  hasPlayerGuessedThisRound: (playerId: string) => boolean;
  showResults: boolean;
  currentRound: any;
}

export const ScoreboardModal = memo(function ScoreboardModal({
  isOpen,
  onClose,
  currentGame,
  playerScores,
  roundNumber,
  hasPlayerGuessedThisRound,
  showResults,
  currentRound,
}: ScoreboardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl p-4 m-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Scoreboard</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Scores */}
        <div className="space-y-2 mb-4">
          {playerScores.map((player, index) => (
            <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <span className="text-lg flex-shrink-0">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-base flex items-center gap-2">
                    <span className="truncate">{player.name}</span>
                    {!showResults && currentRound && !currentRound.completed && (
                      <span className="text-sm flex-shrink-0">
                        {hasPlayerGuessedThisRound(player.id) ? '✅' : '⏳'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {player.isComputer ? 'Computer' : 'Human'}
                    {!showResults && currentRound && !currentRound.completed && hasPlayerGuessedThisRound(player.id) && (
                      <span className="text-green-600 ml-1">• Guessed</span>
                    )}
                    {!showResults && currentRound && !currentRound.completed && !hasPlayerGuessedThisRound(player.id) && (
                      <span className="text-orange-600 ml-1">• Waiting</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-blue-600 text-lg">{player.totalScore}</div>
                <div className="text-xs text-gray-500">pts</div>
              </div>
            </div>
          ))}
        </div>

        {/* Round Progress */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 mb-2">
            Round {roundNumber} of {currentGame.settings.totalRounds}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(roundNumber / currentGame.settings.totalRounds) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
});