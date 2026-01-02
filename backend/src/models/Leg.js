import { run, get, all } from '../config/database.js';

export const Leg = {
  // Create new leg
  create: async (gameId, legNumber) => {
    const result = await run(
      'INSERT INTO legs (game_id, leg_number) VALUES (?, ?)',
      [gameId, legNumber]
    );
    return result.lastID;
  },

  // Get leg by ID
  getById: async (id) => {
    return await get('SELECT * FROM legs WHERE id = ?', [id]);
  },

  // Get current leg for game
  getCurrentLeg: async (gameId) => {
    return await get(
      'SELECT * FROM legs WHERE game_id = ? ORDER BY leg_number DESC LIMIT 1',
      [gameId]
    );
  },

  // Get all legs for game
  getByGameId: async (gameId) => {
    return await all(
      'SELECT * FROM legs WHERE game_id = ? ORDER BY leg_number',
      [gameId]
    );
  },

  // Finish leg
  finish: async (id, winnerId) => {
    await run(
      'UPDATE legs SET winner_id = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?',
      [winnerId, id]
    );
  }
};

export default Leg;
