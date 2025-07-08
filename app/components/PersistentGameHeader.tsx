import { memo } from 'react';
import type { Game, GameRound } from '../types/game';

interface PersistentGameHeaderProps {
  currentGame: Game;
  currentRound: GameRound;
  timeLeft: number;
  roundNumber: number;
  currentPlayerScore: number;
  leaderName: string;
  leaderScore: number;
  isCurrentPlayerLeader: boolean;
}

export const PersistentGameHeader = memo(function PersistentGameHeader({
  currentGame,
  currentRound,
  timeLeft,
  roundNumber,
  currentPlayerScore,
  leaderName,
  leaderScore,
  isCurrentPlayerLeader,
}: PersistentGameHeaderProps) {
  const isLowTime = timeLeft <= 10;
  const showResults = currentRound?.completed || false;

  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm lg:hidden">
      <div className="px-3 py-2">
        {/* Top Row: Target Location and Timer */}
        <div className="flex justify-between items-center mb-1">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">
              🎯 FIND: {currentRound.city.name}, {currentRound.city.country}
            </div>
          </div>
          {!showResults && (
            <div className="flex-shrink-0 ml-2">
              <div className={`text-sm font-bold px-2 py-1 rounded ${
                isLowTime 
                  ? 'text-red-600 bg-red-50 animate-pulse' 
                  : 'text-blue-600 bg-blue-50'
              }`}>
                {timeLeft}s remaining
              </div>
            </div>
          )}
          {showResults && (
            <div className="flex-shrink-0 ml-2">
              <div className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                Round Complete
              </div>
            </div>
          )}
        </div>

        {/* Bottom Row: Round, Score, Leader */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center space-x-3">
            {/* Round Info */}
            <div className="font-medium text-gray-600">
              ROUND {roundNumber}/{currentGame.settings.totalRounds}
            </div>
            
            {/* Current Score */}
            <div className="font-medium">
              <span className="text-gray-500">Score:</span>{' '}
              <span className="text-blue-600 font-semibold">{currentPlayerScore}</span>
            </div>
          </div>

          {/* Leader Info */}
          <div className="flex-shrink-0">
            {isCurrentPlayerLeader ? (
              <div className="text-green-600 font-semibold">
                🥇 YOU LEAD ({leaderScore})
              </div>
            ) : (
              <div className="text-gray-600">
                <span className="text-gray-500">LEADER:</span>{' '}
                <span className="font-semibold">{leaderName}</span>{' '}
                <span className="text-gray-800">({leaderScore})</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});