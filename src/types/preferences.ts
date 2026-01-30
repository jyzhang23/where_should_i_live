// User preferences types - stored client-side in localStorage

export interface UserPreferences {
  // === BASIC OPTIONS (always visible) ===

  // Category weights (0-100, shown as sliders)
  weights: {
    climate: number;
    costOfLiving: number;
    demographics: number;
    qualityOfLife: number;
    cultural: number;
  };

  // Quick filters (toggles) - reserved for future hard filters
  filters: Record<string, never>;

  // === ADVANCED OPTIONS (collapsible) ===

  advanced: {
    // Climate sub-preferences (NOAA ACIS + Open-Meteo based)
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

      // === SNOW ===
      weightSnowDays: number;           // 0-100, default 25
      maxSnowDays: number;              // Days with >1in snow, default 15

      // === GLOOM / SUNSHINE ===
      weightCloudyDays: number;         // 0-100, default 40
      maxCloudyDays: number;            // Days with >75% cloud cover, default 150

      // === HUMIDITY / STICKINESS ===
      weightHumidity: number;           // 0-100, default 40
      maxJulyDewpoint: number;          // °F, default 65 (65+ = muggy, 72+ = oppressive)

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
      // Housing situation affects how RPP (cost index) is calculated
      housingSituation: "renter" | "homeowner" | "prospective-buyer";
      // Include utilities in renter calculation (older cities have higher utility costs)
      includeUtilities: boolean;
      
      // Work situation affects the INCOME numerator in purchasing power calculation
      workSituation: "standard" | "local-earner" | "retiree";
      // "standard" = Fixed national median income - pure affordability comparison
      // "local-earner" = Per Capita Income (BEA) - reflects local earning potential  
      // "retiree" = User-defined fixed income
      
      // Fixed income for retiree persona (annual, pre-tax)
      retireeFixedIncome: number;
      
      // Legacy fields (kept for backward compatibility, no longer used in UI)
      maxStateTax: number;
      maxPropertyTax: number;
      weightHomePrice: number;
      weightTaxBurden: number;
    };

    // Demographics sub-preferences (Census ACS-based)
    demographics: {
      // Population
      minPopulation: number;              // Minimum city population, default 0
      
      // Diversity
      minDiversityIndex: number;          // 0-100, Simpson's diversity index
      weightDiversity: number;            // How important is diversity (0-100)
      
      // Age preferences
      preferredAgeGroup: "young" | "mixed" | "mature" | "any";  // Young: median <35, Mature: >45
      weightAge: number;                  // 0-100, default 0
      
      // Education
      minBachelorsPercent: number;        // Minimum % with bachelor's degree
      weightEducation: number;            // 0-100, default 25
      
      // Foreign-born / International culture
      minForeignBornPercent: number;      // % born outside US (proxy for international food/culture)
      weightForeignBorn: number;          // 0-100, default 0
      
      // Minority community presence
      minorityGroup: "none" | "hispanic" | "black" | "asian" | "pacific-islander" | "native-american";
      // Subgroup targeting (for Hispanic and Asian)
      minoritySubgroup: "any" | 
        // Hispanic subgroups
        "mexican" | "puerto-rican" | "cuban" | "salvadoran" | "guatemalan" | "colombian" |
        // Asian subgroups
        "chinese" | "indian" | "filipino" | "vietnamese" | "korean" | "japanese";
      // Minimum presence desired (0-30%) - for cultural infrastructure (stores, restaurants, institutions)
      minMinorityPresence: number;
      // How important is minority community in the demographics score (0-100%)
      minorityImportance: number;
      
      // Income / Economic health
      minMedianHouseholdIncome: number;   // Minimum median household income
      maxPovertyRate: number;             // Maximum poverty rate %
      weightEconomicHealth: number;       // 0-100, default 25
      
      // Dating Favorability (optional sub-feature)
      datingEnabled: boolean;             // Enable dating favorability scoring
      seekingGender: "men" | "women" | null;  // Who you're looking for
      datingAgeRange: "20-29" | "30-39" | "40-49" | null;  // Age range interested in
      datingWeight: number;               // 0-100, how much dating affects demographics score
    };

