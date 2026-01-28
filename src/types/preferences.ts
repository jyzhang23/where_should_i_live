// User preferences types - stored client-side in localStorage

export interface UserPreferences {
  // === BASIC OPTIONS (always visible) ===

  // Category weights (0-100, shown as sliders)
  weights: {
    climate: number;
    costOfLiving: number;
    demographics: number;
    qualityOfLife: number;
  };

  // Quick filters (toggles)
  filters: {
    requiresNFL: boolean;
    requiresNBA: boolean;
    requiresAirport: boolean;
    maxHomePrice: number | null;
  };

  // === ADVANCED OPTIONS (collapsible) ===

  advanced: {
    // Climate sub-preferences (NOAA-based)
    climate: {
      // === COMFORT ===
      // T-Shirt Weather: How important are comfortable outdoor days?
      weightComfortDays: number;        // 0-100, default 50
      minComfortDays: number;           // Days 65-80°F, default 150

      // === EXTREMES ===
      // Heat Tolerance
      weightExtremeHeat: number;        // 0-100, default 50
      maxExtremeHeatDays: number;       // Days >95°F, default 10

      // Cold Tolerance
      weightFreezeDays: number;         // 0-100, default 50
      maxFreezeDays: number;            // Days <32°F, default 30

      // === PRECIPITATION ===
      weightRainDays: number;           // 0-100, default 50
      maxRainDays: number;              // Default 100

      // === UTILITY COSTS ===
      weightUtilityCosts: number;       // 0-100, default 50
      // Uses CDD + HDD internally

      // === GROWING SEASON ===
      weightGrowingSeason: number;      // 0-100, default 0 (off by default)
      minGrowingSeasonDays: number;     // Default 180

      // === STABILITY ===
      weightSeasonalStability: number;  // 0-100, default 25
      // Lower stddev = more "perpetual spring" like San Diego

      weightDiurnalSwing: number;       // 0-100, default 25
      maxDiurnalSwing: number;          // °F, default 25

      // Legacy fields (kept for migration/fallback)
      idealTemp: number;
      maxSummerTemp: number;
      minWinterTemp: number;
      minSunshineDays: number;
    };

    // Cost sub-preferences
    costOfLiving: {
      // Housing situation affects how RPP is calculated
      housingSituation: "renter" | "homeowner" | "prospective-buyer";
      // Include utilities in renter calculation (older cities have higher utility costs)
      includeUtilities: boolean;
      // Legacy fields (kept for backward compatibility, no longer used in UI)
      maxStateTax: number;
      maxPropertyTax: number;
      weightHomePrice: number;
      weightTaxBurden: number;
    };

    // Demographics sub-preferences
    demographics: {
      minPopulation: number;
      minDiversityIndex: number;
      targetEastAsianPercent: number;
    };

    // Quality of life sub-preferences
    qualityOfLife: {
      minWalkScore: number;
      minTransitScore: number;
      maxCrimeRate: number;
      requiresAirport: boolean;
    };

    // Political preferences
    political: {
      preferredLeaning: "blue" | "red" | "neutral";
      strengthOfPreference: number;
    };
  };
}

// Default preferences (sensible starting point)
export const DEFAULT_PREFERENCES: UserPreferences = {
  weights: {
    climate: 50,
    costOfLiving: 50,
    demographics: 50,
    qualityOfLife: 50,
  },
  filters: {
    requiresNFL: false,
    requiresNBA: false,
    requiresAirport: false,
    maxHomePrice: null,
  },
  advanced: {
    climate: {
      // NOAA-based preferences
      weightComfortDays: 50,
      minComfortDays: 150,
      weightExtremeHeat: 50,
      maxExtremeHeatDays: 10,
      weightFreezeDays: 50,
      maxFreezeDays: 30,
      weightRainDays: 50,
      maxRainDays: 100,
      weightUtilityCosts: 50,
      weightGrowingSeason: 0,  // Off by default
      minGrowingSeasonDays: 180,
      weightSeasonalStability: 25,
      weightDiurnalSwing: 25,
      maxDiurnalSwing: 25,
      // Legacy fields
      idealTemp: 65,
      maxSummerTemp: 90,
      minWinterTemp: 30,
      minSunshineDays: 200,
    },
    costOfLiving: {
      housingSituation: "renter",
      includeUtilities: true,
      // Legacy fields
      maxStateTax: 0.1,
      maxPropertyTax: 0.015,
      weightHomePrice: 60,
      weightTaxBurden: 40,
    },
    demographics: {
      minPopulation: 0,
      minDiversityIndex: 0,
      targetEastAsianPercent: 0,
    },
    qualityOfLife: {
      minWalkScore: 0,
      minTransitScore: 0,
      maxCrimeRate: 1000,
      requiresAirport: false,
    },
    political: {
      preferredLeaning: "neutral",
      strengthOfPreference: 0,
    },
  },
};

