import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useGame } from "../contexts/GameContext";
import { WorldMap } from "../components/WorldMap";
import { getRandomCityByDifficulty } from "../data/cities";
import { calculateDistance, calculateBonusPoints, calculatePlacementPoints, generateComputerGuess } from "../utils/game";
import type { City, GameRound, Guess } from "../types/game";

export function meta() {
  return [
    { title: "Playing Game - Geograph" },
    { name: "description", content: "Geography guessing game in progress" },
  ];
}

export default function Game() {
  const { currentGame, clearGame, finishGame } = useGame();
  const navigate = useNavigate();
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [completedRounds, setCompletedRounds] = useState<GameRound[]>([]);
  const [usedCityIds, setUsedCityIds] = useState<string[]>([]);

  const updateRoundWithPlacements = (round: GameRound) => {
    if (!currentGame) return round;
    
    const guessData = round.guesses.map(guess => ({
      playerId: guess.playerId,
      distance: guess.distance
    }));
    
    const placements = calculatePlacementPoints(guessData, currentGame.players.length);
    
    const updatedGuesses = round.guesses.map(guess => {
      const placement = placements.find(p => p.playerId === guess.playerId);
      if (placement) {
        return {
          ...guess,
          placementPoints: placement.placementPoints,
          placement: placement.placement,
          totalPoints: placement.placementPoints + guess.bonusPoints
        };
      }
      return guess;
    });
    
    return { ...round, guesses: updatedGuesses };
  };

  const handleRoundEnd = useCallback(() => {
    if (!currentRound) return;
    
    // Calculate placements before showing results
    const updatedRound = updateRoundWithPlacements(currentRound);
    setCurrentRound({ ...updatedRound, completed: true, endTime: Date.now() });
    setShowResults(true);
  }, [currentRound, currentGame]);

  const handleNextRound = () => {
    if (!currentGame) return;
    
    if (roundNumber >= currentGame.settings.totalRounds) {
      // Game finished - call handleGameEnd immediately without adding to completedRounds
      // handleGameEnd will handle including the current round in calculations
      handleGameEnd();
      return;
    }

    // Save the current round to completed rounds (with placements calculated)
    if (currentRound && currentRound.completed) {
      setCompletedRounds(prev => [...prev, currentRound]);
    }

    // Reset state immediately before starting new round
    setShowResults(false);
    setHasGuessed(false);
    
    // Start new round immediately to avoid race condition
    startNewRound();
    
    // Moving to next round AFTER the new round is created
    setRoundNumber(prev => prev + 1);
  };

  const handleGameEnd = () => {
    // Calculate final scores and navigate to results
    if (!currentGame) return;
    
    // Include the current round if it has calculated placement points
    let allRounds = [...completedRounds];
    if (currentRound && currentRound.guesses.length > 0 && 
        currentRound.guesses.some(g => g.totalPoints > 0)) {
      allRounds = [...allRounds, currentRound];
    }
    
    // Calculate total scores for each player
    const playerScores = currentGame.players.map(player => {
      let totalScore = 0;
      
      allRounds.forEach(round => {
        const playerGuess = round.guesses.find(g => g.playerId === player.id);
        if (playerGuess) {
          totalScore += playerGuess.totalPoints;
        }
      });
      
      
      return {
        playerId: player.id,
        playerName: player.name,
        isComputer: player.isComputer,
        totalScore,
        finalPlacement: 0 // Will be set after sorting
      };
    });
    
    // Sort by score and assign placements
    const sortedScores = playerScores.sort((a, b) => b.totalScore - a.totalScore);
    sortedScores.forEach((player, index) => {
      player.finalPlacement = index + 1;
    });
    
    const finalResults = {
      playerScores: sortedScores,
      winnerId: sortedScores[0].playerId,
      gameEndTime: Date.now()
    };
    
    finishGame(finalResults);
    
    navigate("/results");
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    // Simple approach: check if already guessed first
    if (hasGuessed) {
      return;
    }
    
    if (!currentRound || !currentGame) {
      return;
    }

    const humanPlayer = currentGame.players.find(p => !p.isComputer);
    if (!humanPlayer) {
      return;
    }

    // Check if this player has already guessed in this round
    const existingGuess = currentRound.guesses.find(g => g.playerId === humanPlayer.id);
    if (existingGuess) {
      return;
    }

    const distance = calculateDistance(currentRound.city.lat, currentRound.city.lng, lat, lng);
    const bonusPoints = calculateBonusPoints(distance);

    const guess: Guess = {
      playerId: humanPlayer.id,
      lat,
      lng,
      distance,
      placementPoints: 0, // Will be calculated after all guesses are in
      bonusPoints,
      totalPoints: 0, // Will be calculated after all players guess
      placement: 0, // Will be calculated after all guesses are in
      timestamp: Date.now(),
    };
    
    // Use functional update to get fresh state
    setCurrentRound(currentRoundState => {
      if (!currentRoundState) return currentRoundState;
      
      // Check again if human already guessed (in case of race condition)
      const existingHumanGuess = currentRoundState.guesses.find(g => g.playerId === humanPlayer.id);
      if (existingHumanGuess) {
        return currentRoundState;
      }
      
      const updatedRound = { ...currentRoundState, guesses: [...currentRoundState.guesses, guess] };
      
      // Check if all players have now guessed
      const totalPlayers = currentGame.players.length;
      const totalGuesses = updatedRound.guesses.length;
      
      if (totalGuesses >= totalPlayers) {
        // All players have guessed! Calculate placements and show results immediately
        const roundWithPlacements = updateRoundWithPlacements(updatedRound);
        
        // Show results after a brief delay
        setTimeout(() => {
          setShowResults(true);
        }, 1500);
        
        return { ...roundWithPlacements, completed: true, endTime: Date.now() };
      }
      
      return updatedRound;
    });
    
    setHasGuessed(true);
  }, [hasGuessed, currentRound?.id, currentGame?.id]); // Use IDs to avoid stale closure

  // Start new round
  const startNewRound = () => {
    const city = getRandomCityByDifficulty(currentGame!.settings.cityDifficulty, usedCityIds);
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newRound: GameRound = {
      id: generateId(),
      city,
      guesses: [],
      completed: false,
      startTime: Date.now(),
    };
    
    // Track this city as used
    setUsedCityIds(prev => [...prev, city.id]);
    
    // Reset all round-specific state
    setShowResults(false);
    setHasGuessed(false);
    setTimeLeft(30);
    setCurrentRound(newRound);
  };

  // Redirect if no game
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

  // Initialize first round
  useEffect(() => {
    if (currentGame && currentGame.status === 'playing' && !currentRound) {
      startNewRound();
    }
  }, [currentGame, currentRound, startNewRound]);

  // Timer countdown
  useEffect(() => {
    if (!currentRound || showResults) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRound?.id, showResults]); // Only depend on round ID, not the whole object

  // Separate effect to handle round end when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && currentRound && !showResults) {
      // Calculate placements before showing results
      const updatedRound = updateRoundWithPlacements(currentRound);
      setCurrentRound({ ...updatedRound, completed: true, endTime: Date.now() });
      setShowResults(true);
    }
  }, [timeLeft, currentRound, showResults]);

  // Generate computer guesses after a delay
  useEffect(() => {
    if (!currentRound || !currentGame || showResults) return;
    
    const computerPlayers = currentGame.players.filter(p => p.isComputer);
    if (computerPlayers.length === 0) return;

    // Only generate guesses for computers that haven't guessed yet
    const computersWhoHaventGuessed = computerPlayers.filter(player => 
      !currentRound.guesses.some(guess => guess.playerId === player.id)
    );

    if (computersWhoHaventGuessed.length === 0) return;
    
    const timer = setTimeout(() => {
      // Get fresh current round state
      setCurrentRound(currentRoundState => {
        if (!currentRoundState || !currentGame) {
          return currentRoundState;
        }
        
        // Check again which computers haven't guessed (in case state changed)
        const stillNeedToGuess = computerPlayers.filter(player => 
          !currentRoundState.guesses.some(guess => guess.playerId === player.id)
        );
        
        if (stillNeedToGuess.length === 0) {
          return currentRoundState;
        }
        
        const computerGuesses: Guess[] = stillNeedToGuess.map(player => {
          const guess = generateComputerGuess(currentRoundState.city, player.accuracy || 0.5);
          const distance = calculateDistance(currentRoundState.city.lat, currentRoundState.city.lng, guess.lat, guess.lng);
          const bonusPoints = calculateBonusPoints(distance);
          return {
            playerId: player.id,
            lat: guess.lat,
            lng: guess.lng,
            distance,
            placementPoints: 0, // Will be calculated after all guesses are in
            bonusPoints,
            totalPoints: 0, // Will be calculated after all players guess
            placement: 0, // Will be calculated after all guesses are in
            timestamp: Date.now() + Math.random() * 1000, // Small random delay
          };
        });

        // Add computer guesses
        const newRoundWithComputerGuesses = { 
          ...currentRoundState, 
          guesses: [...currentRoundState.guesses, ...computerGuesses] 
        };
        
        const totalPlayers = currentGame.players.length;
        const totalGuesses = newRoundWithComputerGuesses.guesses.length;
        
        if (totalGuesses >= totalPlayers) {
          // All players have guessed, calculate placements and show results
          const updatedRoundWithPlacements = updateRoundWithPlacements(newRoundWithComputerGuesses);
          
          // Show results after a brief delay
          setTimeout(() => {
            setShowResults(true);
          }, 1500);
          
          return { ...updatedRoundWithPlacements, completed: true, endTime: Date.now() };
        }
        
        return newRoundWithComputerGuesses;
      });
    }, 2000 + Math.random() * 3000); // Computers guess between 2-5 seconds

    return () => clearTimeout(timer);
  }, [currentRound?.id, currentGame?.id, showResults]); // Only depend on IDs to avoid re-triggering

  // Check if a player has made a guess in the current round
  const hasPlayerGuessed = (playerId: string): boolean => {
    if (!currentRound) return false;
    return currentRound.guesses.some(guess => guess.playerId === playerId);
  };

  // Calculate cumulative scores
  const getPlayerScores = () => {
    if (!currentGame) return [];
    
    return currentGame.players.map(player => {
      let totalScore = 0;
      
      // Add scores from all completed rounds
      completedRounds.forEach(round => {
        const playerGuess = round.guesses.find(g => g.playerId === player.id);
        if (playerGuess) {
          totalScore += playerGuess.totalPoints;
        }
      });
      
      // Add scores from current round if it has calculated placement points
      if (currentRound) {
        const playerGuess = currentRound.guesses.find(g => g.playerId === player.id);
        if (playerGuess && playerGuess.placementPoints > 0) {
          // Use totalPoints if available, otherwise calculate from placement + bonus
          const score = playerGuess.totalPoints > 0 
            ? playerGuess.totalPoints 
            : playerGuess.placementPoints + playerGuess.bonusPoints;
          totalScore += score;
        }
      }
      
      return {
        ...player,
        totalScore
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  };

  if (!currentGame || !currentRound) {
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
                    Time: <span className={timeLeft <= 10 ? 'text-red-500' : 'text-blue-600'}>{timeLeft}s</span>
                  </div>
                  <button
                    onClick={() => {
                      clearGame();
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
                  key={currentRound.id} // Force re-render when round changes
                  targetCity={currentRound.city}
                  onMapClick={showResults || hasGuessed ? undefined : handleMapClick}
                  guesses={(() => {
                    // Show all guesses as they happen, but only show target when results are shown
                    return currentRound.guesses.map(guess => {
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

              {/* Target City Indicator */}
              {showResults && (
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-red-100 border border-red-300 rounded-lg">
                    <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-red-800 font-semibold">
                      🎯 {currentRound.city.name} is located here ({currentRound.city.country})
                    </span>
                  </div>
                </div>
              )}

          {showResults && (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Round Results</h3>
                <div className="space-y-2">
                  {currentRound.guesses
                    .sort((a, b) => a.placement - b.placement)
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
                            <div className="font-semibold text-blue-600">{guess.totalPoints} pts</div>
                            <div className="text-xs text-gray-500">
                              {guess.placementPoints} place + {guess.bonusPoints} bonus
                            </div>
                            <div className="text-xs text-gray-500">{Math.round(guess.distance)} km away</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={handleNextRound}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                  >
                    {roundNumber >= currentGame.settings.totalRounds ? 'Final Results' : 'Next Round'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!hasGuessed && !showResults && (
            <div className="text-center text-gray-600">
              <p>Click on the map to guess where <strong>{currentRound.city.name}, {currentRound.city.country}</strong> is located!</p>
            </div>
          )}

              {hasGuessed && !showResults && (
                <div className="text-center text-gray-600">
                  <p>✅ Guess submitted! Waiting for other players...</p>
                  {(() => {
                    const humanGuess = currentRound.guesses.find(g => {
                      const player = currentGame.players.find(p => p.id === g.playerId);
                      return player && !player.isComputer;
                    });
                    if (humanGuess) {
                      return (
                        <p className="mt-2">
                          Your guess was <strong>{Math.round(humanGuess.distance)} km</strong> away
                          {/* Only show points after results are calculated */}
                          {humanGuess.totalPoints > 0 && (
                            <span>
                              {' '}for <strong>{humanGuess.totalPoints} points</strong>
                              {humanGuess.bonusPoints > 0 && (
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
                {getPlayerScores().map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
                      </span>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {player.name}
                          {/* Guess status indicator */}
                          {!showResults && (
                            <span className="text-sm">
                              {hasPlayerGuessed(player.id) ? '✅' : '⏳'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {player.isComputer ? 'Computer' : 'Human'}
                          {!showResults && hasPlayerGuessed(player.id) && (
                            <span className="text-green-600 ml-1">• Guessed</span>
                          )}
                          {!showResults && !hasPlayerGuessed(player.id) && (
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