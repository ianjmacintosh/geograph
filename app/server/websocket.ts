import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database.js';
import { GameManager } from './game-manager.js';
import type { Game, Player } from '../types/game.js';

export interface WebSocketMessage {
  type: string;
  payload?: any;
  gameId?: string;
  playerId?: string;
}

export interface AuthenticatedWebSocket extends WebSocket {
  gameId?: string;
  playerId?: string;
  playerName?: string;
  isAlive?: boolean;
}

export class GameWebSocketServer {
  private wss: WebSocketServer;
  private gameManager: GameManager;
  private db = getDatabase();

  constructor(port?: number, existingWss?: WebSocketServer) {
    if (existingWss) {
      this.wss = existingWss;
    } else {
      this.wss = new WebSocketServer({ 
        port: port || 8080,
        host: '0.0.0.0'  // Bind to all interfaces for Railway
      });
    }
    this.gameManager = new GameManager();
    this.gameManager.setWebSocketServer(this); // Inject this WS server instance into GameManager
    this.setupServer();
    
    if (!existingWss) {
      console.log(`🎮 WebSocket server running on port ${port || 8080} (all interfaces)`);
    }
  }

  private setupServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
      console.log('📱 New WebSocket connection');
      
      ws.isAlive = true;
      
      // Parse connection URL for initial game/player info
      const url = parse(request.url || '', true);
      const gameCode = url.query.gameCode as string;
      const playerId = url.query.playerId as string;
      
