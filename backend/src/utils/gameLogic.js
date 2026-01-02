import { calculateDartValue as calcDartValue } from './validators.js';

// Re-export for convenience
export const calculateDartValue = calcDartValue;

// Check if score results in a bust
export const isBust = (currentScore, dartValue) => {
  return (currentScore - dartValue) < 0;
};

// Check if game is won (exactly 0)
export const isWin = (currentScore, dartValue) => {
  return (currentScore - dartValue) === 0;
};

// Format dart for display (e.g., "T20", "D10", "5", "MISS")
export const formatDart = (score, multiplier) => {
  if (score === null) return 'MISS';
  
  if (score === 25) {
    return multiplier === 2 ? 'BULL' : '25';
  }
  
  const prefix = multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : '';
  return `${prefix}${score}`;
};

// Calculate average points per dart
export const calculateAverage = (totalPoints, totalDarts) => {
  if (totalDarts === 0) return 0;
  return Math.round((totalPoints / totalDarts) * 100) / 100;
};

// Get starting score for game type
export const getStartingScore = (gameType) => {
  return gameType;
};

// Determine if a player has won the match
export const hasWonMatch = (legsWon, bestOf) => {
  const legsToWin = Math.ceil(bestOf / 2);
  return legsWon >= legsToWin;
};

// Format turn display (e.g., ["T20", "T20", "T20"] -> "180 (T20, T20, T20)")
export const formatTurnDisplay = (darts) => {
  const scores = darts.map(d => {
    if (!d) return null;
    return calculateDartValue(d.score, d.multiplier);
  }).filter(s => s !== null);
  
  const total = scores.reduce((sum, s) => sum + s, 0);
  const formatted = darts
    .filter(d => d)
    .map(d => formatDart(d.score, d.multiplier))
    .join(', ');
  
  return { total, formatted };
};
