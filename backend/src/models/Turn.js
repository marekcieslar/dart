import { run, get, all } from "../config/database.js";

export const Turn = {
  // Create new turn
  create: async (legId, playerId, turnNumber, remainingBefore) => {
    const result = await run(
      `INSERT INTO turns (leg_id, player_id, turn_number, remaining_before) 
       VALUES (?, ?, ?, ?)`,
      [legId, playerId, turnNumber, remainingBefore]
    );
    return result.lastID;
  },

  // Get turn by ID
  getById: async (id) => {
    return await get("SELECT * FROM turns WHERE id = ?", [id]);
  },

  // Get all turns for a leg
  getByLegId: async (legId) => {
    return await all(
      "SELECT * FROM turns WHERE leg_id = ? ORDER BY turn_number, created_at",
      [legId]
    );
  },

  // Get last turn for a leg
  getLastTurn: async (legId) => {
    return await get(
      "SELECT * FROM turns WHERE leg_id = ? ORDER BY id DESC LIMIT 1",
      [legId]
    );
  },

  // Update dart in turn
  updateDart: async (id, dartNumber, score, multiplier) => {
    const field = `dart${dartNumber}`;
    await run(
      `UPDATE turns SET ${field}_score = ?, ${field}_multiplier = ? WHERE id = ?`,
      [score, multiplier, id]
    );
  },

  // Update remaining after for incomplete turn
  updateRemainingAfter: async (id, remainingAfter) => {
    await run(`UPDATE turns SET remaining_after = ? WHERE id = ?`, [
      remainingAfter,
      id,
    ]);
  },

  // Complete turn
  complete: async (id, totalScore, remainingAfter, isBust) => {
    await run(
      `UPDATE turns SET total_score = ?, remaining_after = ?, is_bust = ? WHERE id = ?`,
      [totalScore, remainingAfter, isBust ? 1 : 0, id]
    );
  },

  // Delete turn (for undo)
  delete: async (id) => {
    await run("DELETE FROM turns WHERE id = ?", [id]);
  },
};

export default Turn;
