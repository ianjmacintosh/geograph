import React from 'react';

interface ScoreboardHeaderProps {
  onClose: () => void;
}

// Renders the modal header and close button
export default function ScoreboardHeader({ onClose }: ScoreboardHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold text-gray-800">Scoreboard</h2>
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
      >
        ✕
      </button>
    </div>
  );
}
