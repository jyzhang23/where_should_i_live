import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { normalizeToRange, toPercentileScore } from "./utils";
import { RECREATION_RANGES } from "./constants";
import { getQoLPercentilesCache } from "./types";

/**
 * Calculate quality of life score (0-100)
 */
export function calculateQualityOfLifeScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const qol = metrics.qol;
  const prefs = preferences.advanced.qualityOfLife;
  const percentiles = getQoLPercentilesCache();

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
