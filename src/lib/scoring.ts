import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { CityScore, ScoringResult } from "@/types/scores";
import { calculateTrueCostOfLiving, CostOfLivingOptions } from "@/lib/cost-of-living";

// ============================================================================
// NORMALIZATION CONSTANTS - U.S. Geographic Extremes
// These define the 0-100 bounds for range-based normalization
// ============================================================================

const CLIMATE_RANGES = {
  // Comfort Days (65-80°F): More is better
  comfortDays: { min: 50, max: 280 },         // ~50 (Buffalo) to ~267 (San Diego)
  // Extreme Heat Days (>95°F): Fewer is better (inverted)
  extremeHeatDays: { min: 0, max: 90 },       // 0 (coastal) to ~90 (Phoenix)
  // Freeze Days (<32°F): Fewer is better (inverted)
  freezeDays: { min: 0, max: 160 },           // 0 (Miami) to ~160 (Minneapolis)
  // Rain Days: Fewer is better (inverted)
  rainDays: { min: 30, max: 180 },            // ~30 (Phoenix) to ~180 (Seattle area)
  // Snow Days: Fewer is better (inverted)
  snowDays: { min: 0, max: 65 },              // 0 (SoCal) to ~65 (Buffalo)
  // Cloudy Days: Fewer is better (inverted)
  cloudyDays: { min: 50, max: 220 },          // ~50 (Phoenix) to ~220 (Seattle)
  // July Dewpoint: Lower is better (inverted)
  julyDewpoint: { min: 45, max: 75 },         // ~45 (desert) to ~75 (Houston)
  // Degree Days (CDD+HDD): Lower is better (inverted)
  degreeDays: { min: 2000, max: 9000 },       // ~2000 (San Diego) to ~9000 (Minneapolis)
  // Growing Season: More is better
  growingSeasonDays: { min: 120, max: 365 },  // ~120 (northern) to 365 (SoCal)
  // Seasonal Stability (temp stddev): Lower is better (inverted)
  seasonalStability: { min: 5, max: 28 },     // ~5 (San Diego) to ~28 (Minneapolis)
  // Diurnal Swing: Smaller is better (inverted)
  diurnalSwing: { min: 10, max: 35 },         // ~10 (coastal) to ~35 (desert)
};

// QoL metric ranges for percentile calculation
const QOL_RANGES = {
  // Walk Score: 0-100, higher is better
  walkScore: { min: 20, max: 95 },
  // Transit Score: 0-100, higher is better
  transitScore: { min: 0, max: 90 },
  // Bike Score: 0-100, higher is better
  bikeScore: { min: 20, max: 85 },
  // Violent Crime Rate: per 100K, lower is better (inverted)
  violentCrimeRate: { min: 80, max: 900 },
  // Healthy Air Days %: higher is better
  healthyDaysPercent: { min: 50, max: 98 },
  // Fiber Coverage %: higher is better
  fiberCoveragePercent: { min: 10, max: 95 },
  // Student-Teacher Ratio: lower is better (inverted)
  studentTeacherRatio: { min: 10, max: 25 },
  // Physicians per 100K: higher is better
  physiciansPer100k: { min: 30, max: 180 },
};

// Recreation metric ranges for range-based normalization
const RECREATION_RANGES = {
  // Trail miles within 10mi radius: higher is better
  trailMiles: { min: 0, max: 150 },           // 0 (flat cities) to 150+ (Denver, Seattle)
  // Park acres per 1K residents: higher is better
  parkAcres: { min: 5, max: 100 },            // ~5 (dense urban) to 100+ (nature-oriented)
  // Protected land %: higher is better
  protectedLandPercent: { min: 0, max: 30 },  // 0% to 30%+ (near national forests)
  // Max elevation delta (ft) in 30mi: higher is better for mountains
  elevationDelta: { min: 0, max: 4000 },      // 0 (flat) to 4000+ (Salt Lake, Denver)
};

