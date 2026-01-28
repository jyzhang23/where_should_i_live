// City and metrics types that match the Prisma schema
import { BEAMetrics } from "@/lib/cost-of-living";

// Census Bureau ACS Demographics Data
export interface CensusDemographics {
  source: string;              // "Census ACS 5-Year"
  year: number;                // e.g., 2022
  lastUpdated: string;         // ISO date
  
  // Population
  totalPopulation: number | null;
  
  // Age Demographics
  medianAge: number | null;
  under18Percent: number | null;
  age18to34Percent: number | null;
  age35to54Percent: number | null;
  age55PlusPercent: number | null;
  
  // Race/Ethnicity (percentages, sum to ~100%)
  whitePercent: number | null;          // White alone, not Hispanic
  blackPercent: number | null;          // Black/African American alone
  hispanicPercent: number | null;       // Hispanic/Latino (any race)
  asianPercent: number | null;          // Asian alone
  pacificIslanderPercent: number | null; // Native Hawaiian/Pacific Islander
  nativeAmericanPercent: number | null; // American Indian/Alaska Native
  twoOrMoreRacesPercent: number | null; // Two or more races
  otherRacePercent: number | null;      // Some other race
  
  // Asian Subgroups (of total population)
  chinesePercent: number | null;
  indianPercent: number | null;
  filipinoPercent: number | null;
  vietnamesePercent: number | null;
  koreanPercent: number | null;
  japanesePercent: number | null;
  
  // Hispanic/Latino Subgroups (of total population)
  mexicanPercent: number | null;
  puertoRicanPercent: number | null;
  cubanPercent: number | null;
  salvadoranPercent: number | null;
  guatemalanPercent: number | null;
  colombianPercent: number | null;
  
  // Diversity Index (calculated)
  diversityIndex: number | null;        // 0-100, probability two random people differ
  
  // Education (25+ population)
  highSchoolOrHigherPercent: number | null;
  bachelorsOrHigherPercent: number | null;
  graduateDegreePercent: number | null;
  
  // Income
  medianHouseholdIncome: number | null;
  perCapitaIncome: number | null;
  povertyRate: number | null;
  
  // Foreign-Born / Immigration
  foreignBornPercent: number | null;
  
  // Household Composition
  familyHouseholdsPercent: number | null;
  marriedCouplePercent: number | null;
  singlePersonPercent: number | null;
  
  // Language
  englishOnlyPercent: number | null;
  spanishAtHomePercent: number | null;
  asianLanguageAtHomePercent: number | null;
}

// Urban Lifestyle Metrics (Nightlife, Arts, Dining, Sports)
export interface UrbanLifestyleMetrics {
  nightlife: {
    barsAndClubsPer10K: number | null;  // Density per 10K residents
    totalVenues: number | null;          // Total bars + clubs
    lateNightVenues: number | null;      // Venues open past midnight
  } | null;
  
  arts: {
    museums: number | null;              // Total museums
    theaters: number | null;             // Performing arts venues
    artGalleries: number | null;         // Art galleries
    musicVenues: number | null;          // Concert halls, live music venues
  } | null;
  
  dining: {
    fineDiningCount: number | null;      // Upscale restaurants
    restaurantsPer10K: number | null;    // Total restaurant density
    cuisineDiversity: number | null;     // Number of distinct cuisine types
    breweries: number | null;            // Craft breweries
    coffeeshops: number | null;          // Coffee shops/cafes
  } | null;
  
  sports: {
    nflTeams: number;                    // Count of NFL teams (0, 1, or 2)
    nbaTeams: number;                    // Count of NBA teams (0, 1, or 2)
    totalProTeams: number;               // Combined count
    teamNames: string[];                 // Names of teams for display
  } | null;
  
  dataYear: number | null;
  lastUpdated: string | null;
}

