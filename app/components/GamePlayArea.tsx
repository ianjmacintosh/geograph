import { WorldMap } from "./WorldMap";
import type { Game, GameRound } from "../types/game";

interface GamePlayAreaProps {
  currentGame: Game;
  currentRound: GameRound;
  provisionalGuessLocation: { lat: number; lng: number } | null;
  isAwaitingConfirmation: boolean;
  _timeLeft: number;
  onProvisionalGuess: (lat: number, lng: number) => void;
  onConfirmGuess: () => void;
  hasPlayerGuessed: boolean;
  _showGuessButton: boolean;
}

export function GamePlayArea({
  currentGame,
  currentRound,
  provisionalGuessLocation,
  isAwaitingConfirmation,
  _timeLeft,
  onProvisionalGuess,
  onConfirmGuess,
  hasPlayerGuessed,
  _showGuessButton,
}: GamePlayAreaProps) {
  const showResults = false; // Never show results in play area
  return (
    <>
      <div className="mb-4 lg:mb-6">
        <div
          className={`relative rounded-lg overflow-hidden ${
            showResults
              ? "h-48 sm:h-64" // Smaller when showing results
              : "h-[calc(100vh-12rem)] sm:h-[calc(100vh-8rem)]" // Full height during gameplay
          } lg:h-96`}
        >
          <WorldMap
            key={currentRound.id}
            targetCity={currentRound.city}
            onProvisionalGuess={onProvisionalGuess}
            provisionalGuessLocation={provisionalGuessLocation}
            isGuessDisabled={hasPlayerGuessed}
            guesses={[]} // Hide guesses during gameplay
            showTarget={currentGame.settings.cityDifficulty === "us_states"} // Show target for US States mode
            gameDifficulty={currentGame.settings.cityDifficulty}
          />

          {/* Confirm Button positioned at bottom of map */}
          {isAwaitingConfirmation && provisionalGuessLocation && (
            <div
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
              style={{ zIndex: 1000 }}
            >
              <style>{`
                @keyframes pulse-green {
                  0%, 100% {
                    background-color: #10b981; /* green-500 */
                  }
                  50% {
                    background-color: #34d399; /* green-400 */
                  }
                }
                .pulse-green {
                  animation: pulse-green 1.5s ease-in-out infinite;
                }
                .pulse-green:hover {
                  animation: none;
                  background-color: #059669 !important; /* green-600 */
                }
              `}</style>
              <button
                onClick={onConfirmGuess}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold text-lg shadow-lg flex items-center space-x-2 min-h-[56px] touch-manipulation pulse-green"
                style={{ zIndex: 1001 }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>CONFIRM GUESS</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prompt to make a guess */}
      {!isAwaitingConfirmation && !hasPlayerGuessed && currentRound && (
        <div className="text-center text-gray-600 mt-3 lg:mt-4">
          <p className="text-sm lg:text-base">
            {currentGame.settings.cityDifficulty === "us_states" ? (
              <>
                Click on the state where{" "}
                <strong>{currentRound.city.name}</strong> is located!
              </>
            ) : currentGame.settings.cityDifficulty === "us_capitals" ? (
              <>
                Click on the state to guess where{" "}
                <strong>
                  {currentRound.city.name}, {currentRound.city.country}
                </strong>{" "}
                is located!
              </>
            ) : (
              <>
                Click on the map to guess where{" "}
                <strong>
                  {currentRound.city.name}, {currentRound.city.country}
                </strong>{" "}
                is located!
              </>
            )}
          </p>
        </div>
      )}

      {/* Feedback after guess is confirmed */}
      {hasPlayerGuessed && !isAwaitingConfirmation && currentRound && (
        <div className="text-center text-gray-600 mt-3 lg:mt-4">
          <p className="text-sm lg:text-base">
            ✅ Guess submitted! Waiting for other players...
          </p>
          {(() => {
            const currentGuesses = currentRound.guesses || [];
            const humanGuess = currentGuesses.find((g) => {
              const playerDetails = currentGame.players.find(
                (p) => p.id === g.playerId,
              );
              return playerDetails && !playerDetails.isComputer;
            });
            if (humanGuess) {
              return (
                <p className="mt-1 lg:mt-2 text-sm lg:text-base">
                  Your guess was{" "}
                  <strong>{Math.round(humanGuess.distance || 0)} km</strong>{" "}
                  away
                  {(humanGuess.totalPoints || 0) > 0 && (
                    <span>
                      {" "}
                      for <strong>{humanGuess.totalPoints} points</strong>
                      {(humanGuess.bonusPoints || 0) > 0 && (
                        <span className="text-green-600">
                          {" "}
                          (+{humanGuess.bonusPoints} bonus)
                        </span>
                      )}
                    </span>
                  )}
                </p>
              );
            }
            return null;
          })()}
        </div>
      )}
    </>
  );
}
