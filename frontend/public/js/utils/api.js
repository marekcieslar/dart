const API_URL = window.location.origin;

export const api = {
  // Create game
  createGame: async (type, bestOf, players) => {
    const response = await fetch(`${API_URL}/api/games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, bestOf, players }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create game");
    }

    return await response.json();
  },

  // Get games list
  getGames: async (status = null, page = 1, limit = 10) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    params.append("page", page);
    params.append("limit", limit);

    const response = await fetch(`${API_URL}/api/games?${params}`);

    if (!response.ok) {
      throw new Error("Failed to fetch games");
    }

    return await response.json();
  },

  // Get game details
  getGame: async (gameId) => {
    const response = await fetch(`${API_URL}/api/games/${gameId}`);

    if (!response.ok) {
      throw new Error("Game not found");
    }

    return await response.json();
  },

  // Verify admin token
  verifyAdmin: async (gameId, token) => {
    const response = await fetch(
      `${API_URL}/api/games/${gameId}/verify-admin?token=${token}`
    );

    if (!response.ok) {
      return { valid: false, isMainAdmin: false };
    }

    return await response.json();
  },

  // End game
  endGame: async (gameId, adminToken) => {
    const response = await fetch(`${API_URL}/api/games/${gameId}/end`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to end game");
    }

    return await response.json();
  },

  // Get turn history
  getHistory: async (gameId) => {
    const response = await fetch(`${API_URL}/api/games/${gameId}/history`);

    if (!response.ok) {
      throw new Error("Failed to fetch history");
    }

    return await response.json();
  },
};
