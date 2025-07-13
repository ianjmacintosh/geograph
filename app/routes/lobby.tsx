import { useState, useEffect } from "react";
import { useGame } from "../contexts/GameContext";
import { useNavigate } from "react-router";
import { QRCodeModal } from "../components/QRCodeModal";
import { LobbyHeader } from "../components/LobbyHeader";
import { PlayersList } from "../components/PlayersList";
import { GameSettingsSection } from "../components/GameSettingsSection";
import { ScoringInfo } from "../components/ScoringInfo";

export function meta() {
  return [
    { title: "Game Lobby - Geograph" },
    { name: "description", content: "Game lobby for Geograph" },
  ];
}

// Helper function to calculate available computer slots
function calculateComputerSlots(currentGame: {
  settings: { maxPlayers: number };
  players: unknown[];
}): number {
  const availableSlots =
    currentGame.settings.maxPlayers - currentGame.players.length;
  return Math.min(3, availableSlots);
}

export default function Lobby() {
  const {
    currentGame,
    addComputerPlayers,
    startGame,
    leaveGame,
    updateSettings,
    playerId,
  } = useGame();
  const navigate = useNavigate();
  const [showQRCode, setShowQRCode] = useState(false);

  // Navigate based on game status
  useEffect(() => {
    if (!currentGame) {
      navigate("/");
      return;
    }

    if (currentGame.status === "playing") {
      navigate("/game");
      return;
    }

    if (currentGame.status === "finished") {
      navigate("/results");
      return;
    }
  }, [currentGame, navigate]);

  if (!currentGame) {
    return null;
  }

  const isHost = playerId === currentGame.hostId;
  const canStart = currentGame.players.length >= 1;

  const handleAddComputers = () => {
    const computersToAdd = calculateComputerSlots(currentGame);
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
          <LobbyHeader
            currentGame={currentGame}
            onLeaveGame={handleLeaveGame}
            onShowQRCode={() => setShowQRCode(true)}
          />

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <PlayersList
              currentGame={currentGame}
              playerId={playerId}
              isHost={isHost}
              onAddComputers={handleAddComputers}
            />

            <GameSettingsSection
              currentGame={currentGame}
              isHost={isHost}
              updateSettings={updateSettings}
              onStartGame={handleStartGame}
              canStart={canStart}
            />
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">How to Play</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• You&apos;ll see a world map with a city marked</li>
              <li>• Guess the location by clicking on the map</li>
              <li>
                • Play {currentGame.settings.totalRounds} rounds and see who
                knows geography best!
              </li>
            </ul>
          </div>

          <ScoringInfo currentGame={currentGame} />
        </div>
      </div>

      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        shareUrl={`${window.location.origin}/join/${currentGame.code}`}
      />
    </div>
  );
}
