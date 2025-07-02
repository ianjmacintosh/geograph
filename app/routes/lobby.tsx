// import type { Route } from "./+types/lobby";
import { useGame } from "../contexts/GameContext";
import { useNavigate } from "react-router";

export function meta() {
  return [
    { title: "Game Lobby - Geograph" },
    { name: "description", content: "Game lobby for Geograph" },
  ];
}

export default function Lobby() {
  const { currentGame, addComputerPlayers, startGame, clearGame } = useGame();
  const navigate = useNavigate();

  if (!currentGame) {
    navigate("/");
    return null;
  }

  const isHost = currentGame.players[0]?.id === currentGame.hostId;
  const canStart = currentGame.players.length >= 1; // Allow starting with 1 player for testing

  const handleAddComputers = () => {
    const availableSlots = currentGame.settings.maxPlayers - currentGame.players.length;
    const computersToAdd = Math.min(3, availableSlots);
    addComputerPlayers(computersToAdd);
  };

  const handleStartGame = () => {
    startGame();
    navigate("/game");
  };

  const handleLeaveGame = () => {
    clearGame();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Game Lobby</h1>
              <p className="text-gray-600">Game Code: <span className="font-mono text-lg font-semibold">{currentGame.code}</span></p>
            </div>
            <button
              onClick={handleLeaveGame}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition duration-200"
            >
              Leave Game
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Players ({currentGame.players.length}/{currentGame.settings.maxPlayers})
                </h2>
                {isHost && currentGame.players.length < currentGame.settings.maxPlayers && (
                  <button
                    onClick={handleAddComputers}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition duration-200"
                  >
                    Add Computers
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                {currentGame.players.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${player.isComputer ? 'bg-blue-400' : 'bg-green-400'}`} />
                      <span className="font-medium">
                        {player.name}
                        {index === 0 && ' (Host)'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {player.isComputer ? 'Computer' : 'Human'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Game Settings</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rounds:</span>
                  <span className="font-semibold">{currentGame.settings.totalRounds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time per round:</span>
                  <span className="font-semibold">{currentGame.settings.roundTimeLimit / 1000}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max players:</span>
                  <span className="font-semibold">{currentGame.settings.maxPlayers}</span>
                </div>
              </div>

              {isHost && (
                <div className="mt-6">
                  <button
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-md transition duration-200"
                  >
                    {canStart ? "Start Game" : "Need at least 1 player"}
                  </button>
                </div>
              )}

              {!isHost && (
                <div className="mt-6 text-center text-gray-600">
                  Waiting for host to start the game...
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">How to Play</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• You'll see a world map with a city marked</li>
              <li>• Guess the location by clicking on the map</li>
              <li>• Closer guesses earn more points</li>
              <li>• Play {currentGame.settings.totalRounds} rounds and see who knows geography best!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}