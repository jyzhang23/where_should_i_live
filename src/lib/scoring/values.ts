import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { normalizeToRange } from "./utils";

/**
 * Calculate values score (0-100) based on political and religious alignment
 * 
 * This category answers: "Do I belong here?"
 * Scoring is SUBJECTIVE - depends entirely on user's identity/preferences
 * 
 * Political scoring uses Gaussian decay for continuous, intuitive matching
 * Religious scoring based on tradition presence and diversity
 */
export function calculateValuesScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const cultural = metrics.cultural;
  const prefs = preferences.advanced?.values;

  // If no cultural data or no values preferences, return neutral score (50 = national avg)
  if (!cultural || !prefs) {
    return 50;
  }

  let totalScore = 0;
  let totalWeight = 0;
  
  // Track potential "dealbreakers" - high-weight preferences with poor matches
  // These will apply a penalty multiplier to prevent dilution
  let dealBreakerPenalty = 1.0;

  // === POLITICAL SCORING ===
  // Uses "Elastic Band" model with Gaussian decay for continuous, intuitive scoring
  // Fixes: (1) Saturation from additive bonuses, (2) Discontinuity at party line
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
    const distance = Math.abs(pi - targetPi);
    
    // Importance affects the decay rate (k) in the Gaussian
    // k ranges from 1.0 (not important) to 3.0 (dealbreaker)
    // Higher k = steeper drop-off for same distances
    const k = 1.0 + (prefs.partisanWeight / 50);
    
    if (prefs.partisanPreference === "swing") {
      // For swing preference, use distance from center (|pi|) instead of distance from target
      // Competitive cities have |pi| near 0
      const competitiveness = Math.abs(pi);
      
      // Gaussian decay from center: perfectly competitive = 100, very partisan = low
      const alignmentScore = 100 * Math.exp(-k * competitiveness * competitiveness);
      
      // Include turnout as weighted component if user cares about civic health
      if (prefs.preferHighTurnout && political.voterTurnout !== null) {
        // Normalize turnout: 40% → 0, 80% → 100
        const turnoutScore = normalizeToRange(political.voterTurnout ?? 50, 40, 80, false);
        // 80% alignment (competitiveness), 20% turnout
        politicalScore = (alignmentScore * 0.8) + (turnoutScore * 0.2);
      } else {
        politicalScore = alignmentScore;
      }
    } else {
      // For partisan preferences (lean-dem, strong-dem, lean-rep, strong-rep)
      
      // 1. Calculate base alignment using Gaussian decay (continuous, no cliff)
      // Formula: 100 * e^(-k * distance²)
      let alignmentScore = 100 * Math.exp(-k * distance * distance);
      
      // 2. Apply "Tribal Penalty" ONLY for partisan users crossing party lines
      // Moderates (|targetPi| < 0.3) care about distance, not which team
      // Partisans (|targetPi| >= 0.3) have stronger in-group preference
      const isOppositeSide = (pi > 0 && targetPi < 0) || (pi < 0 && targetPi > 0);
      const isUserPartisan = Math.abs(targetPi) >= 0.3; // strong-dem/strong-rep
      
      if (isOppositeSide && isUserPartisan) {
        // Partisan crossing party lines: 15% penalty
        alignmentScore *= 0.85;
      } else if (isOppositeSide && !isUserPartisan) {
        // Moderate crossing party lines: very mild penalty (5%)
        alignmentScore *= 0.95;
      }
      
      // 3. Include turnout as weighted component (prevents saturation)
      if (prefs.preferHighTurnout && political.voterTurnout !== null) {
        // Normalize turnout: 40% → 0, 80% → 100
        const turnoutScore = normalizeToRange(political.voterTurnout ?? 50, 40, 80, false);
        // 80% alignment, 20% civic health
        politicalScore = (alignmentScore * 0.8) + (turnoutScore * 0.2);
      } else {
        politicalScore = alignmentScore;
      }
    }
    
    // Ensure bounds
    politicalScore = Math.max(0, Math.min(100, politicalScore));
    
    // DEALBREAKER LOGIC: If political weight is high (>70) and score is poor (<40),
    // this is likely a dealbreaker that shouldn't be diluted by religious scores
    if (prefs.partisanWeight > 70 && politicalScore < 40) {
      dealBreakerPenalty = Math.min(dealBreakerPenalty, 0.5 + (politicalScore / 80));
    }
    
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

  // If no weights were set, return neutral score (50 = national average)
  if (totalWeight === 0) {
    return 50;
  }

  // Calculate base score from weighted average
  let finalScore = totalScore / totalWeight;
  
  // Apply dealbreaker penalty if a high-priority preference had a poor match
  if (dealBreakerPenalty < 1.0) {
    finalScore *= dealBreakerPenalty;
  }

  return Math.max(0, Math.min(100, finalScore));
}
