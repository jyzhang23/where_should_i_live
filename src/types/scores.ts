// Scoring types - computed client-side from city data + user preferences

export interface CityScore {
  cityId: string;
  cityName: string;
  state: string;

  // Category scores (0-100) - 6 categories
  climateScore: number;
  costScore: number;
  demographicsScore: number;
  qualityOfLifeScore: number;
  valuesScore: number;        // NEW - political + religious alignment
  entertainmentScore: number; // NEW - nightlife, arts, dining, sports, recreation

  // Weighted total
  totalScore: number;

  // Filtered out?
  excluded: boolean;
  exclusionReason?: string;
  
  // Legacy field for backward compatibility (deprecated)
  /** @deprecated Use valuesScore and entertainmentScore instead */
  culturalScore?: number;
}

export interface ScoringResult {
  rankings: CityScore[];
  includedCount: number;
  excludedCount: number;
}
