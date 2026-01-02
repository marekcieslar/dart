import { run, get, all } from "../config/database.js";

export const Player = {
  // Create player
  create: async (gameId, name, order) => {
    const result = await run(
      "INSERT INTO game_players (game_id, player_name, player_order, legs_won) VALUES (?, ?, ?, 0)",
      [gameId, name, order]
    );
    return result.lastID;
  },

  // Get player by ID
  getById: async (id) => {
    return await get("SELECT * FROM game_players WHERE id = ?", [id]);
  },

  // Get all players for a game
  getByGameId: async (gameId) => {
    return await all(
      "SELECT * FROM game_players WHERE game_id = ? ORDER BY player_order",
      [gameId]
    );
  },

  // Update legs won
  updateLegsWon: async (id, legsWon) => {
    await run("UPDATE game_players SET legs_won = ? WHERE id = ?", [
      legsWon,
      id,
    ]);
  },

  // Increment legs won
  incrementLegsWon: async (id) => {
    await run("UPDATE game_players SET legs_won = legs_won + 1 WHERE id = ?", [
      id,
    ]);
  },
};

export default Player;
