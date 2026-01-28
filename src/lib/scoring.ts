import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { CityScore, ScoringResult } from "@/types/scores";
import { calculateTrueCostOfLiving, CostOfLivingOptions } from "@/lib/cost-of-living";

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
    const { climate, costOfLiving, demographics, qualityOfLife } = preferences.weights;
    const totalWeight = climate + costOfLiving + demographics + qualityOfLife;

    const totalScore =
      totalWeight > 0
        ? (climateScore * climate +
            costScore * costOfLiving +
            demographicsScore * demographics +
            qualityOfLifeScore * qualityOfLife) /
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

  if (filters.requiresAirport && !metrics.hasInternationalAirport) {
    return "No international airport";
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
 * Calculate climate score (0-100) using NOAA data with weighted preferences
 * Falls back to legacy calculation if NOAA data unavailable
 */
function calculateClimateScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const noaa = metrics.noaa;
  const prefs = preferences.advanced.climate;

  // If NOAA data available, use weighted scoring
  if (noaa) {
    let totalScore = 0;
    let totalWeight = 0;

    // T-Shirt Weather (comfort days: 65-80°F)
    if (prefs.weightComfortDays > 0 && noaa.comfortDays !== null) {
      // Score: ratio of actual to desired, capped at 100
      const comfortScore = Math.min(100, (noaa.comfortDays / prefs.minComfortDays) * 100);
      totalScore += comfortScore * prefs.weightComfortDays;
      totalWeight += prefs.weightComfortDays;
    }

    // Extreme Heat (inverse - fewer is better)
    if (prefs.weightExtremeHeat > 0 && noaa.extremeHeatDays !== null) {
      // Score: 100 if at or below max, decreases linearly
      const heatScore = prefs.maxExtremeHeatDays > 0
        ? Math.max(0, 100 - (Math.max(0, noaa.extremeHeatDays - prefs.maxExtremeHeatDays) / prefs.maxExtremeHeatDays) * 100)
        : (noaa.extremeHeatDays === 0 ? 100 : 50);
      totalScore += heatScore * prefs.weightExtremeHeat;
      totalWeight += prefs.weightExtremeHeat;
    }

    // Freeze Days (inverse - fewer is better)
    if (prefs.weightFreezeDays > 0 && noaa.freezeDays !== null) {
      const freezeScore = prefs.maxFreezeDays > 0
        ? Math.max(0, 100 - (Math.max(0, noaa.freezeDays - prefs.maxFreezeDays) / prefs.maxFreezeDays) * 100)
        : (noaa.freezeDays === 0 ? 100 : 50);
      totalScore += freezeScore * prefs.weightFreezeDays;
      totalWeight += prefs.weightFreezeDays;
    }

    // Rain Days (inverse - fewer is better)
    if (prefs.weightRainDays > 0 && noaa.rainDays !== null) {
      const rainScore = Math.max(0, 100 - (Math.max(0, noaa.rainDays - prefs.maxRainDays) / prefs.maxRainDays) * 100);
      totalScore += rainScore * prefs.weightRainDays;
      totalWeight += prefs.weightRainDays;
    }

    // Utility Costs (inverse - lower CDD+HDD is better)
    if (prefs.weightUtilityCosts > 0 && 
        noaa.coolingDegreeDays !== null && 
        noaa.heatingDegreeDays !== null) {
      const totalDegreeDays = noaa.coolingDegreeDays + noaa.heatingDegreeDays;
      // National range: ~2000 (San Diego) to ~9000 (Minneapolis)
      // Score 100 at 2000, score 0 at 9000
      const utilityScore = Math.max(0, 100 - ((totalDegreeDays - 2000) / 7000) * 100);
      totalScore += utilityScore * prefs.weightUtilityCosts;
      totalWeight += prefs.weightUtilityCosts;
    }

    // Growing Season
    if (prefs.weightGrowingSeason > 0 && noaa.growingSeasonDays !== null) {
      const growScore = Math.min(100, (noaa.growingSeasonDays / prefs.minGrowingSeasonDays) * 100);
      totalScore += growScore * prefs.weightGrowingSeason;
      totalWeight += prefs.weightGrowingSeason;
    }

    // Seasonal Stability (inverse - lower stddev is better)
    if (prefs.weightSeasonalStability > 0 && noaa.seasonalStability !== null) {
      // Range: ~5 (San Diego) to ~25 (Minneapolis)
      // Score 100 at 5, score 0 at 25
      const stabilityScore = Math.max(0, 100 - ((noaa.seasonalStability - 5) / 20) * 100);
      totalScore += stabilityScore * prefs.weightSeasonalStability;
      totalWeight += prefs.weightSeasonalStability;
    }

    // Diurnal Swing (inverse - smaller swing is better)
    if (prefs.weightDiurnalSwing > 0 && noaa.diurnalSwing !== null) {
      const swingScore = Math.max(0, 100 - (Math.max(0, noaa.diurnalSwing - 10) / prefs.maxDiurnalSwing) * 100);
      totalScore += swingScore * prefs.weightDiurnalSwing;
      totalWeight += prefs.weightDiurnalSwing;
    }

    // Return weighted average, or 50 if no weights
    if (totalWeight > 0) {
      return Math.max(0, Math.min(100, totalScore / totalWeight));
    }
  }

  // Fallback: Legacy calculation using basic metrics
  return calculateLegacyClimateScore(metrics, prefs);
}

