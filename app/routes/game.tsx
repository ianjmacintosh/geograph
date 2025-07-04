import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useGame } from "../contexts/GameContext";
import { WorldMap } from "../components/WorldMap";
import { getRandomCityByDifficulty } from "../data/cities";
import { calculateDistance, calculatePoints, generateComputerGuess } from "../utils/game";
import type { City, GameRound, Guess } from "../types/game";

export function meta() {
  return [
    { title: "Playing Game - Geograph" },
    { name: "description", content: "Geography guessing game in progress" },
  ];
}

export default function Game() {
  const { currentGame, clearGame } = useGame();
  const navigate = useNavigate();
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);

  const handleRoundEnd = () => {
    if (!currentRound) return;
    
    setCurrentRound(prev => prev ? { ...prev, completed: true, endTime: Date.now() } : null);
    setShowResults(true);
  };

  const handleNextRound = () => {
    if (!currentGame) return;
    
    if (roundNumber >= currentGame.settings.totalRounds) {
      // Game finished
      handleGameEnd();
      return;
    }

    // Moving to next round
    setRoundNumber(prev => prev + 1);
    
    // Add small delay to ensure state updates properly
    setTimeout(() => {
      startNewRound();
    }, 100);
  };

  const handleGameEnd = () => {
    // Calculate final scores and navigate to results
    clearGame();
    navigate("/");
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!currentRound || hasGuessed || showResults || !currentGame) {
      return;
    }

    const humanPlayer = currentGame.players.find(p => !p.isComputer);
    if (!humanPlayer) {
      return;
    }

    // Check if this player has already guessed
    const existingGuess = currentRound.guesses.find(g => g.playerId === humanPlayer.id);
    if (existingGuess) {
      return;
    }

    const distance = calculateDistance(currentRound.city.lat, currentRound.city.lng, lat, lng);
    const points = calculatePoints(distance);

    const guess: Guess = {
      playerId: humanPlayer.id,
      lat,
      lng,
      distance,
      points,
      timestamp: Date.now(),
    };
    
    setCurrentRound(prev => prev ? { ...prev, guesses: [...prev.guesses, guess] } : null);
    setHasGuessed(true);
  }, [currentRound, hasGuessed, showResults, currentGame]);

  // Start new round
  const startNewRound = () => {
    const city = getRandomCityByDifficulty(currentGame!.settings.cityDifficulty);
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newRound: GameRound = {
      id: generateId(),
      city,
      guesses: [],
      completed: false,
      startTime: Date.now(),
    };
    
    // Starting new round with fresh state
    
    setCurrentRound(newRound);
    setTimeLeft(30);
    setHasGuessed(false);
    setShowResults(false);
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
    if (!currentRound || showResults || hasGuessed) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          // Time's up - use a ref to avoid closure issues
          setShowResults(true);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRound, showResults, hasGuessed]);

  // Separate effect to handle round end when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && currentRound && !showResults) {
      setShowResults(true);
      setTimeout(() => handleRoundEnd(), 500);
    }
  }, [timeLeft, currentRound, showResults, handleRoundEnd]);

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
      const computerGuesses: Guess[] = computersWhoHaventGuessed.map(player => {
        const guess = generateComputerGuess(currentRound.city, player.accuracy || 0.5);
        const distance = calculateDistance(currentRound.city.lat, currentRound.city.lng, guess.lat, guess.lng);
        return {
          playerId: player.id,
          lat: guess.lat,
          lng: guess.lng,
          distance,
          points: calculatePoints(distance),
          timestamp: Date.now() + Math.random() * 1000, // Small random delay
        };
      });

      setCurrentRound(prev => {
        if (!prev) return null;
        const newRound = { ...prev, guesses: [...prev.guesses, ...computerGuesses] };
        
        // Check if all players have now guessed
        const totalPlayers = currentGame.players.length;
        const totalGuesses = newRound.guesses.length;
        
        if (totalGuesses >= totalPlayers) {
          // All players have guessed, end round after short delay to show the guesses
          setTimeout(() => {
            setShowResults(true);
            setTimeout(() => handleRoundEnd(), 500);
          }, 1500);
        }
        
        return newRound;
      });
    }, 2000 + Math.random() * 3000); // Computers guess between 2-5 seconds

    return () => clearTimeout(timer);
  }, [currentRound, currentGame, showResults, handleRoundEnd]);

  // Calculate cumulative scores
  const getPlayerScores = () => {
    if (!currentGame) return [];
    
    return currentGame.players.map(player => {
      let totalScore = 0;
      
      // Add scores from all completed rounds
      // For now, we'll track scores in state - in a real app you'd persist this
      if (currentRound && showResults) {
        const playerGuess = currentRound.guesses.find(g => g.playerId === player.id);
        if (playerGuess) {
          totalScore += playerGuess.points;
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
                  onMapClick={showResults ? undefined : handleMapClick}
                  guesses={currentRound.guesses.map(guess => {
                    const player = currentGame.players.find(p => p.id === guess.playerId);
                    return {
                      lat: guess.lat,
                      lng: guess.lng,
                      playerName: player?.name || 'Unknown',
                      isComputer: player?.isComputer || false,
                    };
                  })}
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
                    .sort((a, b) => a.distance - b.distance)
                    .map((guess, index) => {
                      const player = currentGame.players.find(p => p.id === guess.playerId);
                      return (
                        <div key={guess.playerId} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}</span>
                            <span className="font-medium">{player?.name}</span>
                            <span className="text-sm text-gray-500">
                              {player?.isComputer ? '(Computer)' : '(You)'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-blue-600">{guess.points} pts</div>
                            <div className="text-sm text-gray-500">{Math.round(guess.distance)} km away</div>
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
                    {roundNumber >= currentGame.settings.totalRounds ? 'Finish Game' : 'Next Round'}
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
                          for <strong>{humanGuess.points} points</strong>
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
                        <div className="font-medium text-sm">{player.name}</div>
                        <div className="text-xs text-gray-500">
                          {player.isComputer ? 'Computer' : 'Human'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{player.totalScore}</div>
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