// Cultural Data (Political + Religious + Urban Lifestyle)
export interface CulturalMetrics {
  political: {
    partisanIndex: number | null;      // -1 (Strong R) to +1 (Strong D)
    democratPercent: number | null;    // 0-100
    republicanPercent: number | null;  // 0-100
    voterTurnout: number | null;       // % of eligible voters
    marginOfVictory: number | null;    // absolute margin (for competitiveness)
    dataYear: number | null;
  } | null;
  religious: {
    // Adherents per 1,000 population
    catholic: number | null;
    evangelicalProtestant: number | null;
    mainlineProtestant: number | null;
    jewish: number | null;
    muslim: number | null;
    unaffiliated: number | null;       // "Nones" / secular
    lds?: number | null;               // LDS/Mormon (significant in some areas)
    // Derived metrics
    diversityIndex: number | null;     // 0-100, Simpson's diversity
    dominantTradition: string | null;  // Which tradition has highest share
    dataYear: number | null;
  } | null;
  
  // Urban Lifestyle (NEW)
  urbanLifestyle?: UrbanLifestyleMetrics;
}

// Recreation Metrics (Nature Access + Geographic Features)
export interface RecreationMetrics {
  nature: {
    parkAcresPer1K: number | null;        // Park acres per 1K residents
    trailMilesWithin10Mi: number | null;  // Hiking trail miles in 10mi radius
    protectedLandPercent: number | null;  // % protected/green space nearby
    stateParksWithin50Mi: number | null;  // Number of state/national parks
  } | null;
  
  geography: {
    coastlineWithin15Mi: boolean;         // Beach access (binary)
    coastlineDistanceMi: number | null;   // Distance to nearest coast (null if >100mi)
    waterQualityIndex: number | null;     // Beach water quality (if coastal)
    maxElevationDelta: number | null;     // Topographic prominence (ft) in 30mi radius
    nearestMountainDistMi: number | null; // Distance to significant elevation (>2000ft above city)
    nearestSkiResortMi: number | null;    // Distance to nearest ski resort
  } | null;
  
  dataYear: number | null;
  lastUpdated: string | null;
}

// Quality of Life API Data
export interface QoLMetrics {
  // Walk Score API
  walkability: {
    walkScore: number | null;
    bikeScore: number | null;
    transitScore: number | null;
    description: string | null;
    updatedAt: string | null;
  } | null;

  // FBI Crime Data Explorer
  crime: {
    violentCrimeRate: number | null;  // per 100k
    propertyCrimeRate: number | null; // per 100k
    trend3Year: "rising" | "falling" | "stable" | null;
    dataYear: number | null;
  } | null;

  // EPA AirNow
  airQuality: {
    annualAQI: number | null;
    healthyDaysPercent: number | null;  // AQI < 50
    hazardousDays: number | null;       // AQI > 100
    primaryPollutant: string | null;
    dataYear: number | null;
  } | null;

  // FCC Broadband Map
  broadband: {
    fiberCoveragePercent: number | null;  // >1Gbps
    providerCount: number | null;
    maxDownloadSpeed: number | null;      // Mbps
  } | null;

  // NCES Education
  education: {
    studentTeacherRatio: number | null;
    graduationRate: number | null;
    schoolCount: number | null;
  } | null;

  // HRSA Health Resources
  health: {
    primaryCarePhysiciansPer100k: number | null;
    hospitalBeds100k: number | null;
    hpsaScore: number | null;  // Health Professional Shortage Area
  } | null;
  
  // Recreation & Outdoor Access (NEW)
  recreation?: RecreationMetrics;
}

// Climate data from NOAA ACIS + Open-Meteo
export interface NOAAClimateData {
  source: string;              // "ACIS+Open-Meteo"
  station: string;             // ICAO code, e.g., "KSFO"
  normalPeriod: string;        // "1991-2020"
  lastUpdated: string;         // ISO date

  // Comfort metrics (ACIS)
  comfortDays: number | null;        // Days with 65°F <= max temp <= 80°F
  extremeHeatDays: number | null;    // Days with max temp > 95°F
  freezeDays: number | null;         // Days with min temp < 32°F

  // Precipitation (ACIS)
  rainDays: number | null;           // Days with precipitation > 0.01 in
  annualPrecipitation: number | null; // Total annual precipitation (inches)

  // Snowfall (ACIS)
  snowDays: number | null;           // Days with snowfall > 1 inch
  annualSnowfall: number | null;     // Total annual snowfall (inches)

