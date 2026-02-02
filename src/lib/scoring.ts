/**
 * Scoring Module - Re-exports from modular scoring directory
 * 
 * The scoring logic has been decomposed into separate files for maintainability:
 * - src/lib/scoring/constants.ts: Range constants for normalization
 * - src/lib/scoring/utils.ts: Normalization utility functions
 * - src/lib/scoring/types.ts: Interfaces and percentile cache
 * - src/lib/scoring/climate.ts: Climate scoring using NOAA data
 * - src/lib/scoring/cost.ts: Cost of living scoring using BEA data
 * - src/lib/scoring/demographics.ts: Demographics scoring using Census data
 * - src/lib/scoring/quality-of-life.ts: QoL scoring (walkability, safety, etc.)
 * - src/lib/scoring/cultural.ts: Cultural scoring (political, religious, urban lifestyle)
 * - src/lib/scoring/display.ts: UI display utilities (grades, colors, labels)
 * 
 * This file re-exports everything for backward compatibility with existing imports.
 */

export {
  // Main scoring function
  calculateScores,
  
  // Category scoring functions
  calculateClimateScore,
  calculateCostScore,
  calculateDemographicsScore,
  calculateQualityOfLifeScore,
  calculateCulturalScore,
  
  // Display utilities
  getGrade,
  getScoreColor,
  getScoreBgColor,
  getScoreLabel,
  getScoreRelative,
  getScoreTooltip,
  
  // Normalization utilities
  normalizeToRange,
  toPercentileScore,
  minorityPresenceScore,
  urbanAmenityScore,
  
  // Constants
  CLIMATE_RANGES,
  QOL_RANGES,
  RECREATION_RANGES,
  URBAN_LIFESTYLE_RANGES,
  
  // Types
  type QoLPercentiles,
  computeQoLPercentiles,
  setQoLPercentilesCache,
  getQoLPercentilesCache,
} from "./scoring/index";
