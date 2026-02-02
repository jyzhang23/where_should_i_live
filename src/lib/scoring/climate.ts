import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { normalizeToRange } from "./utils";
import { CLIMATE_RANGES } from "./constants";

/**
 * Calculate climate score (0-100) using NOAA data with weighted preferences
 * Falls back to legacy calculation if NOAA data unavailable
 */
export function calculateClimateScore(
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
