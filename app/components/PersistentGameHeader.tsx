import React, { memo } from "react";
import GameTimer from "./GameHeader/GameTimer";
import PlayerScore from "./GameHeader/PlayerScore";
import LeaderInfo from "./GameHeader/LeaderInfo";
import type { Game, GameRound } from "../types/game";

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
  timeLeft,
  roundNumber,
  currentPlayerScore,
  leaderName,
  leaderScore,
  isCurrentPlayerLeader,
  isAwaitingConfirmation: _isAwaitingConfirmation,
  onShowScoreboard,
}: PersistentGameHeaderProps) {
  const showResults = currentRound?.completed || false;

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
            <GameTimer timeLeft={timeLeft} showResults={showResults} />
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
            <PlayerScore currentPlayerScore={currentPlayerScore} />
          </div>

          {/* Leader Info */}
          <div className="flex-shrink-0">
            <LeaderInfo
              isCurrentPlayerLeader={isCurrentPlayerLeader}
              leaderName={leaderName}
              leaderScore={leaderScore}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
