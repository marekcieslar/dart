import { api } from "./utils/api.js";
import { formatDate } from "./utils/helpers.js";

let activeGamesPage = 1;
let finishedGamesPage = 1;

// Load games
const loadGames = async (status, page, containerId, paginationId) => {
  const container = document.getElementById(containerId);

  try {
    const data = await api.getGames(status, page, 10);

    if (data.games.length === 0) {
      container.innerHTML =
        '<div class="text-center text-gray-500 py-8">Brak gier</div>';
      return;
    }

    container.innerHTML = data.games
      .map(
        (game) => `
      <a href="game.html?id=${
        game.id
      }" class="block p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition">
        <div class="flex justify-between items-center">
          <div>
            <div class="font-bold text-lg">${game.type} • ${game.players.join(
          " vs "
        )}</div>
            <div class="text-sm text-gray-600">Wynik: ${game.currentScore}</div>
            <div class="text-xs text-gray-500">${formatDate(
              game.createdAt
            )}</div>
          </div>
          <div class="text-purple-600 font-bold">
            ${game.status === "active" ? "▶" : "✓"}
          </div>
        </div>
      </a>
    `
      )
      .join("");

    // Pagination
    if (data.totalPages > 1) {
      const paginationContainer = document.getElementById(paginationId);
      paginationContainer.innerHTML = Array.from(
        { length: data.totalPages },
        (_, i) => i + 1
      )
        .map(
          (p) => `
          <button 
            class="px-3 py-1 rounded ${
              p === page
                ? "bg-purple-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }"
            onclick="window.loadGamesPage('${status}', ${p}, '${containerId}', '${paginationId}')"
          >
            ${p}
          </button>
        `
        )
        .join("");
    }
  } catch (error) {
    console.error("Error loading games:", error);
    container.innerHTML =
      '<div class="text-center text-red-500 py-8">Błąd ładowania gier</div>';
  }
};

// Make loadGamesPage global for onclick handlers
window.loadGamesPage = (status, page, containerId, paginationId) => {
  if (status === "active") activeGamesPage = page;
  else finishedGamesPage = page;
  loadGames(status, page, containerId, paginationId);
};

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  loadGames("active", activeGamesPage, "active-games", "active-pagination");
  loadGames(
    "finished",
    finishedGamesPage,
    "finished-games",
    "finished-pagination"
  );
});
