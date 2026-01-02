import express from 'express';
import AdminToken from '../models/AdminToken.js';
import { requireMainAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Generate new admin token (main admin only)
router.post('/games/:id/admin-token', requireMainAdmin, async (req, res) => {
  try {
    const gameId = req.params.id;
    const token = await AdminToken.create(gameId, req.adminToken);
    
    const baseUrl = process.env.FRONTEND_URL || 'https://frog03-11217.wykr.es';
    const link = `${baseUrl}/game.html?id=${gameId}&admin=${token}`;

    res.json({ token, link });
  } catch (error) {
    console.error('Error generating admin token:', error);
    res.status(400).json({ error: error.message });
  }
});

// Revoke admin token (main admin only)
router.delete('/games/:id/admin-token', requireMainAdmin, async (req, res) => {
  try {
    const { tokenToRevoke } = req.body;
    
    if (!tokenToRevoke) {
      return res.status(400).json({ error: 'tokenToRevoke is required' });
    }

    await AdminToken.revoke(tokenToRevoke);
    res.json({ success: true });
  } catch (error) {
    console.error('Error revoking admin token:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all admin tokens for game (main admin only)
router.get('/games/:id/admin-tokens', requireMainAdmin, async (req, res) => {
  try {
    const tokens = await AdminToken.getByGameId(req.params.id);
    res.json({
      count: tokens.length,
      tokens: tokens.map(t => ({
        token: t.token,
        createdAt: t.created_at
      }))
    });
  } catch (error) {
    console.error('Error getting admin tokens:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
