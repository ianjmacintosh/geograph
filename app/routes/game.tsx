import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useGame } from "../contexts/GameContext";
import { WorldMap } from "../components/WorldMap";
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
  const currentRound = currentGame?.rounds?.[currentGame.rounds.length - 1] || null;
  const roundNumber = currentGame?.rounds?.length || 0;
  
  // Check if current player has guessed in this round
  const hasPlayerGuessed = currentRound?.guesses?.some(g => g.playerId === playerId) || false;
  
  // Check if all players have guessed (round is complete)
  const allPlayersGuessed = currentRound && currentGame ? 
    currentRound.guesses.length >= currentGame.players.length : false;
    
  // Show results when round is completed or timer expired
  const showResults = currentRound?.completed || false;
  
  // Timer state for display
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Update timer display
  useEffect(() => {
    if (!currentRound || showResults) {
      setTimeLeft(0);
      return;
    }
    
    const updateTimer = () => {
      const timeLimit = currentGame?.settings?.roundTimeLimit || 30000;
      const elapsed = Date.now() - currentRound.startTime;
      const remaining = Math.max(0, Math.ceil((timeLimit - elapsed) / 1000));
      setTimeLeft(remaining);
    };
    
    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [currentRound, currentGame, showResults]);

  const {
    hasGuessed,
    handleMapClick,
    resetPlayerGuessState,
  } = usePlayerInteraction({
    currentGame,
    currentRound,
    isViewOnly: () => showResults || hasPlayerGuessed, // Disable clicks if already guessed or showing results
  });

  // Reset guess state when round changes
  useEffect(() => {
    if (currentRound?.id) {
      resetPlayerGuessState();
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
    if (currentGame.status === 'finished') {
      navigate("/results");
      return;
    }
    if (currentGame.status !== 'playing') {
      navigate("/lobby");
      return;
    }
  }, [currentGame, navigate]);


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

    // Calculate scores from all completed rounds
    currentGame.rounds.forEach(round => {
      if (round.completed) {
        round.guesses.forEach(guess => {
          if (guess.totalPoints && playerScoresMap.has(guess.playerId)) {
            playerScoresMap.set(guess.playerId, (playerScoresMap.get(guess.playerId) || 0) + guess.totalPoints);
          }
        });
      }
    });

    return currentGame.players.map(player => ({
      ...player,
      totalScore: playerScoresMap.get(player.id) || 0,
    })).sort((a, b) => b.totalScore - a.totalScore);
  }, [currentGame]);


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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white rounded-lg shadow-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                Round {roundNumber}/{currentGame.settings.totalRounds}
              </h1>
              <p className="text-sm text-gray-600">Code: {currentGame.code}</p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-sm sm:text-lg font-semibold">
                <span className={timeLeft <= 10 ? 'text-red-500' : 'text-blue-600'}>{timeLeft}s</span>
              </div>
              <button
                onClick={() => {
                  leaveGame();
                  navigate("/");
                }}
                className="px-2 py-1 sm:px-4 sm:py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
              >
                Leave
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-3 order-2 lg:order-1">
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
                  <div className="text-lg font-semibold">
                    Time: <span className={timeLeft <= 10 ? 'text-red-500' : 'text-blue-600'}>{timeLeft}s</span>
                  </div>
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
                <div className="h-64 sm:h-80 lg:h-96 rounded-lg overflow-hidden">
                  <WorldMap
                    key={currentRound.id}
                    targetCity={currentRound.city}
                    onMapClick={showResults || hasPlayerGuessed ? undefined : handleMapClick}
                    guesses={(() => {
                      const currentGuesses = currentRound.guesses || [];
                      // Only show guesses when round is complete (showResults is true)
                      // Hide all player guesses during active gameplay for suspense
                      const visibleGuesses = showResults ? currentGuesses : [];
                      
                      return visibleGuesses.map(guess => {
                        const player = currentGame.players.find(p => p.id === guess.playerId);
                        return {
                          lat: guess.lat,
                          lng: guess.lng,
                          playerName: player?.name || 'Unknown',
                          isComputer: player?.isComputer || false,
                        };
                      });
                    })()}
                    showTarget={showResults}
                  />
                </div>
              </div>

              {/* Target City Indicator */}
              {showResults && currentRound && (
                <div className="mb-4 lg:mb-6 text-center px-2">
                  <div className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-3 bg-red-100 border border-red-300 rounded-lg max-w-full">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full mr-2 flex-shrink-0"></div>
                    <span className="text-red-800 font-semibold text-sm sm:text-base break-words">
                      🎯 {currentRound.city.name} is here ({currentRound.city.country})
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

                    {isHost && (
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={handleNextRound}
                          className="px-6 py-3 sm:px-8 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-semibold text-base sm:text-lg min-h-[48px] touch-manipulation"
                        >
                          {roundNumber >= currentGame.settings.totalRounds ? 'Final Results' : 'Next Round'}
                        </button>
                      </div>
                    )}
                    
                    {!isHost && (
                      <div className="mt-4 text-center text-gray-600">
                        <p className="text-sm">Waiting for host to continue...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!hasPlayerGuessed && !showResults && currentRound && (
                <div className="text-center text-gray-600">
                  <p>Click on the map to guess where <strong>{currentRound.city.name}, {currentRound.city.country}</strong> is located!</p>
                </div>
              )}

              {hasPlayerGuessed && !showResults && currentRound && (
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

          {/* Scoreboard */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white rounded-lg shadow-xl p-3 sm:p-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Scoreboard</h2>
              <div className="space-y-2">
                {getPlayerScores().map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="text-base sm:text-lg flex-shrink-0">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base flex items-center gap-1 sm:gap-2">
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