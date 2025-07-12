import { WorldMap } from "./WorldMap";
import type { Game, GameRound, Guess } from "../types/game";

interface GameResultsProps {
  currentGame: Game;
  currentRound: GameRound;
  roundNumber: number;
  isHost: boolean;
  onNextRound: () => void;
  _onLeaveGame: () => void;
  _getPlayerScores: () => Array<{
    playerId: string;
    playerName: string;
    isComputer: boolean;
    totalScore: number;
  }>;
}

function getPlacementEmoji(placement: number): string {
  if (placement === 1) return "🥇";
  if (placement === 2) return "🥈";
  if (placement === 3) return "🥉";
  return "👤";
}

function renderGuessResult(guess: Guess, currentGame: Game) {
  const player = currentGame.players.find((p) => p.id === guess.playerId);
  const placementEmoji = getPlacementEmoji(guess.placement);

  return (
    <div
      key={guess.playerId}
      className="flex justify-between items-center py-1"
    >
      <div className="flex items-center space-x-1 lg:space-x-2 min-w-0 flex-1">
        <span className="text-sm lg:text-lg flex-shrink-0">
          {placementEmoji}
        </span>
        <span className="font-medium text-sm lg:text-base truncate">
          {player?.name}
        </span>
        <span className="text-xs lg:text-sm text-gray-500 hidden sm:inline">
          {player?.isComputer ? "(AI)" : "(You)"}
        </span>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-semibold text-blue-600 text-sm lg:text-base">
          {guess.totalPoints || 0}
        </div>
        <div className="text-xs text-gray-500 hidden lg:block">
          {guess.placementPoints || 0} + {guess.bonusPoints || 0} bonus
        </div>
        <div className="text-xs text-gray-500">
          {Math.round(guess.distance || 0)}km
        </div>
      </div>
    </div>
  );
}

export function GameResults({
  currentGame,
  currentRound,
  roundNumber,
  isHost,
  onNextRound,
  _onLeaveGame,
  _getPlayerScores,
}: GameResultsProps) {
  return (
    <>
      <div className="mb-4 lg:mb-6">
        <div className="h-48 sm:h-64 lg:h-96 relative rounded-lg overflow-hidden">
          <WorldMap
            key={currentRound.id}
            targetCity={currentRound.city}
            onProvisionalGuess={() => {}} // No interaction during results
            provisionalGuessLocation={null}
            isGuessDisabled={true}
            guesses={(() => {
              const currentGuesses = currentRound.guesses || [];
              return currentGuesses.map((guess) => {
                const player = currentGame.players.find(
                  (p) => p.id === guess.playerId,
                );
                return {
                  lat: guess.lat,
                  lng: guess.lng,
                  playerName: player?.name || "Unknown",
                  isComputer: player?.isComputer || false,
                };
              });
            })()}
            showTarget={true}
          />
        </div>
      </div>

      {/* Target City Indicator */}
      {currentRound && (
        <div className="mb-3 lg:mb-6 text-center px-2">
          <div className="inline-flex items-center px-2 py-1 lg:px-4 lg:py-3 bg-red-100 border border-red-300 rounded-lg max-w-full">
            <div className="w-3 h-3 lg:w-4 lg:h-4 bg-red-500 rounded-full mr-2 flex-shrink-0"></div>
            <span className="text-red-800 font-semibold text-xs lg:text-base break-words">
              🎯 {currentRound.city.name} is here ({currentRound.city.country})
            </span>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="bg-gray-50 rounded-lg p-3 lg:p-4">
          <h3 className="text-base lg:text-lg font-semibold mb-2 lg:mb-3">
            Round Results
          </h3>
          <div className="space-y-1 lg:space-y-2">
            {(currentRound.guesses || [])
              .sort((a, b) => (a.placement || 0) - (b.placement || 0))
              .map((guess) => renderGuessResult(guess, currentGame))}
          </div>

          {isHost && (
            <div className="mt-3 lg:mt-4 flex justify-center">
              <button
                onClick={onNextRound}
                className="px-4 py-2 lg:px-8 lg:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-semibold text-sm lg:text-lg min-h-[44px] lg:min-h-[48px] touch-manipulation"
              >
                {roundNumber >= currentGame.settings.totalRounds
                  ? "Final Results"
                  : "Next Round"}
              </button>
            </div>
          )}

          {!isHost && (
            <div className="mt-3 lg:mt-4 text-center text-gray-600">
              <p className="text-xs lg:text-sm">
                Waiting for host to continue...
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