// Tooltip content for all preferences
export const TOOLTIPS: Record<string, string> = {
  // Basic weights
  "weights.climate":
    "How heavily to weight weather factors (temperature, sunshine, rain) in the final score. Higher = weather matters more.",
  "weights.costOfLiving":
    "How heavily to weight affordability (home prices, taxes) in the final score. Higher = cost matters more.",
  "weights.demographics":
    "How heavily to weight population and diversity factors. Higher = demographics matter more.",
  "weights.qualityOfLife":
    "How heavily to weight quality of life factors (walkability, transit, crime, pollution). Higher = QoL matters more.",

  // Filters
  "filters.requiresNFL":
    "Exclude cities without an NFL team. Excludes cities like Sacramento, Austin, Portland.",
  "filters.requiresNBA":
    "Exclude cities without an NBA team. Excludes cities like San Diego, Austin, Nashville.",
  "filters.requiresAirport":
    "Exclude cities without a major international airport. Most large cities have one.",
  "filters.maxHomePrice":
    "Filter out cities where median single-family home exceeds this price.",

  // Climate advanced (NOAA-based)
  "advanced.climate.weightComfortDays":
    "How important are 'T-shirt weather' days (65-80°F)? San Diego: 267 days, Chicago: 89 days.",
  "advanced.climate.minComfortDays":
    "Minimum desired comfortable outdoor days (65-80°F). Cities with more score higher.",
  "advanced.climate.weightExtremeHeat":
    "How important is avoiding extreme heat (>95°F)? Phoenix: 107 days, Seattle: 3 days.",
  "advanced.climate.maxExtremeHeatDays":
    "Maximum acceptable extreme heat days (>95°F). Cities exceeding this get penalized.",
  "advanced.climate.weightFreezeDays":
    "How important is avoiding freezing temps (<32°F)? Minneapolis: 156 days, Miami: 0 days.",
  "advanced.climate.maxFreezeDays":
    "Maximum acceptable freeze days (<32°F). Cities exceeding this get penalized.",
  "advanced.climate.weightRainDays":
    "How important is avoiding rainy days? Seattle: 152 days, Phoenix: 36 days.",
  "advanced.climate.maxRainDays":
    "Maximum acceptable rainy days per year. Cities exceeding this get penalized.",
  "advanced.climate.weightUtilityCosts":
    "How important are utility costs? Based on Heating + Cooling Degree Days. San Diego: low, Minneapolis: high.",
  "advanced.climate.weightGrowingSeason":
    "How important is a long growing season for gardening? Miami: 365 days, Boston: 180 days.",
  "advanced.climate.minGrowingSeasonDays":
    "Minimum desired growing season length. Cities with longer seasons score higher.",
  "advanced.climate.weightSeasonalStability":
    "Prefer consistent year-round temps ('perpetual spring')? San Diego: very stable, Chicago: high variation.",
  "advanced.climate.weightDiurnalSwing":
    "Prefer consistent day/night temps? Miami: 10°F swing, Denver: 28°F swing.",
  "advanced.climate.maxDiurnalSwing":
    "Maximum acceptable daily temperature swing (°F). Lower = more consistent temps.",
  // Legacy climate tooltips (for fallback)
  "advanced.climate.idealTemp":
    "Your preferred average annual temperature in °F. Cities closer to this score higher. US cities range from 45°F (Seattle) to 77°F (Miami).",
  "advanced.climate.maxSummerTemp":
    "Maximum acceptable average summer temperature. Cities exceeding this get penalized.",
  "advanced.climate.minWinterTemp":
    "Minimum acceptable average winter temperature. Cities below this get penalized.",
  "advanced.climate.minSunshineDays":
    "Minimum days of sunshine per year. Seattle has ~160, Phoenix has ~300.",

  // Cost advanced
  "advanced.costOfLiving.housingSituation":
    "Your housing situation affects how cost of living is calculated. Renters use the standard BEA index. Homeowners exclude housing costs (your mortgage is fixed). Prospective buyers factor in current home prices and mortgage rates.",
  "advanced.costOfLiving.includeUtilities":
    "Include utility costs in the calculation. Important for renters in older cities (Boston, Philly) where utilities can be significantly higher.",
  // Legacy tooltips (kept for compatibility)
  "advanced.costOfLiving.maxStateTax":
    "Maximum acceptable state income tax rate. 0% (TX, FL) to 13.3% (CA).",
  "advanced.costOfLiving.maxPropertyTax":
    "Maximum acceptable property tax rate. Ranges from 0.3% (HI) to 2.5% (NJ).",
  "advanced.costOfLiving.weightHomePrice":
    "Within cost of living, how much weight to give home prices vs taxes.",
  "advanced.costOfLiving.weightTaxBurden":
    "Within cost of living, how much weight to give tax burden vs home prices.",

  // Demographics advanced
  "advanced.demographics.minPopulation":
    "Minimum metro area population (in thousands). NYC is ~20,000, smallest tracked is ~500.",
  "advanced.demographics.minDiversityIndex":
    "Minimum diversity index (0-100). Higher = more diverse.",
  "advanced.demographics.targetEastAsianPercent":
    "Target East Asian population percentage. SF is ~28%, most cities are 2-5%.",

  // Quality of life advanced
  "advanced.qualityOfLife.minWalkScore":
    "Minimum Walk Score (0-100). NYC is ~88, most suburbs are 20-40.",
  "advanced.qualityOfLife.minTransitScore":
    "Minimum Transit Score (0-100). NYC is ~89, car-dependent cities are 20-40.",
  "advanced.qualityOfLife.maxCrimeRate":
    "Maximum violent crime rate per 100K population. National average is ~380.",
  "advanced.qualityOfLife.requiresAirport":
    "Require an international airport for easy travel.",

  // Political advanced
  "advanced.political.preferredLeaning":
    "Prefer cities/states that lean Democratic (blue), Republican (red), or no preference (neutral).",
  "advanced.political.strengthOfPreference":
    "How strongly to weight political alignment (0 = ignore, 100 = very important).",
};