    // Quality of life sub-preferences
    qualityOfLife: {
      // Walkability thresholds
      minWalkScore: number;        // 0-100, default 0
      minTransitScore: number;     // 0-100, default 0
      
      // Safety thresholds
      maxViolentCrimeRate: number; // per 100k, default 500
      preferFallingCrime: boolean; // bonus for improving trend
      
      // Air Quality
      maxHazardousDays: number;    // default 30
      
      // Internet
      requireFiber: boolean;       // require >1Gbps option
      minProviders: number;        // competition threshold
      
      // Schools
      maxStudentTeacherRatio: number; // default 20
      
      // Healthcare
      minPhysiciansPer100k: number;   // default 50
      
      // Recreation & Outdoor Access (NEW)
      recreationWeight: number;       // 0-100, overall recreation importance
      natureImportance: number;       // Parks, trails, protected land (0-100)
      beachImportance: number;        // Coastal access (0-100)
      mountainImportance: number;     // Mountain/elevation access (0-100)
      
      // Legacy (kept for backward compatibility)
      maxCrimeRate: number;
      
      // Category weights (sum to 100)
      weights: {
        walkability: number;  // default 20
        safety: number;       // default 25
        airQuality: number;   // default 15
        internet: number;     // default 10
        schools: number;      // default 15
        healthcare: number;   // default 15
        recreation: number;   // default 0 (NEW)
      };
    };

    // Cultural preferences (political + religious + urban lifestyle)
    cultural: {
      // Political
      partisanPreference: "strong-dem" | "lean-dem" | "swing" | "lean-rep" | "strong-rep" | "neutral";
      partisanWeight: number;           // 0-100
      preferHighTurnout: boolean;       // Civic engagement filter
      
      // Religious
      religiousTraditions: string[];    // Multi-select: ["catholic", "jewish", ...]
      minTraditionPresence: number;     // Minimum adherents/1000 (default 50)
      traditionsWeight: number;         // 0-100
      preferReligiousDiversity: boolean; // High diversity = higher score
      diversityWeight: number;          // 0-100
      
      // Urban Lifestyle (NEW)
      urbanLifestyleWeight: number;     // 0-100, overall urban vibe importance
      nightlifeImportance: number;      // Bars, clubs, late night (0-100)
      artsImportance: number;           // Museums, theaters, galleries (0-100)
      diningImportance: number;         // Fine dining, cuisine diversity (0-100)
      sportsImportance: number;         // Professional sports teams (0-100)
    };

