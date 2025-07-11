import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "./database";
import { getRandomCityByDifficulty } from "../data/cities";
import {
  calculateDistance,
  calculateBonusPoints,
  calculatePlacementPoints,
  calculateFinalPlacements,
  generateComputerGuess,
  createComputerPlayer,
  createHumanPlayer,
  generateGameCode,
} from "../utils/game";
import type {
  Game,
  Player,
  GameRound,
  Guess,
  FinalResults,
} from "../types/game";
import type { GameWebSocketServer as GameWebSocketServerType } from "./websocket.js"; // Added import for type

export interface GameResult {
  success: boolean;
  error?: string;
  game?: Game;
  player?: Player;
  currentRound?: GameRound;
  guess?: Guess;
  roundId?: string;
  gameFinished?: boolean;
}

export class GameManager {
  private db = getDatabase();
  private activeTimers = new Map<string, NodeJS.Timeout>();
  private wsServerInstance: GameWebSocketServerType | null = null;

  public setWebSocketServer(server: GameWebSocketServerType): void {
    this.wsServerInstance = server;
  }

  createGame(hostName: string): Game {
    const hostPlayer = createHumanPlayer(hostName);
    const game: Game = {
      id: uuidv4(),
      code: generateGameCode(),
      hostId: hostPlayer.id,
      players: [hostPlayer],
      rounds: [],
      status: "waiting",
      settings: {
        maxPlayers: 8,
        roundTimeLimit: 30000,
        totalRounds: 5,
        cityDifficulty: "easy",
      },
      createdAt: Date.now(),
    };

    this.db.createGame(game);
    return game;
  }

  joinGame(gameCode: string, playerName: string): GameResult {
    const game = this.db.getGameByCode(gameCode);

    if (!game) {
      return { success: false, error: "Game not found" };
    }

    if (game.status !== "waiting") {
      return { success: false, error: "Game has already started" };
    }

    if (game.players.length >= game.settings.maxPlayers) {
      return { success: false, error: "Game is full" };
    }

    // Check if player name is already taken
    if (game.players.some((p) => p.name === playerName)) {
      return { success: false, error: "Player name already taken" };
    }

    const player = createHumanPlayer(playerName);
    this.db.addPlayer(game.id, player);

    // Return updated game
    const updatedGame = this.db.getGameById(game.id)!;

    return {
      success: true,
      game: updatedGame,
      player,
    };
  }

  startGame(gameId: string, playerId: string): GameResult {
    const game = this.db.getGameById(gameId);

    if (!game) {
      return { success: false, error: "Game not found" };
    }

    if (game.hostId !== playerId) {
      return { success: false, error: "Only the host can start the game" };
    }

    if (game.status !== "waiting") {
      return { success: false, error: "Game has already started" };
    }

    if (game.players.length < 1) {
      return { success: false, error: "Need at least 1 player to start" };
    }

    // Update game status
    this.db.updateGameStatus(gameId, "playing");

    // Start first round
    const firstRound = this.createNewRound(
      gameId,
      game.settings.cityDifficulty,
      [],
    );

    // Start round timer
    this.startRoundTimer(gameId, firstRound.id, game.settings.roundTimeLimit);

    const updatedGame = this.db.getGameById(gameId)!;

    return {
      success: true,
      game: updatedGame,
      currentRound: firstRound,
    };
  }

  addComputerPlayers(gameId: string, count: number): GameResult {
    const game = this.db.getGameById(gameId);

    if (!game) {
      return { success: false, error: "Game not found" };
    }

    if (game.status !== "waiting") {
      return {
        success: false,
        error: "Cannot add computer players after game has started",
      };
    }

    const computerNames = [
      "Alex",
      "Sam",
      "Jordan",
      "Casey",
      "Taylor",
      "Morgan",
      "Riley",
      "Avery",
      "Quinn",
      "Sage",
    ];
    const usedNames = game.players.map((p) => p.name);
    const availableNames = computerNames.filter(
      (name) => !usedNames.includes(name),
    );

    const actualCount = Math.min(
      count,
      availableNames.length,
      game.settings.maxPlayers - game.players.length,
    );

    for (let i = 0; i < actualCount; i++) {
      const computerPlayer = createComputerPlayer(availableNames[i]);
      this.db.addPlayer(gameId, computerPlayer);
    }

    const updatedGame = this.db.getGameById(gameId)!;

    return {
      success: true,
      game: updatedGame,
    };
  }