/**
 * Legacy climate score calculation (fallback when NOAA data unavailable)
 */
function calculateLegacyClimateScore(
  metrics: CityWithMetrics["metrics"],
  prefs: UserPreferences["advanced"]["climate"]
): number {
  if (!metrics) return 50;

  let score = 100;

  // Temperature score: penalty for deviation from ideal
  if (metrics.avgTemp !== null) {
    const tempDiff = Math.abs(metrics.avgTemp - prefs.idealTemp);
    score -= tempDiff * 2;
  }

  // Summer temperature penalty
  if (metrics.avgSummerTemp !== null && metrics.avgSummerTemp > prefs.maxSummerTemp) {
    score -= (metrics.avgSummerTemp - prefs.maxSummerTemp) * 3;
  }

  // Winter temperature penalty
  if (metrics.avgWinterTemp !== null && metrics.avgWinterTemp < prefs.minWinterTemp) {
    score -= (prefs.minWinterTemp - metrics.avgWinterTemp) * 3;
  }

  // Sunshine bonus/penalty
  if (metrics.daysOfSunshine !== null) {
    if (metrics.daysOfSunshine >= prefs.minSunshineDays) {
      score += 10;
    } else {
      score -= ((prefs.minSunshineDays - metrics.daysOfSunshine) / prefs.minSunshineDays) * 20;
    }
  }

  // Rain penalty
  if (metrics.daysOfRain !== null && metrics.daysOfRain > prefs.maxRainDays) {
    score -= ((metrics.daysOfRain - prefs.maxRainDays) / prefs.maxRainDays) * 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate cost of living score (0-100)
 * Higher score = better purchasing power / more affordable
 * 
 * Uses BEA "True Cost of Living" formula with persona-based adjustments:
 * 
 * RENTER: Standard BEA RPP (weighted by rental data)
 * HOMEOWNER: Goods + Services only (mortgage is fixed)
 * PROSPECTIVE BUYER: Uses current home prices + mortgage rates
 * 
 * Falls back to home price-based scoring if BEA data unavailable.
 */
function calculateCostScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const { housingSituation, includeUtilities } = preferences.advanced.costOfLiving;

  // Try to use BEA True Purchasing Power data (merged from metrics.json)
  const beaData = metrics.bea;
  
  if (beaData) {
    // Build options based on user's housing situation
    const options: CostOfLivingOptions = {
      housingSituation: housingSituation || "renter",
      includeUtilities: includeUtilities ?? true,
      medianHomePrice: metrics.medianHomePrice,
    };
    
    const trueCostOfLiving = calculateTrueCostOfLiving(beaData, options);
    
    if (trueCostOfLiving.truePurchasingPowerIndex !== null) {
      // Convert True Purchasing Power Index to a 0-100 score
      // Index: 100 = national average, higher = better
      // Score mapping:
      //   Index 80 (poor) -> Score ~30
      //   Index 100 (average) -> Score ~60
      //   Index 120 (excellent) -> Score ~90
      const index = trueCostOfLiving.truePurchasingPowerIndex;
      
      // Linear mapping: index 70-130 -> score 0-100
      const score = ((index - 70) / 60) * 100;
      return Math.max(0, Math.min(100, score));
    }
  }

  // Fallback: Use simple home price-based scoring if no BEA data
  // Home price score (inversely proportional)
  // $300K = 100, $1.5M = 0
  if (metrics.medianHomePrice !== null) {
    const price = metrics.medianHomePrice;
    return Math.max(0, 100 - ((price - 300000) / 1200000) * 100);
  }

  // No data available - return neutral score
  return 50;
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
  if (score >= 75) return "text-score-high";
  if (score >= 50) return "text-score-medium";
  return "text-score-low";
}

/**
 * Get background color class for a score
 */
export function getScoreBgColor(score: number): string {
  if (score >= 75) return "bg-score-high";
  if (score >= 50) return "bg-score-medium";
  return "bg-score-low";
}
