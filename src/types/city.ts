// City and metrics types that match the Prisma schema
import { BEAMetrics } from "@/lib/cost-of-living";

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
