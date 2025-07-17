import { useGame } from "../contexts/GameContext";

export function ConnectionStatus() {
  const { connectionStatus, reconnectionInfo } = useGame();

  if (connectionStatus === "connected") {
    return <p className="text-green-600">🟢 Connected to server</p>;
  }

  if (connectionStatus === "reconnected") {
    return <p className="text-green-600">✅ Reconnected!</p>;
  }

  if (connectionStatus === "connecting") {
    if (reconnectionInfo.isReconnecting) {
      const { attempt, maxAttempts, countdownSeconds } = reconnectionInfo;

      if (countdownSeconds > 0) {
        return (
          <p className="text-yellow-600">
            🔄 Reconnecting in {countdownSeconds}s... (attempt {attempt} of{" "}
            {maxAttempts})
          </p>
        );
      } else {
        return (
          <p className="text-yellow-600">
            🔄 Reconnecting... (attempt {attempt} of {maxAttempts})
          </p>
        );
      }
    } else {
      return <p className="text-yellow-600">🟡 Connecting to server...</p>;
    }
  }

  if (connectionStatus === "disconnected") {
    if (reconnectionInfo.isReconnecting) {
      const { attempt, maxAttempts, countdownSeconds } = reconnectionInfo;

      if (countdownSeconds > 0) {
        return (
          <p className="text-orange-600">
            🔄 Connection lost. Reconnecting in {countdownSeconds}s... (attempt{" "}
            {attempt} of {maxAttempts})
          </p>
        );
      } else {
        return (
          <p className="text-orange-600">
            🔄 Connection lost. Reconnecting... (attempt {attempt} of{" "}
            {maxAttempts})
          </p>
        );
      }
    } else {
      return <p className="text-red-600">🔴 Disconnected from server</p>;
    }
  }

  if (connectionStatus === "error") {
    return <p className="text-red-600">❌ Connection error</p>;
  }

  return null;
}
