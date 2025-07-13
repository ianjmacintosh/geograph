interface WinnerCelebrationProps {
  winner: {
    playerName: string;
    totalScore: number;
    isComputer: boolean;
  };
}

export function WinnerCelebration({ winner }: WinnerCelebrationProps) {
  return (
    <div className="text-center mb-8">
      <div className="relative inline-block">
        <h1 className="text-6xl font-bold text-white mb-4 relative z-10">
          🏆 GAME OVER! 🏆
        </h1>
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-lg blur-lg opacity-30 animate-pulse"></div>
      </div>

      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl p-8 mb-6 transform hover:scale-105 transition-transform duration-300 shadow-2xl">
        <div className="flex items-center justify-center space-x-4">
          <span className="text-6xl animate-bounce">👑</span>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">WINNER</h2>
            <h3 className="text-4xl font-extrabold text-yellow-900">
              {winner.playerName}
            </h3>
            <p className="text-xl text-yellow-800 mt-2">{winner.totalScore} points</p>
            <p className="text-sm text-yellow-700">
              {winner.isComputer ? "Computer" : "Human"}
            </p>
          </div>
          <span className="text-6xl animate-bounce" style={{ animationDelay: "0.2s" }}>
            🎉
          </span>
        </div>
      </div>
    </div>
  );
}