import { v4 as uuidv4 } from "uuid";
import Game from "../models/Game.js";
import Player from "../models/Player.js";
import Leg from "../models/Leg.js";
import Turn from "../models/Turn.js";
import StatsService from "./statsService.js";
import {
  getStartingScore,
  calculateDartValue,
  isBust,
  isWin,
  formatDart,
  hasWonMatch,
} from "../utils/gameLogic.js";
import {
  isValidGameType,
  isValidBestOf,
  validatePlayerNames,
  validateDartThrow,
} from "../utils/validators.js";

export const GameService = {
  // Create new game
  createGame: async (type, bestOf, playerNames) => {
    // Validate input
    if (!isValidGameType(type)) {
      throw new Error("Invalid game type. Must be 301 or 501");
    }

    if (!isValidBestOf(bestOf)) {
      throw new Error("Invalid best of. Must be 3, 5, or 7");
    }

    const validation = validatePlayerNames(playerNames);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create game
    const adminToken = uuidv4();
    const gameId = await Game.create(type, bestOf, adminToken);

    // Create players
    for (let i = 0; i < playerNames.length; i++) {
      await Player.create(gameId, playerNames[i], i);
    }

    // Create first leg
    await Leg.create(gameId, 1);

    return {
      gameId,
      adminToken,
    };
  },

  // Get full game state
  getGameState: async (gameId) => {
    const game = await Game.getById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const players = await Player.getByGameId(gameId);
    const currentLeg = await Leg.getCurrentLeg(gameId);

    if (!currentLeg) {
      throw new Error("No active leg found");
    }

    // Get current scores for each player
    const playerStates = [];
    for (const player of players) {
      const currentScore = await GameService.getPlayerCurrentScore(
        currentLeg.id,
        player.id,
        game.type
      );
      const stats = await StatsService.getPlayerStats(
        gameId,
        currentLeg.id,
        player.id,
        currentScore
      );

      playerStates.push({
        id: player.id,
        name: player.player_name,
        order: player.player_order,
        legsWon: player.legs_won,
        ...stats,
      });
    }

    // Get current player turn
    const currentPlayerIndex = await GameService.getCurrentPlayerIndex(
      currentLeg.id,
      players
    );

    // Get current turn (incomplete darts)
    const currentTurn = await GameService.getCurrentTurnDarts(
      currentLeg.id,
      players[currentPlayerIndex].id
    );

    return {
      id: game.id,
      type: game.type,
      bestOf: game.best_of,
      status: game.status,
      createdAt: game.created_at,
      finishedAt: game.finished_at,
      currentLeg: currentLeg.leg_number,
      currentPlayer: currentPlayerIndex,
      players: playerStates,
      currentTurn,
      turnNumber: await GameService.getTurnNumber(currentLeg.id),
    };
  },

  // Get player's current score in leg
  getPlayerCurrentScore: async (legId, playerId, gameType) => {
    const turns = await Turn.getByLegId(legId);
    const startingScore = getStartingScore(gameType);

    let score = startingScore;

    for (const turn of turns) {
      if (turn.player_id === playerId && !turn.is_bust) {
        score = turn.remaining_after;
      }
    }

    return score;
  },

  // Get current player index (whose turn it is)
  getCurrentPlayerIndex: async (legId, players) => {
    const turns = await Turn.getByLegId(legId);

    // Count completed turns (total_score is set when turn is complete)
    const completedTurns = turns.filter((t) => t.total_score !== null);

    return completedTurns.length % players.length;
  },

  // Get current turn's darts (incomplete turn)
  getCurrentTurnDarts: async (legId, playerId) => {
    const lastTurn = await Turn.getLastTurn(legId);

    if (!lastTurn || lastTurn.player_id !== playerId) {
      return [];
    }

    // Check if turn is incomplete
    if (lastTurn.dart3_score !== null) {
      return [];
    }

    const darts = [];
    if (lastTurn.dart1_score !== null) {
      darts.push({
        score: lastTurn.dart1_score === -1 ? null : lastTurn.dart1_score,
        multiplier: lastTurn.dart1_multiplier,
      });
    }
    if (lastTurn.dart2_score !== null) {
      darts.push({
        score: lastTurn.dart2_score === -1 ? null : lastTurn.dart2_score,
        multiplier: lastTurn.dart2_multiplier,
      });
    }

    return darts;
  },

  // Get turn number
  getTurnNumber: async (legId) => {
    const turns = await Turn.getByLegId(legId);
    return turns.length + 1;
  },

  // Add dart to current turn
  addDart: async (gameId, score, multiplier) => {
    const game = await Game.getById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.status !== "active") {
      throw new Error("Game is not active");
    }

    // Convert MISS (null) to -1 for database storage
    const dbScore = score === null ? -1 : score;
    const dbMultiplier = score === null ? 0 : multiplier;

    // Validate dart
    const validation = validateDartThrow(score, multiplier);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const currentLeg = await Leg.getCurrentLeg(gameId);
    const players = await Player.getByGameId(gameId);
    const currentPlayerIndex = await GameService.getCurrentPlayerIndex(
      currentLeg.id,
      players
    );
    const currentPlayer = players[currentPlayerIndex];

    // Get or create current turn
    let currentTurn = await Turn.getLastTurn(currentLeg.id);

    const needsNewTurn =
      !currentTurn ||
      currentTurn.player_id !== currentPlayer.id ||
      currentTurn.total_score !== null;

    if (needsNewTurn) {
      const turnNumber = await GameService.getTurnNumber(currentLeg.id);
      const remainingBefore = await GameService.getPlayerCurrentScore(
        currentLeg.id,
        currentPlayer.id,
        game.type
      );
      const turnId = await Turn.create(
        currentLeg.id,
        currentPlayer.id,
        turnNumber,
        remainingBefore
      );
      currentTurn = await Turn.getById(turnId);
    }

    // Determine which dart to update
    let dartNumber;
    if (currentTurn.dart1_score === null) {
      dartNumber = 1;
    } else if (currentTurn.dart2_score === null) {
      dartNumber = 2;
    } else if (currentTurn.dart3_score === null) {
      dartNumber = 3;
    } else {
      throw new Error("Turn is already complete");
    }

    // Update dart with converted score (-1 for MISS, original value otherwise)
    await Turn.updateDart(currentTurn.id, dartNumber, dbScore, dbMultiplier);
    currentTurn = await Turn.getById(currentTurn.id);

    // Calculate current total and remaining score after this dart
    const darts = [
      {
        score: currentTurn.dart1_score,
        multiplier: currentTurn.dart1_multiplier,
      },
      {
        score: currentTurn.dart2_score,
        multiplier: currentTurn.dart2_multiplier,
      },
      {
        score: currentTurn.dart3_score,
        multiplier: currentTurn.dart3_multiplier,
      },
    ];

    let totalScore = 0;
    for (const dart of darts) {
      // Treat -1 (MISS) as 0 points, skip null (not thrown yet)
      if (dart.score !== null && dart.score !== -1) {
        totalScore += calculateDartValue(dart.score, dart.multiplier);
      }
    }

    const currentRemaining = currentTurn.remaining_before - totalScore;

    // Update remaining_after for incomplete turn
    await Turn.updateRemainingAfter(currentTurn.id, currentRemaining);

    // Check for bust immediately
    if (currentRemaining < 0) {
      // Complete turn as bust
      await Turn.complete(
        currentTurn.id,
        0,
        currentTurn.remaining_before,
        true
      );
      return await GameService.getGameState(gameId);
    }

    // Check for win immediately (must finish on double for 501 games)
    if (currentRemaining === 0) {
      // For 501 games, must finish with a double; for 301, any finish is valid
      const isValidFinish = (game.type === 501 && multiplier === 2) || game.type === 301;
      
      if (isValidFinish) {
        // Complete turn and finish leg
        await Turn.complete(currentTurn.id, totalScore, 0, false);
        await GameService.finishLeg(gameId, currentLeg.id, currentPlayer.id);
        return await GameService.getGameState(gameId);
      } else {
        // Not a valid finish (didn't hit double in 501) - it's a bust
        await Turn.complete(
          currentTurn.id,
          0,
          currentTurn.remaining_before,
          true
        );
        return await GameService.getGameState(gameId);
      }
    }

    // Check if turn is complete (3 darts thrown) and not already completed by bust/win
    if (dartNumber === 3) {
      // Refresh turn data to check if it was already completed
      const updatedTurn = await Turn.getById(currentTurn.id);
      if (updatedTurn.total_score === null) {
        await GameService.completeTurn(gameId, currentTurn.id);
      }
    }

    return await GameService.getGameState(gameId);
  },

  // Complete turn and check for bust/win
  completeTurn: async (gameId, turnId) => {
    const turn = await Turn.getById(turnId);
    const game = await Game.getById(gameId);

    // Calculate total score
    const darts = [
      { score: turn.dart1_score, multiplier: turn.dart1_multiplier },
      { score: turn.dart2_score, multiplier: turn.dart2_multiplier },
      { score: turn.dart3_score, multiplier: turn.dart3_multiplier },
    ];

    let totalScore = 0;
    for (const dart of darts) {
      // Treat -1 (MISS) as 0 points, skip null (not thrown yet)
      if (dart.score !== null && dart.score !== -1) {
        totalScore += calculateDartValue(dart.score, dart.multiplier);
      }
    }

    const remainingAfter = turn.remaining_before - totalScore;

    // Check for bust
    if (remainingAfter < 0) {
      await Turn.complete(turnId, 0, turn.remaining_before, true);
      return { bust: true, win: false };
    }

    // Check for win (must finish on double for 501 games)
    if (remainingAfter === 0) {
      // Find the last dart thrown to check if it's a double
      let lastDartMultiplier = null;
      if (turn.dart3_score !== null) {
        lastDartMultiplier = turn.dart3_multiplier;
      } else if (turn.dart2_score !== null) {
        lastDartMultiplier = turn.dart2_multiplier;
      } else if (turn.dart1_score !== null) {
        lastDartMultiplier = turn.dart1_multiplier;
      }
      
      // For 501 games, must finish with a double; for 301, any finish is valid
      const isValidFinish = (game.type === 501 && lastDartMultiplier === 2) || game.type === 301;
      
      if (isValidFinish) {
        await Turn.complete(turnId, totalScore, 0, false);
        await GameService.finishLeg(gameId, turn.leg_id, turn.player_id);
        return { bust: false, win: true };
      } else {
        // Not a valid finish (didn't hit double in 501) - it's a bust
        await Turn.complete(turnId, 0, turn.remaining_before, true);
        return { bust: true, win: false };
      }
    }

    // Normal turn completion
    await Turn.complete(turnId, totalScore, remainingAfter, false);
    return { bust: false, win: false };
  },

  // Finish leg
  finishLeg: async (gameId, legId, winnerId) => {
    await Leg.finish(legId, winnerId);
    await Player.incrementLegsWon(winnerId);

    const game = await Game.getById(gameId);
    const winner = await Player.getById(winnerId);

    // Check if match is won
    if (hasWonMatch(winner.legs_won, game.best_of)) {
      await Game.updateStatus(gameId, "finished", new Date().toISOString());
      return { matchWon: true, winnerId };
    }

    // Start new leg
    const legs = await Leg.getByGameId(gameId);
    const newLegNumber = legs.length + 1;
    await Leg.create(gameId, newLegNumber);

    return { matchWon: false, winnerId, newLegNumber };
  },

  // Undo last dart
  undoLastDart: async (gameId) => {
    const game = await Game.getById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const currentLeg = await Leg.getCurrentLeg(gameId);
    const lastTurn = await Turn.getLastTurn(currentLeg.id);

    if (!lastTurn) {
      throw new Error("No turns to undo");
    }

    // Determine which dart to remove
    if (lastTurn.dart3_score !== null) {
      await Turn.updateDart(lastTurn.id, 3, null, null);
    } else if (lastTurn.dart2_score !== null) {
      await Turn.updateDart(lastTurn.id, 2, null, null);
    } else if (lastTurn.dart1_score !== null) {
      await Turn.updateDart(lastTurn.id, 1, null, null);
      // If first dart is removed, delete the turn
      await Turn.delete(lastTurn.id);
    }

    return await GameService.getGameState(gameId);
  },

  // End game prematurely
  endGame: async (gameId) => {
    await Game.updateStatus(gameId, "abandoned", new Date().toISOString());
  },

  // Get turn history for current leg
  getTurnHistory: async (gameId) => {
    const game = await Game.getById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const currentLeg = await Leg.getCurrentLeg(gameId);
    if (!currentLeg) {
      throw new Error("No active leg found");
    }

    const players = await Player.getByGameId(gameId);
    const turns = await Turn.getByLegId(currentLeg.id);

    // Map turns to history entries with player info
    const history = turns.map((turn) => {
      const player = players.find((p) => p.id === turn.player_id);

      const darts = [];
      
      // Add darts that were actually thrown (not null in database)
      if (turn.dart1_score !== null) {
        darts.push({
          score: turn.dart1_score === -1 ? null : turn.dart1_score,
          multiplier: turn.dart1_multiplier,
        });
      }
      if (turn.dart2_score !== null) {
        darts.push({
          score: turn.dart2_score === -1 ? null : turn.dart2_score,
          multiplier: turn.dart2_multiplier,
        });
      }
      if (turn.dart3_score !== null) {
        darts.push({
          score: turn.dart3_score === -1 ? null : turn.dart3_score,
          multiplier: turn.dart3_multiplier,
        });
      }

      return {
        turnNumber: turn.turn_number,
        playerId: player.id,
        playerName: player.player_name,
        darts,
        totalScore: turn.total_score,
        remainingBefore: turn.remaining_before,
        remainingAfter: turn.remaining_after,
        isBust: turn.is_bust === 1,
      };
    });

    return history;
  },
};

export default GameService;
