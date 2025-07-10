import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useGame } from "../contexts/GameContext";

export function meta() {
  return [
    { title: "Game Results - Geograph" },
    { name: "description", content: "Final scores and winner celebration" },
  ];
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
      // Don't navigate immediately - give it a moment for the context to update
      const timeout = setTimeout(() => {
        if (!currentGame.finalResults) {
          navigate("/");
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }

    // Trigger animations
    setTimeout(() => setAnimateIn(true), 100);
    setTimeout(() => setShowConfetti(true), 800);

    // Stop confetti after a while
    setTimeout(() => setShowConfetti(false), 5000);
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
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 animate-bounce`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                backgroundColor: [
                  "#FFD700",
                  "#FF6B6B",
                  "#4ECDC4",
                  "#45B7D1",
                  "#96CEB4",
                  "#FFEAA7",
                ][Math.floor(Math.random() * 6)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div
          className={`transition-all duration-1000 ${animateIn ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
        >
          {/* Winner Celebration */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <h1 className="text-6xl font-bold text-white mb-4 relative z-10">
                🏆 GAME OVER! 🏆
              </h1>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-lg blur-lg opacity-30 animate-pulse"></div>
            </div>

            <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl p-8 mb-6 transform hover:scale-105 transition-transform duration-300 shadow-2xl">
              <div className="flex items-center justify-center space-x-4">
                <span className="text-6xl animate-bounce">👑</span>
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-2">WINNER</h2>
                  <h3 className="text-4xl font-extrabold text-yellow-900">
                    {winner.playerName}
                  </h3>
                  <p className="text-xl text-yellow-800 mt-2">
                    {winner.totalScore} points
                  </p>
                  <p className="text-sm text-yellow-700">
                    {winner.isComputer ? "Computer" : "Human"}
                  </p>
                </div>
                <span
                  className="text-6xl animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                >
                  🎉
                </span>
              </div>
            </div>
          </div>

          {/* Final Standings */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              🏅 Final Standings 🏅
            </h2>

            <div className="space-y-4">
              {finalResults.playerScores.map((player, index) => {
                const isWinner = index === 0;
                const isTop3 = index < 3;
                const placementEmoji =
                  index === 0
                    ? "🥇"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : "🏃";

                return (
                  <div
                    key={player.playerId}
                    className={`flex items-center justify-between p-6 rounded-xl transition-all duration-300 hover:scale-102 ${
                      isWinner
                        ? "bg-gradient-to-r from-yellow-100 to-yellow-200 border-4 border-yellow-400 shadow-lg"
                        : isTop3
                          ? "bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300"
                          : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <span
                        className={`text-4xl ${isWinner ? "animate-pulse" : ""}`}
                      >
                        {placementEmoji}
                      </span>
                      <div>
                        <div
                          className={`font-bold ${
                            isWinner
                              ? "text-2xl text-yellow-800"
                              : "text-xl text-gray-800"
                          }`}
                        >
                          {player.playerName}
                          {isWinner && (
                            <span className="ml-2 text-yellow-600">👑</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {player.isComputer ? "Computer" : "Human"} • #
                          {player.finalPlacement}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          isWinner
                            ? "text-3xl text-yellow-700"
                            : "text-2xl text-blue-600"
                        }`}
                      >
                        {player.totalScore}
                      </div>
                      <div className="text-sm text-gray-500">points</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Summary */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              🎮 Game Summary
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {currentGame.settings.totalRounds}
                </div>
                <div className="text-sm text-gray-600">Rounds Played</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {finalResults.playerScores.length}
                </div>
                <div className="text-sm text-gray-600">Players</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 capitalize">
                  {currentGame.settings.cityDifficulty}
                </div>
                <div className="text-sm text-gray-600">Difficulty</div>
              </div>
            </div>
          </div>

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
