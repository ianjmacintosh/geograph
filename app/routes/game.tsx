import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useGame } from "../contexts/GameContext";
import { PersistentGameHeader } from "../components/PersistentGameHeader";
import { ScoreboardModal } from "../components/ScoreboardModal";
import { GamePlayArea } from "../components/GamePlayArea";
import { GameResults } from "../components/GameResults";
import { GameScoreboard } from "../components/GameScoreboard";
import { GameDesktopHeader } from "../components/GameDesktopHeader";
import { GameLoadingState } from "../components/GameLoadingState";
import { usePlayerInteraction } from "../hooks/usePlayerInteraction";
import { useAutoSubmit } from "../hooks/useAutoSubmit";
import { useGameScoring } from "../hooks/useGameScoring";
import { useGameNavigation } from "../hooks/useGameNavigation";
import type { Game, GameRound } from "../types/game";

export function meta() {
  return [
    { title: "Playing Game - Geograph" },
    { name: "description", content: "Geography guessing game in progress" },
  ];
}

// Helper function to get current round info
function getCurrentRoundInfo(currentGame: Game | null) {
  const currentRound =
    currentGame?.rounds?.[currentGame.rounds.length - 1] || null;
  const roundNumber = currentGame?.rounds?.length || 0;
  return { currentRound, roundNumber };
}

// Helper function to check game state
function checkGameState(
  currentGame: Game | null,
  currentRound: GameRound | null,
  playerId: string,
) {
  const isHost = currentGame ? playerId === currentGame.hostId : false;
  const hasPlayerGuessed =
    currentRound?.guesses?.some((g) => g.playerId === playerId) || false;
  const showResults = currentRound?.completed || false;
  return { isHost, hasPlayerGuessed, showResults };
}

// Helper function to create leave game handler
function createLeaveGameHandler(
  leaveGame: () => void,
  navigate: (path: string) => void,
) {
  return () => {
    leaveGame();
    navigate("/");
  };
}

export default function Game() {
  const { currentGame, nextRound, playerId, leaveGame } = useGame();
  const navigate = useNavigate();

  const { currentRound, roundNumber } = getCurrentRoundInfo(currentGame);
  const { isHost, hasPlayerGuessed, showResults } = checkGameState(
    currentGame,
    currentRound,
    playerId,
  );

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

  const { hasPlayerGuessedThisRound, getPlayerScores, getLeaderInfo } =
    useGameScoring(currentGame, currentRound);

  useGameNavigation(currentGame);

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

  // Calculate leader information for persistent header
  const { playerScores, leader, leaderName, leaderScore } = getLeaderInfo();
  const currentPlayerScore =
    playerScores.find((p) => p.id === playerId)?.totalScore || 0;
  const isCurrentPlayerLeader = leader?.id === playerId;

  const handleLeaveGame = createLeaveGameHandler(leaveGame, navigate);

  if (!currentGame || !currentRound) {
    return <GameLoadingState />;
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
        leaderName={leaderName}
        leaderScore={leaderScore}
        isCurrentPlayerLeader={isCurrentPlayerLeader}
        isAwaitingConfirmation={isAwaitingConfirmation}
        onShowScoreboard={() => setIsScoreboardModalOpen(true)}
      />

      <div className="max-w-7xl mx-auto p-2 sm:p-4">
        <div className="grid lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Main Game Area - Full width on mobile, 3/4 on desktop */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-xl p-3 sm:p-6">
              <GameDesktopHeader
                currentGame={currentGame}
                roundNumber={roundNumber}
                onLeaveGame={handleLeaveGame}
              />

              {showResults ? (
                <GameResults
                  currentGame={currentGame}
                  currentRound={currentRound}
                  roundNumber={roundNumber}
                  isHost={isHost}
                  onNextRound={handleNextRound}
                  _onLeaveGame={handleLeaveGame}
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

          <GameScoreboard
            currentGame={currentGame}
            currentRound={currentRound}
            showResults={showResults}
            roundNumber={roundNumber}
            getPlayerScores={getPlayerScores}
            hasPlayerGuessedThisRound={hasPlayerGuessedThisRound}
          />
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
