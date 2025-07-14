import type { Route } from "./+types/join";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { isValidGameCode } from "../utils/game";
import { useGame } from "../contexts/GameContext";
import { ConnectionStatus } from "../components/ConnectionStatus";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Join Game - Geograph" },
    { name: "description", content: "Join a geography game with friends!" },
  ];
}

// Helper function to validate join form
function validateJoinForm(
  playerName: string,
  isValidCode: boolean,
): string | null {
  if (!playerName.trim()) {
    return "Please enter your name";
  }
  if (!isValidCode) {
    return "Invalid game code";
  }
  return null;
}

export default function Join() {
  const { gameCode } = useParams<{ gameCode: string }>();
  const [playerName, setPlayerName] = useState("");
  const { joinGame, isLoading, error, currentGame, connectionStatus } =
    useGame();
  const navigate = useNavigate();

  // Validate game code from URL
  const isValidCode = gameCode && isValidGameCode(gameCode);

  const handleJoinGame = () => {
    const validationError = validateJoinForm(playerName, !!isValidCode);
    if (validationError) {
      alert(validationError);
      return;
    }
    joinGame(gameCode!, playerName.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoinGame();
    }
  };

  // Navigate to lobby when game is joined
  useEffect(() => {
    if (currentGame && !isLoading) {
      navigate("/lobby");
    }
  }, [currentGame, isLoading, navigate]);

  // Redirect to home if invalid game code
  useEffect(() => {
    if (gameCode && !isValidCode) {
      navigate("/");
    }
  }, [gameCode, isValidCode, navigate]);

  if (!isValidCode) {
    return null; // Will redirect to home
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Join Game</h1>
          <p className="text-gray-600">Game Code: {gameCode}</p>
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
              autoFocus
            />
          </div>

          <button
            onClick={handleJoinGame}
            disabled={
              !playerName.trim() ||
              isLoading ||
              connectionStatus !== "connected"
            }
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-md transition duration-200 min-h-[48px] touch-manipulation"
          >
            {isLoading ? "Joining..." : "Join Game"}
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-md transition duration-200 min-h-[48px] touch-manipulation"
          >
            Back to Home
          </button>
        </div>

        <div className="mt-8 text-center text-sm">
          <ConnectionStatus />
          {error && <p className="text-red-600 mt-2">⚠️ {error}</p>}
        </div>
      </div>
    </div>
  );
}
