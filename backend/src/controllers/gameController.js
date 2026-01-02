import express from 'express';
import GameService from '../services/gameService.js';
import Game from '../models/Game.js';
import Player from '../models/Player.js';
import { requireAdmin, requireMainAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Create new game
router.post('/', async (req, res) => {
  try {
    const { type, bestOf, players } = req.body;

    if (!type || !bestOf || !players) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, bestOf, players' 
      });
    }

    const result = await GameService.createGame(type, bestOf, players);
    const baseUrl = process.env.FRONTEND_URL || 'https://frog03-11217.wykr.es';

    res.status(201).json({
      gameId: result.gameId,
      adminToken: result.adminToken,
      viewLink: `${baseUrl}/game.html?id=${result.gameId}`,
      adminLink: `${baseUrl}/game.html?id=${result.gameId}&admin=${result.adminToken}`
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get games list
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const result = await Game.getAll(
      status, 
      parseInt(page), 
      parseInt(limit)
    );

    // Enhance games with player info
    const enhancedGames = await Promise.all(
      result.games.map(async (game) => {
        const players = await Player.getByGameId(game.id);
        const playerNames = players.map(p => p.player_name);
        
        // Calculate current score (legs won)
        const scores = players.map(p => p.legs_won);
        const currentScore = scores.join('-');

        return {
          id: game.id,
          type: game.type,
          bestOf: game.best_of,
          status: game.status,
          players: playerNames,
          currentScore,
          createdAt: game.created_at,
          finishedAt: game.finished_at
        };
      })
    );

    res.json({
      games: enhancedGames,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.error('Error getting games:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get game details
router.get('/:id', async (req, res) => {
  try {
    const gameState = await GameService.getGameState(req.params.id);
    res.json(gameState);
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(404).json({ error: error.message });
  }
});

// End game (admin only)
router.post('/:id/end', requireAdmin, async (req, res) => {
  try {
    await GameService.endGame(req.params.id);
    const gameState = await GameService.getGameState(req.params.id);
    
    res.json({
      success: true,
      finalScores: gameState.players.reduce((acc, p) => {
        acc[p.name] = p.legsWon;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(400).json({ error: error.message });
  }
});

// Verify admin token
router.get('/:id/verify-admin', async (req, res) => {
  try {
    const { token } = req.query;
    const game = await Game.getById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const isMainAdmin = game.admin_token === token;
    
    // Check additional admin tokens
    const { verifyAdminToken } = await import('../middleware/adminAuth.js');
    const { valid } = await verifyAdminToken(req.params.id, token);

    res.json({
      valid,
      isMainAdmin
    });
  } catch (error) {
    console.error('Error verifying admin:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