  // Utility cost proxy (ACIS)
  coolingDegreeDays: number | null;  // CDD base 65°F
  heatingDegreeDays: number | null;  // HDD base 65°F

  // Growing season (ACIS)
  growingSeasonDays: number | null;  // Days between last spring and first fall freeze
  lastSpringFreeze: string | null;   // MM-DD format
  firstFallFreeze: string | null;    // MM-DD format

  // Temperature stability (ACIS)
  diurnalSwing: number | null;       // Avg daily temp range (°F)
  seasonalStability: number | null;  // StdDev of monthly avg temps (lower = more stable)

  // Cloud cover / Gloom factor (Open-Meteo)
  cloudyDays: number | null;         // Days with cloud cover > 75%
  avgCloudCover: number | null;      // Annual average cloud cover %

  // Humidity / Stickiness (Open-Meteo)
  julyDewpoint: number | null;       // July avg dewpoint (°F) - >65 = muggy, >72 = oppressive
  summerHumidityIndex: number | null; // July-Aug avg relative humidity %
}

export interface City {
  id: string;
  name: string;
  state: string;
  regionId: number | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CityMetrics {
  id: string;
  cityId: string;

  // Climate
  avgTemp: number | null;
  avgWinterTemp: number | null;
  avgSummerTemp: number | null;
  daysOfSunshine: number | null;
  daysOfRain: number | null;

  // Demographics
  diversityIndex: number | null;
  population: number | null;
  eastAsianPercent: number | null;

  // Cost of Living
  medianHomePrice: number | null;
  stateTaxRate: number | null;
  propertyTaxRate: number | null;
  costOfLivingIndex: number | null;

  // Quality of Life (legacy - replaced by QoLMetrics from APIs)
  /** @deprecated Use qol.crime.violentCrimeRate instead */
  crimeRate: number | null;
  /** @deprecated Use qol.walkability.walkScore instead */
  walkScore: number | null;
  /** @deprecated Use qol.walkability.transitScore instead */
  transitScore: number | null;
  /** @deprecated Use qol.broadband.maxDownloadSpeed instead */
  avgBroadbandSpeed: number | null;
  /** @deprecated No longer used - removed from preferences */
  hasInternationalAirport: boolean | null;
  /** @deprecated Use qol.health instead */
  healthScore: number | null;
  /** @deprecated Use qol.airQuality instead */
  pollutionIndex: number | null;
  /** @deprecated Use qol.airQuality instead */
  waterQualityIndex: number | null;
  /** @deprecated No longer tracked */
  trafficIndex: number | null;

  // Political (legacy - replaced by cultural.political)
  /** @deprecated Use cultural.political.democratPercent instead */
  cityDemocratPercent: number | null;
  /** @deprecated Use cultural.political instead */
  stateDemocratPercent: number | null;

  // Sports/Amenities (Major Professional Leagues)
  nflTeams: string | null;   // NFL (Football)
  nbaTeams: string | null;   // NBA (Basketball)
  mlbTeams: string | null;   // MLB (Baseball)
  nhlTeams: string | null;   // NHL (Hockey)
  mlsTeams: string | null;   // MLS (Soccer)

  // BEA data (merged from metrics.json, not in database)
  bea?: BEAMetrics;

  // NOAA climate data (merged from metrics.json, not in database)
  noaa?: NOAAClimateData;
  
  // Census demographics (merged from metrics.json, not in database)
  census?: CensusDemographics;

  // QoL API data (merged from metrics.json, not in database)
  qol?: QoLMetrics;

  // Cultural data (merged from metrics.json, not in database)
  cultural?: CulturalMetrics;

  // Quality of Life aggregate score (calculated)
  qualityOfLifeScore?: number | null;

  dataAsOf: Date;
  updatedAt: Date;
}

export interface ZHVIDataPoint {
  id: string;
  cityId: string;
  date: Date;
  value: number;
}

export interface CityWithMetrics extends City {
  metrics: CityMetrics | null;
  zhviHistory?: ZHVIDataPoint[];
}

// API response types
export interface CitiesResponse {
  cities: CityWithMetrics[];
  lastUpdated: Date | null;
}
