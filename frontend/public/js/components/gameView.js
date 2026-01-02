import { api } from "../utils/api.js";
import { getQueryParam, copyToClipboard, showToast } from "../utils/helpers.js";

const gameId = getQueryParam("id");
const adminToken = getQueryParam("admin");
let isAdmin = false;
let socket = null;
let gameState = null;

// Initialize
const init = async () => {
  if (!gameId) {
    showError("No game ID provided");
    return;
  }

  try {
    // Verify admin
    if (adminToken) {
      const result = await api.verifyAdmin(gameId, adminToken);
      isAdmin = result.valid;
    }

    // Connect to socket
    socket = io(window.location.origin);

    socket.on("connect", () => {
      console.log("Connected to server");
      socket.emit("join:game", { gameId, adminToken });
    });

    socket.on("game:update", (data) => {
      gameState = data;
      render();
      renderHistory(); // Update history on every game update
    });

    socket.on("leg:finished", (data) => {
      showToast(`${data.winner.name} wins leg ${data.legNumber}!`, "success");
    });

    socket.on("game:finished", (data) => {
      showToast(`🏆 ${data.winner.name} wins the match!`, "success");
    });

    socket.on("game:error", (data) => {
      showToast(data.message, "error");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });
  } catch (error) {
    showError(error.message);
  }
};

// Render game
const render = () => {
  if (!gameState) return;

  document.getElementById("loading").classList.add("hidden");
  document.getElementById("game-content").classList.remove("hidden");

  // Header
  document.getElementById(
    "game-title"
  ).textContent = `${gameState.type} • Leg ${gameState.currentLeg}/${gameState.bestOf}`;
  document.getElementById(
    "game-subtitle"
  ).textContent = `Best of ${gameState.bestOf}`;

  // Scoreboard
  renderScoreboard();

  // Admin panel
  if (isAdmin) {
    renderAdminPanel();
  }

  // History
  renderHistory();
};

// Render scoreboard
const renderScoreboard = () => {
  const scoreboard = document.getElementById("scoreboard");

  scoreboard.innerHTML = gameState.players
    .map((player, idx) => {
      const isCurrentPlayer = idx === gameState.currentPlayer;

      return `
      <div class="bg-white rounded-lg shadow-lg p-4 ${
        isCurrentPlayer ? "ring-4 ring-green-500" : ""
      }">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h2 class="text-xl font-bold ${
              isCurrentPlayer ? "text-green-600" : "text-gray-800"
            }">
              ${isCurrentPlayer ? "⭐ " : ""}${player.name}
            </h2>
            <div class="text-sm text-gray-600">Legs won: ${player.legsWon}</div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-purple-600">${
              player.currentScore
            }</div>
            <div class="text-xs text-gray-500">remaining</div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span class="text-gray-600">Leg avg:</span>
            <span class="font-semibold">${player.avgThisLeg.toFixed(1)}</span>
          </div>
          <div>
            <span class="text-gray-600">Match avg:</span>
            <span class="font-semibold">${player.avgTotal.toFixed(1)}</span>
          </div>
        </div>

        ${
          player.lastThreeDarts && player.lastThreeDarts.length > 0
            ? `
          <div class="mt-2 text-xs text-gray-500">
            Last: ${player.lastThreeDarts.map((d) => formatDart(d)).join(", ")}
          </div>
        `
            : ""
        }
      </div>
    `;
    })
    .join("");
};

