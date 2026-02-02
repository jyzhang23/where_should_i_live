import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { normalizeToRange } from "./utils";

/**
 * Calculate quality of life score (0-100)
 * 
 * Uses absolute range normalization (not percentiles) to align with the
 * 50-point baseline philosophy. National averages score ~50.
 * 
 * Ranges are anchored to real-world national statistics:
 * - Walk Score: 0-100 (already standardized, use directly)
 * - Crime: 0-800 incidents/100k (national avg ~380)
 * - Air Quality: 70-99% healthy days
 * - Fiber: 0-100% (use directly)
 * - Education: Ratio 12-22:1, Grad 80-95%
 * - Healthcare: 40-120 physicians/100k (national avg ~75)
 */
export function calculateQualityOfLifeScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const qol = metrics.qol;
  const prefs = preferences.advanced?.qualityOfLife;

  if (!qol || !prefs) return 50;

  let totalScore = 0;
  let totalWeight = 0;
  const weights = prefs.weights;

  // 1. Walkability - Use raw scores (Walk Score is already 0-100 standardized)
  // No percentiles needed - avoids "double penalty" distortion
  if (weights.walkability > 0 && qol.walkability) {
    const w = qol.walkability;
    let scoreSum = 0;
    let scoreCount = 0;
    
    if (w.walkScore !== null) {
      // Use raw Walk Score directly (it's already 0-100)
      // Apply heavy penalty if below user's minimum threshold
      const score = w.walkScore < prefs.minWalkScore 
        ? w.walkScore * 0.5
        : w.walkScore;
      scoreSum += score;
      scoreCount++;
    }
    if (w.transitScore !== null) {
      const score = w.transitScore < prefs.minTransitScore
        ? w.transitScore * 0.5
        : w.transitScore;
      scoreSum += score;
      scoreCount++;
    }
    if (w.bikeScore !== null) {
      scoreSum += w.bikeScore;
      scoreCount++;
    }
    
    if (scoreCount > 0) {
      totalScore += (scoreSum / scoreCount) * weights.walkability;
      totalWeight += weights.walkability;
    }
  }

  // 2. Safety - Anchored range instead of percentile
  // Range: 0 incidents = 100 pts, 800 incidents = 0 pts (national avg ~380 = 52 pts)
  if (weights.safety > 0 && qol.crime) {
    const c = qol.crime;
    
    if (c.violentCrimeRate !== null) {
      // Anchored range: 0-800 incidents/100k
      let safetyScore = normalizeToRange(c.violentCrimeRate, 0, 800, true);
      
      // Penalty if exceeds user threshold
      if (c.violentCrimeRate > prefs.maxViolentCrimeRate) {
        safetyScore -= Math.min(25, ((c.violentCrimeRate - prefs.maxViolentCrimeRate) / prefs.maxViolentCrimeRate) * 30);
      }
      
      // Bonus/penalty for trend
      if (prefs.preferFallingCrime && c.trend3Year === "falling") {
        safetyScore += 5;
      } else if (c.trend3Year === "rising") {
        safetyScore -= 5;
      }
      
      totalScore += Math.max(0, Math.min(100, safetyScore)) * weights.safety;
      totalWeight += weights.safety;
    }
  }

  // 3. Air Quality - Anchored range for healthy days
  // Range: 70% healthy = 0 pts, 99% healthy = 100 pts
  // (Most US cities are fairly clean, compressed range differentiates better)
  if (weights.airQuality > 0 && qol.airQuality) {
    const a = qol.airQuality;
    
    if (a.healthyDaysPercent !== null) {
      let airScore = normalizeToRange(a.healthyDaysPercent, 70, 99, false);
      
      // Penalty for hazardous days above user threshold
      if (a.hazardousDays !== null && prefs.maxHazardousDays > 0) {
        if (a.hazardousDays > prefs.maxHazardousDays) {
          airScore -= Math.min(25, ((a.hazardousDays - prefs.maxHazardousDays) / prefs.maxHazardousDays) * 30);
        }
      }
      
      totalScore += Math.max(0, Math.min(100, airScore)) * weights.airQuality;
      totalWeight += weights.airQuality;
    }
  }

  // 4. Internet - Use fiber % directly (already 0-100)
  if (weights.internet > 0 && qol.broadband) {
    const b = qol.broadband;
    
    if (b.fiberCoveragePercent !== null) {
      // Fiber % is already 0-100, use directly
      let internetScore = b.fiberCoveragePercent;
      
      // Bonus for competition (multiple providers)
      if (b.providerCount !== null && b.providerCount > 2) {
        internetScore += 10;
      }
      
      // Penalty if fiber required but not available
      if (prefs.requireFiber && b.fiberCoveragePercent < 50) {
        internetScore -= 20;
      }
      
      totalScore += Math.max(0, Math.min(100, internetScore)) * weights.internet;
      totalWeight += weights.internet;
    }
  }

  // 5. Education - Both ratio and grad rate normalized before blending
  // Ratio: 12:1 = 100 pts (excellent), 22:1 = 0 pts (overcrowded)
  // Grad Rate: 80% = 0 pts, 95% = 100 pts (normalized to differentiate)
  if (weights.schools > 0 && qol.education) {
    const e = qol.education;
    
    if (e.studentTeacherRatio !== null) {
      // Normalize ratio: 12:1 = 100, 22:1 = 0 (inverted - lower is better)
      let schoolScore = normalizeToRange(e.studentTeacherRatio, 12, 22, true);
      
      // Penalty if above user's max threshold
      if (e.studentTeacherRatio > prefs.maxStudentTeacherRatio) {
        schoolScore -= 15;
      }
      
      // Blend with graduation rate (also normalized)
      if (e.graduationRate !== null) {
        // Normalize grad rate: 80% = 0, 95% = 100
        // This fixes the "raw 85 pulling down percentile 99" issue
        const gradScore = normalizeToRange(e.graduationRate, 80, 95, false);
        schoolScore = (schoolScore * 0.6 + gradScore * 0.4);
      }
      
      totalScore += Math.max(0, Math.min(100, schoolScore)) * weights.schools;
      totalWeight += weights.schools;
    }
  }

  // 6. Healthcare - Anchored range for physician rate
  // Range: 40 docs/100k = 0 pts, 120 docs/100k = 100 pts (national avg ~75 = 44 pts)
  if (weights.healthcare > 0 && qol.health) {
    const h = qol.health;
    
    if (h.primaryCarePhysiciansPer100k !== null) {
      let healthScore = normalizeToRange(h.primaryCarePhysiciansPer100k, 40, 120, false);
      
      // Penalty if below user's minimum threshold
      if (h.primaryCarePhysiciansPer100k < prefs.minPhysiciansPer100k) {
        healthScore -= 15;
      }
      
      // HPSA penalty (Health Professional Shortage Area score)
      // 0 = no shortage, 25+ = severe shortage
      if (h.hpsaScore !== null) {
        healthScore -= Math.min(25, h.hpsaScore);
      }
      
      totalScore += Math.max(0, Math.min(100, healthScore)) * weights.healthcare;
      totalWeight += weights.healthcare;
    }
  }

  // Note: Recreation has been moved to Entertainment category

  if (totalWeight === 0) return 50;
  return Math.max(0, Math.min(100, totalScore / totalWeight));
}