// Urban lifestyle ranges for logarithmic/percentile normalization
const URBAN_LIFESTYLE_RANGES = {
  // Bars/clubs per 10K: uses logarithmic curve (critical mass at ~30)
  barsAndClubsPer10K: { min: 2, plateau: 30, max: 80 },   // 2 (small city) to 80+ (NYC)
  // Museums: uses logarithmic curve (critical mass at ~20)
  museums: { min: 0, plateau: 20, max: 100 },              // 0 to 100+ (DC, NYC)
  // Restaurants per 10K: uses logarithmic curve
  restaurantsPer10K: { min: 10, plateau: 50, max: 150 },   // 10 (rural) to 150+ (big cities)
  // Cuisine diversity (number of distinct types)
  cuisineDiversity: { min: 5, max: 50 },                   // 5 (limited) to 50+ (diverse metros)
};

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
function normalizeToRange(value: number, min: number, max: number, invert: boolean = false): number {
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
function toPercentileScore(value: number, allValues: number[], higherIsBetter: boolean = true): number {
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
function minorityPresenceScore(actualPct: number, targetPct: number): number {
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
function urbanAmenityScore(value: number, min: number, plateau: number, max: number): number {
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

// ============================================================================
// QoL PERCENTILE CACHE
// Pre-computed during scoring to avoid repeated calculations
// ============================================================================

interface QoLPercentiles {
  walkScores: number[];
  transitScores: number[];
  bikeScores: number[];
  crimeRates: number[];
  airQualityPcts: number[];
  fiberPcts: number[];
  studentTeacherRatios: number[];
  physicianRates: number[];
  // Recreation metrics
  trailMiles: number[];
  parkAcres: number[];
  elevationDeltas: number[];
}

function computeQoLPercentiles(cities: CityWithMetrics[]): QoLPercentiles {
  const percentiles: QoLPercentiles = {
    walkScores: [],
    transitScores: [],
    bikeScores: [],
    crimeRates: [],
    airQualityPcts: [],
    fiberPcts: [],
    studentTeacherRatios: [],
    physicianRates: [],
    trailMiles: [],
    parkAcres: [],
    elevationDeltas: [],
  };

  for (const city of cities) {
    const qol = city.metrics?.qol;
    if (!qol) continue;

    if (qol.walkability?.walkScore !== null && qol.walkability?.walkScore !== undefined) {
      percentiles.walkScores.push(qol.walkability.walkScore);
    }
    if (qol.walkability?.transitScore !== null && qol.walkability?.transitScore !== undefined) {
      percentiles.transitScores.push(qol.walkability.transitScore);
    }
    if (qol.walkability?.bikeScore !== null && qol.walkability?.bikeScore !== undefined) {
      percentiles.bikeScores.push(qol.walkability.bikeScore);
    }
    if (qol.crime?.violentCrimeRate !== null && qol.crime?.violentCrimeRate !== undefined) {
      percentiles.crimeRates.push(qol.crime.violentCrimeRate);
    }
    if (qol.airQuality?.healthyDaysPercent !== null && qol.airQuality?.healthyDaysPercent !== undefined) {
      percentiles.airQualityPcts.push(qol.airQuality.healthyDaysPercent);
    }
    if (qol.broadband?.fiberCoveragePercent !== null && qol.broadband?.fiberCoveragePercent !== undefined) {
      percentiles.fiberPcts.push(qol.broadband.fiberCoveragePercent);
    }
    if (qol.education?.studentTeacherRatio !== null && qol.education?.studentTeacherRatio !== undefined) {
      percentiles.studentTeacherRatios.push(qol.education.studentTeacherRatio);
    }
    if (qol.health?.primaryCarePhysiciansPer100k !== null && qol.health?.primaryCarePhysiciansPer100k !== undefined) {
      percentiles.physicianRates.push(qol.health.primaryCarePhysiciansPer100k);
    }
    
    // Recreation metrics
    const rec = qol.recreation;
    if (rec?.nature?.trailMilesWithin10Mi !== null && rec?.nature?.trailMilesWithin10Mi !== undefined) {
      percentiles.trailMiles.push(rec.nature.trailMilesWithin10Mi);
    }
    if (rec?.nature?.parkAcresPer1K !== null && rec?.nature?.parkAcresPer1K !== undefined) {
      percentiles.parkAcres.push(rec.nature.parkAcresPer1K);
    }
    if (rec?.geography?.maxElevationDelta !== null && rec?.geography?.maxElevationDelta !== undefined) {
      percentiles.elevationDeltas.push(rec.geography.maxElevationDelta);
    }
  }

  return percentiles;
}

// Global cache for percentiles (updated per scoring run)
let qolPercentilesCache: QoLPercentiles | null = null;

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
  qolPercentilesCache = computeQoLPercentiles(cities);

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

  // If NOAA data available, use range-based normalization with weighted scoring
  if (noaa) {
    let totalScore = 0;
    let totalWeight = 0;

    // T-Shirt Weather (comfort days: 65-80°F) - More is better
    if (prefs.weightComfortDays > 0 && noaa.comfortDays !== null) {
      // Range-based: 50 days = 0, 280 days = 100
      const comfortScore = normalizeToRange(
        noaa.comfortDays,
        CLIMATE_RANGES.comfortDays.min,
        CLIMATE_RANGES.comfortDays.max,
        false // higher is better
      );
      totalScore += comfortScore * prefs.weightComfortDays;
      totalWeight += prefs.weightComfortDays;
    }

    // Extreme Heat (>95°F) - Fewer is better
    if (prefs.weightExtremeHeat > 0 && noaa.extremeHeatDays !== null) {
      // Range-based: 0 days = 100, 90 days = 0
      const heatScore = normalizeToRange(
        noaa.extremeHeatDays,
        CLIMATE_RANGES.extremeHeatDays.min,
        CLIMATE_RANGES.extremeHeatDays.max,
        true // lower is better
      );
      totalScore += heatScore * prefs.weightExtremeHeat;
      totalWeight += prefs.weightExtremeHeat;
    }

    // Freeze Days (<32°F) - Fewer is better
    if (prefs.weightFreezeDays > 0 && noaa.freezeDays !== null) {
      // Range-based: 0 days = 100, 160 days = 0
      const freezeScore = normalizeToRange(
        noaa.freezeDays,
        CLIMATE_RANGES.freezeDays.min,
        CLIMATE_RANGES.freezeDays.max,
        true // lower is better
      );
      totalScore += freezeScore * prefs.weightFreezeDays;
      totalWeight += prefs.weightFreezeDays;
    }

    // Rain Days - Fewer is better
    if (prefs.weightRainDays > 0 && noaa.rainDays !== null) {
      // Range-based: 30 days = 100, 180 days = 0
      const rainScore = normalizeToRange(
        noaa.rainDays,
        CLIMATE_RANGES.rainDays.min,
        CLIMATE_RANGES.rainDays.max,
        true // lower is better
      );
      totalScore += rainScore * prefs.weightRainDays;
      totalWeight += prefs.weightRainDays;
    }

    // Snow Days - Fewer is better
    if (prefs.weightSnowDays > 0 && noaa.snowDays !== null) {
      // Range-based: 0 days = 100, 65 days = 0
      const snowScore = normalizeToRange(
        noaa.snowDays,
        CLIMATE_RANGES.snowDays.min,
        CLIMATE_RANGES.snowDays.max,
        true // lower is better
      );
      totalScore += snowScore * prefs.weightSnowDays;
      totalWeight += prefs.weightSnowDays;
    }

    // Cloudy Days / Gloom Factor - Fewer is better
    if (prefs.weightCloudyDays > 0 && noaa.cloudyDays !== null) {
      // Range-based: 50 days = 100, 220 days = 0
      const cloudyScore = normalizeToRange(
        noaa.cloudyDays,
        CLIMATE_RANGES.cloudyDays.min,
        CLIMATE_RANGES.cloudyDays.max,
        true // lower is better
      );
      totalScore += cloudyScore * prefs.weightCloudyDays;
      totalWeight += prefs.weightCloudyDays;
    }

    // Humidity / Stickiness (July dewpoint) - Lower is better
    if (prefs.weightHumidity > 0 && noaa.julyDewpoint !== null) {
      // Range-based: 45°F = 100, 75°F = 0
      const humidityScore = normalizeToRange(
        noaa.julyDewpoint,
        CLIMATE_RANGES.julyDewpoint.min,
        CLIMATE_RANGES.julyDewpoint.max,
        true // lower is better
      );
      totalScore += humidityScore * prefs.weightHumidity;
      totalWeight += prefs.weightHumidity;
    }

    // Utility Costs (CDD+HDD) - Lower is better
    if (prefs.weightUtilityCosts > 0 && 
        noaa.coolingDegreeDays !== null && 
        noaa.heatingDegreeDays !== null) {
      const totalDegreeDays = noaa.coolingDegreeDays + noaa.heatingDegreeDays;
      // Range-based: 2000 = 100 (San Diego), 9000 = 0 (Minneapolis)
      const utilityScore = normalizeToRange(
        totalDegreeDays,
        CLIMATE_RANGES.degreeDays.min,
        CLIMATE_RANGES.degreeDays.max,
        true // lower is better
      );
      totalScore += utilityScore * prefs.weightUtilityCosts;
      totalWeight += prefs.weightUtilityCosts;
    }

    // Growing Season - More is better
    if (prefs.weightGrowingSeason > 0 && noaa.growingSeasonDays !== null) {
      // Range-based: 120 days = 0, 365 days = 100
      const growScore = normalizeToRange(
        noaa.growingSeasonDays,
        CLIMATE_RANGES.growingSeasonDays.min,
        CLIMATE_RANGES.growingSeasonDays.max,
        false // higher is better
      );
      totalScore += growScore * prefs.weightGrowingSeason;
      totalWeight += prefs.weightGrowingSeason;
    }

    // Seasonal Stability (temp stddev) - Lower is better
    if (prefs.weightSeasonalStability > 0 && noaa.seasonalStability !== null) {
      // Range-based: 5 = 100 (San Diego), 28 = 0 (Minneapolis)
      const stabilityScore = normalizeToRange(
        noaa.seasonalStability,
        CLIMATE_RANGES.seasonalStability.min,
        CLIMATE_RANGES.seasonalStability.max,
        true // lower is better
      );
      totalScore += stabilityScore * prefs.weightSeasonalStability;
      totalWeight += prefs.weightSeasonalStability;
    }

    // Diurnal Swing - Smaller is better
    if (prefs.weightDiurnalSwing > 0 && noaa.diurnalSwing !== null) {
      // Range-based: 10 = 100 (coastal), 35 = 0 (desert)
      const swingScore = normalizeToRange(
        noaa.diurnalSwing,
        CLIMATE_RANGES.diurnalSwing.min,
        CLIMATE_RANGES.diurnalSwing.max,
        true // lower is better
      );
      totalScore += swingScore * prefs.weightDiurnalSwing;
      totalWeight += prefs.weightDiurnalSwing;
    }

    // Return weighted average, or 50 (national average) if no weights
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
 * Uses BEA "True Cost of Living" formula with DUAL PERSONA adjustments:
 * 
 * HOUSING PERSONA (affects cost denominator - RPP):
 *   RENTER: Standard BEA RPP (weighted by rental data)
 *   HOMEOWNER: Goods + Services only (mortgage is fixed)
 *   PROSPECTIVE BUYER: Uses current home prices + mortgage rates
 * 
 * WORK PERSONA (affects income numerator):
 *   STANDARD: Median Household Income (Census ACS) - less skewed by high earners
 *   HIGH-EARNER: Per Capita Income (BEA) - reflects tech/gov/law markets
 *   RETIREE: User-defined fixed income
 * 
 * Falls back to home price-based scoring if BEA data unavailable.
 */
function calculateCostScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const { 
    housingSituation, 
    includeUtilities,
    workSituation,
    retireeFixedIncome
  } = preferences.advanced.costOfLiving;

  // Try to use BEA True Purchasing Power data (merged from metrics.json)
  const beaData = metrics.bea;
  
  if (beaData) {
    // Build options based on user's housing AND work situation
    const options: CostOfLivingOptions = {
      // Housing persona (affects cost/RPP)
      housingSituation: housingSituation || "renter",
      includeUtilities: includeUtilities ?? true,
      medianHomePrice: metrics.medianHomePrice,
      // Work persona (affects income)
      workSituation: workSituation || "standard",
      medianHouseholdIncome: metrics.census?.medianHouseholdIncome ?? null,
      retireeFixedIncome: retireeFixedIncome ?? 50000,
      // State for accurate tax calculation (retiree/standard personas)
      state: city.state,
      // Property tax rate for homeowner calculations
      propertyTaxRate: metrics.propertyTaxRate,
    };
    
    const trueCostOfLiving = calculateTrueCostOfLiving(beaData, options);
    
    if (trueCostOfLiving.truePurchasingPowerIndex !== null) {
      // Convert True Purchasing Power Index to a 0-100 score
      // Index: 100 = national average, higher = better
      // 
      // The index represents purchasing power relative to baseline:
      //   Index 80 = 80% of baseline purchasing power (expensive city)
      //   Index 100 = same as baseline (average city)
      //   Index 120 = 120% of baseline (affordable city)
      //
      // Score mapping (linear, centered at 50):
      //   Index 60 -> Score 20  (very expensive)
      //   Index 80 -> Score 35  (expensive)
      //   Index 100 -> Score 50 (average)
      //   Index 120 -> Score 65 (affordable)
      //   Index 140 -> Score 80 (very affordable)
      //
      // Formula: score = 50 + (index - 100) * 0.75
      // This gives ±30 points for ±40 index deviation
      const index = trueCostOfLiving.truePurchasingPowerIndex;
      
      const score = 50 + (index - 100) * 0.75;
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
 * Calculate dating favorability score (0-100)
 * Sub-score for demographics that considers:
 * - Pool: Gender ratio + never-married % in target age bracket
 * - Economic: Disposable income for dating ("date tax")
 * - Alignment: Political preference match
 * - Walk/Safety: Walkability and safety for meeting people
 */
function calculateDatingFavorability(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const census = metrics.census;
  const bea = metrics.bea;
  const qol = metrics.qol;
  const cultural = metrics.cultural;
  const prefs = preferences.advanced.demographics;
  const culturalPrefs = preferences.advanced.cultural;
  
  // Dating preferences
  const seekingGender = prefs.seekingGender;
  const ageRange = prefs.datingAgeRange;
  
  // If no seeking gender specified, can't calculate properly
  if (!seekingGender) {
    return 50; // Neutral
  }
  
  // === POOL SCORE (40%) ===
  // Gender ratio: seeking women prefers ratio < 100, seeking men prefers ratio > 100
  // Never married %: higher is better for dating pool
  let poolScore = 50;
  let poolFactors = 0;
  
  // Get the appropriate gender ratio for age range
  let genderRatio: { male: number; female: number; ratio: number } | null = null;
  if (census?.genderRatios) {
    switch (ageRange) {
      case "20-29": genderRatio = census.genderRatios.age20to29; break;
      case "30-39": genderRatio = census.genderRatios.age30to39; break;
      case "40-49": genderRatio = census.genderRatios.age40to49; break;
      default: genderRatio = census.genderRatios.overall; // Use overall if no age specified
    }
  }
  
  if (genderRatio) {
    const ratio = genderRatio.ratio; // males per 100 females
    
    if (seekingGender === "women") {
      // Looking for women: more women is better (ratio < 100)
      // Ratio 85 = very favorable (100 pts), ratio 100 = neutral (50), ratio 115 = unfavorable (0)
      const favorability = Math.max(0, Math.min(100, 100 - (ratio - 85) * (100 / 30)));
      poolScore += favorability;
      poolFactors++;
    } else {
      // Looking for men: more men is better (ratio > 100)
      // Ratio 115 = very favorable (100 pts), ratio 100 = neutral (50), ratio 85 = unfavorable (0)
      const favorability = Math.max(0, Math.min(100, (ratio - 85) * (100 / 30)));
      poolScore += favorability;
      poolFactors++;
    }
  }
  
  // Never married percentage (for the relevant gender being sought)
  if (census) {
    const neverMarriedPct = seekingGender === "women" 
      ? census.neverMarriedFemalePercent
      : census.neverMarriedMalePercent;
    
    if (neverMarriedPct !== null && neverMarriedPct !== undefined) {
      // Higher never-married % = larger dating pool
      // 25% = below average (40), 35% = average (60), 45%+ = excellent (90+)
      const neverMarriedScore = Math.min(100, 30 + neverMarriedPct * 1.5);
      poolScore += neverMarriedScore;
      poolFactors++;
    }
  }
  
  if (poolFactors > 0) {
    poolScore = poolScore / poolFactors;
  }
  
  // === ECONOMIC SCORE (30%) - "Date Tax" ===
  // Disposable income after rent affects dating affordability
  let econScore = 50;
  
  if (bea && census?.medianHouseholdIncome) {
    // Calculate disposable income (income - estimated annual rent)
    // Use RPP housing as proxy for rent costs
    const income = census.medianHouseholdIncome;
    const housingRPP = bea.regionalPriceParity?.housing || 100;
    
    // Estimate annual rent: national median ~$1400/mo = $16,800/yr
    // Adjust by local housing RPP
    const estimatedAnnualRent = 16800 * (housingRPP / 100);
    const disposableIncome = income - estimatedAnnualRent;
    
    // Rent-to-income ratio (< 30% is healthy)
    const rentToIncomeRatio = estimatedAnnualRent / income;
    
    // Score: $30K disposable = 40, $50K = 65, $70K+ = 90
    let incomeScore = Math.min(100, 20 + (disposableIncome / 1000));
    
    // Bonus/penalty for rent burden
    if (rentToIncomeRatio < 0.25) {
      incomeScore += 10; // Very affordable
    } else if (rentToIncomeRatio > 0.35) {
      incomeScore -= 15; // Rent-burdened
    } else if (rentToIncomeRatio > 0.30) {
      incomeScore -= 5;
    }
    
    econScore = Math.max(0, Math.min(100, incomeScore));
  }
  
  // === ALIGNMENT SCORE (20%) - Political Match ===
  // Use user's partisan preference to score alignment
  let alignScore = 50; // Neutral if no preference
  
  const political = cultural?.political;
  const partisanPref = culturalPrefs.partisanPreference;
  
  if (political && political.partisanIndex !== null && partisanPref !== "neutral") {
    const pi = political.partisanIndex; // -1 (R) to +1 (D)
    
    // Map preference to target PI
    const prefToPi: Record<string, number> = {
      "strong-dem": 0.6,
      "lean-dem": 0.2,
      "swing": 0,
      "lean-rep": -0.2,
      "strong-rep": -0.6,
    };
    
    const targetPi = prefToPi[partisanPref] ?? 0;
    const distance = Math.abs(pi - targetPi);
    
    // Distance 0 = 100, distance 1.2 (max) = 0
    alignScore = Math.max(0, 100 - (distance / 1.2) * 100);
  }
  
  // === WALK/SAFETY SCORE (10%) ===
  // Walkability for serendipitous meetings + safety
  let walkSafeScore = 50;
  let walkSafeFactors = 0;
  
  // Walk Score (higher = more walkable = easier to meet people)
  if (qol?.walkability?.walkScore !== null && qol?.walkability?.walkScore !== undefined) {
    const ws = qol.walkability.walkScore;
    // Walk Score: 70+ = good for dating (bonus), 50-70 = ok, <50 = car-dependent (penalty)
    const walkability = ws >= 70 ? Math.min(100, 60 + ws * 0.5) 
                      : ws >= 50 ? 50 + (ws - 50) * 0.5
                      : Math.max(20, ws);
    walkSafeScore += walkability;
    walkSafeFactors++;
  }
  
  // Safety (lower crime = more comfortable meeting strangers)
  if (qol?.crime?.violentCrimeRate !== null && qol?.crime?.violentCrimeRate !== undefined) {
    const crimeRate = qol.crime.violentCrimeRate;
    // National avg ~380/100K; lower is better
    // 200 = 90 pts, 400 = 60, 600 = 30
    const safetyScore = Math.max(10, Math.min(100, 100 - (crimeRate - 100) * 0.1));
    walkSafeScore += safetyScore;
    walkSafeFactors++;
  }
  
  if (walkSafeFactors > 0) {
    walkSafeScore = walkSafeScore / walkSafeFactors;
  }
  
  // === FINAL WEIGHTED SCORE ===
  // Pool 40% + Economic 30% + Alignment 20% + Walk/Safety 10%
  const finalScore = (
    poolScore * 0.40 +
    econScore * 0.30 +
    alignScore * 0.20 +
    walkSafeScore * 0.10
  );
  
  return Math.max(0, Math.min(100, finalScore));
}

/**
 * Calculate demographics score (0-100) using Census ACS data
 */
function calculateDemographicsScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const census = metrics.census;
  const prefs = preferences.advanced.demographics;

  // If no Census data, return neutral score
  if (!census) {
    return 50;
  }

  let totalScore = 0;
  let totalWeight = 0;

  // === Population Filter (hard requirement, not weighted) ===
  if (prefs.minPopulation > 0 && census.totalPopulation !== null) {
    if (census.totalPopulation < prefs.minPopulation) {
      return 30; // Significant penalty for not meeting minimum
    }
  }

  // === Diversity (weighted) ===
  if (prefs.weightDiversity > 0 && census.diversityIndex !== null) {
    let diversityScore = 50; // Base score
    if (census.diversityIndex >= prefs.minDiversityIndex) {
      // Scale score: 0 diversity = 0, 70+ diversity = 100
      diversityScore = Math.min(100, (census.diversityIndex / 70) * 100);
    } else {
      // Penalty for not meeting minimum
      diversityScore = Math.max(0, 50 - (prefs.minDiversityIndex - census.diversityIndex) * 2);
    }
    totalScore += diversityScore * prefs.weightDiversity;
    totalWeight += prefs.weightDiversity;
  }

  // === Age Demographics (weighted) ===
  if (prefs.weightAge > 0 && census.medianAge !== null) {
    let ageScore = 50;
    const medianAge = census.medianAge;
    
    switch (prefs.preferredAgeGroup) {
      case "young":
        // Prefer median age < 35 (college towns, young professionals)
        ageScore = medianAge < 30 ? 100 : medianAge < 35 ? 80 : medianAge < 40 ? 50 : 20;
        break;
      case "mixed":
        // Prefer median age 35-45 (family hubs)
        ageScore = medianAge >= 35 && medianAge <= 45 ? 100 : 
                   medianAge >= 30 && medianAge <= 50 ? 70 : 40;
        break;
      case "mature":
        // Prefer median age > 45 (retirement communities)
        ageScore = medianAge > 50 ? 100 : medianAge > 45 ? 80 : medianAge > 40 ? 50 : 20;
        break;
      case "any":
      default:
        ageScore = 70; // Neutral score
    }
    totalScore += ageScore * prefs.weightAge;
    totalWeight += prefs.weightAge;
  }

  // === Education (weighted) ===
  if (prefs.weightEducation > 0 && census.bachelorsOrHigherPercent !== null) {
    let educationScore = 50;
    const bachelorsPct = census.bachelorsOrHigherPercent;
    
    if (bachelorsPct >= prefs.minBachelorsPercent) {
      // Scale: 20% = 40, 40% = 80, 60%+ = 100
      educationScore = Math.min(100, 20 + (bachelorsPct * 1.3));
    } else {
      educationScore = Math.max(0, 50 - (prefs.minBachelorsPercent - bachelorsPct) * 2);
    }
    totalScore += educationScore * prefs.weightEducation;
    totalWeight += prefs.weightEducation;
  }

  // === Foreign-Born / International Culture (weighted) ===
  if (prefs.weightForeignBorn > 0 && census.foreignBornPercent !== null) {
    let foreignBornScore = 50;
    const fbPct = census.foreignBornPercent;
    
    if (fbPct >= prefs.minForeignBornPercent) {
      // Scale: 10% = 50, 30%+ = 100
      foreignBornScore = Math.min(100, 30 + (fbPct * 2.3));
    } else {
      foreignBornScore = Math.max(0, 50 - (prefs.minForeignBornPercent - fbPct) * 3);
    }
    totalScore += foreignBornScore * prefs.weightForeignBorn;
    totalWeight += prefs.weightForeignBorn;
  }

  // === Minority Community (weighted) ===
  // Only factor in if a group is selected (not "none")
  if (prefs.minorityGroup !== "none") {
    let minorityScore = 50;
    
    // Determine which percentage to use (subgroup or main group)
    let actualPct: number | null = null;
    
    // Check for specific subgroup first (Hispanic or Asian)
    if (prefs.minoritySubgroup !== "any") {
      // Hispanic subgroups
      if (prefs.minorityGroup === "hispanic") {
        switch (prefs.minoritySubgroup) {
          case "mexican": actualPct = census.mexicanPercent; break;
          case "puerto-rican": actualPct = census.puertoRicanPercent; break;
          case "cuban": actualPct = census.cubanPercent; break;
          case "salvadoran": actualPct = census.salvadoranPercent; break;
          case "guatemalan": actualPct = census.guatemalanPercent; break;
          case "colombian": actualPct = census.colombianPercent; break;
        }
      }
      // Asian subgroups
      else if (prefs.minorityGroup === "asian") {
        switch (prefs.minoritySubgroup) {
          case "chinese": actualPct = census.chinesePercent; break;
          case "indian": actualPct = census.indianPercent; break;
          case "filipino": actualPct = census.filipinoPercent; break;
          case "vietnamese": actualPct = census.vietnamesePercent; break;
          case "korean": actualPct = census.koreanPercent; break;
          case "japanese": actualPct = census.japanesePercent; break;
        }
      }
    }
    
    // Fall back to main group percentage if no subgroup or subgroup not found
    if (actualPct === null) {
      switch (prefs.minorityGroup) {
        case "hispanic": actualPct = census.hispanicPercent; break;
        case "black": actualPct = census.blackPercent; break;
        case "asian": actualPct = census.asianPercent; break;
        case "pacific-islander": actualPct = census.pacificIslanderPercent; break;
        case "native-american": actualPct = census.nativeAmericanPercent; break;
      }
    }
    
    if (actualPct !== null) {
      const minPresence = prefs.minMinorityPresence;
      
      // Use logarithmic "Critical Mass" curve - diminishing returns above threshold
      // This reflects reality: 25%+ presence plateaus in practical benefit (grocery stores,
      // restaurants, cultural events) - 40% doesn't offer 2x the benefit of 20%
      minorityScore = minorityPresenceScore(actualPct, minPresence);
    }
    
    totalScore += minorityScore * prefs.minorityImportance;
    totalWeight += prefs.minorityImportance;
  }

  // === Economic Health (weighted) ===
  if (prefs.weightEconomicHealth > 0) {
    let economicScore = 50;
    let factors = 0;
    let factorSum = 0;
    
    // Median household income
    if (census.medianHouseholdIncome !== null) {
      const income = census.medianHouseholdIncome;
      if (income >= prefs.minMedianHouseholdIncome) {
        // Scale: $50K = 40, $80K = 70, $120K+ = 100
        factorSum += Math.min(100, (income / 1200));
      } else {
        factorSum += Math.max(0, 50 - (prefs.minMedianHouseholdIncome - income) / 1000);
      }
      factors++;
    }
    
    // Poverty rate (inverse - lower is better)
    if (census.povertyRate !== null) {
      const poverty = census.povertyRate;
      if (poverty <= prefs.maxPovertyRate) {
        // Scale: 5% = 100, 15% = 60, 25% = 20
        factorSum += Math.max(0, 120 - poverty * 4);
      } else {
        factorSum += Math.max(0, 30 - (poverty - prefs.maxPovertyRate) * 3);
      }
      factors++;
    }
    
    if (factors > 0) {
      economicScore = factorSum / factors;
    }
    
    totalScore += economicScore * prefs.weightEconomicHealth;
    totalWeight += prefs.weightEconomicHealth;
  }

  // If no weights were set, return a neutral score (50 = national average)
  if (totalWeight === 0) {
    // But if dating is enabled, return dating score instead
    if (prefs.datingEnabled && prefs.datingWeight > 0) {
      const datingScore = calculateDatingFavorability(city, preferences);
      return datingScore;
    }
    return 50;
  }

  // Calculate base demographics score
  let baseScore = Math.max(0, Math.min(100, totalScore / totalWeight));
  
  // === DATING FAVORABILITY INTEGRATION ===
  // If dating is enabled, blend the dating score into demographics
  if (prefs.datingEnabled && prefs.datingWeight > 0) {
    const datingScore = calculateDatingFavorability(city, preferences);
    
    // datingWeight: 0 = ignore dating, 50 = 50/50 blend, 100 = dating only
    const datingInfluence = prefs.datingWeight / 100;
    baseScore = baseScore * (1 - datingInfluence) + datingScore * datingInfluence;
  }
  
  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Calculate quality of life score (0-100)
 */
function calculateQualityOfLifeScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const qol = metrics.qol;
  const prefs = preferences.advanced.qualityOfLife;
  const percentiles = qolPercentilesCache;

  // If QoL API data is available, use percentile-based scoring
  if (qol) {
    let totalScore = 0;
    let totalWeight = 0;
    const weights = prefs.weights;

    // Walkability (Walk Score API) - Percentile-based
    if (weights.walkability > 0 && qol.walkability) {
      let walkScore = 50;
      const w = qol.walkability;
      let scoreSum = 0;
      let scoreCount = 0;
      
      // Use percentile ranking for each sub-score
      if (w.walkScore !== null && percentiles?.walkScores.length) {
        const pctScore = toPercentileScore(w.walkScore, percentiles.walkScores, true);
        // Apply threshold penalty if below minimum
        const adjusted = w.walkScore >= prefs.minWalkScore
          ? pctScore
          : Math.max(0, pctScore - (prefs.minWalkScore - w.walkScore) * 0.5);
        scoreSum += adjusted;
        scoreCount++;
      }
      if (w.transitScore !== null && percentiles?.transitScores.length) {
        const pctScore = toPercentileScore(w.transitScore, percentiles.transitScores, true);
        const adjusted = w.transitScore >= prefs.minTransitScore
          ? pctScore
          : Math.max(0, pctScore - (prefs.minTransitScore - w.transitScore) * 0.5);
        scoreSum += adjusted;
        scoreCount++;
      }
      if (w.bikeScore !== null && percentiles?.bikeScores.length) {
        scoreSum += toPercentileScore(w.bikeScore, percentiles.bikeScores, true);
        scoreCount++;
      }
      
      if (scoreCount > 0) {
        walkScore = scoreSum / scoreCount;
      }
      
      totalScore += walkScore * weights.walkability;
      totalWeight += weights.walkability;
    }

    // Safety (FBI Crime Data) - Percentile-based
    if (weights.safety > 0 && qol.crime) {
      let safetyScore = 50;
      const c = qol.crime;
      
      if (c.violentCrimeRate !== null && percentiles?.crimeRates.length) {
        // Percentile ranking - lower crime = higher score (inverted)
        safetyScore = toPercentileScore(c.violentCrimeRate, percentiles.crimeRates, false);
        
        // Penalty if exceeds user threshold
        if (c.violentCrimeRate > prefs.maxViolentCrimeRate) {
          safetyScore -= Math.min(25, ((c.violentCrimeRate - prefs.maxViolentCrimeRate) / prefs.maxViolentCrimeRate) * 30);
        }
        
        // Bonus for falling crime trend
        if (prefs.preferFallingCrime && c.trend3Year === "falling") {
          safetyScore += 8;
        } else if (c.trend3Year === "rising") {
          safetyScore -= 5;
        }
      }
      
      totalScore += Math.max(0, Math.min(100, safetyScore)) * weights.safety;
      totalWeight += weights.safety;
    }

    // Air Quality (EPA AirNow) - Percentile-based
    if (weights.airQuality > 0 && qol.airQuality) {
      let airScore = 50;
      const a = qol.airQuality;
      
      if (a.healthyDaysPercent !== null && percentiles?.airQualityPcts.length) {
        // Percentile ranking - higher healthy days = higher score
        airScore = toPercentileScore(a.healthyDaysPercent, percentiles.airQualityPcts, true);
      }
      
      if (a.hazardousDays !== null && prefs.maxHazardousDays > 0) {
        if (a.hazardousDays > prefs.maxHazardousDays) {
          airScore -= Math.min(25, ((a.hazardousDays - prefs.maxHazardousDays) / prefs.maxHazardousDays) * 30);
        }
      }
      
      totalScore += Math.max(0, Math.min(100, airScore)) * weights.airQuality;
      totalWeight += weights.airQuality;
    }

    // Internet (FCC Broadband) - Percentile-based
    if (weights.internet > 0 && qol.broadband) {
      let internetScore = 50;
      const b = qol.broadband;
      
      if (b.fiberCoveragePercent !== null && percentiles?.fiberPcts.length) {
        // Percentile ranking - higher fiber coverage = higher score
        internetScore = toPercentileScore(b.fiberCoveragePercent, percentiles.fiberPcts, true);
        
        // Bonus for competition (multiple providers)
        if (b.providerCount !== null && b.providerCount >= prefs.minProviders) {
          internetScore += Math.min(15, (b.providerCount - 1) * 4);
        }
        
        // Penalty if fiber required but not available
        if (prefs.requireFiber && b.fiberCoveragePercent < 50) {
          internetScore -= 20;
        }
      }
      
      totalScore += Math.max(0, Math.min(100, internetScore)) * weights.internet;
      totalWeight += weights.internet;
    }

    // Schools (NCES Education) - Percentile-based
    if (weights.schools > 0 && qol.education) {
      let schoolScore = 50;
      const e = qol.education;
      
      if (e.studentTeacherRatio !== null && percentiles?.studentTeacherRatios.length) {
        // Percentile ranking - lower ratio = higher score (inverted)
        schoolScore = toPercentileScore(e.studentTeacherRatio, percentiles.studentTeacherRatios, false);
        
        if (e.studentTeacherRatio > prefs.maxStudentTeacherRatio) {
          schoolScore -= 15;
        }
      }
      
      if (e.graduationRate !== null) {
        // Factor in graduation rate (blend with percentile score)
        schoolScore = (schoolScore * 0.6 + e.graduationRate * 0.4);
      }
      
      totalScore += Math.max(0, Math.min(100, schoolScore)) * weights.schools;
      totalWeight += weights.schools;
    }

    // Healthcare (HRSA) - Percentile-based
    if (weights.healthcare > 0 && qol.health) {
      let healthScore = 50;
      const h = qol.health;
      
      if (h.primaryCarePhysiciansPer100k !== null && percentiles?.physicianRates.length) {
        // Percentile ranking - higher physician rate = higher score
        healthScore = toPercentileScore(h.primaryCarePhysiciansPer100k, percentiles.physicianRates, true);
        
        if (h.primaryCarePhysiciansPer100k < prefs.minPhysiciansPer100k) {
          healthScore -= 15;
        }
      }
      
      // HPSA score (lower = better, means less shortage)
      if (h.hpsaScore !== null) {
        // HPSA 0 = no shortage, 25+ = severe
        healthScore -= Math.min(25, h.hpsaScore);
      }
      
      totalScore += Math.max(0, Math.min(100, healthScore)) * weights.healthcare;
      totalWeight += weights.healthcare;
    }

    // Recreation & Outdoor Access (NEW) - Mixed percentile and range-based
    if (weights.recreation > 0 && qol.recreation) {
      let recreationScore = 50;
      const rec = qol.recreation;
      const natureWeight = prefs.natureImportance;
      const beachWeight = prefs.beachImportance;
      const mountainWeight = prefs.mountainImportance;
      const subTotal = natureWeight + beachWeight + mountainWeight;
      
      if (subTotal > 0) {
        let natureScore = 50;
        let beachScore = 50;
        let mountainScore = 50;
        
        // Nature scoring (parks + trails + protected land) - Percentile-based
        if (rec.nature && natureWeight > 0) {
          let natureSubScores = 0;
          let natureSubCount = 0;
          
          // Trail miles - percentile if we have data, else range-based
          if (rec.nature.trailMilesWithin10Mi !== null) {
            if (percentiles?.trailMiles.length) {
              natureSubScores += toPercentileScore(rec.nature.trailMilesWithin10Mi, percentiles.trailMiles, true);
            } else {
              natureSubScores += normalizeToRange(rec.nature.trailMilesWithin10Mi, 
                RECREATION_RANGES.trailMiles.min, RECREATION_RANGES.trailMiles.max, false);
            }
            natureSubCount++;
          }
          
          // Park acres - percentile if we have data, else range-based
          if (rec.nature.parkAcresPer1K !== null) {
            if (percentiles?.parkAcres.length) {
              natureSubScores += toPercentileScore(rec.nature.parkAcresPer1K, percentiles.parkAcres, true);
            } else {
              natureSubScores += normalizeToRange(rec.nature.parkAcresPer1K,
                RECREATION_RANGES.parkAcres.min, RECREATION_RANGES.parkAcres.max, false);
            }
            natureSubCount++;
          }
          
          // Protected land percentage - range-based
          if (rec.nature.protectedLandPercent !== null) {
            natureSubScores += normalizeToRange(rec.nature.protectedLandPercent,
              RECREATION_RANGES.protectedLandPercent.min, RECREATION_RANGES.protectedLandPercent.max, false);
            natureSubCount++;
          }
          
          if (natureSubCount > 0) {
            natureScore = natureSubScores / natureSubCount;
          }
        }
        
        // Beach scoring - Binary bonus + distance decay
        if (rec.geography && beachWeight > 0) {
          if (rec.geography.coastlineWithin15Mi) {
            // Full score if within 15 miles
            beachScore = 100;
            // Small bonus for water quality
            if (rec.geography.waterQualityIndex !== null && rec.geography.waterQualityIndex >= 70) {
              beachScore = Math.min(100, beachScore + 5);
            }
          } else if (rec.geography.coastlineDistanceMi !== null && rec.geography.coastlineDistanceMi <= 100) {
            // Distance decay: 15mi = 100, 50mi = 50, 100mi = 0
            beachScore = Math.max(0, 100 - (rec.geography.coastlineDistanceMi - 15) * 1.2);
          } else {
            // No ocean access
            beachScore = 0;
          }
        }
        
        // Mountain scoring - Range-based on elevation delta
        if (rec.geography && mountainWeight > 0) {
          if (rec.geography.maxElevationDelta !== null) {
            // Use percentile if available, else range-based
            if (percentiles?.elevationDeltas.length) {
              mountainScore = toPercentileScore(rec.geography.maxElevationDelta, percentiles.elevationDeltas, true);
            } else {
              mountainScore = normalizeToRange(rec.geography.maxElevationDelta,
                RECREATION_RANGES.elevationDelta.min, RECREATION_RANGES.elevationDelta.max, false);
            }
            
            // Bonus for nearby ski resorts
            if (rec.geography.nearestSkiResortMi !== null && rec.geography.nearestSkiResortMi <= 60) {
              mountainScore = Math.min(100, mountainScore + 10);
            }
          } else {
            // No elevation data - flat city
            mountainScore = 0;
          }
        }
        
        // Weighted average of sub-scores
        recreationScore = (
          natureScore * natureWeight +
          beachScore * beachWeight +
          mountainScore * mountainWeight
        ) / subTotal;
      }
      
      totalScore += Math.max(0, Math.min(100, recreationScore)) * weights.recreation;
      totalWeight += weights.recreation;
    }

    if (totalWeight > 0) {
      return Math.max(0, Math.min(100, totalScore / totalWeight));
    }
  }

  // No QoL data available - return neutral score
  return 50;
}

/**
 * Calculate cultural score (0-100) based on political and religious preferences
 * 
 * Political scoring based on partisan index match and voter turnout
 * Religious scoring based on tradition presence and diversity
 */
export function calculateCulturalScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const cultural = metrics.cultural;
  const prefs = preferences.advanced.cultural;

  // If no cultural data or all preferences are neutral/zero, return neutral score (50 = national avg)
  if (!cultural) {
    return 50;
  }

  let totalScore = 0;
  let totalWeight = 0;

  // === POLITICAL SCORING ===
  const political = cultural.political;
  
  if (prefs.partisanPreference !== "neutral" && political && prefs.partisanWeight > 0) {
    let politicalScore = 70; // Base score
    const pi = political.partisanIndex ?? 0; // -1 (strong R) to +1 (strong D)
    
    // Map user preference to a target PI value
    const prefToPi: Record<string, number> = {
      "strong-dem": 0.6,
      "lean-dem": 0.2,
      "swing": 0,
      "lean-rep": -0.2,
      "strong-rep": -0.6,
    };
    
    const targetPi = prefToPi[prefs.partisanPreference] ?? 0;
    
    if (prefs.partisanPreference === "swing") {
      // For swing preference, reward cities with |PI| < 0.1 (competitive)
      const absMargin = Math.abs(pi);
      if (absMargin < 0.05) {
        politicalScore = 100; // Very competitive
      } else if (absMargin < 0.10) {
        politicalScore = 90; // Competitive
      } else if (absMargin < 0.15) {
        politicalScore = 75;
      } else if (absMargin < 0.25) {
        politicalScore = 50;
      } else {
        politicalScore = 30; // Not competitive at all
      }
    } else {
      // For partisan preferences, measure alignment
      const distance = Math.abs(pi - targetPi);
      
      if (distance < 0.1) {
        // Very aligned
        politicalScore = 100;
      } else if (distance < 0.2) {
        // Aligned
        politicalScore = 85;
      } else if (distance < 0.4) {
        // Somewhat aligned
        politicalScore = 65;
      } else if (distance < 0.6) {
        // Opposite direction
        politicalScore = 40;
      } else {
        // Strongly opposite
        politicalScore = 20;
      }
    }
    
    // Bonus for high voter turnout if preferred
    if (prefs.preferHighTurnout && political.voterTurnout !== null) {
      if (political.voterTurnout >= 70) {
        politicalScore += 10;
      } else if (political.voterTurnout >= 65) {
        politicalScore += 5;
      } else if (political.voterTurnout < 55) {
        politicalScore -= 5;
      }
    }
    
    politicalScore = Math.max(0, Math.min(100, politicalScore));
    totalScore += politicalScore * prefs.partisanWeight;
    totalWeight += prefs.partisanWeight;
  } else if (prefs.preferHighTurnout && political && political.voterTurnout !== null) {
    // If only turnout preference is set (no partisan preference)
    let turnoutScore = 70;
    if (political.voterTurnout >= 75) {
      turnoutScore = 100;
    } else if (political.voterTurnout >= 70) {
      turnoutScore = 90;
    } else if (political.voterTurnout >= 65) {
      turnoutScore = 80;
    } else if (political.voterTurnout >= 60) {
      turnoutScore = 65;
    } else if (political.voterTurnout >= 55) {
      turnoutScore = 50;
    } else {
      turnoutScore = 35;
    }
    // Give turnout a default weight of 30 if user only cares about turnout
    totalScore += turnoutScore * 30;
    totalWeight += 30;
  }

  // === RELIGIOUS SCORING ===
  const religious = cultural.religious;
  
  if (religious) {
    // Tradition presence scoring
    if (prefs.religiousTraditions.length > 0 && prefs.traditionsWeight > 0) {
      let traditionsScore = 50;
      let traditionsFound = 0;
      let traditionsMetThreshold = 0;
      
      // Map preference IDs to religious data fields
      const traditionMap: Record<string, number | null> = {
        "catholic": religious.catholic,
        "evangelical": religious.evangelicalProtestant,
        "mainline": religious.mainlineProtestant,
        "jewish": religious.jewish,
        "muslim": religious.muslim,
        "unaffiliated": religious.unaffiliated,
      };
      
      // National averages for concentration calculation
      const nationalAvg: Record<string, number> = {
        "catholic": 205,
        "evangelical": 256,
        "mainline": 103,
        "jewish": 22,
        "muslim": 11,
        "unaffiliated": 290,
      };
      
      for (const tradition of prefs.religiousTraditions) {
        const presence = traditionMap[tradition];
        if (presence !== null && presence !== undefined) {
          traditionsFound++;
          
          if (presence >= prefs.minTraditionPresence) {
            traditionsMetThreshold++;
            
            // Concentration bonus: above national average = extra points
            const natAvg = nationalAvg[tradition] || 100;
            const concentration = presence / natAvg;
            
            if (concentration > 2.0) {
              traditionsScore += 20; // Strong presence
            } else if (concentration > 1.5) {
              traditionsScore += 15;
            } else if (concentration > 1.0) {
              traditionsScore += 10;
            } else {
              traditionsScore += 5; // At least meets threshold
            }
          } else {
            // Below threshold penalty
            const deficit = prefs.minTraditionPresence - presence;
            traditionsScore -= Math.min(20, deficit / 5);
          }
        }
      }
      
      // Adjust based on how many traditions were found vs requested
      if (prefs.religiousTraditions.length > 0) {
        const foundRatio = traditionsMetThreshold / prefs.religiousTraditions.length;
        if (foundRatio === 1) {
          traditionsScore += 10; // All traditions meet threshold
        } else if (foundRatio < 0.5) {
          traditionsScore -= 15; // Less than half meet threshold
        }
      }
      
      traditionsScore = Math.max(0, Math.min(100, traditionsScore));
      totalScore += traditionsScore * prefs.traditionsWeight;
      totalWeight += prefs.traditionsWeight;
    }
    
    // Religious diversity scoring
    if (prefs.preferReligiousDiversity && prefs.diversityWeight > 0 && religious.diversityIndex !== null) {
      // Religious diversity index is 0-100 (Simpson's)
      // Higher = more diverse
      const diversityScore = religious.diversityIndex;
      totalScore += diversityScore * prefs.diversityWeight;
      totalWeight += prefs.diversityWeight;
    }
  }

  // === URBAN LIFESTYLE SCORING (includes Sports) ===
  const urbanLifestyle = cultural.urbanLifestyle;
  
  if (prefs.urbanLifestyleWeight > 0) {
    const nightlifeWeight = prefs.nightlifeImportance;
    const artsWeight = prefs.artsImportance;
    const diningWeight = prefs.diningImportance;
    const sportsWeight = prefs.sportsImportance;
    const subTotal = nightlifeWeight + artsWeight + diningWeight + sportsWeight;
    
    if (subTotal > 0) {
      let nightlifeScore = 50;
      let artsScore = 50;
      let diningScore = 50;
      let sportsScore = 50;
      
      // Nightlife scoring - Logarithmic curve (critical mass at ~30 bars/clubs per 10K)
      if (nightlifeWeight > 0 && urbanLifestyle?.nightlife) {
        const nl = urbanLifestyle.nightlife;
        
        if (nl.barsAndClubsPer10K !== null) {
          nightlifeScore = urbanAmenityScore(
            nl.barsAndClubsPer10K,
            URBAN_LIFESTYLE_RANGES.barsAndClubsPer10K.min,
            URBAN_LIFESTYLE_RANGES.barsAndClubsPer10K.plateau,
            URBAN_LIFESTYLE_RANGES.barsAndClubsPer10K.max
          );
          
          // Bonus for late-night options
          if (nl.lateNightVenues !== null && nl.lateNightVenues >= 10) {
            nightlifeScore = Math.min(100, nightlifeScore + 5);
          }
        }
      }
      
      // Arts scoring - Logarithmic curve (critical mass at ~20 museums)
      if (artsWeight > 0 && urbanLifestyle?.arts) {
        const arts = urbanLifestyle.arts;
        let artsSubScores = 0;
        let artsSubCount = 0;
        
        if (arts.museums !== null) {
          artsSubScores += urbanAmenityScore(
            arts.museums,
            URBAN_LIFESTYLE_RANGES.museums.min,
            URBAN_LIFESTYLE_RANGES.museums.plateau,
            URBAN_LIFESTYLE_RANGES.museums.max
          );
          artsSubCount++;
        }
        
        // Theaters and galleries as secondary factors
        if (arts.theaters !== null && arts.theaters > 0) {
          artsSubScores += Math.min(100, 50 + arts.theaters * 3);
          artsSubCount++;
        }
        
        if (arts.artGalleries !== null && arts.artGalleries > 0) {
          artsSubScores += Math.min(100, 40 + arts.artGalleries * 2);
          artsSubCount++;
        }
        
        if (arts.musicVenues !== null && arts.musicVenues > 0) {
          artsSubScores += Math.min(100, 50 + arts.musicVenues * 2);
          artsSubCount++;
        }
        
        if (artsSubCount > 0) {
          artsScore = artsSubScores / artsSubCount;
        }
      }
      
      // Dining scoring - Logarithmic curve + diversity bonus
      if (diningWeight > 0 && urbanLifestyle?.dining) {
        const dining = urbanLifestyle.dining;
        let diningSubScores = 0;
        let diningSubCount = 0;
        
        // Restaurant density
        if (dining.restaurantsPer10K !== null) {
          diningSubScores += urbanAmenityScore(
            dining.restaurantsPer10K,
            URBAN_LIFESTYLE_RANGES.restaurantsPer10K.min,
            URBAN_LIFESTYLE_RANGES.restaurantsPer10K.plateau,
            URBAN_LIFESTYLE_RANGES.restaurantsPer10K.max
          );
          diningSubCount++;
        }
        
        // Fine dining presence
        if (dining.fineDiningCount !== null && dining.fineDiningCount > 0) {
          diningSubScores += Math.min(100, 40 + dining.fineDiningCount * 3);
          diningSubCount++;
        }
        
        // Cuisine diversity (linear scale)
        if (dining.cuisineDiversity !== null) {
          const diversityScore = normalizeToRange(
            dining.cuisineDiversity,
            URBAN_LIFESTYLE_RANGES.cuisineDiversity.min,
            URBAN_LIFESTYLE_RANGES.cuisineDiversity.max,
            false
          );
          diningSubScores += diversityScore;
          diningSubCount++;
        }
        
        // Craft breweries as bonus (cap at +10)
        if (dining.breweries !== null && dining.breweries > 0) {
          diningSubScores += Math.min(80, 50 + dining.breweries * 3);
          diningSubCount++;
        }
        
        if (diningSubCount > 0) {
          diningScore = diningSubScores / diningSubCount;
        }
      }
      
      // Sports scoring - based on major pro sports team presence
      // Counts NFL, NBA, MLB, NHL, and MLS teams (comma-separated strings)
      if (sportsWeight > 0) {
        // Count teams from each league
        const countTeams = (teams: string | null) => 
          teams ? teams.split(",").filter(t => t.trim()).length : 0;
        
        const nflCount = countTeams(metrics.nflTeams);
        const nbaCount = countTeams(metrics.nbaTeams);
        const mlbCount = countTeams(metrics.mlbTeams);
        const nhlCount = countTeams(metrics.nhlTeams);
        const mlsCount = countTeams(metrics.mlsTeams);
        const totalTeams = nflCount + nbaCount + mlbCount + nhlCount + mlsCount;
        
        // Count how many different leagues are represented
        const leaguesPresent = [nflCount, nbaCount, mlbCount, nhlCount, mlsCount]
          .filter(count => count > 0).length;
        
        // Sports scoring thresholds (5 major leagues = potential for 10+ teams):
        // 0 teams = 30 (city still livable, but no major sports)
        // 1-2 teams = 55-70 (small sports market)
        // 3-4 teams = 75-85 (solid sports city)
        // 5-6 teams = 88-93 (major sports market)
        // 7+ teams = 95-100 (elite sports city like NYC, LA, Chicago)
        if (totalTeams === 0) {
          sportsScore = 30;
        } else if (totalTeams <= 2) {
          sportsScore = 50 + totalTeams * 10; // 60-70
        } else if (totalTeams <= 4) {
          sportsScore = 65 + (totalTeams - 2) * 7; // 72-79
        } else if (totalTeams <= 6) {
          sportsScore = 80 + (totalTeams - 4) * 5; // 85-90
        } else if (totalTeams <= 8) {
          sportsScore = 92 + (totalTeams - 6) * 2; // 94-96
        } else {
          sportsScore = Math.min(100, 97 + (totalTeams - 8)); // 98-100
        }
        
        // Bonus for league diversity (having teams in 3+ different leagues)
        if (leaguesPresent >= 4) {
          sportsScore = Math.min(100, sportsScore + 5);
        } else if (leaguesPresent >= 3) {
          sportsScore = Math.min(100, sportsScore + 3);
        }
      }
      
      // Weighted average of sub-scores (now including sports)
      const urbanLifestyleScore = (
        nightlifeScore * nightlifeWeight +
        artsScore * artsWeight +
        diningScore * diningWeight +
        sportsScore * sportsWeight
      ) / subTotal;
      
      totalScore += Math.max(0, Math.min(100, urbanLifestyleScore)) * prefs.urbanLifestyleWeight;
      totalWeight += prefs.urbanLifestyleWeight;
    }
  }

  // If no weights were set, return neutral score (50 = national average)
  if (totalWeight === 0) {
    return 50;
  }

  return Math.max(0, Math.min(100, totalScore / totalWeight));
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

/**
 * Get interpretation label for a score (aligned with letter grades)
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return "Exceptional";  // A+
  if (score >= 80) return "Excellent";    // A/A-
  if (score >= 70) return "Good";         // B+/B/B-
  if (score >= 60) return "Average";      // C+/C/C-
  if (score >= 50) return "Below Average"; // D
  return "Poor";                          // F
}

/**
 * Get relative indicator for a score vs national average (50)
 * Returns "+X" for above average, "-X" for below, or "avg" for near-average
 */
export function getScoreRelative(score: number): { text: string; color: string } {
  const diff = score - 50;
  if (Math.abs(diff) < 5) {
    return { text: "avg", color: "text-muted-foreground" };
  }
  if (diff > 0) {
    return { text: `+${diff.toFixed(0)}`, color: "text-green-600 dark:text-green-400" };
  }
  return { text: `${diff.toFixed(0)}`, color: "text-red-600 dark:text-red-400" };
}

/**
 * Get tooltip explanation for a score category
 */
export function getScoreTooltip(category: string, score: number): string {
  const label = getScoreLabel(score);
  const relative = score >= 50 
    ? `${(score - 50).toFixed(0)} points above` 
    : `${(50 - score).toFixed(0)} points below`;
  
  const categoryExplanations: Record<string, string> = {
    climate: "Weather patterns compared to U.S. geographic extremes",
    cost: "Cost of living adjusted for your income scenario",
    demographics: "Population, diversity, and community metrics",
    qol: "Quality of life factors (walkability, safety, schools, etc.)",
    cultural: "Cultural amenities and political alignment",
    total: "Weighted average of all category scores",
  };

  const explanation = categoryExplanations[category.toLowerCase()] || "";
  return `${label} (${relative} national average)\n${explanation}`;
}
