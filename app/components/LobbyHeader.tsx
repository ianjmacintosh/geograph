import { useState } from "react";
import type { Game } from "../types/game";

interface LobbyHeaderProps {
  currentGame: Game;
  onLeaveGame: () => void;
  onShowQRCode: () => void;
}

export function LobbyHeader({ currentGame, onLeaveGame, onShowQRCode }: LobbyHeaderProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/join/${currentGame.code}`
      );
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
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
              onClick={handleCopyLink}
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
              onClick={onShowQRCode}
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
        onClick={onLeaveGame}
        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition duration-200 self-start sm:self-auto"
      >
        Leave Game
      </button>
    </div>
  );
}