  makeGuess(
    gameId: string,
    playerId: string,
    lat: number,
    lng: number,
  ): GameResult {
    const game = this.db.getGameById(gameId);

    if (!game) {
      return { success: false, error: "Game not found" };
    }

    if (game.status !== "playing") {
      return { success: false, error: "Game is not in progress" };
    }

    const currentRound = game.rounds[game.rounds.length - 1];

    if (!currentRound) {
      return { success: false, error: "No active round" };
    }

    if (currentRound.completed) {
      // Allow a 5-second grace period for late guesses due to network latency
      const gracePeriodMs = 5000; // 5 seconds
      const timeSinceRoundEnd =
        Date.now() - (currentRound.endTime || Date.now());

      if (timeSinceRoundEnd > gracePeriodMs) {
        return { success: false, error: "Round is already completed" };
      }

      console.log(
        `Accepting late guess from player ${playerId} (${timeSinceRoundEnd}ms after round end)`,
      );
    }

    // Check if player already guessed
    if (currentRound.guesses.some((g) => g.playerId === playerId)) {
      return { success: false, error: "Player has already guessed this round" };
    }

    // Calculate distance and points
    const distance = calculateDistance(
      lat,
      lng,
      currentRound.city.lat,
      currentRound.city.lng,
    );
    const bonusPoints = calculateBonusPoints(distance);

    const guess: Guess = {
      playerId,
      lat,
      lng,
      distance,
      placementPoints: 0, // Will be calculated when round ends
      bonusPoints,
      totalPoints: bonusPoints, // Will be updated when round ends
      placement: 0, // Will be calculated when round ends
      timestamp: Date.now(),
    };

    this.db.addGuess(currentRound.id, guess);

    // Check if all human players have guessed
    const humanPlayers = game.players.filter((p) => !p.isComputer);
    const humanGuesses =
      currentRound.guesses.filter((g) =>
        humanPlayers.some((p) => p.id === g.playerId),
      ).length + 1; // +1 for the guess we just added

    if (humanGuesses === humanPlayers.length) {
      // All human players have guessed, trigger computer guesses
      this.triggerComputerGuesses(gameId, currentRound.id);
    }

    return {
      success: true,
      guess,
      roundId: currentRound.id,
    };
  }

  private triggerComputerGuesses(gameId: string, roundId: string) {
    const game = this.db.getGameById(gameId);
    if (!game) return;

    const currentRound = game.rounds.find((r) => r.id === roundId);
    if (!currentRound || currentRound.completed) return;

    const computerPlayers = game.players.filter((p) => p.isComputer);

    console.log(
      `🤖 Triggering guesses for ${computerPlayers.length} computer players`,
    );

    for (const computer of computerPlayers) {
      // Check if computer hasn't guessed yet
      if (!currentRound.guesses.some((g) => g.playerId === computer.id)) {
        const computerGuessPos = generateComputerGuess(
          currentRound.city,
          computer.accuracy || 0.5,
        );
        const distance = calculateDistance(
          computerGuessPos.lat,
          computerGuessPos.lng,
          currentRound.city.lat,
          currentRound.city.lng,
        );
        const bonusPoints = calculateBonusPoints(distance);

        const guess: Guess = {
          playerId: computer.id,
          lat: computerGuessPos.lat,
          lng: computerGuessPos.lng,
          distance,
          placementPoints: 0,
          bonusPoints,
          totalPoints: bonusPoints,
          placement: 0,
          timestamp: Date.now(),
        };

        this.db.addGuess(roundId, guess);
        console.log(
          `🎯 Computer player ${computer.name} guessed (${distance.toFixed(0)}km away)`,
        );
      }
    }

    // Check if round should end (all players have guessed)
    const updatedGame = this.db.getGameById(gameId)!;
    const updatedRound = updatedGame.rounds.find((r) => r.id === roundId)!;

    if (updatedRound.guesses.length === game.players.length) {
      console.log(`🏁 All players have guessed - ending round ${roundId}`);
      this.endRound(gameId, roundId);
    }
  }

