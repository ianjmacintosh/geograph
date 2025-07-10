import React, { useEffect, useRef, useState } from "react";

interface GameTimerProps {
  timeLeft: number;
  showResults: boolean;
}

// Handles timer display and logic
export default function GameTimer({
  timeLeft: initialTimeLeft,
  showResults,
}: GameTimerProps) {
  const [displayTime, setDisplayTime] = useState(initialTimeLeft);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimeLeftRef = useRef(initialTimeLeft);
  const isLowTime = displayTime <= 10;
  const isCriticalTime = displayTime <= 5;

  useEffect(() => {
    if (showResults) {
      setDisplayTime(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setDisplayTime(initialTimeLeft);
    lastTimeLeftRef.current = initialTimeLeft;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const newTime = Math.max(0, lastTimeLeftRef.current - elapsed);
      setDisplayTime(newTime);
      if (newTime <= 0) {
        clearInterval(intervalRef.current!);
      }
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [initialTimeLeft, showResults]);

  if (showResults) {
    return (
      <div className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
        Complete
      </div>
    );
  }

  return (
    <div
      className={`text-sm font-bold px-2 py-1 rounded flex items-center gap-2 ${
        isCriticalTime
          ? "text-white bg-red-600 animate-pulse-fast"
          : isLowTime
            ? "text-red-600 bg-red-50 animate-pulse"
            : "text-blue-600 bg-blue-50"
      }`}
    >
      <span>{`Time: ${displayTime.toFixed(1)}s`}</span>
      <style>{`
        @keyframes pulse-fast {
          0%, 100% { background-color: #dc2626; color: #fff; }
          50% { background-color: #fff; color: #dc2626; }
        }
        .animate-pulse-fast {
          animation: pulse-fast 0.7s cubic-bezier(0.4,0,0.6,1) infinite;
        }
      `}</style>
    </div>
  );
}
