import { api } from '../utils/api.js';
import { showToast } from '../utils/helpers.js';

let selectedType = 301;
let selectedBestOf = 3;

// Type selection
document.querySelectorAll('.game-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.game-type-btn').forEach(b => {
      b.classList.remove('bg-purple-600', 'text-white');
      b.classList.add('border-gray-300');
    });
    btn.classList.add('bg-purple-600', 'text-white');
    btn.classList.remove('border-gray-300');
    selectedType = parseInt(btn.dataset.type);
  });
});

// Best of selection
document.querySelectorAll('.best-of-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.best-of-btn').forEach(b => {
      b.classList.remove('bg-purple-600', 'text-white');
      b.classList.add('border-gray-300');
    });
    btn.classList.add('bg-purple-600', 'text-white');
    btn.classList.remove('border-gray-300');
    selectedBestOf = parseInt(btn.dataset.value);
  });
});

// Add player
document.getElementById('add-player-btn').addEventListener('click', () => {
  const playersList = document.getElementById('players-list');
  const currentCount = playersList.querySelectorAll('.player-input').length;
  
  if (currentCount >= 8) {
    showToast('Maximum 8 players allowed', 'error');
    return;
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'player-input w-full px-4 py-2 border rounded-lg';
  input.placeholder = `Player ${currentCount + 1}`;
  input.required = true;
  
  playersList.appendChild(input);
});

// Form submission
document.getElementById('create-game-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const playerInputs = document.querySelectorAll('.player-input');
  const players = Array.from(playerInputs)
    .map(input => input.value.trim())
    .filter(name => name.length > 0);

  if (players.length < 2) {
    showToast('At least 2 players required', 'error');
    return;
  }

  if (players.length !== new Set(players).size) {
    showToast('Player names must be unique', 'error');
    return;
  }

  try {
    const result = await api.createGame(selectedType, selectedBestOf, players);
    showToast('Game created!', 'success');
    
    // Redirect to game with admin token
    setTimeout(() => {
      window.location.href = `game.html?id=${result.gameId}&admin=${result.adminToken}`;
    }, 500);
  } catch (error) {
    document.getElementById('error-message').textContent = error.message;
    document.getElementById('error-message').classList.remove('hidden');
  }
});
