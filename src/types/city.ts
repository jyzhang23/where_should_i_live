// City and metrics types that match the Prisma schema
import { BEAMetrics } from "@/lib/cost-of-living";

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

  // Quality of Life
  crimeRate: number | null;
  walkScore: number | null;
  transitScore: number | null;
  avgBroadbandSpeed: number | null;
  hasInternationalAirport: boolean | null;
  healthScore: number | null;
  pollutionIndex: number | null;
  waterQualityIndex: number | null;
  trafficIndex: number | null;

  // Political
  cityDemocratPercent: number | null;
  stateDemocratPercent: number | null;

  // Sports/Amenities
  nflTeams: string | null;
  nbaTeams: string | null;

  // BEA data (merged from metrics.json, not in database)
  bea?: BEAMetrics;

  // NOAA climate data (merged from metrics.json, not in database)
  noaa?: NOAAClimateData;

  // Quality of Life aggregate score
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
