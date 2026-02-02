import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { minorityPresenceScore } from "./utils";

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
  const prefs = preferences.advanced?.demographics;
  // Use values preferences for political alignment (was cultural before refactor)
  const valuesPrefs = preferences.advanced?.values;
  
  // If no demographics preferences, return neutral
  if (!prefs) {
    return 50;
  }
  
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
  let poolScore = 0;
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
    
    // Tightened range: 90-110 is the critical zone (real metros vary 90-105)
    // A 5% imbalance is socially noticeable, 10% is drastic
    if (seekingGender === "women") {
      // Looking for women: fewer men is better (ratio < 100)
      // Ratio 90 or less = 100pts, 100 = 50pts, 110 or more = 0pts
      const rawScore = 100 - ((ratio - 90) * 5);
      poolScore += Math.max(0, Math.min(100, rawScore));
      poolFactors++;
    } else {
      // Looking for men: more men is better (ratio > 100)
      // Ratio 110 or more = 100pts, 100 = 50pts, 90 or less = 0pts
      const rawScore = (ratio - 90) * 5;
      poolScore += Math.max(0, Math.min(100, rawScore));
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
  
  // Average the pool factors, or use neutral (50) if no data
  poolScore = poolFactors > 0 ? poolScore / poolFactors : 50;
  
  // === ECONOMIC SCORE (30%) - "Date Tax" ===
  // Disposable income after rent affects dating affordability
  // Use per capita income (not household) since dating users are single
  let econScore = 50;
  
  if (bea && census?.perCapitaIncome) {
    // Use per capita income for singles, not household income
    const income = census.perCapitaIncome;
    const housingRPP = bea.regionalPriceParity?.housing || 100;
    
    // Estimate annual rent: national median ~$1400/mo = $16,800/yr
    // Adjust by local housing RPP
    const estimatedAnnualRent = 16800 * (housingRPP / 100);
    const disposableIncome = income - estimatedAnnualRent;
    
    // Rent-to-income ratio (< 30% is healthy for singles)
    const rentToIncomeRatio = estimatedAnnualRent / income;
    
    // Rescaled for per capita: $15K disposable = 0, $45K+ = 100
    let incomeScore = Math.max(0, Math.min(100, (disposableIncome - 15000) / 300));
    
    // Rent burden penalty (stricter for singles)
    if (rentToIncomeRatio > 0.40) {
      incomeScore -= 20; // Severely rent-burdened
    } else if (rentToIncomeRatio > 0.30) {
      incomeScore -= 10;
    } else if (rentToIncomeRatio < 0.25) {
      incomeScore += 10; // Very affordable
    }
    
    econScore = Math.max(0, Math.min(100, incomeScore));
  }
  
  // === ALIGNMENT SCORE (20%) - Political Match ===
  // Use user's partisan preference to score alignment
  // Uses Gaussian decay (consistent with Values scoring) instead of linear
  let alignScore = 50; // Neutral if no preference
  
  const political = cultural?.political;
  const partisanPref = valuesPrefs?.partisanPreference ?? "neutral";
  
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
    
    // Use Gaussian decay matching the main Values score
    // k=2 is a standard "Important" curve - smooth falloff instead of linear cliff
    alignScore = 100 * Math.exp(-2 * distance * distance);
  }
  
  // === WALK/SAFETY SCORE (10%) ===
  // Walkability for serendipitous meetings + safety
  let walkSafeScore = 0;
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
  
  // Average the walk/safe factors, or use neutral (50) if no data
  walkSafeScore = walkSafeFactors > 0 ? walkSafeScore / walkSafeFactors : 50;
  
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
