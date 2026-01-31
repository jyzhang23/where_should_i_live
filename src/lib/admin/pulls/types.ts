/**
 * Shared types for data pull operations
 */

import { DataDirectory, ProgressReporter } from "../helpers";

/**
 * Result of a data pull operation
 */
export interface PullResult {
  success: boolean;
  message?: string;
  error?: string;
  stats?: {
    citiesUpdated?: number;
    citiesSkipped?: number;
    recordsCreated?: number;
    errors?: string[];
    [key: string]: unknown;
  };
}

/**
 * Context for a data pull operation
 */
export interface PullContext {
  dataDir: DataDirectory;
  report: ProgressReporter;
  verbose?: boolean;
}

/**
 * City data with Census FIPS codes
 */
export interface CityWithCensusFips {
  id: string;
  name: string;
  state: string;
  censusFips?: {
    state: string;
    place: string;
  };
}

/**
 * City data with BEA GeoFips
 */
export interface CityWithBeaFips {
  id: string;
  name: string;
  state: string;
  beaGeoFips?: string | null;
}

/**
 * City data with NOAA station
 */
export interface CityWithNoaa {
  id: string;
  name: string;
  state: string;
  noaaStation?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Generic city data
 */
export interface CityBase {
  id: string;
  name: string;
  state: string;
}
