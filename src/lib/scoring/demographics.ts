import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { minorityPresenceScore } from "./utils";

/**
 * Calculate dating favorability score (0-100)
 * 
 * 50-Point Baseline Philosophy:
 * All sub-scores are centered around national averages = 50.
 * An "average" city yields score 50, not 0 or 100.
 * 
 * Sub-scores:
 * - Pool (40%): Gender ratio + never-married % - centered on ratio 100 and 55% single
 * - Economic (30%): Disposable income for dating - centered on $25k disposable
 * - Alignment (20%): Political preference match - Gaussian decay, 0.4 distance = 50
 * - Walk/Safety (10%): Walkability and safety - centered on Walk 48 and Crime 380
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
  const demographicsPrefs = preferences.advanced?.demographics;
  const valuesPrefs = preferences.advanced?.values;
  
  if (!demographicsPrefs?.seekingGender) return 50;

  // --- 1. POOL SCORE (40%) ---
  // Centered: Ratio 100 = Score 50. +/- 10 points of ratio = +/- 25 points of score.
  let poolScore = 50;
  
  if (census?.genderRatios) {
    // Select ratio based on age range preference
    let ratioObj = census.genderRatios.overall;
    if (demographicsPrefs.datingAgeRange === "20-29") ratioObj = census.genderRatios.age20to29;
    else if (demographicsPrefs.datingAgeRange === "30-39") ratioObj = census.genderRatios.age30to39;
    else if (demographicsPrefs.datingAgeRange === "40-49") ratioObj = census.genderRatios.age40to49;

    if (ratioObj) {
      const ratio = ratioObj.ratio; // males per 100 females
      const deviation = ratio - 100;
      
      // If seeking women, positive deviation (more men) is bad (-).
      // If seeking men, positive deviation (more men) is good (+).
      const direction = demographicsPrefs.seekingGender === "women" ? -1 : 1;
      
      // 100 -> 50pts. 
      // 90 (seeking women) -> 50 + (-1 * -10 * 2.5) = 75pts.
      // 110 (seeking women) -> 50 + (-1 * 10 * 2.5) = 25pts.
      poolScore = 50 + (direction * deviation * 2.5);
    }
  }

  // Singles Adjustment: Bonus for high single population, penalty for low
  // Avg for young metros is ~55%. 
  if (census) {
    const singlePct = demographicsPrefs.seekingGender === "women" 
      ? census.neverMarriedFemalePercent 
      : census.neverMarriedMalePercent;

    if (singlePct != null) {
      // 55% = neutral. +/- 1% = +/- 1.5 score
      const singleAdjustment = (singlePct - 55) * 1.5; 
      poolScore += singleAdjustment;
    }
  }
  poolScore = Math.max(0, Math.min(100, poolScore));

  // --- 2. ECONOMIC SCORE (30%) ---
  // Centered: $25k Disposable = Score 50
  let econScore = 50;
  if (bea && census?.perCapitaIncome) {
    const income = census.perCapitaIncome; // Use individual income, not household
    const housingRPP = bea.regionalPriceParity?.housing || 100;
    const estimatedRent = 16800 * (housingRPP / 100); // Baseline ~$1400/mo normalized
    const disposable = income - estimatedRent;

    // $25k = 50pts. $45k = 75pts ($800 per point)
    econScore = 50 + ((disposable - 25000) / 800);
    econScore = Math.max(0, Math.min(100, econScore));
  }

  // --- 3. ALIGNMENT SCORE (20%) ---
  // Centered: Distance 0.4 (Moderate gap) = Score 50
  let alignScore = 50;
  const political = cultural?.political;
  const targetPi = valuesPrefs?.partisanPreference === "neutral" ? null : 
    (valuesPrefs?.partisanPreference === "strong-dem" ? 0.6 :
     valuesPrefs?.partisanPreference === "lean-dem" ? 0.2 :
     valuesPrefs?.partisanPreference === "lean-rep" ? -0.2 :
     valuesPrefs?.partisanPreference === "strong-rep" ? -0.6 : 0);

  if (political?.partisanIndex != null && targetPi !== null) {
    const dist = Math.abs(political.partisanIndex - targetPi);
    // Gaussian: Perfect match (0) = 100.
    // We want 0.4 distance to be ~50.
    // 100 * e^(-k * 0.4^2) = 50  => k ≈ 4.3
    alignScore = 100 * Math.exp(-4.3 * dist * dist);
  }

  // --- 4. SAFETY/WALK SCORE (10%) ---
  // Centered: Walk 48 = 50pts. Crime 380 = 50pts.
  let vibeScore = 50;
  if (qol?.walkability?.walkScore != null && qol?.crime?.violentCrimeRate != null) {
    // Walk: 48 (national avg) = 50pts, 1:1 mapping beyond that
    const wScore = 50 + (qol.walkability.walkScore - 48);
    // Crime: 380 (national avg) = 50pts, 500pt crime diff = 100pt score diff
    const cScore = 50 + (380 - qol.crime.violentCrimeRate) / 5;
    vibeScore = Math.max(0, Math.min(100, (wScore + cScore) / 2));
  }

  // Final Weighted Average
  // Pool 40% + Economic 30% + Alignment 20% + Walk/Safety 10%
  return (poolScore * 0.4) + (econScore * 0.3) + (alignScore * 0.2) + (vibeScore * 0.1);
}

/**
 * Calculate demographics score (0-100) using Census ACS data
 */
