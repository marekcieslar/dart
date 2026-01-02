import { run, get, all } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const AdminToken = {
  // Create new admin token
  create: async (gameId, createdBy) => {
    const token = uuidv4();
    await run(
      'INSERT INTO admin_tokens (game_id, token, created_by) VALUES (?, ?, ?)',
      [gameId, token, createdBy]
    );
    return token;
  },

  // Get token info
  getByToken: async (token) => {
    return await get(
      'SELECT * FROM admin_tokens WHERE token = ? AND revoked = 0',
      [token]
    );
  },

  // Get all tokens for game
  getByGameId: async (gameId) => {
    return await all(
      'SELECT * FROM admin_tokens WHERE game_id = ? AND revoked = 0 ORDER BY created_at',
      [gameId]
    );
  },

  // Revoke token
  revoke: async (token) => {
    await run(
      'UPDATE admin_tokens SET revoked = 1 WHERE token = ?',
      [token]
    );
  },

  // Check if token is valid
  isValid: async (gameId, token) => {
    const result = await get(
      'SELECT COUNT(*) as count FROM admin_tokens WHERE game_id = ? AND token = ? AND revoked = 0',
      [gameId, token]
    );
    return result.count > 0;
  }
};

export default AdminToken;
