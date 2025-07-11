import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { isValidGameCode } from "../utils/game";
import { useGame } from "../contexts/GameContext";

export function meta() {
  return [
    { title: "Geograph - Geography Game" },
    {
      name: "description",
      content: "Test your geography knowledge with friends!",
    },
  ];
}

export default function Home() {
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const {
    createGame,
    joinGame,
    isLoading,
    error,
    currentGame,
    connectionStatus,
  } = useGame();
  const navigate = useNavigate();

  const handlePlay = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }

    if (gameCode.trim()) {
      // Join existing game
      if (!isValidGameCode(gameCode)) {
        alert("Please enter a valid 4-digit game code");
        return;
      }
      joinGame(gameCode, playerName.trim());
    } else {
      // Create new game
      createGame(playerName.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePlay();
    }
  };

  // Navigate to lobby when game is created/joined
  useEffect(() => {
    if (currentGame && !isLoading) {
      navigate("/lobby");
    }
  }, [currentGame, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Geograph</h1>
          <p className="text-gray-600">Test your geography knowledge!</p>
        </div>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="playerName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          <div>
            <label
              htmlFor="gameCode"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Game Code (optional)
            </label>
            <input
              id="gameCode"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={gameCode}
              onChange={(e) =>
                setGameCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-lg tracking-wider"
              placeholder="1234"
              maxLength={4}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          <button
            onClick={handlePlay}
            disabled={
              !playerName.trim() ||
              isLoading ||
              connectionStatus !== "connected"
            }
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-md transition duration-200 min-h-[48px] touch-manipulation"
          >
            {isLoading
              ? gameCode.trim()
                ? "Joining..."
                : "Creating..."
              : "Play"}
          </button>
        </div>

        <div className="mt-8 text-center text-sm">
          {connectionStatus === "connected" && (
            <p className="text-green-600">🟢 Connected to server</p>
          )}
          {connectionStatus === "connecting" && (
            <p className="text-yellow-600">🟡 Connecting to server...</p>
          )}
          {connectionStatus === "disconnected" && (
            <p className="text-red-600">🔴 Disconnected from server</p>
          )}
          {connectionStatus === "error" && (
            <p className="text-red-600">❌ Connection error</p>
          )}

          {error && <p className="text-red-600 mt-2">⚠️ {error}</p>}

          <p className="text-gray-500 mt-2">
            Create a new game or join with a 4-digit code
          </p>
        </div>
      </div>
    </div>
  );
}
