import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Game } from "../types/game";

export function useGameNavigation(currentGame: Game | null) {
  const navigate = useNavigate();

  // Navigation logic based on game state
  useEffect(() => {
    if (!currentGame) {
      navigate("/");
      return;
    }
    if (currentGame.status === "finished") {
      navigate("/results");
      return;
    }
    if (currentGame.status !== "playing") {
      navigate("/lobby");
      return;
    }
  }, [currentGame, navigate]);
}