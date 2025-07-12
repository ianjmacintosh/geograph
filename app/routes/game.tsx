import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useGame } from "../contexts/GameContext";
import { PersistentGameHeader } from "../components/PersistentGameHeader";
import { ScoreboardModal } from "../components/ScoreboardModal";
import { GamePlayArea } from "../components/GamePlayArea";
import { GameResults } from "../components/GameResults";
import { usePlayerInteraction } from "../hooks/usePlayerInteraction";
import { useAutoSubmit } from "../hooks/useAutoSubmit";

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

  // Modal state
  const [isScoreboardModalOpen, setIsScoreboardModalOpen] = useState(false);

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
    hasPlayerAlreadyGuessedInRound: hasPlayerGuessed,
  });

  const { timeLeft } = useAutoSubmit({
    currentRound,
    currentGame,
    showResults,
    playerId,
    provisionalGuessLocation,
    hasConfirmedGuess: hasConfirmedGuessForRound,
    onConfirmGuess: confirmCurrentGuess,
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

              {showResults ? (
                <GameResults
                  currentGame={currentGame}
                  currentRound={currentRound}
                  roundNumber={roundNumber}
                  isHost={isHost}
                  onNextRound={handleNextRound}
                  _onLeaveGame={() => {
                    leaveGame();
                    navigate("/");
                  }}
                  _getPlayerScores={() =>
                    currentGame.players.map((player) => ({
                      playerId: player.id,
                      playerName: player.name,
                      isComputer: player.isComputer,
                      totalScore:
                        playerScores.find((p) => p.id === player.id)
                          ?.totalScore || 0,
                    }))
                  }
                />
              ) : (
                <GamePlayArea
                  currentGame={currentGame}
                  currentRound={currentRound}
                  provisionalGuessLocation={provisionalGuessLocation}
                  isAwaitingConfirmation={isAwaitingConfirmation}
                  _timeLeft={timeLeft}
                  onProvisionalGuess={handleSetProvisionalGuess}
                  onConfirmGuess={confirmCurrentGuess}
                  hasPlayerGuessed={hasConfirmedGuessForRound}
                  _showGuessButton={
                    isAwaitingConfirmation && !hasConfirmedGuessForRound
                  }
                />
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