// Render admin panel
const renderAdminPanel = () => {
  const panel = document.getElementById("admin-panel");
  panel.classList.remove("hidden");

  const currentPlayer = gameState.players[gameState.currentPlayer];

  const formattedTurn = gameState.currentTurn
    .map((d) => formatDart(d))
    .join(", ");

  // Use "—" if empty
  const displayTurn = formattedTurn || "—";

  panel.innerHTML = `
    <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-4 text-white">
      <h3 class="font-bold text-lg mb-3">Admin Panel</h3>
      <div class="bg-white/20 rounded p-2 mb-3 text-center">
        <div class="text-sm">Current turn: <span class="font-bold">${
          currentPlayer.name
        }</span></div>
        <div class="text-2xl font-bold mt-1">${displayTurn}</div>
      </div>

      <!-- Multiplier -->
      <div class="mb-3">
        <div class="text-sm mb-2">Multiplier:</div>
        <div class="grid grid-cols-3 gap-2">
          <button class="multiplier-btn bg-white/90 hover:bg-white text-green-600 font-bold py-2 rounded active" data-multiplier="1">
            1x
          </button>
          <button class="multiplier-btn bg-white/30 hover:bg-white/50 font-bold py-2 rounded" data-multiplier="2">
            Double
          </button>
          <button class="multiplier-btn bg-white/30 hover:bg-white/50 font-bold py-2 rounded" data-multiplier="3">
            Triple
          </button>
        </div>
      </div>

      <!-- Score buttons -->
      <div class="grid grid-cols-6 gap-1 mb-3">
        <button class="score-btn bg-white/30 hover:bg-white/50 font-bold py-3 rounded text-sm" data-score="null">MISS</button>
        ${[
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        ]
          .map(
            (n) => `
          <button class="score-btn bg-white/30 hover:bg-white/50 font-bold py-3 rounded text-sm" data-score="${n}">${n}</button>
        `
          )
          .join("")}
        <button class="score-btn bg-white/30 hover:bg-white/50 font-bold py-3 rounded text-sm" data-score="25">25</button>
        <button class="score-btn bg-white/30 hover:bg-white/50 font-bold py-3 rounded text-sm col-span-2" data-score="25" data-multiplier="2">BULL</button>
      </div>

      <!-- Undo button -->
      <button id="undo-btn" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded">
        ← Undo Last Dart
      </button>
    </div>
  `;

  setupAdminHandlers();
};

// Setup admin event handlers
const setupAdminHandlers = () => {
  let selectedMultiplier = 1;

  // Multiplier buttons
  document.querySelectorAll(".multiplier-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".multiplier-btn").forEach((b) => {
        b.classList.remove("bg-white/90", "active");
        b.classList.add("bg-white/30");
      });
      btn.classList.add("bg-white/90", "active");
      btn.classList.remove("bg-white/30");
      selectedMultiplier = parseInt(btn.dataset.multiplier);
    });
  });

  // Score buttons
  document.querySelectorAll(".score-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const score =
        btn.dataset.score === "null" ? null : parseInt(btn.dataset.score);
      const multiplier = btn.dataset.multiplier
        ? parseInt(btn.dataset.multiplier)
        : selectedMultiplier;

      // Validate
      if (score === 25 && multiplier === 3) {
        showToast("Bull cannot be tripled", "error");
        return;
      }

      addDart(score, multiplier);
    });
  });

  // Undo button
  document.getElementById("undo-btn").addEventListener("click", () => {
    undoDart();
  });
};

// Add dart
const addDart = (score, multiplier) => {
  if (!socket) return;

  socket.emit("game:add-dart", {
    gameId,
    adminToken,
    score,
    multiplier,
  });
};

// Undo dart
const undoDart = () => {
  if (!socket) return;

  socket.emit("game:undo-dart", {
    gameId,
    adminToken,
  });
};

// Format dart for display
const formatDart = (dart) => {
  if (!dart) return "—";
  if (dart.score === null) return "MISS";

  const prefix = dart.multiplier === 3 ? "T" : dart.multiplier === 2 ? "D" : "";
  return `${prefix}${dart.score}`;
};

// Render history
let showAllHistory = false;

