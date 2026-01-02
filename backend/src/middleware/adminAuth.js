import { get } from '../config/database.js';

// Verify if token is a valid admin token for the game
export const verifyAdminToken = async (gameId, token) => {
  if (!gameId || !token) {
    return { valid: false, isMainAdmin: false };
  }

  try {
    // Check if it's the main admin token
    const game = await get(
      'SELECT admin_token FROM games WHERE id = ?',
      [gameId]
    );

    if (game && game.admin_token === token) {
      return { valid: true, isMainAdmin: true };
    }

    // Check if it's a valid additional admin token
    const adminToken = await get(
      'SELECT * FROM admin_tokens WHERE game_id = ? AND token = ? AND revoked = 0',
      [gameId, token]
    );

    if (adminToken) {
      return { valid: true, isMainAdmin: false };
    }

    return { valid: false, isMainAdmin: false };
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return { valid: false, isMainAdmin: false };
  }
};

// Middleware for Express routes
export const requireAdmin = async (req, res, next) => {
  const gameId = req.params.id;
  const token = req.body.adminToken || req.query.token;

  const { valid } = await verifyAdminToken(gameId, token);

  if (!valid) {
    return res.status(403).json({ error: 'Invalid or missing admin token' });
  }

  req.adminToken = token;
  next();
};

// Middleware requiring main admin only
export const requireMainAdmin = async (req, res, next) => {
  const gameId = req.params.id;
  const token = req.body.adminToken || req.query.token;

  const { valid, isMainAdmin } = await verifyAdminToken(gameId, token);

  if (!valid || !isMainAdmin) {
    return res.status(403).json({ error: 'Main admin token required' });
  }

  req.adminToken = token;
  next();
};
