import type { Game } from "../types/game";

interface ScoringInfoProps {
  currentGame: Game;
  variant?: "blue" | "green";
}

export function ScoringInfo({
  currentGame,
  variant = "green",
}: ScoringInfoProps) {
  const bgColor = variant === "blue" ? "bg-blue-50" : "bg-green-50";
  const textColor = variant === "blue" ? "text-blue-800" : "text-green-800";
  const contentColor = variant === "blue" ? "text-blue-700" : "text-green-700";

  return (
    <div className={`mt-4 p-4 ${bgColor} rounded-md`}>
      <h3 className={`font-semibold ${textColor} mb-2`}>🏆 Scoring System</h3>
      <div className={`text-sm ${contentColor} space-y-2`}>
        <div>
          <strong>Placement Points:</strong>
          <ul className="ml-4 mt-1 space-y-1">
            <li>• 1st place: {currentGame.players.length} points</li>
            <li>
              • 2nd place: {Math.max(0, currentGame.players.length - 1)} points
            </li>
            <li>
              • 3rd place: {Math.max(0, currentGame.players.length - 2)} points
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
  );
}
