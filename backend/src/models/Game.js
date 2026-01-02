import { run, get, all } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const Game = {
  // Create new game
  create: async (type, bestOf, adminToken) => {
    const id = uuidv4();
    await run(
      `INSERT INTO games (id, type, best_of, admin_token, status) 
       VALUES (?, ?, ?, ?, 'active')`,
      [id, type, bestOf, adminToken]
    );
    return id;
  },

  // Get game by ID
  getById: async (id) => {
    return await get('SELECT * FROM games WHERE id = ?', [id]);
  },

  // Get all games with pagination
  getAll: async (status = null, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM games';
    let countQuery = 'SELECT COUNT(*) as total FROM games';
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      countQuery += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    const games = await all(query, [...params, limit, offset]);
    const { total } = await get(countQuery, params);
    
    return {
      games,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  },

  // Update game status
  updateStatus: async (id, status, finishedAt = null) => {
    if (finishedAt) {
      await run(
        'UPDATE games SET status = ?, finished_at = ? WHERE id = ?',
        [status, finishedAt, id]
      );
    } else {
      await run(
        'UPDATE games SET status = ? WHERE id = ?',
        [status, id]
      );
    }
  },

  // Delete game
  delete: async (id) => {
    await run('DELETE FROM games WHERE id = ?', [id]);
  }
};

export default Game;
