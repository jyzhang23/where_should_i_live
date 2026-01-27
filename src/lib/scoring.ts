import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { CityScore, ScoringResult } from "@/types/scores";

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

  for (const city of cities) {
    const metrics = city.metrics;
    if (!metrics) {
      excludedCount++;
      continue;
    }

    // Check hard filters first
    const exclusionReason = checkFilters(city, preferences);
    if (exclusionReason) {
      rankings.push({
        cityId: city.id,
        cityName: city.name,
        state: city.state,
        climateScore: 0,
        costScore: 0,
        demographicsScore: 0,
        qualityOfLifeScore: 0,
        totalScore: 0,
        excluded: true,
        exclusionReason,
      });
      excludedCount++;
      continue;
    }

    // Calculate category scores (0-100 each)
    const climateScore = calculateClimateScore(city, preferences);
    const costScore = calculateCostScore(city, preferences);
    const demographicsScore = calculateDemographicsScore(city, preferences);
    const qualityOfLifeScore = calculateQualityOfLifeScore(city, preferences);

    // Apply category weights
    const { climate, costOfLiving, demographics } = preferences.weights;
    const totalWeight = climate + costOfLiving + demographics;

    const totalScore =
      totalWeight > 0
        ? (climateScore * climate +
            costScore * costOfLiving +
            demographicsScore * demographics) /
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

/**
 * Check if a city should be excluded based on hard filters
 */
function checkFilters(
  city: CityWithMetrics,
  preferences: UserPreferences
): string | null {
  const { filters } = preferences;
  const metrics = city.metrics!;

  if (filters.requiresNFL && !metrics.nflTeams) {
    return "No NFL team";
  }

  if (filters.requiresNBA && !metrics.nbaTeams) {
    return "No NBA team";
  }

  if (
    filters.maxHomePrice !== null &&
    metrics.medianHomePrice !== null &&
    metrics.medianHomePrice > filters.maxHomePrice
  ) {
    return `Home price ($${(metrics.medianHomePrice / 1000).toFixed(0)}K) exceeds budget`;
  }

  return null;
}

/**
 * Calculate climate score (0-100)
 */
function calculateClimateScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const { idealTemp, maxSummerTemp, minWinterTemp, minSunshineDays, maxRainDays } =
    preferences.advanced.climate;

  let score = 100;

  // Temperature score: penalty for deviation from ideal
  if (metrics.avgTemp !== null) {
    const tempDiff = Math.abs(metrics.avgTemp - idealTemp);
    score -= tempDiff * 2; // -2 points per degree difference
  }

  // Summer temperature penalty
  if (metrics.avgSummerTemp !== null && metrics.avgSummerTemp > maxSummerTemp) {
    score -= (metrics.avgSummerTemp - maxSummerTemp) * 3;
  }

  // Winter temperature penalty
  if (metrics.avgWinterTemp !== null && metrics.avgWinterTemp < minWinterTemp) {
    score -= (minWinterTemp - metrics.avgWinterTemp) * 3;
  }

  // Sunshine bonus/penalty
  if (metrics.daysOfSunshine !== null) {
    if (metrics.daysOfSunshine >= minSunshineDays) {
      score += 10; // Bonus for meeting sunshine requirement
    } else {
      score -= ((minSunshineDays - metrics.daysOfSunshine) / minSunshineDays) * 20;
    }
  }

  // Rain penalty
  if (metrics.daysOfRain !== null && metrics.daysOfRain > maxRainDays) {
    score -= ((metrics.daysOfRain - maxRainDays) / maxRainDays) * 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate cost of living score (0-100)
 * Higher score = more affordable
 */
function calculateCostScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const { maxStateTax, maxPropertyTax, weightHomePrice, weightTaxBurden } =
    preferences.advanced.costOfLiving;

  let homePriceScore = 100;
  let taxScore = 100;

  // Home price score (inversely proportional)
  // $300K = 100, $1.5M = 0
  if (metrics.medianHomePrice !== null) {
    const price = metrics.medianHomePrice;
    homePriceScore = Math.max(0, 100 - ((price - 300000) / 1200000) * 100);
  }

  // Tax burden score
  if (metrics.stateTaxRate !== null) {
    if (metrics.stateTaxRate > maxStateTax) {
      taxScore -= ((metrics.stateTaxRate - maxStateTax) / maxStateTax) * 50;
    }
  }

  if (metrics.propertyTaxRate !== null) {
    if (metrics.propertyTaxRate > maxPropertyTax) {
      taxScore -= ((metrics.propertyTaxRate - maxPropertyTax) / maxPropertyTax) * 50;
    }
  }

  taxScore = Math.max(0, taxScore);

  // Weighted combination
  const totalWeight = weightHomePrice + weightTaxBurden;
  if (totalWeight === 0) return 50;

  return (homePriceScore * weightHomePrice + taxScore * weightTaxBurden) / totalWeight;
}

/**
 * Calculate demographics score (0-100)
 */
function calculateDemographicsScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const { minPopulation, minDiversityIndex, targetEastAsianPercent } =
    preferences.advanced.demographics;

  let score = 100;

  // Population check
  if (metrics.population !== null && metrics.population < minPopulation) {
    score -= 30; // Significant penalty for being too small
  }

  // Diversity index
  if (metrics.diversityIndex !== null) {
    if (metrics.diversityIndex >= minDiversityIndex) {
      // Bonus for meeting diversity requirement
      score += Math.min(10, (metrics.diversityIndex - minDiversityIndex) / 5);
    } else {
      score -= (minDiversityIndex - metrics.diversityIndex) * 2;
    }
  }

  // East Asian population preference
  if (targetEastAsianPercent > 0 && metrics.eastAsianPercent !== null) {
    const diff = Math.abs(metrics.eastAsianPercent * 100 - targetEastAsianPercent);
    score -= diff * 2;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate quality of life score (0-100)
 */
function calculateQualityOfLifeScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const { minWalkScore, minTransitScore, maxCrimeRate, requiresAirport } =
    preferences.advanced.qualityOfLife;

  let score = 70; // Start at 70, adjust up/down

  // Walk score
  if (metrics.walkScore !== null) {
    if (metrics.walkScore >= minWalkScore) {
      score += (metrics.walkScore - minWalkScore) / 10;
    } else {
      score -= (minWalkScore - metrics.walkScore) / 5;
    }
  }

  // Transit score
  if (metrics.transitScore !== null) {
    if (metrics.transitScore >= minTransitScore) {
      score += (metrics.transitScore - minTransitScore) / 10;
    } else {
      score -= (minTransitScore - metrics.transitScore) / 5;
    }
  }

  // Crime rate (lower is better)
  if (metrics.crimeRate !== null) {
    if (metrics.crimeRate <= maxCrimeRate) {
      score += 10;
    } else {
      score -= ((metrics.crimeRate - maxCrimeRate) / maxCrimeRate) * 20;
    }
  }

  // Airport requirement
  if (requiresAirport && !metrics.hasInternationalAirport) {
    score -= 15;
  }

  // Pollution (lower is better, typical range 20-80)
  if (metrics.pollutionIndex !== null) {
    score -= (metrics.pollutionIndex - 40) / 4;
  }

  // Water quality (higher is better, typical range 50-90)
  if (metrics.waterQualityIndex !== null) {
    score += (metrics.waterQualityIndex - 70) / 4;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get letter grade for a score
 */
export function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 77) return "B+";
  if (score >= 73) return "B";
  if (score >= 70) return "B-";
  if (score >= 67) return "C+";
  if (score >= 63) return "C";
  if (score >= 60) return "C-";
  if (score >= 50) return "D";
  return "F";
}

/**
 * Get color class for a score
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}
