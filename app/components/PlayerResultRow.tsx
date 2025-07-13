interface PlayerResultRowProps {
  player: {
    playerId: string;
    playerName: string;
    isComputer: boolean;
    totalScore: number;
    finalPlacement: number;
  };
  index: number;
}

function getPlacementEmoji(index: number): string {
  switch (index) {
    case 0:
      return "🥇";
    case 1:
      return "🥈";
    case 2:
      return "🥉";
    default:
      return "🏃";
  }
}

function getRowStyling(isWinner: boolean, isTop3: boolean): string {
  if (isWinner) {
    return "bg-gradient-to-r from-yellow-100 to-yellow-200 border-4 border-yellow-400 shadow-lg";
  }
  if (isTop3) {
    return "bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300";
  }
  return "bg-gray-50 border border-gray-200";
}

export function PlayerResultRow({ player, index }: PlayerResultRowProps) {
  const isWinner = index === 0;
  const isTop3 = index < 3;
  const placementEmoji = getPlacementEmoji(index);
  const rowStyling = getRowStyling(isWinner, isTop3);

  return (
    <div
      key={player.playerId}
      className={`flex items-center justify-between p-6 rounded-xl transition-all duration-300 hover:scale-102 ${rowStyling}`}
    >
      <div className="flex items-center space-x-4">
        <span className={`text-4xl ${isWinner ? "animate-pulse" : ""}`}>
          {placementEmoji}
        </span>
        <div>
          <div
            className={`font-bold ${
              isWinner ? "text-2xl text-yellow-800" : "text-xl text-gray-800"
            }`}
          >
            {player.playerName}
            {isWinner && <span className="ml-2 text-yellow-600">👑</span>}
          </div>
          <div className="text-sm text-gray-600">
            {player.isComputer ? "Computer" : "Human"} • #{player.finalPlacement}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div
          className={`font-bold ${
            isWinner ? "text-3xl text-yellow-700" : "text-2xl text-blue-600"
          }`}
        >
          {player.totalScore}
        </div>
        <div className="text-sm text-gray-500">points</div>
      </div>
    </div>
  );
}