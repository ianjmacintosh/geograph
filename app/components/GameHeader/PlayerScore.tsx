import React from "react";

interface PlayerScoreProps {
  currentPlayerScore: number;
}

export default function PlayerScore({ currentPlayerScore }: PlayerScoreProps) {
  return (
    <div className="font-medium">
      <span className="text-gray-500">Score:</span>{" "}
      <span className="text-blue-600 font-semibold">{currentPlayerScore}</span>
    </div>
  );
}
