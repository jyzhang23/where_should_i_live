/**
 * Scoring Module - City ranking based on user preferences
 * 
 * This module is decomposed into category-specific files for maintainability:
 * - constants.ts: Range constants for normalization
 * - utils.ts: Normalization utility functions
 * - types.ts: Interfaces and percentile cache
 * - climate.ts: Climate scoring using NOAA data
 * - cost.ts: Cost of living scoring using BEA data
 * - demographics.ts: Demographics scoring using Census data
 * - quality-of-life.ts: QoL scoring (walkability, safety, etc.)
 * - cultural.ts: Cultural scoring (political, religious, urban lifestyle)
 * - display.ts: UI display utilities (grades, colors, labels)
 */

import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { CityScore, ScoringResult } from "@/types/scores";

// Import scoring functions from category modules
import { calculateClimateScore } from "./climate";
import { calculateCostScore } from "./cost";
import { calculateDemographicsScore } from "./demographics";
import { calculateQualityOfLifeScore } from "./quality-of-life";
import { calculateCulturalScore } from "./cultural";

// Import types and cache functions
import { computeQoLPercentiles, setQoLPercentilesCache } from "./types";

// Re-export everything for backward compatibility
export * from "./constants";
export * from "./utils";
export * from "./types";
export * from "./display";
export { calculateClimateScore } from "./climate";
export { calculateCostScore } from "./cost";
export { calculateDemographicsScore } from "./demographics";
export { calculateQualityOfLifeScore } from "./quality-of-life";
export { calculateCulturalScore } from "./cultural";

/**
 * Calculate scores for all cities based on user preferences
 * This runs entirely client-side for instant feedback
 */
export function calculateScores(
  cities: CityWithMetrics[],
  preferences: UserPreferences
): ScoringResult {
  const rankings: CityScore[] = [];
  let excludedCount = 0;

  // Pre-compute QoL percentiles for all cities (for percentile-based scoring)
  const percentiles = computeQoLPercentiles(cities);
  setQoLPercentilesCache(percentiles);

  for (const city of cities) {
    const metrics = city.metrics;
    if (!metrics) {
      excludedCount++;
      continue;
    }

    // Calculate category scores (0-100 each)
    const climateScore = calculateClimateScore(city, preferences);
    const costScore = calculateCostScore(city, preferences);
    const demographicsScore = calculateDemographicsScore(city, preferences);
    const qualityOfLifeScore = calculateQualityOfLifeScore(city, preferences);
    const culturalScore = calculateCulturalScore(city, preferences);

    // Apply category weights
    const { climate, costOfLiving, demographics, qualityOfLife, cultural } = preferences.weights;
    const totalWeight = climate + costOfLiving + demographics + qualityOfLife + cultural;

    const totalScore =
      totalWeight > 0
        ? (climateScore * climate +
            costScore * costOfLiving +
            demographicsScore * demographics +
            qualityOfLifeScore * qualityOfLife +
            culturalScore * cultural) /
          totalWeight
        : 0;

    rankings.push({
      cityId: city.id,
      cityName: city.name,
      state: city.state,
      climateScore,
      costScore,
      demographicsScore,
      qualityOfLifeScore,
      culturalScore,
      totalScore,
      excluded: false,
    });
  }

  // Sort by total score descending
  rankings.sort((a, b) => {
    // Excluded cities go to the bottom
    if (a.excluded && !b.excluded) return 1;
    if (!a.excluded && b.excluded) return -1;
    return b.totalScore - a.totalScore;
  });

  return {
    rankings,
    includedCount: rankings.length - excludedCount,
    excludedCount,
  };
}
