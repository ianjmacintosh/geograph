interface ConfettiAnimationProps {
  showConfetti: boolean;
}

const confettiColors = [
  "#FFD700",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
];

export function ConfettiAnimation({ showConfetti }: ConfettiAnimationProps) {
  if (!showConfetti) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10px`,
            backgroundColor:
              confettiColors[Math.floor(Math.random() * confettiColors.length)],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}