export function calculateDemographicsScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const census = metrics.census;
  const prefs = preferences.advanced?.demographics;

  // If no Census data or no demographics preferences, return neutral score
  if (!census || !prefs) {
    return 50;
  }

  let totalScore = 0;
  let totalWeight = 0;

  // === Population Filter (soft penalty with decay) ===
  // Instead of a hard cutoff, apply a graduated penalty based on how far below minimum
  let populationPenalty = 0;
  if (prefs.minPopulation > 0 && census.totalPopulation !== null) {
    if (census.totalPopulation < prefs.minPopulation) {
      // Calculate deficit as percentage (0 = at threshold, 1 = zero population)
      const deficit = (prefs.minPopulation - census.totalPopulation) / prefs.minPopulation;
      // Apply penalty: 50% deficit = 25pt penalty, 100% deficit = 50pt penalty
      populationPenalty = 50 * deficit;
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
        // Scale: $50K = 55, $75K = 83, $90K+ = 100
        // Adjusted to reflect US median (~$75K) scoring in B+/A- range
        factorSum += Math.min(100, (income / 900));
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

  // Get dating preferences with defaults
  const datingEnabled = prefs.datingEnabled ?? false;
  const datingWeight = prefs.datingWeight ?? 50;

  // If no weights were set, return a neutral score (50 = national average)
  if (totalWeight === 0) {
    // But if dating is enabled, return dating score instead
    if (datingEnabled && datingWeight > 0) {
      const datingScore = calculateDatingFavorability(city, preferences);
      return datingScore;
    }
    return 50;
  }

  // Calculate base demographics score
  let baseScore = Math.max(0, Math.min(100, totalScore / totalWeight));
  
  // === DATING FAVORABILITY INTEGRATION ===
  // If dating is enabled, blend the dating score into demographics
  if (datingEnabled && datingWeight > 0) {
    const datingScore = calculateDatingFavorability(city, preferences);
    
    // datingWeight: 0 = ignore dating, 50 = 50/50 blend, 100 = dating only
    const datingInfluence = datingWeight / 100;
    baseScore = baseScore * (1 - datingInfluence) + datingScore * datingInfluence;
  }
  
  // Apply population penalty (graduated decay instead of hard cutoff)
  baseScore = baseScore - populationPenalty;
  
  return Math.max(0, Math.min(100, baseScore));
}
