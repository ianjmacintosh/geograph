// import type { Route } from "./+types/lobby";
import { useState, useEffect } from "react";
import { useGame } from "../contexts/GameContext";
import { useNavigate } from "react-router";

export function meta() {
  return [
    { title: "Game Lobby - Geograph" },
    { name: "description", content: "Game lobby for Geograph" },
  ];
}

export default function Lobby() {
  const { currentGame, addComputerPlayers, startGame, leaveGame, updateSettings, playerId } = useGame();
  const navigate = useNavigate();
  const [showScoringHelp, setShowScoringHelp] = useState(false);

  // Navigate based on game status
  useEffect(() => {
    if (!currentGame) {
      navigate("/");
      return;
    }
    
    if (currentGame.status === 'playing') {
      navigate("/game");
      return;
    }
    
    if (currentGame.status === 'finished') {
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
    const availableSlots = currentGame.settings.maxPlayers - currentGame.players.length;
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Game Lobby</h1>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <p className="text-sm sm:text-base text-gray-600">
                  Code: <span className="font-mono text-lg sm:text-xl font-semibold">{currentGame.code}</span>
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/join/${currentGame.code}`}
                    readOnly
                    className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded text-gray-600 font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/join/${currentGame.code}`);
                      // You could add a toast notification here
                    }}
                    className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition duration-200"
                  >
                    Copy
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
                  Players ({currentGame.players.length}/{currentGame.settings.maxPlayers})
                </h2>
                {isHost && currentGame.players.length < currentGame.settings.maxPlayers && (
                  <button
                    onClick={handleAddComputers}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-semibold min-h-[44px] touch-manipulation transition duration-200"
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
                        {player.id === currentGame.hostId && ' (Host)'}
                        {player.id === playerId && ' (You)'}
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
                
                {isHost && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      City Difficulty
                    </label>
                    <div className="space-y-2">
                      {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                        <label key={difficulty} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="difficulty"
                            value={difficulty}
                            checked={currentGame.settings.cityDifficulty === difficulty}
                            onChange={(e) => updateSettings({ cityDifficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                            className="mr-3 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {difficulty}
                            {difficulty === 'easy' && ' - Famous world cities'}
                            {difficulty === 'medium' && ' - Regional capitals'}
                            {difficulty === 'hard' && ' - Lesser-known cities'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {!isHost && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">City difficulty:</span>
                    <span className="font-semibold capitalize">{currentGame.settings.cityDifficulty}</span>
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
                      <h4 className="font-semibold text-blue-800 mb-2">🏆 Scoring System</h4>
                      <div className="text-sm text-blue-700 space-y-2">
                        <div>
                          <strong>Placement Points:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            <li>• 1st place: {currentGame.players.length} points</li>
                            <li>• 2nd place: {Math.max(0, currentGame.players.length - 1)} points</li>
                            <li>• 3rd place: {Math.max(0, currentGame.players.length - 2)} points</li>
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
              <li>• You'll see a world map with a city marked</li>
              <li>• Guess the location by clicking on the map</li>
              <li>• Play {currentGame.settings.totalRounds} rounds and see who knows geography best!</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded-md">
            <h3 className="font-semibold text-green-800 mb-2">🏆 Scoring System</h3>
            <div className="text-sm text-green-700 space-y-2">
              <div>
                <strong>Placement Points:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• 1st place: {currentGame.players.length} points</li>
                  <li>• 2nd place: {Math.max(0, currentGame.players.length - 1)} points</li>
                  <li>• 3rd place: {Math.max(0, currentGame.players.length - 2)} points</li>
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
    </div>
  );
}