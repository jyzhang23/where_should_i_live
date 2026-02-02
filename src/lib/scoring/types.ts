import { CityWithMetrics } from "@/types/city";

// ============================================================================
// QoL PERCENTILE CACHE
// Pre-computed during scoring to avoid repeated calculations
// ============================================================================

export interface QoLPercentiles {
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

export function computeQoLPercentiles(cities: CityWithMetrics[]): QoLPercentiles {
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

export function setQoLPercentilesCache(percentiles: QoLPercentiles): void {
  qolPercentilesCache = percentiles;
}

export function getQoLPercentilesCache(): QoLPercentiles | null {
  return qolPercentilesCache;
}
