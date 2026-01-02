// Validate game type
export const isValidGameType = (type) => {
  return type === 301 || type === 501;
};

// Validate best of
export const isValidBestOf = (bestOf) => {
  return [3, 5, 7].includes(bestOf);
};

// Validate number of players
export const isValidPlayerCount = (count) => {
  return count >= 2 && count <= 8;
};

// Validate player names
export const validatePlayerNames = (players) => {
  if (!Array.isArray(players)) {
    return { valid: false, error: "Players must be an array" };
  }

  if (!isValidPlayerCount(players.length)) {
    return { valid: false, error: "Number of players must be between 2 and 8" };
  }

  for (const name of players) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return {
        valid: false,
        error: "All player names must be non-empty strings",
      };
    }
    if (name.length > 50) {
      return {
        valid: false,
        error: "Player names must be 50 characters or less",
      };
    }
  }

  return { valid: true };
};

// Validate dart score
export const isValidDartScore = (score) => {
  if (score === null) return true; // MISS
  if (typeof score !== "number") return false;
  if (score < 0 || score > 25) return false;
  if (score === 25) return true; // Bull
  if (score >= 0 && score <= 20) return true;
  return false;
};

// Validate multiplier
export const isValidMultiplier = (multiplier) => {
  return [1, 2, 3].includes(multiplier);
};

// Validate dart throw
export const validateDartThrow = (score, multiplier) => {
  if (!isValidDartScore(score)) {
    return { valid: false, error: "Invalid dart score" };
  }

  if (!isValidMultiplier(multiplier)) {
    return { valid: false, error: "Invalid multiplier (must be 1, 2, or 3)" };
  }

  // Bull (25) can only be 1x or 2x (single bull or double bull)
  if (score === 25 && multiplier === 3) {
    return { valid: false, error: "Bull cannot be tripled" };
  }

  return { valid: true };
};

// Calculate dart value
export const calculateDartValue = (score, multiplier) => {
  if (score === null) return 0; // MISS
  return score * multiplier;
};
