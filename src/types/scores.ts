// Scoring types - computed client-side from city data + user preferences

export interface CityScore {
  cityId: string;
  cityName: string;
  state: string;

  // Category scores (0-100)
  climateScore: number;
  costScore: number;
  demographicsScore: number;
  qualityOfLifeScore: number;
  culturalScore: number;

  // Weighted total
  totalScore: number;

  // Filtered out?
  excluded: boolean;
  exclusionReason?: string;
}

export interface ScoringResult {
  rankings: CityScore[];
  includedCount: number;
  excludedCount: number;
}