    // Legacy political preferences (kept for migration)
    /** @deprecated Use cultural instead */
    political?: {
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
    cultural: 0,  // Off by default (sensitive topic)
  },
  filters: {},
  advanced: {
    climate: {
      // NOAA ACIS + Open-Meteo based preferences
      weightComfortDays: 50,
      minComfortDays: 150,
      weightExtremeHeat: 50,
      maxExtremeHeatDays: 10,
      weightFreezeDays: 50,
      maxFreezeDays: 30,
      weightRainDays: 50,
      maxRainDays: 100,
      weightSnowDays: 25,
      maxSnowDays: 15,
      weightCloudyDays: 40,
      maxCloudyDays: 150,
      weightHumidity: 40,
      maxJulyDewpoint: 65,
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
      workSituation: "local-earner",  // Use local income levels by default
      retireeFixedIncome: 50000,  // Default $50K/year for retiree persona
      // Legacy fields
      maxStateTax: 0.1,
      maxPropertyTax: 0.015,
      weightHomePrice: 60,
      weightTaxBurden: 40,
    },
    demographics: {
      minPopulation: 0,
      minDiversityIndex: 0,
      weightDiversity: 25,
      preferredAgeGroup: "any",
      weightAge: 0,
      minBachelorsPercent: 0,
      weightEducation: 25,
      minForeignBornPercent: 0,
      weightForeignBorn: 0,
      minorityGroup: "none",
      minoritySubgroup: "any",
      minMinorityPresence: 5,        // Default: at least 5% for cultural infrastructure
      minorityImportance: 50,        // Default: moderately important when enabled
      minMedianHouseholdIncome: 0,
      maxPovertyRate: 100,
      weightEconomicHealth: 25,
      // Dating Favorability (off by default)
      datingEnabled: false,
      seekingGender: null,
      datingAgeRange: null,
      datingWeight: 50,
    },
    qualityOfLife: {
      minWalkScore: 0,
      minTransitScore: 0,
      maxViolentCrimeRate: 500,
      preferFallingCrime: false,
      maxHazardousDays: 30,
      requireFiber: false,
      minProviders: 2,
      maxStudentTeacherRatio: 20,
      minPhysiciansPer100k: 50,
      // Recreation preferences (NEW)
      recreationWeight: 0,        // Off by default
      natureImportance: 50,       // Balanced when enabled
      beachImportance: 50,
      mountainImportance: 50,
      maxCrimeRate: 1000, // Legacy
      weights: {
        walkability: 20,
        safety: 25,
        airQuality: 15,
        internet: 10,
        schools: 15,
        healthcare: 15,
        recreation: 0,            // Off by default (NEW)
      },
    },
    cultural: {
      partisanPreference: "neutral",
      partisanWeight: 0,
      preferHighTurnout: false,
      religiousTraditions: [],
      minTraditionPresence: 50,
      traditionsWeight: 0,
      preferReligiousDiversity: false,
      diversityWeight: 0,
      // Urban Lifestyle preferences (NEW)
      urbanLifestyleWeight: 0,    // Off by default
      nightlifeImportance: 50,    // Balanced when enabled
      artsImportance: 50,
      diningImportance: 50,
      sportsImportance: 50,       // Balanced when enabled
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
  "weights.cultural":
    "How heavily to weight cultural factors (political lean, religious communities). Set to 0 to ignore. Configure specific preferences in Advanced > Cultural Preferences.",

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
  "advanced.climate.weightSnowDays":
    "How important is avoiding snowy days? Minneapolis: 40+ days, Miami: 0 days.",
  "advanced.climate.maxSnowDays":
    "Maximum acceptable snow days (>1 inch) per year. Cities exceeding this get penalized.",
  "advanced.climate.weightCloudyDays":
    "How important is avoiding cloudy/gloomy weather? Seattle: 200+ cloudy days, Phoenix: 80 days.",
  "advanced.climate.maxCloudyDays":
    "Maximum acceptable cloudy days (>75% cloud cover) per year. Higher = more tolerance for gloom.",
  "advanced.climate.weightHumidity":
    "How important is avoiding summer humidity/stickiness? Miami: very humid, Denver: very dry.",
  "advanced.climate.maxJulyDewpoint":
    "Maximum acceptable July dewpoint (°F). 65°F+ = muggy, 72°F+ = oppressive. Phoenix: 55°F, Miami: 75°F.",
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
  "advanced.costOfLiving.workSituation":
    "Determines how purchasing power is calculated. 'Standard' uses fixed national median income - pure affordability comparison. 'High Earner' uses local per-capita income - shows how local professionals fare. 'Retiree' uses your specified fixed income.",
  "advanced.costOfLiving.retireeFixedIncome":
    "Your annual pre-tax income for the retiree persona. The average Social Security benefit is ~$22K/year; median retiree income is ~$50K.",
  // Legacy tooltips (kept for compatibility)
  "advanced.costOfLiving.maxStateTax":
    "Maximum acceptable state income tax rate. 0% (TX, FL) to 13.3% (CA).",
  "advanced.costOfLiving.maxPropertyTax":
    "Maximum acceptable property tax rate. Ranges from 0.3% (HI) to 2.5% (NJ).",
  "advanced.costOfLiving.weightHomePrice":
    "Within cost of living, how much weight to give home prices vs taxes.",
  "advanced.costOfLiving.weightTaxBurden":
    "Within cost of living, how much weight to give tax burden vs home prices.",

  // Demographics advanced (Census ACS-based)
  "advanced.demographics.minPopulation":
    "Minimum city population. NYC: 8.3M, San Francisco: 870K, Gainesville: 140K.",
  "advanced.demographics.minDiversityIndex":
    "Minimum diversity index (0-100). Probability two random people differ by race. NYC: 77, Salt Lake: 35.",
  "advanced.demographics.weightDiversity":
    "How important is racial/ethnic diversity? Higher weight = diversity matters more in scoring.",
  "advanced.demographics.preferredAgeGroup":
    "Preferred city age profile. Young (<35 median): college towns. Mixed (35-45): family hubs. Mature (>45): retirement areas.",
  "advanced.demographics.weightAge":
    "How important is age demographics? Set to 0 to ignore.",
  "advanced.demographics.minBachelorsPercent":
    "Minimum % with bachelor's degree (25+). SF: 58%, Cleveland: 19%. Higher education often correlates with job market strength.",
  "advanced.demographics.weightEducation":
    "How important is educational attainment in scoring?",
  "advanced.demographics.minForeignBornPercent":
    "Minimum foreign-born %. Miami: 40%, Memphis: 5%. Proxy for international food, culture, and immigrant communities.",
  "advanced.demographics.weightForeignBorn":
    "How important is international/immigrant community presence?",
  "advanced.demographics.minorityGroup":
    "Select a minority group to find community with. Helps locate cultural resources like grocery stores, restaurants, religious institutions. Subgroup targeting is available for Hispanic and Asian.",
  "advanced.demographics.minoritySubgroup":
    "Target a specific subgroup (Hispanic: Mexican, Puerto Rican, Cuban, etc. Asian: Chinese, Indian, Filipino, etc.). Only available for Hispanic and Asian groups.",
  "advanced.demographics.minMinorityPresence":
    "Minimum % presence needed for cultural infrastructure. 5% = some restaurants/stores, 10% = established community, 20%+ = major presence.",
  "advanced.demographics.minorityImportance":
    "How much does minority community presence matter in your demographics score?",
  "advanced.demographics.minMedianHouseholdIncome":
    "Minimum median household income ($). SF: $126K, Memphis: $52K. Indicator of local economic health.",
  "advanced.demographics.maxPovertyRate":
    "Maximum acceptable poverty rate %. US avg: 11%. Higher poverty may indicate economic challenges.",
  "advanced.demographics.weightEconomicHealth":
    "How important is economic health (income, poverty rate) in scoring?",
  
  // Demographics advanced - Dating Favorability
  "advanced.demographics.datingEnabled":
    "Enable dating favorability scoring. Considers gender ratios, single population, economic factors, and walkability.",
  "advanced.demographics.seekingGender":
    "Who are you looking for? Affects how gender ratios are scored - looking for women favors cities with more women (ratio < 100).",
  "advanced.demographics.datingAgeRange":
    "Age range you're interested in. We'll use gender ratios for that specific bracket.",
  "advanced.demographics.datingWeight":
    "How much dating favorability affects your demographics score. 0 = ignore, 100 = dating factors only.",

  // Quality of life advanced
  "advanced.qualityOfLife.minWalkScore":
    "Minimum Walk Score® (0-100). NYC is ~88, most suburbs are 20-40. Data from walkscore.com.",
  "advanced.qualityOfLife.minTransitScore":
    "Minimum Transit Score® (0-100). NYC is ~89, car-dependent cities are 20-40. Data from walkscore.com.",
  "advanced.qualityOfLife.maxViolentCrimeRate":
    "Maximum violent crime rate per 100K population. National average is ~380.",
  "advanced.qualityOfLife.preferFallingCrime":
    "Give bonus points to cities where crime rates are declining over 3 years.",
  "advanced.qualityOfLife.maxHazardousDays":
    "Maximum acceptable days per year with AQI > 100 (unhealthy). Important for those with respiratory issues.",
  "advanced.qualityOfLife.requireFiber":
    "Require access to fiber internet (>1Gbps). Essential for remote workers with large file uploads.",
  "advanced.qualityOfLife.minProviders":
    "Minimum number of internet providers. More competition = better prices and service.",
  "advanced.qualityOfLife.maxStudentTeacherRatio":
    "Maximum students per teacher. Lower ratio = more individual attention. National avg is ~16.",
  "advanced.qualityOfLife.minPhysiciansPer100k":
    "Minimum primary care physicians per 100K residents. National avg is ~75.",
  "advanced.qualityOfLife.weights.walkability":
    "Weight for Walk Score®/Transit Score® in QoL calculation. Data from walkscore.com.",
  "advanced.qualityOfLife.weights.safety":
    "Weight for crime/safety scores in QoL calculation.",
  "advanced.qualityOfLife.weights.airQuality":
    "Weight for air quality scores in QoL calculation.",
  "advanced.qualityOfLife.weights.internet":
    "Weight for broadband/internet scores in QoL calculation.",
  "advanced.qualityOfLife.weights.schools":
    "Weight for education/school quality in QoL calculation.",
  "advanced.qualityOfLife.weights.healthcare":
    "Weight for healthcare access in QoL calculation.",

  // Cultural advanced - Political
  "advanced.cultural.partisanPreference":
    "Prefer cities that lean Democratic, Republican, or swing/competitive. 'Neutral' ignores political lean entirely.",
  "advanced.cultural.partisanWeight":
    "How strongly to weight political alignment (0 = ignore, 100 = very important).",
  "advanced.cultural.preferHighTurnout":
    "Prefer cities with high voter turnout (>65%). Often correlates with civic engagement and community activism.",
  
  // Cultural advanced - Religious
  "advanced.cultural.religiousTraditions":
    "Select religious traditions you want to find community with. Cities with higher presence score better.",
  "advanced.cultural.minTraditionPresence":
    "Minimum adherents per 1,000 residents. 50 = small community, 150 = moderate, 300+ = strong presence. National avg Catholic: 205, Evangelical: 256.",
  "advanced.cultural.traditionsWeight":
    "How important is finding your religious community (0 = ignore, 100 = very important).",
  "advanced.cultural.preferReligiousDiversity":
    "Prefer cities with diverse religious landscape vs. dominated by one tradition.",
  "advanced.cultural.diversityWeight":
    "How important is religious diversity (0 = ignore, 100 = very important).",

  // Cultural advanced - Urban Lifestyle (NEW)
  "advanced.cultural.urbanLifestyleWeight":
    "How important is urban entertainment and nightlife (0 = ignore, 100 = very important).",
  "advanced.cultural.nightlifeImportance":
    "How important are bars, clubs, and late-night venues? NYC has ~1,500+ bars, smaller cities have 50-100.",
  "advanced.cultural.artsImportance":
    "How important are museums, theaters, and galleries? DC has 70+ museums, most cities have 10-20.",
  "advanced.cultural.diningImportance":
    "How important is the dining scene? Fine dining, cuisine diversity, craft breweries.",
  "advanced.cultural.sportsImportance":
    "How important are professional sports teams (NFL, NBA)? NYC/LA have 4+ teams, many cities have 1-2, some have none.",

  // Quality of Life - Recreation (NEW)
  "advanced.qualityOfLife.recreationWeight":
    "How important is outdoor recreation access (0 = ignore, 100 = very important).",
  "advanced.qualityOfLife.natureImportance":
    "How important are parks, hiking trails, and protected lands? Denver has 300+ miles of trails nearby.",
  "advanced.qualityOfLife.beachImportance":
    "How important is beach/coastal access? Only ~30% of US cities are within 15 miles of coastline.",
  "advanced.qualityOfLife.mountainImportance":
    "How important is mountain access? Salt Lake has 4,000ft elevation gain within 30 miles; Dallas has <200ft.",
  "advanced.qualityOfLife.weights.recreation":
    "Weight for recreation/outdoor access in QoL calculation.",

  // Privacy note for cultural preferences
  "advanced.cultural.privacyNote":
    "Political and religious preferences are stored locally in your browser only and never sent to our servers.",
};
