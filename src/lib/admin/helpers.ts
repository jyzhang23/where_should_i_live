/**
 * Shared helper functions for admin data operations.
 * Used by both CLI scripts and API routes.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface CityBase {
  id: string;
  name: string;
  state: string;
}

export interface DataDirectory {
  path: string;
  citiesPath: string;
  metricsPath: string;
}

/**
 * Find the data directory from various possible locations.
 * Works from both the app root and scripts directory.
 */
export function findDataDirectory(): DataDirectory | null {
  const possiblePaths = [
    join(process.cwd(), "data"),
    join(process.cwd(), "../data"),
    join(process.cwd(), "cities-app/data"),
  ];

  for (const p of possiblePaths) {
    const citiesPath = join(p, "cities.json");
    if (existsSync(citiesPath)) {
      return {
        path: p,
        citiesPath,
        metricsPath: join(p, "metrics.json"),
      };
    }
  }

  return null;
}

/**
 * Load cities from cities.json
 */
export function loadCities<T extends CityBase>(dataDir: DataDirectory): T[] {
  const citiesFile = JSON.parse(readFileSync(dataDir.citiesPath, "utf-8"));
  return citiesFile.cities as T[];
}

/**
 * Load metrics from metrics.json
 */
export function loadMetrics(dataDir: DataDirectory): {
  cities: Record<string, Record<string, unknown>>;
  sources?: Record<string, unknown>;
  lastUpdated?: string;
} {
  if (existsSync(dataDir.metricsPath)) {
    return JSON.parse(readFileSync(dataDir.metricsPath, "utf-8"));
  }
  return { cities: {} };
}

/**
 * Save metrics to metrics.json
 */
export function saveMetrics(
  dataDir: DataDirectory,
  metricsFile: {
    cities: Record<string, Record<string, unknown>>;
    sources?: Record<string, unknown>;
    lastUpdated?: string;
  }
): void {
  writeFileSync(dataDir.metricsPath, JSON.stringify(metricsFile, null, 2));
}

/**
 * Check if running in production environment.
 * Admin routes should be disabled in production.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Validate admin password.
 * Returns true if valid, false otherwise.
 * Requires ADMIN_PASSWORD to be explicitly set (no default).
 */
export function validateAdminPassword(password: string | undefined): {
  valid: boolean;
  error?: string;
} {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    return {
      valid: false,
      error: "ADMIN_PASSWORD environment variable not configured",
    };
  }

  if (!password) {
    return {
      valid: false,
      error: "Password required",
    };
  }

  if (password !== adminPassword) {
    return {
      valid: false,
      error: "Invalid password",
    };
  }

  return { valid: true };
}

/**
 * Check if admin routes should be blocked.
 * Returns an error response if in production, null otherwise.
 */
export function getProductionGuardResponse(): Response | null {
  if (process.env.NODE_ENV === "production") {
    return new Response(
      JSON.stringify({ error: "Admin routes are disabled in production" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}

/**
 * Result type for data pull operations
 */
export interface PullResult {
  success: boolean;
  message?: string;
  error?: string;
  stats?: Record<string, unknown>;
}

/**
 * CLI progress reporter
 */
export interface ProgressReporter {
  info: (message: string) => void;
  success: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
}

/**
 * Create a CLI progress reporter
 */
export function createCliReporter(verbose: boolean = false): ProgressReporter {
  return {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warn: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.error(`❌ ${msg}`),
    debug: (msg) => {
      if (verbose) console.log(`   ${msg}`);
    },
  };
}
