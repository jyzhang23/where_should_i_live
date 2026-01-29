#!/usr/bin/env npx tsx
/**
 * Verify city data completeness
 * 
 * Usage:
 *   npx tsx scripts/verify-city-data.ts [cityId]
 *   npx tsx scripts/verify-city-data.ts boise
 *   npx tsx scripts/verify-city-data.ts --all
 * 
 * Checks for:
 * - Required fields in cities.json
 * - Required metrics in metrics.json
 * - Data in database
 * - ZHVI price history
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(__dirname, "../data");

interface VerificationResult {
  city: string;
  errors: string[];
  warnings: string[];
  summary: Record<string, string>;
}

// Required fields in cities.json
const REQUIRED_CITY_FIELDS = [
  "id", "name", "state", "latitude", "longitude",
  "noaaStation", "censusFips", "zillowRegionId", "beaGeoFips"
];

// Required metrics sections
const REQUIRED_METRICS = {
  "census.totalPopulation": (v: unknown) => typeof v === "number" && v > 0,
  "census.medianAge": (v: unknown) => typeof v === "number" && v > 0,
  "census.medianHouseholdIncome": (v: unknown) => typeof v === "number" && v > 0,
  "census.diversityIndex": (v: unknown) => typeof v === "number",
  "bea.regionalPriceParity.allItems": (v: unknown) => typeof v === "number" && v > 0,
  "bea.regionalPriceParity.housing": (v: unknown) => typeof v === "number" && v > 0,
  "climate.noaa.comfortDays": (v: unknown) => typeof v === "number",
  "climate.noaa.extremeHeatDays": (v: unknown) => typeof v === "number",
  "climate.noaa.freezeDays": (v: unknown) => typeof v === "number",
  "climate.noaa.rainDays": (v: unknown) => typeof v === "number",
  "qol.crime.violentCrimeRate": (v: unknown) => typeof v === "number",
  "qol.airQuality.annualAQI": (v: unknown) => typeof v === "number",
  "qol.recreation.nature.parkAcresPer1K": (v: unknown) => typeof v === "number",
  "qol.recreation.nature.trailMilesWithin10Mi": (v: unknown) => typeof v === "number",
  "cultural.urbanLifestyle.nightlife.barsAndClubsPer10K": (v: unknown) => typeof v === "number",
  "cultural.urbanLifestyle.dining.restaurantsPer10K": (v: unknown) => typeof v === "number",
};

// Optional but recommended metrics
const OPTIONAL_METRICS = {
  "qol.broadband.fiberCoveragePercent": (v: unknown) => typeof v === "number",
  "qol.health.primaryCarePhysiciansPer100k": (v: unknown) => typeof v === "number",
  "qol.education.graduationRate": (v: unknown) => typeof v === "number",
  "qol.walkability": (v: unknown) => v !== null,
};

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function verifyCity(cityId: string): VerificationResult {
  const result: VerificationResult = {
    city: cityId,
    errors: [],
    warnings: [],
    summary: {},
  };

  // Load data files
  const citiesFile = JSON.parse(readFileSync(join(DATA_DIR, "cities.json"), "utf-8"));
  const metricsFile = JSON.parse(readFileSync(join(DATA_DIR, "metrics.json"), "utf-8"));
  const zhviFile = existsSync(join(DATA_DIR, "zhvi-history.json"))
    ? JSON.parse(readFileSync(join(DATA_DIR, "zhvi-history.json"), "utf-8"))
    : null;

  // Find city in cities.json
  const city = citiesFile.cities.find((c: { id: string }) => c.id === cityId);
  if (!city) {
    result.errors.push(`City "${cityId}" not found in cities.json`);
    return result;
  }

  result.summary["name"] = city.name;
  result.summary["state"] = city.state;

  // Check required city fields
  for (const field of REQUIRED_CITY_FIELDS) {
    const value = getNestedValue(city, field);
    if (value === undefined || value === null) {
      result.errors.push(`Missing city field: ${field}`);
    }
  }

  // Check metrics
  const metrics = metricsFile.cities[cityId];
  if (!metrics) {
    result.errors.push(`No metrics found for "${cityId}" in metrics.json`);
    return result;
  }

  // Check required metrics
  for (const [path, validator] of Object.entries(REQUIRED_METRICS)) {
    const value = getNestedValue(metrics, path);
    if (value === undefined || value === null) {
      result.errors.push(`Missing required metric: ${path}`);
    } else if (!validator(value)) {
      result.errors.push(`Invalid value for ${path}: ${value}`);
    }
  }

  // Check optional metrics
  for (const [path, validator] of Object.entries(OPTIONAL_METRICS)) {
    const value = getNestedValue(metrics, path);
    if (value === undefined || value === null || !validator(value)) {
      result.warnings.push(`Missing optional metric: ${path}`);
    }
  }

  // Check ZHVI history
  if (zhviFile) {
    const zhvi = zhviFile.cities[cityId];
    if (!zhvi) {
      result.warnings.push("No ZHVI price history");
    } else if (!zhvi.history || zhvi.history.length === 0) {
      result.warnings.push("ZHVI history is empty");
    } else {
      result.summary["zhviDataPoints"] = String(zhvi.history.length);
      const latestPrice = zhvi.history[zhvi.history.length - 1];
      result.summary["latestZHVI"] = `$${latestPrice.value.toLocaleString()} (${latestPrice.date})`;
    }
  }

  // Add summary stats
  if (metrics.census?.totalPopulation) {
    result.summary["population"] = metrics.census.totalPopulation.toLocaleString();
  }
  if (metrics.bea?.regionalPriceParity?.allItems) {
    result.summary["costOfLiving"] = `${metrics.bea.regionalPriceParity.allItems.toFixed(1)} (100=avg)`;
  }
  if (metrics.climate?.noaa?.comfortDays !== undefined) {
    result.summary["comfortDays"] = String(metrics.climate.noaa.comfortDays);
  }

  return result;
}

function printResult(result: VerificationResult): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`City: ${result.city} (${result.summary.name || "unknown"}, ${result.summary.state || "?"})`);
  console.log("=".repeat(60));

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log("✅ All checks passed!");
  } else {
    if (result.errors.length > 0) {
      console.log(`\n❌ ERRORS (${result.errors.length}):`);
      for (const error of result.errors) {
        console.log(`   - ${error}`);
      }
    }
    if (result.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${result.warnings.length}):`);
      for (const warning of result.warnings) {
        console.log(`   - ${warning}`);
      }
    }
  }

  console.log("\n📊 Summary:");
  for (const [key, value] of Object.entries(result.summary)) {
    if (key !== "name" && key !== "state") {
      console.log(`   ${key}: ${value}`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isAll = args.includes("--all");
  const cityId = args.find(a => !a.startsWith("--"));

  const citiesFile = JSON.parse(readFileSync(join(DATA_DIR, "cities.json"), "utf-8"));
  
  let citiesToVerify: string[];
  if (isAll) {
    citiesToVerify = citiesFile.cities.map((c: { id: string }) => c.id);
  } else if (cityId) {
    citiesToVerify = [cityId];
  } else {
    console.log("Usage:");
    console.log("  npx tsx scripts/verify-city-data.ts <cityId>");
    console.log("  npx tsx scripts/verify-city-data.ts --all");
    console.log("\nExamples:");
    console.log("  npx tsx scripts/verify-city-data.ts boise");
    console.log("  npx tsx scripts/verify-city-data.ts san-francisco");
    process.exit(1);
  }

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const id of citiesToVerify) {
    const result = verifyCity(id);
    printResult(result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`TOTAL: ${citiesToVerify.length} cities verified`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Warnings: ${totalWarnings}`);
  console.log("=".repeat(60));

  if (totalErrors > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
