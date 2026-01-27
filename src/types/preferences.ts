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
    // Climate sub-preferences
    climate: {
      idealTemp: number;
      maxSummerTemp: number;
      minWinterTemp: number;
      minSunshineDays: number;
      maxRainDays: number;
    };

    // Cost sub-preferences
    costOfLiving: {
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
      idealTemp: 65,
      maxSummerTemp: 90,
      minWinterTemp: 30,
      minSunshineDays: 200,
      maxRainDays: 120,
    },
    costOfLiving: {
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

  // Climate advanced
  "advanced.climate.idealTemp":
    "Your preferred average annual temperature in °F. Cities closer to this score higher. US cities range from 45°F (Seattle) to 77°F (Miami).",
  "advanced.climate.maxSummerTemp":
    "Maximum acceptable average summer temperature. Cities exceeding this get penalized.",
  "advanced.climate.minWinterTemp":
    "Minimum acceptable average winter temperature. Cities below this get penalized.",
  "advanced.climate.minSunshineDays":
    "Minimum days of sunshine per year. Seattle has ~160, Phoenix has ~300.",
  "advanced.climate.maxRainDays":
    "Maximum acceptable rainy days per year. Seattle has ~150, Phoenix has ~35.",

  // Cost advanced
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
