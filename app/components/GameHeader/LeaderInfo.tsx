import React from 'react';

interface LeaderInfoProps {
  isCurrentPlayerLeader: boolean;
  leaderName: string;
  leaderScore: number;
}

// Displays leader name and score
export default function LeaderInfo({ isCurrentPlayerLeader, leaderName, leaderScore }: LeaderInfoProps) {
  return isCurrentPlayerLeader ? (
    <div className="text-green-600 font-semibold">
      🥇 YOU LEAD ({leaderScore})
    </div>
  ) : (
    <div className="text-gray-600">
      <span className="text-gray-500">LEADER:</span>{' '}
      <span className="font-semibold">{leaderName}</span>{' '}
      <span className="text-gray-800">({leaderScore})</span>
    </div>
  );
}
