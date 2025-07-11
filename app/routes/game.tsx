import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useGame } from "../contexts/GameContext";
import { WorldMap } from "../components/WorldMap";
import { PersistentGameHeader } from "../components/PersistentGameHeader";
import { ScoreboardModal } from "../components/ScoreboardModal";
import { usePlayerInteraction } from "../hooks/usePlayerInteraction";

export function meta() {
  return [
    { title: "Playing Game - Geograph" },
    { name: "description", content: "Geography guessing game in progress" },
  ];
}

export default function Game() {
  const { currentGame, nextRound, playerId, leaveGame } = useGame();
  const navigate = useNavigate();

  // Check if current player is the host
  const isHost = currentGame ? playerId === currentGame.hostId : false;

  // Get current round from the game state (managed by server)
  const currentRound =
    currentGame?.rounds?.[currentGame.rounds.length - 1] || null;
  const roundNumber = currentGame?.rounds?.length || 0;

  // Check if current player has guessed in this round
  const hasPlayerGuessed =
    currentRound?.guesses?.some((g) => g.playerId === playerId) || false;

  // Check if all players have guessed (round is complete)
  const _allPlayersGuessed =
    currentRound && currentGame
      ? currentRound.guesses.length >= currentGame.players.length
      : false;

  // Show results when round is completed or timer expired
  const showResults = currentRound?.completed || false;

  // Timer state for display
  const [timeLeft, setTimeLeft] = useState(0);

  // Modal state
  const [isScoreboardModalOpen, setIsScoreboardModalOpen] = useState(false);

  // Track if we've already auto-submitted for this round to prevent duplicates
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const {
    provisionalGuessLocation,
    isAwaitingConfirmation,
    hasConfirmedGuessForRound,
    handleSetProvisionalGuess,
    confirmCurrentGuess,
    resetPlayerGuessState,
  } = usePlayerInteraction({
    currentGame,
    currentRound,
    hasPlayerAlreadyGuessedInRound: hasPlayerGuessed, // Pass the existing hasPlayerGuessed
  });

  // Use refs to access current values without causing effect restarts
  const provisionalGuessRef = useRef(provisionalGuessLocation);
  const hasConfirmedRef = useRef(hasConfirmedGuessForRound);
  const hasAutoSubmittedRef = useRef(hasAutoSubmitted);
  const confirmGuessRef = useRef(confirmCurrentGuess);

  // Update refs when values change
  useEffect(() => {
    provisionalGuessRef.current = provisionalGuessLocation;
    hasConfirmedRef.current = hasConfirmedGuessForRound;
    hasAutoSubmittedRef.current = hasAutoSubmitted;
    confirmGuessRef.current = confirmCurrentGuess;
  });

  // Effect 1: Initial Time Calculation (SSR + Client)
  useEffect(() => {
    if (!currentRound || showResults) {
      setTimeLeft(0);
      return;
    }
    const calculateInitialTime = () => {
      const timeLimit = currentGame?.settings?.roundTimeLimit || 30000;
      const startTime =
        typeof currentRound.startTime === "number"
          ? currentRound.startTime
          : Date.now();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((timeLimit - elapsed) / 1000));
      setTimeLeft(remaining);
    };
    calculateInitialTime();
  }, [currentRound, currentGame, showResults]);

  // Effect 2: Client-Side Interval Timer and Auto-Submit
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!currentRound || showResults || currentRound.completed) {
      return;
    }

    const updateTimerAndAutoSubmit = () => {
      const timeLimit = currentGame?.settings?.roundTimeLimit || 30000;
      const startTime =
        typeof currentRound.startTime === "number"
          ? currentRound.startTime
          : Date.now();
      const elapsed = Date.now() - startTime;
      const newRemaining = Math.max(0, Math.ceil((timeLimit - elapsed) / 1000));
      setTimeLeft(newRemaining);

      // Auto-submit tentative guess when timer reaches 1 second (to beat server timer race)
      // Use ref values to avoid stale closures
      const shouldAutoSubmit =
        newRemaining <= 1 &&
        provisionalGuessRef.current &&
        !hasConfirmedRef.current &&
        !hasAutoSubmittedRef.current &&
        !showResults &&
        currentGame &&
        currentGame.players.find((p) => p.id === playerId && !p.isComputer);

      // Debug logs (remove after testing)
      if (newRemaining <= 3) {
        console.log(`Timer: ${newRemaining}s, conditions:`, {
          timeExpired: newRemaining <= 1,
          hasProvisionalGuess: !!provisionalGuessRef.current,
          notConfirmed: !hasConfirmedRef.current,
          notAutoSubmitted: !hasAutoSubmittedRef.current,
          roundCompleted: currentRound.completed,
          notShowingResults: !showResults,
          isHumanPlayer: !!(
            currentGame &&
            currentGame.players.find((p) => p.id === playerId && !p.isComputer)
          ),
          shouldAutoSubmit,
        });
      }

      if (shouldAutoSubmit) {
        console.log(
          `Client Timer: Auto-submitting tentative guess for player ${playerId} at 1 second remaining.`,
        );
        setHasAutoSubmitted(true);
        confirmGuessRef.current();
      }
    };

    updateTimerAndAutoSubmit();
    const interval = setInterval(updateTimerAndAutoSubmit, 1000);

    return () => clearInterval(interval);
  }, [currentRound?.id, currentGame?.id, showResults, playerId]);

  // Reset guess state when round changes
  useEffect(() => {
    if (currentRound?.id) {
      resetPlayerGuessState();
      setHasAutoSubmitted(false);
    }
  }, [currentRound?.id, resetPlayerGuessState]);

  // Handle next round button click
  const handleNextRound = useCallback(() => {
    nextRound();
  }, [nextRound]);

  // Navigation logic
  useEffect(() => {
    if (!currentGame) {
      navigate("/");
      return;
    }
    if (currentGame.status === "finished") {
      navigate("/results");
      return;
    }
    if (currentGame.status !== "playing") {
      navigate("/lobby");
      return;
    }
  }, [currentGame, navigate]);

  // Check if a player (human or computer) has made a guess in the current round
  // This is used for UI display (e.g., checkmarks next to player names)
  const hasPlayerGuessedThisRound = useCallback(
    (playerId: string): boolean => {
      if (!currentRound || !currentRound.guesses) return false;
      return currentRound.guesses.some((guess) => guess.playerId === playerId);
    },
    [currentRound],
  );

  // Calculate cumulative scores for display on the scoreboard
  const getPlayerScores = useCallback(() => {
    if (!currentGame) return [];

    const playerScoresMap = new Map<string, number>();
    currentGame.players.forEach((p) => playerScoresMap.set(p.id, 0));

    // Calculate scores from all completed rounds
    currentGame.rounds.forEach((round) => {
      if (round.completed) {
        round.guesses.forEach((guess) => {
          if (guess.totalPoints && playerScoresMap.has(guess.playerId)) {
            playerScoresMap.set(
              guess.playerId,
              (playerScoresMap.get(guess.playerId) || 0) + guess.totalPoints,
            );
          }
        });
      }
    });

    return currentGame.players
      .map((player) => ({
        ...player,
        totalScore: playerScoresMap.get(player.id) || 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [currentGame]);

  // Calculate leader information for persistent header
  const playerScores = getPlayerScores();
  const currentPlayerScore =
    playerScores.find((p) => p.id === playerId)?.totalScore || 0;
  const leader = playerScores[0];
  const isCurrentPlayerLeader = leader?.id === playerId;

  if (!currentGame || !currentRound) {
    // currentRound from useRoundManagement
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      {/* Persistent Mobile Header */}
      <PersistentGameHeader
        currentGame={currentGame}
        currentRound={currentRound}
        timeLeft={timeLeft}
        roundNumber={roundNumber}
        currentPlayerScore={currentPlayerScore}
        leaderName={leader?.name || ""}
        leaderScore={leader?.totalScore || 0}
        isCurrentPlayerLeader={isCurrentPlayerLeader}
        isAwaitingConfirmation={isAwaitingConfirmation}
        onShowScoreboard={() => setIsScoreboardModalOpen(true)}
      />

      <div className="max-w-7xl mx-auto p-2 sm:p-4">
        <div className="grid lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Main Game Area - Full width on mobile, 3/4 on desktop */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-xl p-3 sm:p-6">
              {/* Desktop Header */}
              <div className="hidden lg:flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Round {roundNumber} of {currentGame.settings.totalRounds}
                  </h1>
                  <p className="text-gray-600">Game Code: {currentGame.code}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      leaveGame();
                      navigate("/");
                    }}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    Leave Game
                  </button>
                </div>
              </div>

              <div className="mb-4 lg:mb-6">
                <div
                  className={`relative rounded-lg overflow-hidden ${
                    showResults
                      ? "h-48 sm:h-64" // Smaller when showing results
                      : "h-[calc(100vh-12rem)] sm:h-[calc(100vh-8rem)]" // Full height during gameplay
                  } lg:h-96`}
                >
                  <WorldMap
                    key={currentRound.id} // Keep key to re-mount map on round change if necessary
                    targetCity={currentRound.city}
                    onProvisionalGuess={handleSetProvisionalGuess}
                    provisionalGuessLocation={provisionalGuessLocation}
                    isGuessDisabled={showResults || hasConfirmedGuessForRound}
                    guesses={(() => {
                      const currentGuesses = currentRound.guesses || [];
                      // Only show guesses when round is complete (showResults is true)
                      // Hide all player guesses during active gameplay for suspense
                      const visibleGuesses = showResults ? currentGuesses : [];

                      return visibleGuesses.map((guess) => {
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
                    showTarget={showResults}
                  />

                  {/* Confirm Button positioned at bottom of map */}
                  {isAwaitingConfirmation &&
                    !showResults &&
                    provisionalGuessLocation && (
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
                          onClick={confirmCurrentGuess}
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

              {/* Target City Indicator */}
              {showResults && currentRound && (
                <div className="mb-3 lg:mb-6 text-center px-2">
                  <div className="inline-flex items-center px-2 py-1 lg:px-4 lg:py-3 bg-red-100 border border-red-300 rounded-lg max-w-full">
                    <div className="w-3 h-3 lg:w-4 lg:h-4 bg-red-500 rounded-full mr-2 flex-shrink-0"></div>
                    <span className="text-red-800 font-semibold text-xs lg:text-base break-words">
                      🎯 {currentRound.city.name} is here (
                      {currentRound.city.country})
                    </span>
                  </div>
                </div>
              )}

              {showResults &&
                currentRound && ( // currentRound from useRoundManagement
                  <div className="mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 lg:p-4">
                      <h3 className="text-base lg:text-lg font-semibold mb-2 lg:mb-3">
                        Round Results
                      </h3>
                      <div className="space-y-1 lg:space-y-2">
                        {(currentRound.guesses || []) // Ensure guesses is not null
                          .sort(
                            (a, b) => (a.placement || 0) - (b.placement || 0),
                          ) // Handle potentially undefined placement
                          .map((guess) => {
                            const player = currentGame.players.find(
                              (p) => p.id === guess.playerId,
                            );
                            const placementEmoji =
                              guess.placement === 1
                                ? "🥇"
                                : guess.placement === 2
                                  ? "🥈"
                                  : guess.placement === 3
                                    ? "🥉"
                                    : "👤";
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
                                    {guess.placementPoints || 0} +{" "}
                                    {guess.bonusPoints || 0} bonus
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {Math.round(guess.distance || 0)}km
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {isHost && (
                        <div className="mt-3 lg:mt-4 flex justify-center">
                          <button
                            onClick={handleNextRound}
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
                )}

              {/* Prompt to make a guess */}
              {!isAwaitingConfirmation &&
                !hasConfirmedGuessForRound &&
                !showResults &&
                currentRound && (
                  <div className="text-center text-gray-600 mt-3 lg:mt-4">
                    <p className="text-sm lg:text-base">
                      Click on the map to guess where{" "}
                      <strong>
                        {currentRound.city.name}, {currentRound.city.country}
                      </strong>{" "}
                      is located!
                    </p>
                  </div>
                )}

              {/* Feedback after guess is confirmed */}
              {hasConfirmedGuessForRound &&
                !isAwaitingConfirmation &&
                !showResults &&
                currentRound && (
                  <div className="text-center text-gray-600 mt-3 lg:mt-4">
                    <p className="text-sm lg:text-base">
                      ✅ Guess submitted! Waiting for other players...
                    </p>
                    {(() => {
                      const currentGuesses = currentRound.guesses || [];
                      const humanGuess = currentGuesses.find((g) => {
                        // currentRound from useRoundManagement
                        const playerDetails = currentGame.players.find(
                          (p) => p.id === g.playerId,
                        );
                        return playerDetails && !playerDetails.isComputer;
                      });
                      if (humanGuess) {
                        return (
                          <p className="mt-1 lg:mt-2 text-sm lg:text-base">
                            Your guess was{" "}
                            <strong>
                              {Math.round(humanGuess.distance || 0)} km
                            </strong>{" "}
                            away
                            {(humanGuess.totalPoints || 0) > 0 && ( // Check totalPoints, not placementPoints
                              <span>
                                {" "}
                                for{" "}
                                <strong>{humanGuess.totalPoints} points</strong>
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
            </div>
          </div>

          {/* Scoreboard - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-lg shadow-xl p-3 sm:p-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                Scoreboard
              </h2>
              <div className="space-y-2">
                {getPlayerScores().map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="text-base sm:text-lg flex-shrink-0">
                        {index === 0
                          ? "🥇"
                          : index === 1
                            ? "🥈"
                            : index === 2
                              ? "🥉"
                              : "👤"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base flex items-center gap-1 sm:gap-2">
                          <span className="truncate">{player.name}</span>
                          {!showResults &&
                            currentRound &&
                            !currentRound.completed && (
                              <span className="text-sm flex-shrink-0">
                                {hasPlayerGuessedThisRound(player.id)
                                  ? "✅"
                                  : "⏳"}
                              </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {player.isComputer ? "Computer" : "Human"}
                          {!showResults &&
                            currentRound &&
                            !currentRound.completed &&
                            hasPlayerGuessedThisRound(player.id) && (
                              <span className="text-green-600 ml-1">
                                • Guessed
                              </span>
                            )}
                          {!showResults &&
                            currentRound &&
                            !currentRound.completed &&
                            !hasPlayerGuessedThisRound(player.id) && (
                              <span className="text-orange-600 ml-1">
                                • Waiting
                              </span>
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
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scoreboard Modal for Mobile */}
      <ScoreboardModal
        isOpen={isScoreboardModalOpen}
        onClose={() => setIsScoreboardModalOpen(false)}
        currentGame={currentGame}
        playerScores={getPlayerScores()}
        roundNumber={roundNumber}
        hasPlayerGuessedThisRound={hasPlayerGuessedThisRound}
        showResults={showResults}
        currentRound={currentRound}
      />
    </div>
  );
}
