// import type { Route } from "./+types/lobby";
import { useState, useEffect } from "react";
import { useGame } from "../contexts/GameContext";
import { useNavigate } from "react-router";
import { QRCodeModal } from "../components/QRCodeModal";

export function meta() {
  return [
    { title: "Game Lobby - Geograph" },
    { name: "description", content: "Game lobby for Geograph" },
  ];
}

export default function Lobby() {
  const {
    currentGame,
    addComputerPlayers,
    startGame,
    leaveGame,
    updateSettings,
    playerId,
  } = useGame();
  const navigate = useNavigate();
  const [showScoringHelp, setShowScoringHelp] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // Navigate based on game status
  useEffect(() => {
    if (!currentGame) {
      navigate("/");
      return;
    }

    if (currentGame.status === "playing") {
      navigate("/game");
      return;
    }

    if (currentGame.status === "finished") {
      navigate("/results");
      return;
    }
  }, [currentGame, navigate]);

  if (!currentGame) {
    return null;
  }

  const isHost = playerId === currentGame.hostId;
  const canStart = currentGame.players.length >= 1; // Allow starting with 1 player for testing

  const handleAddComputers = () => {
    const availableSlots =
      currentGame.settings.maxPlayers - currentGame.players.length;
    const computersToAdd = Math.min(3, availableSlots);
    addComputerPlayers(computersToAdd);
  };

  const handleStartGame = () => {
    startGame();
  };

  const handleLeaveGame = () => {
    leaveGame();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Game Lobby
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <p className="text-sm sm:text-base text-gray-600">
                  Code:{" "}
                  <span className="font-mono text-lg sm:text-xl font-semibold">
                    {currentGame.code}
                  </span>
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/join/${currentGame.code}`,
                        );
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      } catch (err) {
                        console.error("Failed to copy:", err);
                      }
                    }}
                    className="inline-flex items-center px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition duration-200"
                    title="Copy invite link"
                  >
                    {copySuccess ? (
                      <>
                        <svg
                          className="w-4 h-4 mr-1"
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
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Share
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowQRCode(true)}
                    className="inline-flex items-center px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition duration-200"
                    title="Show QR code"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z"
                      />
                    </svg>
                    QR Code
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleLeaveGame}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition duration-200 self-start sm:self-auto"
            >
              Leave Game
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Players ({currentGame.players.length}/
                  {currentGame.settings.maxPlayers})
                </h2>
                {isHost &&
                  currentGame.players.length <
                  currentGame.settings.maxPlayers && (
                    <button
                      onClick={handleAddComputers}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-semibold min-h-[44px] touch-manipulation transition duration-200"
                    >
                      Add Computers
                    </button>
                  )}
              </div>

              <div className="space-y-2">
                {currentGame.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${player.isComputer ? "bg-blue-400" : "bg-green-400"}`}
                      />
                      <span className="font-medium">
                        {player.name}
                        {player.id === currentGame.hostId && " (Host)"}
                        {player.id === playerId && " (You)"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {player.isComputer ? "Computer" : "Human"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Game Settings
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rounds:</span>
                  <span className="font-semibold">
                    {currentGame.settings.totalRounds}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time per round:</span>
                  <span className="font-semibold">
                    {currentGame.settings.roundTimeLimit / 1000}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max players:</span>
                  <span className="font-semibold">
                    {currentGame.settings.maxPlayers}
                  </span>
                </div>

                {isHost && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      City Difficulty
                    </label>
                    <div className="space-y-2">
                      {(
                        [
                          "easy",
                          "medium",
                          "hard",
                          "brazilian_capitals",
                          "us_capitals",
                        ] as const
                      ).map((difficulty) => (
                        <label
                          key={difficulty}
                          className="flex items-center cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="difficulty"
                            value={difficulty}
                            checked={
                              currentGame.settings.cityDifficulty === difficulty
                            }
                            onChange={(e) =>
                              updateSettings({
                                cityDifficulty: e.target.value as
                                  | "easy"
                                  | "medium"
                                  | "hard"
                                  | "brazilian_capitals"
                                  | "us_capitals",
                              })
                            }
                            className="mr-3 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {difficulty === "easy" &&
                              "Easy - Famous world cities"}
                            {difficulty === "medium" &&
                              "Medium - Regional capitals"}
                            {difficulty === "hard" &&
                              "Hard - Lesser-known cities"}
                            {difficulty === "brazilian_capitals" &&
                              "Brazilian State Capitals"}
                            {difficulty === "us_capitals" &&
                              "US State Capitals"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {!isHost && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">City difficulty:</span>
                    <span className="font-semibold">
                      {currentGame.settings.cityDifficulty === "easy" && "Easy"}
                      {currentGame.settings.cityDifficulty === "medium" &&
                        "Medium"}
                      {currentGame.settings.cityDifficulty === "hard" && "Hard"}
                      {currentGame.settings.cityDifficulty ===
                        "brazilian_capitals" && "Brazilian State Capitals"}
                      {currentGame.settings.cityDifficulty === "us_capitals" &&
                        "US State Capitals"}
                    </span>
                  </div>
                )}
              </div>

              {isHost && (
                <div className="mt-6">
                  <button
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-4 px-4 rounded-md transition duration-200 min-h-[56px] touch-manipulation text-lg"
                  >
                    {canStart ? "Start Game" : "Need at least 1 player"}
                  </button>
                </div>
              )}

              {!isHost && (
                <div className="mt-6 text-center">
                  <div className="text-gray-600 mb-4">
                    Waiting for host to start the game...
                  </div>
                  <button
                    onClick={() => setShowScoringHelp(!showScoringHelp)}
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    📊 How does scoring work?
                  </button>

                  {showScoringHelp && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        🏆 Scoring System
                      </h4>
                      <div className="text-sm text-blue-700 space-y-2">
                        <div>
                          <strong>Placement Points:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            <li>
                              • 1st place: {currentGame.players.length} points
                            </li>
                            <li>
                              • 2nd place:{" "}
                              {Math.max(0, currentGame.players.length - 1)}{" "}
                              points
                            </li>
                            <li>
                              • 3rd place:{" "}
                              {Math.max(0, currentGame.players.length - 2)}{" "}
                              points
                            </li>
                            <li>• And so on...</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Distance Bonus:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            <li>• Within 100 km: +5 bonus points</li>
                            <li>• Within 500 km: +2 bonus points</li>
                            <li>• Within 1000 km: +1 bonus point</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">How to Play</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• You&apos;ll see a world map with a city marked</li>
              <li>• Guess the location by clicking on the map</li>
              <li>
                • Play {currentGame.settings.totalRounds} rounds and see who
                knows geography best!
              </li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded-md">
            <h3 className="font-semibold text-green-800 mb-2">
              🏆 Scoring System
            </h3>
            <div className="text-sm text-green-700 space-y-2">
              <div>
                <strong>Placement Points:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• 1st place: {currentGame.players.length} points</li>
                  <li>
                    • 2nd place: {Math.max(0, currentGame.players.length - 1)}{" "}
                    points
                  </li>
                  <li>
                    • 3rd place: {Math.max(0, currentGame.players.length - 2)}{" "}
                    points
                  </li>
                  <li>• And so on...</li>
                </ul>
              </div>
              <div>
                <strong>Distance Bonus:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Within 100 km: +5 bonus points</li>
                  <li>• Within 500 km: +2 bonus points</li>
                  <li>• Within 1000 km: +1 bonus point</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        shareUrl={`${window.location.origin}/join/${currentGame.code}`}
      />
    </div>
  );
}
