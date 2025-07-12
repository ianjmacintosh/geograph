import type { Game } from "../types/game";

interface GameDesktopHeaderProps {
  currentGame: Game;
  roundNumber: number;
  onLeaveGame: () => void;
}

export function GameDesktopHeader({
  currentGame,
  roundNumber,
  onLeaveGame,
}: GameDesktopHeaderProps) {
  return (
    <div className="hidden lg:flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Round {roundNumber} of {currentGame.settings.totalRounds}
        </h1>
        <p className="text-gray-600">Game Code: {currentGame.code}</p>
      </div>
      <div className="flex items-center space-x-4">
        <button
          onClick={onLeaveGame}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
        >
          Leave Game
        </button>
      </div>
    </div>
  );
}