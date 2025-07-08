import Database from 'better-sqlite3';
import { join } from 'path';
import type { Game, Player, GameRound, Guess } from '../types/game';

const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'geograph.db');

export class GameDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.init();
  }

  private init() {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        host_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('waiting', 'playing', 'finished')),
        settings TEXT NOT NULL, -- JSON
        final_results TEXT, -- JSON
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        name TEXT NOT NULL,
        is_computer BOOLEAN NOT NULL DEFAULT 0,
        score INTEGER NOT NULL DEFAULT 0,
        accuracy REAL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        city_id TEXT NOT NULL,
        city_data TEXT NOT NULL, -- JSON
        completed BOOLEAN NOT NULL DEFAULT 0,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        round_number INTEGER NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS guesses (
        id TEXT PRIMARY KEY,
        round_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        distance REAL NOT NULL,
        placement_points INTEGER NOT NULL DEFAULT 0,
        bonus_points INTEGER NOT NULL DEFAULT 0,
        total_points INTEGER NOT NULL DEFAULT 0,
        placement INTEGER NOT NULL DEFAULT 0,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (round_id) REFERENCES rounds (id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
        UNIQUE (round_id, player_id)
      );

      CREATE INDEX IF NOT EXISTS idx_games_code ON games (code);
      CREATE INDEX IF NOT EXISTS idx_players_game_id ON players (game_id);
      CREATE INDEX IF NOT EXISTS idx_rounds_game_id ON rounds (game_id);
      CREATE INDEX IF NOT EXISTS idx_guesses_round_id ON guesses (round_id);
      CREATE INDEX IF NOT EXISTS idx_guesses_player_id ON guesses (player_id);
    `);
  }

  // Game operations
  createGame(game: Game): void {
    const stmt = this.db.prepare(`
      INSERT INTO games (id, code, host_id, status, settings, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      game.id,
      game.code,
      game.hostId,
      game.status,
      JSON.stringify(game.settings),
      game.createdAt
    );

    // Add host player
    this.addPlayer(game.id, game.players[0]);
  }

  getGameByCode(code: string): Game | null {
    const stmt = this.db.prepare(`
      SELECT * FROM games WHERE code = ?
    `);
    
    const row = stmt.get(code) as any;
    if (!row) return null;

    return this.buildGameFromRow(row);
  }

  getGameById(id: string): Game | null {
    const stmt = this.db.prepare(`
      SELECT * FROM games WHERE id = ?
    `);
    
    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.buildGameFromRow(row);
  }

  private buildGameFromRow(row: any): Game {
    const players = this.getPlayersForGame(row.id);
    const rounds = this.getRoundsForGame(row.id);

    return {
      id: row.id,
      code: row.code,
      hostId: row.host_id,
      players,
      rounds,
      status: row.status,
      settings: JSON.parse(row.settings),
      finalResults: row.final_results ? JSON.parse(row.final_results) : undefined,
      createdAt: row.created_at,
    };
  }

  updateGameStatus(gameId: string, status: Game['status']): void {
    const stmt = this.db.prepare(`
      UPDATE games SET status = ?, updated_at = ? WHERE id = ?
    `);
    
    stmt.run(status, Date.now(), gameId);
  }

  updateGameFinalResults(gameId: string, finalResults: any): void {
    const stmt = this.db.prepare(`
      UPDATE games SET final_results = ?, status = 'finished', updated_at = ? WHERE id = ?
    `);
    
    stmt.run(JSON.stringify(finalResults), Date.now(), gameId);
  }

  // Player operations
  addPlayer(gameId: string, player: Player): void {
    const stmt = this.db.prepare(`
      INSERT INTO players (id, game_id, name, is_computer, score, accuracy, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      player.id,
      gameId,
      player.name,
      player.isComputer ? 1 : 0,
      player.score,
      player.accuracy || null,
      Date.now()
    );
  }

  removePlayer(gameId: string, playerId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM players WHERE game_id = ? AND id = ?
    `);
    
    stmt.run(gameId, playerId);
  }

  getPlayersForGame(gameId: string): Player[] {
    const stmt = this.db.prepare(`
      SELECT * FROM players WHERE game_id = ? ORDER BY created_at ASC
    `);
    
    const rows = stmt.all(gameId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      isComputer: Boolean(row.is_computer),
      score: row.score,
      accuracy: row.accuracy,
    }));
  }

  // Round operations
  createRound(gameId: string, round: GameRound): void {
    const stmt = this.db.prepare(`
      INSERT INTO rounds (id, game_id, city_id, city_data, completed, start_time, round_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Get round number
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM rounds WHERE game_id = ?
    `);
    const roundNumber = (countStmt.get(gameId) as any).count + 1;
    
    stmt.run(
      round.id,
      gameId,
      round.city.id,
      JSON.stringify(round.city),
      round.completed ? 1 : 0,
      round.startTime,
      roundNumber
    );
  }

  completeRound(roundId: string): void {
    const stmt = this.db.prepare(`
      UPDATE rounds SET completed = 1, end_time = ? WHERE id = ?
    `);
    
    stmt.run(Date.now(), roundId);
  }

  getRoundsForGame(gameId: string): GameRound[] {
    const stmt = this.db.prepare(`
      SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number ASC
    `);
    
    const rows = stmt.all(gameId) as any[];
    
    return rows.map(row => {
      const guesses = this.getGuessesForRound(row.id);
      
      return {
        id: row.id,
        city: JSON.parse(row.city_data),
        guesses,
        completed: Boolean(row.completed),
        startTime: row.start_time,
        endTime: row.end_time,
      };
    });
  }

  // Guess operations
  addGuess(roundId: string, guess: Guess): void {
    const stmt = this.db.prepare(`
      INSERT INTO guesses (id, round_id, player_id, lat, lng, distance, placement_points, bonus_points, total_points, placement, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const id = `${roundId}-${guess.playerId}`;
    
    stmt.run(
      id,
      roundId,
      guess.playerId,
      guess.lat,
      guess.lng,
      guess.distance,
      guess.placementPoints,
      guess.bonusPoints,
      guess.totalPoints,
      guess.placement,
      guess.timestamp
    );
  }

  updateGuess(roundId: string, guess: Guess): void {
    const stmt = this.db.prepare(`
      UPDATE guesses 
      SET placement_points = ?, total_points = ?, placement = ?
      WHERE round_id = ? AND player_id = ?
    `);
    
    stmt.run(
      guess.placementPoints,
      guess.totalPoints,
      guess.placement,
      roundId,
      guess.playerId
    );
  }

  getGuessesForRound(roundId: string): Guess[] {
    const stmt = this.db.prepare(`
      SELECT * FROM guesses WHERE round_id = ? ORDER BY timestamp ASC
    `);
    
    const rows = stmt.all(roundId) as any[];
    
    return rows.map(row => ({
      playerId: row.player_id,
      lat: row.lat,
      lng: row.lng,
      distance: row.distance,
      placementPoints: row.placement_points,
      bonusPoints: row.bonus_points,
      totalPoints: row.total_points,
      placement: row.placement,
      timestamp: row.timestamp,
    }));
  }

  // Utility
  close(): void {
    this.db.close();
  }

  // Clean up old games (called periodically)
  cleanupOldGames(olderThanHours: number = 24): void {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    const stmt = this.db.prepare(`
      DELETE FROM games WHERE updated_at < ? AND status != 'playing'
    `);
    
    stmt.run(cutoff);
  }
}

// Singleton instance
let dbInstance: GameDatabase | null = null;

export function getDatabase(): GameDatabase {
  if (!dbInstance) {
    dbInstance = new GameDatabase();
  }
  return dbInstance;
}