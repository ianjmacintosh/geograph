import type { Game } from "../types/game";

interface PlayersListProps {
  currentGame: Game;
  playerId: string;
  isHost: boolean;
  onAddComputers: () => void;
}

export function PlayersList({
  currentGame,
  playerId,
  isHost,
  onAddComputers,
}: PlayersListProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Players ({currentGame.players.length}/
          {currentGame.settings.maxPlayers})
        </h2>
        {isHost &&
          currentGame.players.length < currentGame.settings.maxPlayers && (
            <button
              onClick={onAddComputers}
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
                className={`w-3 h-3 rounded-full ${
                  player.isComputer ? "bg-blue-400" : "bg-green-400"
                }`}
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
  );
}
