// ============================================================================
// NORMALIZATION UTILITIES
// ============================================================================

/**
 * Range-based normalization: maps a value to 0-100 based on U.S. extremes
 * @param value - The raw value to normalize
 * @param min - The "best" end of the range (maps to 100)
 * @param max - The "worst" end of the range (maps to 0)
 * @param invert - If true, higher raw values are worse (default: false)
 */
export function normalizeToRange(value: number, min: number, max: number, invert: boolean = false): number {
  // Clamp to range
  const clamped = Math.max(min, Math.min(max, value));
  // Calculate position in range (0-1)
  const normalized = (clamped - min) / (max - min);
  // Convert to 0-100 score (invert if needed)
  const score = invert ? (1 - normalized) * 100 : normalized * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Compute percentile rank of a value within an array
 * @param value - The value to rank
 * @param allValues - Array of all values in the dataset
 * @param higherIsBetter - If true, higher values get higher percentiles
 */
export function toPercentileScore(value: number, allValues: number[], higherIsBetter: boolean = true): number {
  if (allValues.length === 0) return 50;
  
  const sorted = [...allValues].sort((a, b) => a - b);
  // Find how many values are below this one
  const belowCount = sorted.filter(v => v < value).length;
  const percentile = (belowCount / sorted.length) * 100;
  
  return higherIsBetter ? percentile : (100 - percentile);
}

/**
 * Logarithmic "Critical Mass" curve for minority community presence
 * Implements diminishing returns: 25%+ presence plateaus in benefit
 * @param actualPct - Actual percentage of community in city
 * @param targetPct - User's minimum threshold
 */
export function minorityPresenceScore(actualPct: number, targetPct: number): number {
  if (actualPct >= targetPct) {
    // Above threshold: diminishing returns using log scale
    // Base score of 75 + logarithmic bonus, cap at 100
    const excess = actualPct - targetPct;
    return Math.min(100, 75 + Math.log10(1 + excess * 2) * 15);
  } else {
    // Below threshold: steeper linear penalty
    const deficit = targetPct - actualPct;
    return Math.max(0, 75 - deficit * 4);
  }
}

/**
 * Logarithmic "Critical Mass" curve for urban amenities
 * Implements diminishing returns: once you have "enough" bars/museums, more is marginal
 * @param value - The actual density or count
 * @param min - Minimum value (maps to ~30 score)
 * @param plateau - Critical mass point (maps to ~75 score)
 * @param max - Maximum value for full credit (maps to 100 score)
 */
export function urbanAmenityScore(value: number, min: number, plateau: number, max: number): number {
  if (value <= min) {
    // Below minimum: low score
    return 30;
  } else if (value >= max) {
    // At or above max: full score
    return 100;
  } else if (value >= plateau) {
    // Between plateau and max: diminishing returns (log curve)
    // At plateau we want ~75, at max we want 100
    const progress = (value - plateau) / (max - plateau);
    return 75 + 25 * Math.log10(1 + progress * 9) / Math.log10(10);
  } else {
    // Between min and plateau: steeper linear climb
    // At min we want 30, at plateau we want 75
    const progress = (value - min) / (plateau - min);
    return 30 + 45 * progress;
  }
}
