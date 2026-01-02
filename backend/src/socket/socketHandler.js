import GameService from "../services/gameService.js";
import { verifyAdminToken } from "../middleware/adminAuth.js";

export const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join game room
    socket.on("join:game", async ({ gameId, adminToken }) => {
      try {
        if (!gameId) {
          socket.emit("game:error", { message: "Game ID is required" });
          return;
        }

        // Verify game exists
        const gameState = await GameService.getGameState(gameId);

        // Join room
        socket.join(gameId);

        // Check if admin
        let isAdmin = false;
        if (adminToken) {
          const { valid } = await verifyAdminToken(gameId, adminToken);
          isAdmin = valid;
        }

        socket.data.gameId = gameId;
        socket.data.isAdmin = isAdmin;
        socket.data.adminToken = adminToken;

        // Send current game state
        socket.emit("game:update", gameState);

        console.log(
          `Client ${socket.id} joined game ${gameId} (admin: ${isAdmin})`
        );
      } catch (error) {
        console.error("Error joining game:", error);
        socket.emit("game:error", { message: error.message });
      }
    });

    // Add dart (admin only)
    socket.on(
      "game:add-dart",
      async ({ gameId, adminToken, score, multiplier }) => {
        try {
          // Verify admin
          const { valid } = await verifyAdminToken(gameId, adminToken);
          if (!valid) {
            socket.emit("game:error", { message: "Invalid admin token" });
            return;
          }

          // Add dart
          const result = await GameService.addDart(gameId, score, multiplier);

          // Check for bust
          const completedTurn =
            result.currentTurn.length === 0 || result.currentTurn.length === 3;

          if (completedTurn) {
            // Get last turn to check for bust/win
            const { all } = await import("../config/database.js");
            const turns = await all(
              `SELECT t.*, l.id as leg_id FROM turns t
             JOIN legs l ON t.leg_id = l.id
             WHERE l.game_id = ?
             ORDER BY t.id DESC LIMIT 1`,
              [gameId]
            );

            if (turns.length > 0) {
              const lastTurn = turns[0];

              if (lastTurn.is_bust) {
                // Emit bust event
                socket.emit("game:error", {
                  message: "Bust! Turn cancelled.",
                  type: "bust",
                });
              }

              if (lastTurn.remaining_after === 0) {
                // Leg finished
                const Leg = (await import("../models/Leg.js")).default;
                const Player = (await import("../models/Player.js")).default;

                const leg = await Leg.getById(lastTurn.leg_id);
                const winner = await Player.getById(lastTurn.player_id);

                const Game = (await import("../models/Game.js")).default;
                const game = await Game.getById(gameId);
                const players = await Player.getByGameId(gameId);

                // Check if match is won
                const { hasWonMatch } = await import("../utils/gameLogic.js");
                const matchWon = hasWonMatch(winner.legs_won, game.best_of);

                if (matchWon) {
                  // Match finished
                  const finalScores = players.reduce((acc, p) => {
                    acc[p.player_name] = p.legs_won;
                    return acc;
                  }, {});

                  io.to(gameId).emit("game:finished", {
                    winner: {
                      id: winner.id,
                      name: winner.player_name,
                    },
                    finalScores,
                  });
                } else {
                  // Just leg finished
                  const scores = players.reduce((acc, p) => {
                    acc[p.player_name] = p.legs_won;
                    return acc;
                  }, {});

                  io.to(gameId).emit("leg:finished", {
                    legNumber: leg.leg_number,
                    winner: {
                      id: winner.id,
                      name: winner.player_name,
                    },
                    newLegStarting: !matchWon,
                    scores,
                  });
                }
              }
            }
          }

          // Broadcast updated game state to all clients
          io.to(gameId).emit("game:update", result);
        } catch (error) {
          console.error("Error adding dart:", error);
          socket.emit("game:error", { message: error.message });
        }
      }
    );

    // Undo dart (admin only)
    socket.on("game:undo-dart", async ({ gameId, adminToken }) => {
      try {
        // Verify admin
        const { valid } = await verifyAdminToken(gameId, adminToken);
        if (!valid) {
          socket.emit("game:error", { message: "Invalid admin token" });
          return;
        }

        // Undo last dart
        const result = await GameService.undoLastDart(gameId);

        // Broadcast updated game state
        io.to(gameId).emit("game:update", result);
      } catch (error) {
        console.error("Error undoing dart:", error);
        socket.emit("game:error", { message: error.message });
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Handle errors
  io.on("error", (error) => {
    console.error("Socket.io error:", error);
  });

  console.log("✓ Socket.io handlers setup complete");
};

export default setupSocketHandlers;
