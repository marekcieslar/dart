import { all } from "../config/database.js";
import { calculateDartValue } from "../utils/validators.js";

export const StatsService = {
  // Calculate average for a player in current leg
  calculateLegAverage: async (legId, playerId) => {
    const turns = await all(
      "SELECT * FROM turns WHERE leg_id = ? AND player_id = ? AND is_bust = 0",
      [legId, playerId]
    );

    let totalPoints = 0;
    let totalDarts = 0;

    for (const turn of turns) {
      // Count darts thrown (non-null scores)
      const darts = [
        { score: turn.dart1_score, multiplier: turn.dart1_multiplier },
        { score: turn.dart2_score, multiplier: turn.dart2_multiplier },
        { score: turn.dart3_score, multiplier: turn.dart3_multiplier },
      ];

      for (const dart of darts) {
        // Count darts (skip null and -1 which is MISS)
        if (dart.score !== null && dart.score !== -1) {
          totalDarts++;
          totalPoints += calculateDartValue(dart.score, dart.multiplier);
        } else if (dart.score === -1) {
          // MISS counts as a dart thrown but adds 0 points
          totalDarts++;
        }
      }
    }

    return totalDarts > 0
      ? Math.round((totalPoints / totalDarts) * 100) / 100
      : 0;
  },

  // Calculate average for a player across all legs in game
  calculateMatchAverage: async (gameId, playerId) => {
    const turns = await all(
      `SELECT t.* FROM turns t
       JOIN legs l ON t.leg_id = l.id
       WHERE l.game_id = ? AND t.player_id = ? AND t.is_bust = 0`,
      [gameId, playerId]
    );

    let totalPoints = 0;
    let totalDarts = 0;

    for (const turn of turns) {
      const darts = [
        { score: turn.dart1_score, multiplier: turn.dart1_multiplier },
        { score: turn.dart2_score, multiplier: turn.dart2_multiplier },
        { score: turn.dart3_score, multiplier: turn.dart3_multiplier },
      ];

      for (const dart of darts) {
        // Count darts (skip null and -1 which is MISS)
        if (dart.score !== null && dart.score !== -1) {
          totalDarts++;
          totalPoints += calculateDartValue(dart.score, dart.multiplier);
        } else if (dart.score === -1) {
          // MISS counts as a dart thrown but adds 0 points
          totalDarts++;
        }
      }
    }

    return totalDarts > 0
      ? Math.round((totalPoints / totalDarts) * 100) / 100
      : 0;
  },

  // Get player stats
  getPlayerStats: async (gameId, legId, playerId, currentScore) => {
    const legAvg = await StatsService.calculateLegAverage(legId, playerId);
    const matchAvg = await StatsService.calculateMatchAverage(gameId, playerId);

    // Get last three darts
    const lastTurn = await all(
      "SELECT * FROM turns WHERE leg_id = ? AND player_id = ? ORDER BY id DESC LIMIT 1",
      [legId, playerId]
    );

    let lastThreeDarts = [];
    if (lastTurn.length > 0) {
      const turn = lastTurn[0];
      const darts = [];
      
      // Add darts that were actually thrown (not null in database)
      if (turn.dart1_score !== null) {
        darts.push({ 
          score: turn.dart1_score === -1 ? null : turn.dart1_score, 
          multiplier: turn.dart1_multiplier 
        });
      }
      if (turn.dart2_score !== null) {
        darts.push({ 
          score: turn.dart2_score === -1 ? null : turn.dart2_score, 
          multiplier: turn.dart2_multiplier 
        });
      }
      if (turn.dart3_score !== null) {
        darts.push({ 
          score: turn.dart3_score === -1 ? null : turn.dart3_score, 
          multiplier: turn.dart3_multiplier 
        });
      }
      
      lastThreeDarts = darts;
    }

    return {
      currentScore,
      avgThisLeg: legAvg,
      avgTotal: matchAvg,
      lastThreeDarts,
    };
  },
};

export default StatsService;
