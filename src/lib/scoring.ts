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
        culturalScore: 0,
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

    // Snow Days (inverse - fewer is better)
    if (prefs.weightSnowDays > 0 && noaa.snowDays !== null) {
      const snowScore = prefs.maxSnowDays > 0
        ? Math.max(0, 100 - (Math.max(0, noaa.snowDays - prefs.maxSnowDays) / prefs.maxSnowDays) * 100)
        : (noaa.snowDays === 0 ? 100 : 50);
      totalScore += snowScore * prefs.weightSnowDays;
      totalWeight += prefs.weightSnowDays;
    }

    // Cloudy Days / Gloom Factor (inverse - fewer is better)
    if (prefs.weightCloudyDays > 0 && noaa.cloudyDays !== null) {
      const cloudyScore = Math.max(0, 100 - (Math.max(0, noaa.cloudyDays - prefs.maxCloudyDays) / prefs.maxCloudyDays) * 100);
      totalScore += cloudyScore * prefs.weightCloudyDays;
      totalWeight += prefs.weightCloudyDays;
    }

    // Humidity / Stickiness (inverse - lower dewpoint is better)
    if (prefs.weightHumidity > 0 && noaa.julyDewpoint !== null) {
      // Dewpoint range: ~50°F (dry) to ~75°F (oppressive)
      // Score 100 at/below max, decreases as it goes above
      const humidityScore = noaa.julyDewpoint <= prefs.maxJulyDewpoint
        ? 100
        : Math.max(0, 100 - ((noaa.julyDewpoint - prefs.maxJulyDewpoint) / 15) * 100);
      totalScore += humidityScore * prefs.weightHumidity;
      totalWeight += prefs.weightHumidity;
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
 * Calculate demographics score (0-100) using Census ACS data
 */
function calculateDemographicsScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const census = metrics.census;
  const prefs = preferences.advanced.demographics;

  // If no Census data, use legacy scoring
  if (!census) {
    return calculateLegacyDemographicsScore(city, preferences);
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
      
      if (actualPct >= minPresence) {
        // Meets or exceeds minimum: base score of 70, bonus for exceeding (up to 100)
        // Each 1% above minimum adds 2 points, capped at 100
        minorityScore = Math.min(100, 70 + (actualPct - minPresence) * 2);
      } else {
        // Below minimum: penalty proportional to how far below
        // Each 1% below minimum subtracts 5 points from base of 70
        minorityScore = Math.max(0, 70 - (minPresence - actualPct) * 5);
      }
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

  // If no weights were set, return a neutral score
  if (totalWeight === 0) {
    return 70;
  }

  return Math.max(0, Math.min(100, totalScore / totalWeight));
}

/**
 * Legacy demographics scoring for cities without Census data
 * Only uses basic population and diversity data from the database
 */
function calculateLegacyDemographicsScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const { minPopulation, minDiversityIndex } = preferences.advanced.demographics;

  let score = 70; // Start at neutral

  // Population check
  if (metrics.population !== null && minPopulation > 0) {
    // Convert from thousands if needed
    const pop = metrics.population > 1000 ? metrics.population : metrics.population * 1000;
    if (pop < minPopulation) {
      score -= 30;
    }
  }

  // Diversity index
  if (metrics.diversityIndex !== null && minDiversityIndex > 0) {
    if (metrics.diversityIndex >= minDiversityIndex) {
      score += Math.min(15, (metrics.diversityIndex - minDiversityIndex) / 3);
    } else {
      score -= (minDiversityIndex - metrics.diversityIndex) * 1.5;
    }
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
  const qol = metrics.qol;
  const prefs = preferences.advanced.qualityOfLife;

  // If QoL API data is available, use weighted scoring
  if (qol) {
    let totalScore = 0;
    let totalWeight = 0;
    const weights = prefs.weights;

    // Walkability (Walk Score API)
    if (weights.walkability > 0 && qol.walkability) {
      let walkScore = 50;
      const w = qol.walkability;
      
      // Average of available scores
      let scoreSum = 0;
      let scoreCount = 0;
      
      if (w.walkScore !== null) {
        const adjusted = w.walkScore >= prefs.minWalkScore 
          ? w.walkScore 
          : Math.max(0, w.walkScore - (prefs.minWalkScore - w.walkScore) * 0.5);
        scoreSum += adjusted;
        scoreCount++;
      }
      if (w.transitScore !== null) {
        const adjusted = w.transitScore >= prefs.minTransitScore
          ? w.transitScore
          : Math.max(0, w.transitScore - (prefs.minTransitScore - w.transitScore) * 0.5);
        scoreSum += adjusted;
        scoreCount++;
      }
      if (w.bikeScore !== null) {
        scoreSum += w.bikeScore;
        scoreCount++;
      }
      
      if (scoreCount > 0) {
        walkScore = scoreSum / scoreCount;
      }
      
      totalScore += walkScore * weights.walkability;
      totalWeight += weights.walkability;
    }

    // Safety (FBI Crime Data)
    if (weights.safety > 0 && qol.crime) {
      let safetyScore = 50;
      const c = qol.crime;
      
      if (c.violentCrimeRate !== null) {
        // Lower crime = higher score
        // National avg ~380, range 100-800
        // Score: 800 -> 0, 100 -> 100
        safetyScore = Math.max(0, Math.min(100, 100 - ((c.violentCrimeRate - 100) / 7)));
        
        // Penalty if exceeds user threshold
        if (c.violentCrimeRate > prefs.maxViolentCrimeRate) {
          safetyScore -= ((c.violentCrimeRate - prefs.maxViolentCrimeRate) / prefs.maxViolentCrimeRate) * 30;
        }
        
        // Bonus for falling crime trend
        if (prefs.preferFallingCrime && c.trend3Year === "falling") {
          safetyScore += 10;
        } else if (c.trend3Year === "rising") {
          safetyScore -= 5;
        }
      }
      
      totalScore += Math.max(0, Math.min(100, safetyScore)) * weights.safety;
      totalWeight += weights.safety;
    }

    // Air Quality (EPA AirNow)
    if (weights.airQuality > 0 && qol.airQuality) {
      let airScore = 50;
      const a = qol.airQuality;
      
      if (a.healthyDaysPercent !== null) {
        // Higher healthy days % = better
        airScore = a.healthyDaysPercent;
      }
      
      if (a.hazardousDays !== null && prefs.maxHazardousDays > 0) {
        if (a.hazardousDays > prefs.maxHazardousDays) {
          airScore -= ((a.hazardousDays - prefs.maxHazardousDays) / prefs.maxHazardousDays) * 30;
        }
      }
      
      totalScore += Math.max(0, Math.min(100, airScore)) * weights.airQuality;
      totalWeight += weights.airQuality;
    }

    // Internet (FCC Broadband)
    if (weights.internet > 0 && qol.broadband) {
      let internetScore = 50;
      const b = qol.broadband;
      
      if (b.fiberCoveragePercent !== null) {
        internetScore = b.fiberCoveragePercent;
        
        // Bonus for competition (multiple providers)
        if (b.providerCount !== null && b.providerCount >= prefs.minProviders) {
          internetScore += Math.min(20, (b.providerCount - 1) * 5);
        }
        
        // Penalty if fiber required but not available
        if (prefs.requireFiber && b.fiberCoveragePercent < 50) {
          internetScore -= 30;
        }
      }
      
      totalScore += Math.max(0, Math.min(100, internetScore)) * weights.internet;
      totalWeight += weights.internet;
    }

    // Schools (NCES Education)
    if (weights.schools > 0 && qol.education) {
      let schoolScore = 50;
      const e = qol.education;
      
      if (e.studentTeacherRatio !== null) {
        // Lower ratio = better (more attention)
        // Range: 10 (excellent) to 25 (poor)
        schoolScore = Math.max(0, 100 - ((e.studentTeacherRatio - 10) / 15) * 100);
        
        if (e.studentTeacherRatio > prefs.maxStudentTeacherRatio) {
          schoolScore -= 20;
        }
      }
      
      if (e.graduationRate !== null) {
        // Factor in graduation rate
        schoolScore = (schoolScore + e.graduationRate) / 2;
      }
      
      totalScore += Math.max(0, Math.min(100, schoolScore)) * weights.schools;
      totalWeight += weights.schools;
    }

    // Healthcare (HRSA)
    if (weights.healthcare > 0 && qol.health) {
      let healthScore = 50;
      const h = qol.health;
      
      if (h.primaryCarePhysiciansPer100k !== null) {
        // Higher = better, national avg ~75
        healthScore = Math.min(100, (h.primaryCarePhysiciansPer100k / 150) * 100);
        
        if (h.primaryCarePhysiciansPer100k < prefs.minPhysiciansPer100k) {
          healthScore -= 20;
        }
      }
      
      // HPSA score (lower = better, means less shortage)
      if (h.hpsaScore !== null) {
        // HPSA 0 = no shortage, 25+ = severe
        healthScore -= Math.min(30, h.hpsaScore);
      }
      
      totalScore += Math.max(0, Math.min(100, healthScore)) * weights.healthcare;
      totalWeight += weights.healthcare;
    }

    if (totalWeight > 0) {
      return Math.max(0, Math.min(100, totalScore / totalWeight));
    }
  }

  // Fallback: Legacy calculation using static metrics
  return calculateLegacyQualityOfLifeScore(city, preferences);
}

/**
 * Legacy QoL scoring for cities without API data
 */
function calculateLegacyQualityOfLifeScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const { minWalkScore, minTransitScore, maxCrimeRate } =
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

  // If no cultural data or all preferences are neutral/zero, return neutral score
  if (!cultural) {
    return 70;
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

  // If no weights were set, return neutral score
  if (totalWeight === 0) {
    return 70;
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
