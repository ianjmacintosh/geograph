import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useGame } from "../contexts/GameContext";
import { ConfettiAnimation } from "../components/ConfettiAnimation";
import { WinnerCelebration } from "../components/WinnerCelebration";
import { PlayerResultRow } from "../components/PlayerResultRow";
import { GameSummary } from "../components/GameSummary";

export function meta() {
  return [
    { title: "Game Results - Geograph" },
    { name: "description", content: "Final scores and winner celebration" },
  ];
}

// Helper function to setup animations with cleanup
function setupAnimations(
  setAnimateIn: (value: boolean) => void,
  setShowConfetti: (value: boolean) => void
) {
  const animationTimeout = setTimeout(() => setAnimateIn(true), 100);
  const confettiStartTimeout = setTimeout(() => setShowConfetti(true), 800);
  const confettiStopTimeout = setTimeout(() => setShowConfetti(false), 5000);

  return () => {
    clearTimeout(animationTimeout);
    clearTimeout(confettiStartTimeout);
    clearTimeout(confettiStopTimeout);
  };
}

export default function Results() {
  const { currentGame, clearGame } = useGame();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (!currentGame) {
      navigate("/");
      return;
    }

    if (!currentGame.finalResults) {
      const timeout = setTimeout(() => {
        if (!currentGame.finalResults) {
          navigate("/");
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }

    return setupAnimations(setAnimateIn, setShowConfetti);
  }, [currentGame, navigate]);

  const handlePlayAgain = () => {
    clearGame();
    navigate("/");
  };

  if (!currentGame || !currentGame.finalResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  const { finalResults } = currentGame;
  const winner = finalResults.playerScores[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4 relative overflow-hidden">
      <ConfettiAnimation showConfetti={showConfetti} />

      <div className="max-w-4xl mx-auto">
        <div
          className={`transition-all duration-1000 ${
            animateIn ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <WinnerCelebration winner={winner} />

          {/* Final Standings */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              🏅 Final Standings 🏅
            </h2>

            <div className="space-y-4">
              {finalResults.playerScores.map((player, index) => (
                <PlayerResultRow key={player.playerId} player={player} index={index} />
              ))}
            </div>
          </div>

          <GameSummary currentGame={currentGame} finalResults={finalResults} />

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            <button
              onClick={handlePlayAgain}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🎯 Play Again
            </button>

            <p className="text-white text-sm opacity-75">
              Thanks for playing Geograph! 🌍
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}