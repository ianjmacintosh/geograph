import { useState } from "react";
import type { Game } from "../types/game";
import { DifficultyRadio } from "./DifficultyRadio";
import { ScoringInfo } from "./ScoringInfo";

interface GameSettingsSectionProps {
  currentGame: Game;
  isHost: boolean;
  updateSettings: (settings: Partial<Game["settings"]>) => void;
  onStartGame: () => void;
  canStart: boolean;
}

function getDifficultyDisplayName(difficulty: string): string {
  switch (difficulty) {
    case "easy":
      return "Easy";
    case "medium":
      return "Medium";
    case "hard":
      return "Hard";
    case "brazilian_capitals":
      return "Brazilian State Capitals";
    case "us_capitals":
      return "US State Capitals";
    default:
      return difficulty;
  }
}

export function GameSettingsSection({
  currentGame,
  isHost,
  updateSettings,
  onStartGame,
  canStart,
}: GameSettingsSectionProps) {
  const [showScoringHelp, setShowScoringHelp] = useState(false);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Game Settings</h2>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Rounds:</span>
          <span className="font-semibold">{currentGame.settings.totalRounds}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Time per round:</span>
          <span className="font-semibold">
            {currentGame.settings.roundTimeLimit / 1000}s
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Max players:</span>
          <span className="font-semibold">{currentGame.settings.maxPlayers}</span>
        </div>

        {isHost && (
          <DifficultyRadio currentGame={currentGame} updateSettings={updateSettings} />
        )}

        {!isHost && (
          <div className="flex justify-between">
            <span className="text-gray-600">City difficulty:</span>
            <span className="font-semibold">
              {getDifficultyDisplayName(currentGame.settings.cityDifficulty)}
            </span>
          </div>
        )}
      </div>

      {isHost && (
        <div className="mt-6">
          <button
            onClick={onStartGame}
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
            <ScoringInfo currentGame={currentGame} variant="blue" />
          )}
        </div>
      )}
    </div>
  );
}