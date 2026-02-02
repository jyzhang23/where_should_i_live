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
 * - values.ts: Values scoring (political alignment, religious presence)
 * - entertainment.ts: Entertainment scoring (nightlife, arts, dining, sports, recreation)
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
import { calculateValuesScore } from "./values";
import { calculateEntertainmentScore } from "./entertainment";

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
export { calculateValuesScore } from "./values";
export { calculateEntertainmentScore } from "./entertainment";

/**
 * Calculate scores for all cities based on user preferences
 * This runs entirely client-side for instant feedback
 * 
 * Uses 6 categories:
 * 1. Climate - weather preferences (NOAA data)
 * 2. Cost - purchasing power (BEA data)
 * 3. Demographics - population characteristics (Census data)
 * 4. Quality of Life - infrastructure (walkability, safety, schools, etc.)
 * 5. Values - alignment (political, religious)
 * 6. Entertainment - amenities (nightlife, arts, dining, sports, recreation)
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

    // Calculate category scores (0-100 each) - 6 categories
    const climateScore = calculateClimateScore(city, preferences);
    const costScore = calculateCostScore(city, preferences);
    const demographicsScore = calculateDemographicsScore(city, preferences);
    const qualityOfLifeScore = calculateQualityOfLifeScore(city, preferences);
    const valuesScore = calculateValuesScore(city, preferences);
    const entertainmentScore = calculateEntertainmentScore(city, preferences);

    // Apply category weights (6 weights)
    const { climate, costOfLiving, demographics, qualityOfLife, values, entertainment } = preferences.weights;
    const totalWeight = climate + costOfLiving + demographics + qualityOfLife + values + entertainment;

    const totalScore =
      totalWeight > 0
        ? (climateScore * climate +
            costScore * costOfLiving +
            demographicsScore * demographics +
            qualityOfLifeScore * qualityOfLife +
            valuesScore * values +
            entertainmentScore * entertainment) /
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
      valuesScore,
      entertainmentScore,
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
