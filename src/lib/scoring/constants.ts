// ============================================================================
// NORMALIZATION CONSTANTS - U.S. Geographic Extremes
// These define the 0-100 bounds for range-based normalization
// ============================================================================

export const CLIMATE_RANGES = {
  // Comfort Days (65-80°F): More is better
  comfortDays: { min: 50, max: 280 },         // ~50 (Buffalo) to ~267 (San Diego)
  // Extreme Heat Days (>95°F): Fewer is better (inverted)
  extremeHeatDays: { min: 0, max: 90 },       // 0 (coastal) to ~90 (Phoenix)
  // Freeze Days (<32°F): Fewer is better (inverted)
  freezeDays: { min: 0, max: 160 },           // 0 (Miami) to ~160 (Minneapolis)
  // Rain Days: Fewer is better (inverted)
  rainDays: { min: 30, max: 180 },            // ~30 (Phoenix) to ~180 (Seattle area)
  // Snow Days: Fewer is better (inverted)
  snowDays: { min: 0, max: 65 },              // 0 (SoCal) to ~65 (Buffalo)
  // Cloudy Days: Fewer is better (inverted)
  cloudyDays: { min: 50, max: 220 },          // ~50 (Phoenix) to ~220 (Seattle)
  // July Dewpoint: Lower is better (inverted)
  julyDewpoint: { min: 45, max: 75 },         // ~45 (desert) to ~75 (Houston)
  // Degree Days (CDD+HDD): Lower is better (inverted)
  degreeDays: { min: 2000, max: 9000 },       // ~2000 (San Diego) to ~9000 (Minneapolis)
  // Growing Season: More is better
  growingSeasonDays: { min: 120, max: 365 },  // ~120 (northern) to 365 (SoCal)
  // Seasonal Stability (temp stddev): Lower is better (inverted)
  seasonalStability: { min: 5, max: 28 },     // ~5 (San Diego) to ~28 (Minneapolis)
  // Diurnal Swing: Smaller is better (inverted)
  diurnalSwing: { min: 10, max: 35 },         // ~10 (coastal) to ~35 (desert)
};

// QoL metric ranges for percentile calculation
export const QOL_RANGES = {
  // Walk Score: 0-100, higher is better
  walkScore: { min: 20, max: 95 },
  // Transit Score: 0-100, higher is better
  transitScore: { min: 0, max: 90 },
  // Bike Score: 0-100, higher is better
  bikeScore: { min: 20, max: 85 },
  // Violent Crime Rate: per 100K, lower is better (inverted)
  violentCrimeRate: { min: 80, max: 900 },
  // Healthy Air Days %: higher is better
  healthyDaysPercent: { min: 50, max: 98 },
  // Fiber Coverage %: higher is better
  fiberCoveragePercent: { min: 10, max: 95 },
  // Student-Teacher Ratio: lower is better (inverted)
  studentTeacherRatio: { min: 10, max: 25 },
  // Physicians per 100K: higher is better
  physiciansPer100k: { min: 30, max: 180 },
};

// Recreation metric ranges for range-based normalization
export const RECREATION_RANGES = {
  // Trail miles within 10mi radius: higher is better
  trailMiles: { min: 0, max: 150 },           // 0 (flat cities) to 150+ (Denver, Seattle)
  // Park acres per 1K residents: higher is better
  parkAcres: { min: 5, max: 100 },            // ~5 (dense urban) to 100+ (nature-oriented)
  // Protected land %: higher is better
  protectedLandPercent: { min: 0, max: 30 },  // 0% to 30%+ (near national forests)
  // Max elevation delta (ft) in 30mi: higher is better for mountains
  elevationDelta: { min: 0, max: 4000 },      // 0 (flat) to 4000+ (Salt Lake, Denver)
};

// Urban lifestyle ranges for logarithmic/percentile normalization
// CALIBRATED to actual OpenStreetMap data distribution (Jan 2026)
export const URBAN_LIFESTYLE_RANGES = {
  // Bars/clubs per 10K: uses logarithmic curve
  // Data range: 0.4 (LA) to 7.7 (Portland). Avg ~2.5-4.0
  // Portland/SF/NOLA should score 80+, Denver/Seattle/Austin should score 70+
  barsAndClubsPer10K: { min: 0.5, plateau: 5, max: 10 },
  
  // Museums: uses logarithmic curve
  // Data range: 8 to 162 (NYC). Most cities 15-60.
  // NYC/DC (100+) should score 95+, mid-tier (30-50) should score 70+
  museums: { min: 5, plateau: 30, max: 150 },
  
  // Restaurants per 10K: uses logarithmic curve
  // Data range: 2.7 to 42.6 (SF). Most cities 10-25.
  // SF/Austin (35+) should score 85+, mid-tier (15-25) should score 65+
  restaurantsPer10K: { min: 3, plateau: 20, max: 45 },
  
  // Cuisine diversity (number of distinct types)
  cuisineDiversity: { min: 5, max: 50 },                   // 5 (limited) to 50+ (diverse metros)
};
