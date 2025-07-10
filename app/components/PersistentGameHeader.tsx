import React, { memo, useEffect, useRef, useState } from 'react';
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
  isAwaitingConfirmation: boolean;
  onShowScoreboard: () => void;
}

export const PersistentGameHeader = memo(function PersistentGameHeader({
  currentGame,
  currentRound,
  timeLeft: initialTimeLeft,
  roundNumber,
  currentPlayerScore,
  leaderName,
  leaderScore,
  isCurrentPlayerLeader,
  isAwaitingConfirmation,
  onShowScoreboard,
}: PersistentGameHeaderProps) {
  // High-precision timer state
  const [displayTime, setDisplayTime] = useState(initialTimeLeft);
  const rafRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const lastTimeLeftRef = useRef(initialTimeLeft);
  const showResults = currentRound?.completed || false;
  const isLowTime = displayTime <= 10;
  const isCriticalTime = displayTime <= 5;

  // Sync displayTime with prop and animate at 10ms intervals
  useEffect(() => {
    if (showResults) {
      setDisplayTime(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    setDisplayTime(initialTimeLeft);
    lastTimeLeftRef.current = initialTimeLeft;
    startTimestampRef.current = performance.now();
    let lastUpdate = performance.now();
    function update() {
      const now = performance.now();
      const elapsed = (now - startTimestampRef.current!) / 1000;
      const newTime = Math.max(0, lastTimeLeftRef.current - elapsed);
      setDisplayTime(newTime);
      if (newTime > 0) {
        rafRef.current = requestAnimationFrame(update);
      }
    }
    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [initialTimeLeft, showResults, currentRound?.id]);

  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="px-3 py-2">
        {/* Top Row: Target Location and Actions */}
        <div className="flex justify-between items-center mb-1">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">
              🎯 FIND: {currentRound.city.name}, {currentRound.city.country}
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            {/* Timer only, high precision */}
            {!showResults && (
              <div className={`text-sm font-bold px-2 py-1 rounded flex items-center gap-2 ${
                isCriticalTime
                  ? 'text-white bg-red-600 animate-pulse-fast'
                  : isLowTime
                  ? 'text-red-600 bg-red-50 animate-pulse'
                  : 'text-blue-600 bg-blue-50'
              }`}>
                <span>{displayTime.toFixed(2)}</span>
                <style>{`
                  @keyframes pulse-fast {
                    0%, 100% { background-color: #dc2626; color: #fff; }
                    50% { background-color: #fff; color: #dc2626; }
                  }
                  .animate-pulse-fast {
                    animation: pulse-fast 0.7s cubic-bezier(0.4,0,0.6,1) infinite;
                  }
                `}</style>
              </div>
            )}

            {/* Round Complete indicator */}
            {showResults && (
              <div className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                Complete
              </div>
            )}

            {/* Scores Button */}
            <button
              onClick={onShowScoreboard}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
            >
              Scores
            </button>
          </div>
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