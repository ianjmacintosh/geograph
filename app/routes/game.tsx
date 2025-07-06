import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useGame } from "../contexts/GameContext";
import { WorldMap } from "../components/WorldMap";
// getRandomCityByDifficulty is used in useRoundManagement
// calculateDistance, calculateBonusPoints are used by usePlayerInteraction or game utils
import { calculatePlacementPoints, generateComputerGuess, calculateDistance, calculateBonusPoints } from "../utils/game"; // Ensured all utils are here or in hooks
import type { City, GameRound, Guess } from "../types/game";
import { useGameTimer } from "../hooks/useGameTimer";
import { useRoundManagement } from "../hooks/useRoundManagement"; // Assuming this was the previous state
import { usePlayerInteraction } from "../hooks/usePlayerInteraction"; // New hook

export function meta() {
  return [
    { title: "Playing Game - Geograph" },
    { name: "description", content: "Geography guessing game in progress" },
  ];
}

export default function Game() {
  const { currentGame, clearGame, finishGame: contextFinishGame } = useGame(); // finishGame from context for useRoundManagement
  const navigate = useNavigate();

  // `currentRound`, `setCurrentRound`, `roundNumber`, `completedRounds`, `processNextRound` (as handleNextRound)
  // are now from useRoundManagement.
  // `hasGuessed`, `handleMapClick`, `resetPlayerGuessState` are from usePlayerInteraction.

  const [showResults, setShowResults] = useState(false); // This state remains crucial for UI toggling

  const updateRoundWithPlacements = useCallback((round: GameRound): GameRound => {
    if (!currentGame || !round || !round.guesses) return round; // Added !round.guesses check
    const guessData = (round.guesses || []).map(guess => ({ // Ensure guesses is not null
      playerId: guess.playerId,
      distance: guess.distance
    }));

    const placements = calculatePlacementPoints(guessData, currentGame.players.length);

    const updatedGuesses = (round.guesses || []).map(guess => { // Ensure guesses is not null
      const placementInfo = placements.find(p => p.playerId === guess.playerId);
      if (placementInfo) {
        return {
          ...guess,
          placementPoints: placementInfo.placementPoints,
          placement: placementInfo.placement,
          totalPoints: placementInfo.placementPoints + guess.bonusPoints
        };
      }
      return guess;
    });

    return { ...round, guesses: updatedGuesses };
  }, [currentGame]);

  const {
    currentRound,
    setCurrentRound,
    roundNumber,
    completedRounds,
    handleNextRound: processNextRoundHook, // Renamed from hook
    // usedCityIds is also available if needed by other hooks directly from useRoundManagement
  } = useRoundManagement({
    currentGame,
    updateRoundWithPlacements, // Passed to the hook
    // onRoundStart from useRoundManagement will handle its internal state resets.
    // UI specific resets (like showResults, hasGuessed) are handled in Game.tsx or by their own hooks.
  });

  // This function is triggered when timer ends or all players have guessed
  const handleRoundEndForTimerOrAllGuessed = useCallback(() => {
    setCurrentRound(prevRound => { // setCurrentRound from useRoundManagement
      if (!prevRound || prevRound.completed) return prevRound;
      const updatedRound = updateRoundWithPlacements(prevRound);
      return { ...updatedRound, completed: true, endTime: Date.now() };
    });
    setShowResults(true);
  }, [setCurrentRound, updateRoundWithPlacements]);

  const roundTimeLimitMs = useMemo(() => currentGame?.settings?.roundTimeLimit || 30000, [currentGame?.settings?.roundTimeLimit]);

  const timeLeft = useGameTimer({
    currentRound, // From useRoundManagement
    showResults,
    roundTimeLimit: roundTimeLimitMs,
    onTimerEnd: handleRoundEndForTimerOrAllGuessed,
  });

  const playerGuessedCompletesRoundHandler = useCallback(() => {
    // This is called by usePlayerInteraction when a human guess completes all guesses.
    // Schedule the round end logic.
    setTimeout(() => {
      handleRoundEndForTimerOrAllGuessed();
    }, 100); // Small delay, similar to computer guess completion
  }, [handleRoundEndForTimerOrAllGuessed]);

  const {
    hasGuessed,
    handleMapClick,
    resetPlayerGuessState,
  } = usePlayerInteraction({
    currentGame,
    currentRound, // From useRoundManagement
    setCurrentRound, // From useRoundManagement
    onPlayerGuessCompletesRound: playerGuessedCompletesRoundHandler,
    isViewOnly: () => showResults || hasGuessed, // Logic to disable map clicks
  });

  // Effect to reset UI states when a new round truly begins (ID changes)
  useEffect(() => {
    if (currentRound) { // currentRound itself might be null initially
      setShowResults(false);
      resetPlayerGuessState(); // From usePlayerInteraction
    }
  }, [currentRound?.id, resetPlayerGuessState]); // Depend on id for actual round change

  // UI facing next round handler
  const handleNextRound = useCallback(() => {
    // setShowResults(false); // Done by useEffect above when new round starts
    // resetPlayerGuessState(); // Done by useEffect above
    processNextRoundHook(); // Call the logic from useRoundManagement
  }, [processNextRoundHook]);

  // Redirect if no game - This remains important UI logic
  useEffect(() => {
    if (!currentGame) {
      navigate("/");
      return;
    }
    if (currentGame.status !== 'playing') {
      navigate("/lobby");
      return;
    }
  }, [currentGame, navigate]);

  // Initial round setup is handled by useRoundManagement's useEffect.
  // Timer countdown and round end on timer expiry are handled by useGameTimer.

  // Generate computer guesses after a delay - This will be moved to useComputerPlayers hook
  useEffect(() => {
    // Computer should not guess if results are shown
    if (!currentRound || currentRound.completed || !currentGame || showResults) {
      return;
    }

    const computerPlayers = currentGame.players.filter(p => p.isComputer);
    if (computerPlayers.length === 0) return;

    const currentGuesses = currentRound.guesses || [];
    const computersWhoHaventGuessed = computerPlayers.filter(player =>
      !currentGuesses.some(guess => guess.playerId === player.id)
    );

    if (computersWhoHaventGuessed.length === 0) return;

    const computerGuessTimer = setTimeout(() => {
      setCurrentRound(currentRoundState => { // setCurrentRound from useRoundManagement
        // Stale closure check: ensure this update is for the intended round and game state
        if (!currentRoundState || currentRoundState.id !== currentRound?.id || currentRoundState.completed || !currentGame) {
          return currentRoundState;
        }

        const latestGuesses = currentRoundState.guesses || [];
        // Re-check which computers haven't guessed using the most up-to-date currentRoundState
        const stillNeedToGuess = currentGame.players.filter(p =>
          p.isComputer &&
          !latestGuesses.some(guess => guess.playerId === p.id)
        );

        if (stillNeedToGuess.length === 0) {
          return currentRoundState; // All computers guessed while timeout was pending
        }

        const computerPlayerGuesses: Guess[] = stillNeedToGuess.map(player => {
          const guessDetails = generateComputerGuess(currentRoundState.city, player.accuracy || 0.5);
          const distance = calculateDistance(currentRoundState.city.lat, currentRoundState.city.lng, guessDetails.lat, guessDetails.lng);
          const bonus = calculateBonusPoints(distance);
          return {
            playerId: player.id,
            lat: guessDetails.lat,
            lng: guessDetails.lng,
            distance,
            placementPoints: 0,
            bonusPoints: bonus,
            totalPoints: 0,
            placement: 0,
            timestamp: Date.now() + Math.random() * 1000,
          };
        });

        const updatedGuesses = [...latestGuesses, ...computerPlayerGuesses];
        const newRoundWithComputerGuesses = {
          ...currentRoundState,
          guesses: updatedGuesses
        };

        const totalPlayers = currentGame.players.length;
        const totalGuessesMade = newRoundWithComputerGuesses.guesses.length;

        if (totalGuessesMade >= totalPlayers) {
          // All players (including these computers) have now guessed.
          // Schedule the round end logic.
          setTimeout(() => {
            handleRoundEndForTimerOrAllGuessed();
          }, 100); // Small delay for state to settle.
        }

        return newRoundWithComputerGuesses;
      });
    }, 2000 + Math.random() * 3000); // Computers guess between 2-5 seconds

    return () => clearTimeout(computerGuessTimer);
  }, [currentRound, currentGame, showResults, setCurrentRound, handleRoundEndForTimerOrAllGuessed]);


  // Check if a player (human or computer) has made a guess in the current round
  // This is used for UI display (e.g., checkmarks next to player names)
  const hasPlayerGuessedThisRound = useCallback((playerId: string): boolean => {
    if (!currentRound || !currentRound.guesses) return false;
    return currentRound.guesses.some(guess => guess.playerId === playerId);
  }, [currentRound]);

  // Calculate cumulative scores for display on the scoreboard
  const getPlayerScores = useCallback(() => {
    if (!currentGame) return [];

    const playerScoresMap = new Map<string, number>();
    currentGame.players.forEach(p => playerScoresMap.set(p.id, 0));

    // Scores from already completed rounds
    completedRounds.forEach(round => { // completedRounds from useRoundManagement
      round.guesses.forEach(guess => {
        if (guess.totalPoints && playerScoresMap.has(guess.playerId)) {
          playerScoresMap.set(guess.playerId, (playerScoresMap.get(guess.playerId) || 0) + guess.totalPoints);
        }
      });
    });

    // If current round's results are being shown, add its scores to the live scoreboard
    // This ensures scoreboard updates immediately when round results are shown, before "Next Round" is clicked.
    if (showResults && currentRound && currentRound.completed && !completedRounds.find(cr => cr.id === currentRound.id)) {
      currentRound.guesses.forEach(guess => {
        if (guess.totalPoints && playerScoresMap.has(guess.playerId)) {
          playerScoresMap.set(guess.playerId, (playerScoresMap.get(guess.playerId) || 0) + guess.totalPoints);
        }
      });
    }

    return currentGame.players.map(player => ({
      ...player,
      totalScore: playerScoresMap.get(player.id) || 0,
    })).sort((a, b) => b.totalScore - a.totalScore);
  }, [currentGame, completedRounds, currentRound, showResults]);


  if (!currentGame || !currentRound) { // currentRound from useRoundManagement
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Round {roundNumber} of {currentGame.settings.totalRounds}
                  </h1>
                  <p className="text-gray-600">Game Code: {currentGame.code}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-semibold">
                    Time: <span className={timeLeft <= 10 ? 'text-red-500' : 'text-blue-600'}>{timeLeft}s</span> {/* timeLeft from useGameTimer */}
                  </div>
                  <button
                    onClick={() => {
                      clearGame(); // from useGame
                      navigate("/");
                    }}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    Leave Game
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <WorldMap
                  key={currentRound.id}
                  targetCity={currentRound.city}
                  onMapClick={handleMapClick} // From usePlayerInteraction, it internally checks showResults/hasGuessed via isViewOnly
                  guesses={(() => {
                    const currentGuesses = currentRound.guesses || [];
                    return currentGuesses.map(guess => { // currentRound from useRoundManagement
                      const player = currentGame.players.find(p => p.id === guess.playerId);
                      return {
                        lat: guess.lat,
                        lng: guess.lng,
                        playerName: player?.name || 'Unknown',
                        isComputer: player?.isComputer || false,
                      };
                    });
                  })()}
                  showTarget={showResults} // UI state
                />
              </div>

              {/* Target City Indicator */}
              {showResults && currentRound && (
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-red-100 border border-red-300 rounded-lg">
                    <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-red-800 font-semibold">
                      🎯 {currentRound.city.name} is located here ({currentRound.city.country})
                    </span>
                  </div>
                </div>
              )}

              {showResults && currentRound && ( // currentRound from useRoundManagement
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Round Results</h3>
                    <div className="space-y-2">
                      {(currentRound.guesses || []) // Ensure guesses is not null
                        .sort((a, b) => (a.placement || 0) - (b.placement || 0)) // Handle potentially undefined placement
                        .map((guess) => {
                          const player = currentGame.players.find(p => p.id === guess.playerId);
                          const placementEmoji = guess.placement === 1 ? '🥇' : guess.placement === 2 ? '🥈' : guess.placement === 3 ? '🥉' : '👤';
                          return (
                            <div key={guess.playerId} className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{placementEmoji}</span>
                                <span className="font-medium">{player?.name}</span>
                                <span className="text-sm text-gray-500">
                                  {player?.isComputer ? '(Computer)' : '(You)'}
                                </span>
                                <span className="text-xs text-gray-400">#{guess.placement}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-blue-600">{guess.totalPoints || 0} pts</div>
                                <div className="text-xs text-gray-500">
                                  {(guess.placementPoints || 0)} place + {(guess.bonusPoints || 0)} bonus
                                </div>
                                <div className="text-xs text-gray-500">{Math.round(guess.distance || 0)} km away</div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={handleNextRound} // UI facing handler
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                      >
                        {roundNumber >= currentGame.settings.totalRounds ? 'Final Results' : 'Next Round'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!hasGuessed && !showResults && currentRound && ( // hasGuessed from usePlayerInteraction, showResults is UI state
                <div className="text-center text-gray-600">
                  <p>Click on the map to guess where <strong>{currentRound.city.name}, {currentRound.city.country}</strong> is located!</p>
                </div>
              )}

              {hasGuessed && !showResults && currentRound && ( // hasGuessed from usePlayerInteraction
                <div className="text-center text-gray-600">
                  <p>✅ Guess submitted! Waiting for other players...</p>
                  {(() => {
                    const currentGuesses = currentRound.guesses || [];
                    const humanGuess = currentGuesses.find(g => { // currentRound from useRoundManagement
                      const playerDetails = currentGame.players.find(p => p.id === g.playerId);
                      return playerDetails && !playerDetails.isComputer;
                    });
                    if (humanGuess) {
                      return (
                        <p className="mt-2">
                          Your guess was <strong>{Math.round(humanGuess.distance || 0)} km</strong> away
                          {(humanGuess.totalPoints || 0) > 0 && ( // Check totalPoints, not placementPoints
                            <span>
                              {' '}for <strong>{humanGuess.totalPoints} points</strong>
                              {(humanGuess.bonusPoints || 0) > 0 && (
                                <span className="text-green-600"> (+{humanGuess.bonusPoints} bonus)</span>
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

          {/* Scoreboard Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-xl p-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Scoreboard</h2>
              <div className="space-y-2">
                {getPlayerScores().map((player, index) => ( // getPlayerScores uses completedRounds from useRoundManagement
                  <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
                      </span>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {player.name}
                          {!showResults && currentRound && !currentRound.completed && ( // Only show status for ongoing round
                            <span className="text-sm">
                              {hasPlayerGuessedThisRound(player.id) ? '✅' : '⏳'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
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
                    <div className="text-right">
                      <div className="font-bold text-blue-600" data-testid={`player-score-${player.id}`}>{player.totalScore}</div>
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
                    style={{ width: `${(roundNumber / currentGame.settings.totalRounds) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}