      if (gameCode && playerId) {
        this.handlePlayerReconnection(ws, gameCode, playerId);
      }

      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        console.log('📱 WebSocket connection closed');
        if (ws.gameId && ws.playerId) {
          this.handlePlayerDisconnection(ws.gameId, ws.playerId);
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });
    });

    // Setup heartbeat to detect dead connections
    setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Check every 30 seconds
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    console.log(`📩 Received message: ${message.type}`, message.payload);

    switch (message.type) {
      case 'CREATE_GAME':
        this.handleCreateGame(ws, message.payload);
        break;
        
      case 'JOIN_GAME':
        this.handleJoinGame(ws, message.payload);
        break;
        
      case 'START_GAME':
        this.handleStartGame(ws);
        break;
        
      case 'ADD_COMPUTER_PLAYERS':
        this.handleAddComputerPlayers(ws, message.payload);
        break;
        
      case 'MAKE_GUESS':
        this.handleMakeGuess(ws, message.payload);
        break;
        
      case 'NEXT_ROUND':
        this.handleNextRound(ws);
        break;
        
      case 'LEAVE_GAME':
        this.handleLeaveGame(ws);
        break;
        
      case 'UPDATE_SETTINGS':
        this.handleUpdateSettings(ws, message.payload);
        break;
        
      default:
        console.warn(`⚠️ Unknown message type: ${message.type}`);
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private handleCreateGame(ws: AuthenticatedWebSocket, payload: { playerName: string }) {
    try {
      const game = this.gameManager.createGame(payload.playerName);
      
      // Set connection info
      ws.gameId = game.id;
      ws.playerId = game.hostId;
      ws.playerName = payload.playerName;
      
      this.sendMessage(ws, 'GAME_CREATED', {
        game,
        playerId: game.hostId
      });
      
      console.log(`🎮 Game created: ${game.code} by ${payload.playerName}`);
    } catch (error) {
      console.error('❌ Error creating game:', error);
      this.sendError(ws, 'Failed to create game');
    }
  }

  private handleJoinGame(ws: AuthenticatedWebSocket, payload: { gameCode: string; playerName: string }) {
    try {
      const result = this.gameManager.joinGame(payload.gameCode, payload.playerName);
      
      if (!result.success) {
        return this.sendError(ws, result.error || 'Failed to join game');
      }
      
      const { game, player } = result;
      
      if (!game || !player) {
        return this.sendError(ws, 'Failed to join game - invalid result');
      }
      
      // Set connection info
      ws.gameId = game.id;
      ws.playerId = player.id;
      ws.playerName = payload.playerName;
      
      this.sendMessage(ws, 'GAME_JOINED', {
        game,
        playerId: player.id
      });
      
      // Notify all players in the game about the new player
      this.broadcastToGame(game.id, 'PLAYER_JOINED', { 
        player,
        game: this.db.getGameById(game.id)
      });
      
      console.log(`👋 ${payload.playerName} joined game ${payload.gameCode}`);
    } catch (error) {
      console.error('❌ Error joining game:', error);
      this.sendError(ws, 'Failed to join game');
    }
  }

  private handleStartGame(ws: AuthenticatedWebSocket) {
    if (!ws.gameId) {
      return this.sendError(ws, 'Not in a game');
    }
    
    try {
      const result = this.gameManager.startGame(ws.gameId, ws.playerId!);
      
      if (!result.success) {
        return this.sendError(ws, result.error || 'Failed to start game');
      }
      
      // Broadcast game start to all players
      this.broadcastToGame(ws.gameId, 'GAME_STARTED', {
        game: result.game,
        currentRound: result.currentRound
      });
      
      console.log(`🎯 Game ${ws.gameId} started`);
    } catch (error) {
      console.error('❌ Error starting game:', error);
      this.sendError(ws, 'Failed to start game');
    }
  }

  private handleAddComputerPlayers(ws: AuthenticatedWebSocket, payload: { count: number }) {
    if (!ws.gameId) {
      return this.sendError(ws, 'Not in a game');
    }
    
    try {
      const result = this.gameManager.addComputerPlayers(ws.gameId, payload.count);
      
      if (!result.success) {
        return this.sendError(ws, result.error || 'Failed to add computer players');
      }
      
      // Broadcast updated game state
      this.broadcastToGame(ws.gameId, 'COMPUTER_PLAYERS_ADDED', {
        game: result.game
      });
      
      console.log(`🤖 Added ${payload.count} computer players to game ${ws.gameId}`);
    } catch (error) {
      console.error('❌ Error adding computer players:', error);
      this.sendError(ws, 'Failed to add computer players');
    }
  }

  private handleMakeGuess(ws: AuthenticatedWebSocket, payload: { lat: number; lng: number }) {
    if (!ws.gameId || !ws.playerId) {
      return this.sendError(ws, 'Not in a game');
    }
    
    try {
      const result = this.gameManager.makeGuess(ws.gameId, ws.playerId, payload.lat, payload.lng);
      
      if (!result.success) {
        return this.sendError(ws, result.error || 'Failed to make guess');
      }
      
      // Send confirmation to the player
      this.sendMessage(ws, 'GUESS_MADE', {
        guess: result.guess
      });
      
      // Broadcast updated game state so UI can show the guess
      const updatedGame = this.db.getGameById(ws.gameId);
      this.broadcastToGame(ws.gameId, 'PLAYER_GUESSED', {
        playerId: ws.playerId,
        playerName: ws.playerName,
        roundId: result.roundId,
        game: updatedGame
      });
      
      console.log(`🎯 ${ws.playerName} made a guess in game ${ws.gameId}`);
    } catch (error) {
      console.error('❌ Error making guess:', error);
      this.sendError(ws, 'Failed to make guess');
    }
  }

  private handleNextRound(ws: AuthenticatedWebSocket) {
    if (!ws.gameId || !ws.playerId) {
      return this.sendError(ws, 'Not in a game');
    }
    
    try {
      const result = this.gameManager.nextRound(ws.gameId, ws.playerId);
      
      if (!result.success) {
        return this.sendError(ws, result.error || 'Failed to proceed to next round');
      }
      
      if (result.gameFinished) {
        // Game is over
        this.broadcastToGame(ws.gameId, 'GAME_FINISHED', {
          game: result.game,
          finalResults: result.game?.finalResults
        });
      } else {
        // New round started
        this.broadcastToGame(ws.gameId, 'ROUND_STARTED', {
          game: result.game,
          currentRound: result.currentRound
        });
      }
      
      console.log(`➡️ Next round triggered for game ${ws.gameId}`);
    } catch (error) {
      console.error('❌ Error proceeding to next round:', error);
      this.sendError(ws, 'Failed to proceed to next round');
    }
  }

  private handleLeaveGame(ws: AuthenticatedWebSocket) {
    if (!ws.gameId || !ws.playerId) {
      return this.sendError(ws, 'Not in a game');
    }
    
    try {
      this.gameManager.removePlayer(ws.gameId, ws.playerId);
      
      // Notify other players
      this.broadcastToGame(ws.gameId, 'PLAYER_LEFT', {
        playerId: ws.playerId,
        playerName: ws.playerName
      }, [ws.playerId]); // Exclude the leaving player
      
      // Clear connection info
      ws.gameId = undefined;
      ws.playerId = undefined;
      ws.playerName = undefined;
      
      this.sendMessage(ws, 'LEFT_GAME', {});
      
      console.log(`👋 Player left game`);
    } catch (error) {
      console.error('❌ Error leaving game:', error);
      this.sendError(ws, 'Failed to leave game');
    }
  }

  private handleUpdateSettings(ws: AuthenticatedWebSocket, payload: { settings: any }) {
    if (!ws.gameId || !ws.playerId) {
      return this.sendError(ws, 'Not in a game');
    }

    try {
      const result = this.gameManager.updateSettings(ws.gameId, ws.playerId, payload.settings);
      
      if (!result.success) {
        return this.sendError(ws, result.error || 'Failed to update settings');
      }
      
      // Broadcast the updated game state to all players in the game
      this.broadcastToGame(ws.gameId, 'SETTINGS_UPDATED', {
        game: result.game
      });
      
      console.log(`⚙️ Settings updated for game ${ws.gameId}`);
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      this.sendError(ws, 'Failed to update settings');
    }
  }

  private handlePlayerReconnection(ws: AuthenticatedWebSocket, gameCode: string, playerId: string) {
    try {
      const game = this.db.getGameByCode(gameCode);
      
      if (!game) {
        return this.sendError(ws, 'Game not found');
      }
      
      const player = game.players.find(p => p.id === playerId);
      
      if (!player) {
        return this.sendError(ws, 'Player not found in game');
      }
      
      // Restore connection info
      ws.gameId = game.id;
      ws.playerId = playerId;
      ws.playerName = player.name;
      
      this.sendMessage(ws, 'RECONNECTED', {
        game,
        playerId
      });
      
      console.log(`🔄 ${player.name} reconnected to game ${gameCode}`);
    } catch (error) {
      console.error('❌ Error handling reconnection:', error);
      this.sendError(ws, 'Reconnection failed');
    }
  }

  private handlePlayerDisconnection(gameId: string, playerId: string) {
    // For now, just log the disconnection
    // In a production app, you might want to:
    // - Set a timeout to remove the player if they don't reconnect
    // - Pause the game if it's the host
    // - Handle graceful degradation
    
    console.log(`📱 Player ${playerId} disconnected from game ${gameId}`);
    
    // Notify other players about the disconnection
    this.broadcastToGame(gameId, 'PLAYER_DISCONNECTED', {
      playerId
    }, [playerId]);
  }

  private sendMessage(ws: WebSocket, type: string, payload?: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  private sendError(ws: WebSocket, message: string) {
    this.sendMessage(ws, 'ERROR', { message });
  }

  private broadcastToGame(gameId: string, type: string, payload?: any, excludePlayerIds: string[] = []) {
    this.wss.clients.forEach((client: AuthenticatedWebSocket) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.gameId === gameId &&
        (!client.playerId || !excludePlayerIds.includes(client.playerId))
      ) {
        this.sendMessage(client, type, payload);
      }
    });
  }

  // Method to trigger computer guesses (called by game manager)
  public triggerComputerGuesses(gameId: string, roundId: string) {
    // This will be called by the game manager when it's time for computer players to guess
    this.broadcastToGame(gameId, 'COMPUTER_GUESSING', { roundId });
  }

  // Method to reveal round results (called by game manager)
  public revealRoundResults(gameId: string, roundData: any) {
    this.broadcastToGame(gameId, 'ROUND_RESULTS', roundData);
  }

  public close() {
    this.wss.close();
  }
}

// Singleton instance
let wsInstance: GameWebSocketServer | null = null;

export function getWebSocketServer(port?: number): GameWebSocketServer {
  if (!wsInstance) {
    wsInstance = new GameWebSocketServer(port);
  }
  return wsInstance;
}