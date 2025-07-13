import type { Game } from "../types/game";

interface DifficultyRadioProps {
  currentGame: Game;
  updateSettings: (settings: Partial<Game["settings"]>) => void;
}

function getDifficultyLabel(difficulty: string): string {
  switch (difficulty) {
    case "easy":
      return "Easy - Famous world cities";
    case "medium":
      return "Medium - Regional capitals";
    case "hard":
      return "Hard - Lesser-known cities";
    case "brazilian_capitals":
      return "Brazilian State Capitals";
    case "us_capitals":
      return "US State Capitals";
    default:
      return difficulty;
  }
}

export function DifficultyRadio({
  currentGame,
  updateSettings,
}: DifficultyRadioProps) {
  const difficulties = [
    "easy",
    "medium",
    "hard",
    "brazilian_capitals",
    "us_capitals",
  ] as const;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        City Difficulty
      </label>
      <div className="space-y-2">
        {difficulties.map((difficulty) => (
          <label key={difficulty} className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="difficulty"
              value={difficulty}
              checked={currentGame.settings.cityDifficulty === difficulty}
              onChange={(e) =>
                updateSettings({
                  cityDifficulty: e.target
                    .value as (typeof difficulties)[number],
                })
              }
              className="mr-3 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              {getDifficultyLabel(difficulty)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