  private endRound(gameId: string, roundId: string) {
    const game = this.db.getGameById(gameId);
    if (!game) return;

    const round = game.rounds.find((r) => r.id === roundId);
    if (!round || round.completed) return;

    // Generate guesses for any computer players who haven't guessed yet
    const playersWhoGuessed = round.guesses.map((g) => g.playerId);
    const computerPlayersWhoNeedToGuess = game.players.filter(
      (p) => p.isComputer && !playersWhoGuessed.includes(p.id),
    );

    if (computerPlayersWhoNeedToGuess.length > 0) {
      console.log(
        `⏰ Timer expired - generating guesses for ${computerPlayersWhoNeedToGuess.length} computer players`,
      );

      for (const player of computerPlayersWhoNeedToGuess) {
        const computerGuessPos = generateComputerGuess(
          round.city,
          player.accuracy || 0.5,
        );
        const distance = calculateDistance(
          computerGuessPos.lat,
          computerGuessPos.lng,
          round.city.lat,
          round.city.lng,
        );
        const bonusPoints = calculateBonusPoints(distance);

        const guess: Guess = {
          playerId: player.id,
          lat: computerGuessPos.lat,
          lng: computerGuessPos.lng,
          distance,
          placementPoints: 0,
          bonusPoints,
          totalPoints: bonusPoints,
          placement: 0,
          timestamp: Date.now(),
        };

        this.db.addGuess(roundId, guess);
        round.guesses.push(guess);
        console.log(
          `⏰ Computer player ${player.name} auto-guessed (${distance.toFixed(0)}km away)`,
        );
      }
    }

    // Calculate placements and update scores
    const guessesWithDistance = round.guesses.map((g) => ({
      playerId: g.playerId,
      distance: g.distance,
    }));

    const placements = calculatePlacementPoints(
      guessesWithDistance,
      game.players.length,
    );

    // Update each guess with placement points
    for (const placement of placements) {
      const guess = round.guesses.find(
        (g) => g.playerId === placement.playerId,
      );
      if (guess) {
        guess.placementPoints = placement.placementPoints;
        guess.placement = placement.placement;
        guess.totalPoints = guess.bonusPoints + guess.placementPoints;

        // Update in database
        this.db.updateGuess(roundId, guess);
      }
    }

    // Mark round as completed
    this.db.completeRound(roundId);

    // Clear round timer
    this.clearRoundTimer(roundId);

    // Notify clients about round end via WebSocket
    if (this.wsServerInstance) {
      const updatedGame = this.db.getGameById(gameId);
      if (updatedGame) {
        // Ensure game is found before sending
        this.wsServerInstance.revealRoundResults(gameId, {
          game: updatedGame,
          round: round, // Ensure 'round' is the correct, updated round object
          completed: true,
        });
      } else {
        console.warn(
          `GameManager: Game ${gameId} not found after round end, cannot send WS update.`,
        );
      }
    } else {
      console.warn(
        "GameManager: WebSocket server instance not set. Cannot send ROUND_RESULTS.",
      );
    }

    console.log(`🏁 Round ${roundId} completed for game ${gameId}`);
  }

  nextRound(gameId: string, playerId: string): GameResult {
    const game = this.db.getGameById(gameId);

    if (!game) {
      return { success: false, error: "Game not found" };
    }

    if (game.hostId !== playerId) {
      return {
        success: false,
        error: "Only the host can start the next round",
      };
    }

    if (game.status !== "playing") {
      return { success: false, error: "Game is not in progress" };
    }

    const completedRounds = game.rounds.filter((r) => r.completed);

    if (completedRounds.length >= game.settings.totalRounds) {
      // Game is finished
      return this.finishGame(gameId);
    }

    // Start next round
    const usedCityIds = game.rounds.map((r) => r.city.id);
    const nextRound = this.createNewRound(
      gameId,
      game.settings.cityDifficulty,
      usedCityIds,
    );

    // Start round timer
    this.startRoundTimer(gameId, nextRound.id, game.settings.roundTimeLimit);

    const updatedGame = this.db.getGameById(gameId)!;

    return {
      success: true,
      game: updatedGame,
      currentRound: nextRound,
    };
  }