const renderHistory = async () => {
  const historyContainer = document.getElementById("history");

  try {
    const history = await api.getHistory(gameId);

    if (history.length === 0) {
      historyContainer.innerHTML =
        '<div class="text-gray-500 text-center py-4">No turns yet</div>';
      return;
    }

    // Show only last 10 turns by default, unless showAllHistory is true
    const displayLimit = showAllHistory ? history.length : 10;
    const displayHistory = history.slice(-displayLimit);
    const hasMore = history.length > displayLimit;

    const historyHTML = displayHistory
      .map((turn) => {
        const dartsDisplay = turn.darts.map((d) => formatDart(d)).join(", ");
        const scoreChange = turn.remainingBefore - turn.remainingAfter;
        const bustClass = turn.isBust ? "text-red-600 font-bold" : "";

        return `
          <div class="flex justify-between items-center p-2 border-b border-gray-200 ${bustClass}">
            <div class="flex-1">
              <span class="font-semibold">${turn.playerName}</span>
              <span class="text-gray-600 ml-2 text-xs md:text-sm">${dartsDisplay}</span>
            </div>
            <div class="text-right">
              <div class="font-bold">${turn.isBust ? "BUST" : scoreChange}</div>
              <div class="text-xs text-gray-500">${
                turn.remainingAfter ?? turn.remainingBefore
              } left</div>
            </div>
          </div>
        `;
      })
      .reverse()
      .join("");

    const showMoreButton =
      !showAllHistory && hasMore
        ? `<button id="show-more-history" class="w-full py-2 text-purple-600 hover:text-purple-800 text-sm font-semibold">Show ${
            history.length - displayLimit
          } more turns</button>`
        : showAllHistory && history.length > 10
        ? `<button id="show-less-history" class="w-full py-2 text-purple-600 hover:text-purple-800 text-sm font-semibold">Show less</button>`
        : "";

    historyContainer.innerHTML = historyHTML + showMoreButton;

    // Add event listeners for show more/less buttons
    const showMoreBtn = document.getElementById("show-more-history");
    const showLessBtn = document.getElementById("show-less-history");

    if (showMoreBtn) {
      showMoreBtn.addEventListener("click", () => {
        showAllHistory = true;
        renderHistory();
      });
    }

    if (showLessBtn) {
      showLessBtn.addEventListener("click", () => {
        showAllHistory = false;
        renderHistory();
      });
    }

    // Auto-scroll to top (latest turns at top after reverse)
    historyContainer.scrollTop = 0;
  } catch (error) {
    console.error("Error loading history:", error);
    historyContainer.innerHTML =
      '<div class="text-red-500 text-center py-4">Failed to load history</div>';
  }
};

// Copy link
document.getElementById("copy-link-btn").addEventListener("click", async () => {
  if (isAdmin) {
    // Show modal for admin to choose which link
    document.getElementById("copy-modal").classList.remove("hidden");
  } else {
    // Direct copy for non-admin (view-only link)
    const link =
      window.location.origin + window.location.pathname + "?id=" + gameId;
    const success = await copyToClipboard(link);
    if (success) {
      showToast("Link copied!", "success");
    }
  }
});

// Modal handlers
document
  .getElementById("copy-admin-link")
  .addEventListener("click", async () => {
    const adminLink = window.location.href; // Full URL with admin token
    const success = await copyToClipboard(adminLink);
    if (success) {
      showToast("Admin link copied!", "success");
    }
    document.getElementById("copy-modal").classList.add("hidden");
  });

document
  .getElementById("copy-view-link")
  .addEventListener("click", async () => {
    const viewLink =
      window.location.origin + window.location.pathname + "?id=" + gameId;
    const success = await copyToClipboard(viewLink);
    if (success) {
      showToast("View-only link copied!", "success");
    }
    document.getElementById("copy-modal").classList.add("hidden");
  });

document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("copy-modal").classList.add("hidden");
});

// Close modal on backdrop click
document.getElementById("copy-modal").addEventListener("click", (e) => {
  if (e.target.id === "copy-modal") {
    document.getElementById("copy-modal").classList.add("hidden");
  }
});

// Show error
const showError = (message) => {
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("error").textContent = message;
  document.getElementById("error").classList.remove("hidden");
};

// Initialize on load
init();
