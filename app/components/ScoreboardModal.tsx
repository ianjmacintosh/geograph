import React, { memo } from 'react';
import ScoreboardHeader from './Scoreboard/ScoreboardHeader';
import ScoreboardList from './Scoreboard/ScoreboardList';
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl p-4 m-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <ScoreboardHeader onClose={onClose} />
        {/* Scores */}
        <ScoreboardList
          playerScores={playerScores}
          showResults={showResults}
          currentRound={currentRound}
          hasPlayerGuessedThisRound={hasPlayerGuessedThisRound}
        />
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