  private finishGame(gameId: string): GameResult {
    const game = this.db.getGameById(gameId);
    if (!game) {
      return { success: false, error: "Game not found" };
    }

    // Calculate final scores
    const playerScores = game.players.map((player) => {
      let totalScore = 0;

      game.rounds.forEach((round) => {
        const playerGuess = round.guesses.find((g) => g.playerId === player.id);
        if (playerGuess) {
          totalScore += playerGuess.totalPoints;
        }
      });

      return {
        playerId: player.id,
        playerName: player.name,
        isComputer: player.isComputer,
        totalScore,
        finalPlacement: 0,
      };
    });

    // Sort by score and assign final placements (handles ties)
    const sortedScores = calculateFinalPlacements(playerScores);

    // Find all players who tied for first place
    const winnerIds: string[] = [];
    if (sortedScores.length > 0) {
      const topScore = sortedScores[0].totalScore;
      winnerIds.push(
        ...sortedScores
          .filter((p) => p.totalScore === topScore)
          .map((p) => p.playerId),
      );
    }

    const finalResults: FinalResults = {
      playerScores: sortedScores,
      winnerId: sortedScores.length > 0 ? sortedScores[0].playerId : "",
      winnerIds,
      gameEndTime: Date.now(),
    };

    // Update game in database
    this.db.updateGameFinalResults(gameId, finalResults);

    const updatedGame = this.db.getGameById(gameId)!;

    return {
      success: true,
      game: updatedGame,
      gameFinished: true,
    };
  }

  updateSettings(
    gameId: string,
    playerId: string,
    settings: Partial<Game["settings"]>,
  ): GameResult {
    const game = this.db.getGameById(gameId);

    if (!game) {
      return { success: false, error: "Game not found" };
    }

    // Only the host can update settings
    if (game.hostId !== playerId) {
      return { success: false, error: "Only the host can update settings" };
    }

    // Only allow settings changes before the game starts
    if (game.status !== "waiting") {
      return {
        success: false,
        error: "Settings can only be changed before the game starts",
      };
    }

    // Update the settings
    const updatedSettings = {
      ...game.settings,
      ...settings,
    };

    // Update in database
    this.db.updateGameSettings(gameId, updatedSettings);

    // Get the updated game
    const updatedGame = this.db.getGameById(gameId);

    return {
      success: true,
      game: updatedGame!,
    };
  }

  removePlayer(gameId: string, playerId: string): GameResult {
    const game = this.db.getGameById(gameId);

    if (!game) {
      return { success: false, error: "Game not found" };
    }

    this.db.removePlayer(gameId, playerId);

    // If host left and game hasn't started, assign new host
    if (game.hostId === playerId && game.status === "waiting") {
      const remainingPlayers = game.players.filter(
        (p) => p.id !== playerId && !p.isComputer,
      );
      if (remainingPlayers.length > 0) {
        // TODO: Assign new host (first human player)
        // const newHost = remainingPlayers[0];
        // Update host in database
        this.db.updateGameStatus(gameId, "waiting"); // This doesn't actually change the host, we'd need a separate method
      }
    }

    return { success: true };
  }

  private createNewRound(
    gameId: string,
    difficulty:
      | "easy"
      | "medium"
      | "hard"
      | "brazilian_capitals"
      | "us_capitals",
    usedCityIds: string[],
  ): GameRound {
    const city = getRandomCityByDifficulty(difficulty, usedCityIds);

    const round: GameRound = {
      id: uuidv4(),
      city,
      guesses: [],
      completed: false,
      startTime: Date.now(),
    };

    this.db.createRound(gameId, round);

    return round;
  }

  private startRoundTimer(gameId: string, roundId: string, timeLimit: number) {
    const timer = setTimeout(() => {
      this.endRound(gameId, roundId);
    }, timeLimit);

    this.activeTimers.set(roundId, timer);
  }

  private clearRoundTimer(roundId: string) {
    const timer = this.activeTimers.get(roundId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(roundId);
    }
  }

  // Cleanup method
  cleanup() {
    // Clear all active timers
    this.activeTimers.forEach((timer) => clearTimeout(timer));
    this.activeTimers.clear();
  }
}
