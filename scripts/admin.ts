#!/usr/bin/env npx tsx
/**
 * Admin CLI for managing city data
 * 
 * Usage:
 *   npx tsx scripts/admin.ts <command> [options]
 * 
 * Commands:
 *   all           - Pull all data sources
 *   zillow        - Pull Zillow ZHVI home price data
 *   bea           - Pull BEA cost of living data
 *   climate       - Pull NOAA/Open-Meteo climate data
 *   census        - Pull Census demographic data
 *   cultural      - Pull cultural/political data
 *   recreation    - Pull recreation data
 *   urbanlife     - Pull urban lifestyle data
 *   qol           - Pull all Quality of Life data (crime, air, broadband, education, health, walkability)
 *   refresh       - Refresh database from JSON files
 *   help          - Show this help message
 * 
 * Options:
 *   --verbose     - Show detailed progress
 * 
 * Environment:
 *   DATABASE_URL  - PostgreSQL connection string (required for DB operations)
 *   BEA_API_KEY   - BEA API key (required for bea command)
 *   CENSUS_API_KEY - Census API key (optional, improves rate limits)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  findDataDirectory,
  loadCities,
  loadMetrics,
  saveMetrics,
  createCliReporter,
  type DataDirectory,
  type ProgressReporter,
} from "../src/lib/admin/helpers";

// Import shared pull modules
import { 
  pullCensusData, pullBEAData, pullClimateData,
  pullFBICrimeData, pullEPAAirData, pullFCCBroadbandData, pullNCESEducationData, pullHRSAHealthData
} from "../src/lib/admin/pulls";

// Import Prisma client
import prisma from "../src/lib/db";

const COMMANDS = [
  "all",
  "zillow",
  "bea", 
  "climate",
  "census",
  "cultural",
  "recreation",
  "urbanlife",
  "qol",
  "refresh",
  "help",
] as const;

type Command = typeof COMMANDS[number];

interface CliArgs {
  command: Command;
  verbose: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const command = (args.find(a => !a.startsWith("--")) || "help") as Command;
  const verbose = args.includes("--verbose") || args.includes("-v");
  
  if (!COMMANDS.includes(command)) {
    console.error(`Unknown command: ${command}`);
    console.error(`Run 'npx tsx scripts/admin.ts help' for usage`);
    process.exit(1);
  }
  
  return { command, verbose };
}

function showHelp(): void {
  console.log(`
Admin CLI for managing city data

Usage:
  npx tsx scripts/admin.ts <command> [options]

Commands:
  all           Pull all data sources (takes several minutes)
  zillow        Pull Zillow ZHVI home price data
  bea           Pull BEA cost of living data
  census        Pull Census demographic data
  climate       Pull NOAA/Open-Meteo climate data
  cultural      Pull cultural/political data (from sources/)
  recreation    Pull recreation data (from sources/)
  urbanlife     Pull urban lifestyle data (from sources/)
  qol           Pull all Quality of Life data (crime, air, broadband, education, health)
  refresh       Refresh database from JSON files
  help          Show this help message

Options:
  --verbose, -v    Show detailed progress

Environment Variables:
  DATABASE_URL     PostgreSQL connection string (for DB operations)
  BEA_API_KEY      BEA API key (required for 'bea' command)
  CENSUS_API_KEY   Census API key (optional, improves rate limits)
  FBI_API_KEY      FBI Crime Data API key (optional, falls back to static data)
  EPA_EMAIL        EPA AQS API email (optional, falls back to static data)
  EPA_API_KEY      EPA AQS API key (optional, falls back to static data)

Examples:
  npx tsx scripts/admin.ts zillow
  npx tsx scripts/admin.ts census
  npx tsx scripts/admin.ts climate
  npx tsx scripts/admin.ts qol
  npx tsx scripts/admin.ts all --verbose
`);
}

// ============================================================================
// Data Pullers
// ============================================================================

/**
 * Pull Zillow ZHVI data
 */
async function pullZillow(dataDir: DataDirectory, report: ProgressReporter): Promise<boolean> {
  report.info("Pulling Zillow ZHVI data...");
  
  const ZILLOW_MSA_URL = "https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv";
  const ZILLOW_CITY_URL = "https://files.zillowstatic.com/research/public_csvs/zhvi/City_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv";

  interface CityData {
    id: string;
    name: string;
    state: string;
    zillowRegionId: number | null;
    zillowGeography?: "msa" | "city";
  }

  const cities = loadCities<CityData>(dataDir);

  // Download data
  report.debug("Downloading MSA data...");
  const msaResponse = await fetch(ZILLOW_MSA_URL);
  if (!msaResponse.ok) throw new Error(`Failed to download MSA data: ${msaResponse.status}`);
  const msaCSV = await msaResponse.text();
  const msaData = parseCSV(msaCSV);
  report.debug(`Parsed ${msaData.length} MSA rows`);

  report.debug("Downloading City data...");
  const cityResponse = await fetch(ZILLOW_CITY_URL);
  if (!cityResponse.ok) throw new Error(`Failed to download City data: ${cityResponse.status}`);
  const cityCSV = await cityResponse.text();
  const cityData = parseCSV(cityCSV);
  report.debug(`Parsed ${cityData.length} City rows`);

  // Build lookup maps
  const msaByRegionId = new Map<number, Record<string, string>>();
  for (const row of msaData) {
    const regionId = parseInt(row.RegionID);
    if (!isNaN(regionId)) msaByRegionId.set(regionId, row);
  }

  const cityByRegionId = new Map<number, Record<string, string>>();
  for (const row of cityData) {
    const regionId = parseInt(row.RegionID);
    if (!isNaN(regionId)) cityByRegionId.set(regionId, row);
  }

  // Process cities
  const zhviHistory: Record<string, {
    zillowRegionId: number;
    geography: "msa" | "city";
    history: { date: string; value: number }[];
  }> = {};
  
  let msaMatches = 0, cityMatches = 0, noMatch = 0, totalDataPoints = 0;

  for (const city of cities) {
    if (!city.zillowRegionId) {
      noMatch++;
      continue;
    }

    let row: Record<string, string> | undefined;
    let geography: "msa" | "city";

    if (city.zillowGeography === "city") {
      row = cityByRegionId.get(city.zillowRegionId);
      geography = "city";
      if (row) cityMatches++;
    } else {
      row = msaByRegionId.get(city.zillowRegionId);
      if (row) {
        geography = "msa";
        msaMatches++;
      } else {
        row = cityByRegionId.get(city.zillowRegionId);
        geography = row ? "city" : "msa";
        if (row) cityMatches++;
      }
    }

    if (!row) {
      report.debug(`No data for ${city.name}`);
      noMatch++;
      continue;
    }

    const dateColumns = Object.keys(row).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
    const history: { date: string; value: number }[] = [];

    for (const date of dateColumns) {
      const value = parseFloat(row[date]);
      if (!isNaN(value) && value > 0) {
        history.push({ date, value: Math.round(value) });
      }
    }

    history.sort((a, b) => a.date.localeCompare(b.date));
    totalDataPoints += history.length;

    zhviHistory[city.id] = { zillowRegionId: city.zillowRegionId, geography, history };
  }

  // Save to JSON
  const zhviOutput = {
    version: "2.0",
    description: "Zillow Home Value Index historical data",
    source: "Zillow Research",
    metric: {
      homeType: "SFR",
      tier: "mid-tier",
      description: "Single Family Residential, 33rd-67th percentile, smoothed, seasonally adjusted",
    },
    lastUpdated: new Date().toISOString().split("T")[0],
    cities: zhviHistory,
  };

  writeFileSync(join(dataDir.path, "zhvi-history.json"), JSON.stringify(zhviOutput, null, 2));

  // Update database
  let dbPointsCreated = 0;
  for (const city of cities) {
    const zhvi = zhviHistory[city.id];
    if (!zhvi || zhvi.history.length === 0) continue;

    const dbCity = await prisma.city.findUnique({ where: { name: city.name } });
    if (!dbCity) continue;

    await prisma.zHVIDataPoint.deleteMany({ where: { cityId: dbCity.id } });

    const historyData = zhvi.history.map((point) => ({
      cityId: dbCity.id,
      date: new Date(point.date),
      value: point.value,
    }));

    for (let i = 0; i < historyData.length; i += 100) {
      const batch = historyData.slice(i, i + 100);
      await prisma.zHVIDataPoint.createMany({ data: batch });
      dbPointsCreated += batch.length;
    }
  }

  await logRefresh("zillow-cli", "success", dbPointsCreated);

  report.success(`Zillow: ${msaMatches + cityMatches} cities, ${totalDataPoints.toLocaleString()} data points, ${dbPointsCreated.toLocaleString()} DB records`);
  return true;
}

/**
 * Pull cultural data from sources
 */
async function pullCultural(dataDir: DataDirectory, report: ProgressReporter): Promise<boolean> {
  report.info("Pulling cultural data from sources...");
  
  const sourcePath = join(dataDir.path, "sources/cultural-data.json");
  if (!existsSync(sourcePath)) {
    report.error("sources/cultural-data.json not found");
    return false;
  }

  const sourceData = JSON.parse(readFileSync(sourcePath, "utf-8"));
  const metricsFile = loadMetrics(dataDir);

  let updated = 0;
  for (const [cityId, data] of Object.entries(sourceData.cities || {})) {
    if (!metricsFile.cities[cityId]) {
      metricsFile.cities[cityId] = {};
    }
    metricsFile.cities[cityId].cultural = data;
    updated++;
  }

  if (!metricsFile.sources) metricsFile.sources = {};
  metricsFile.sources.cultural = sourceData.sources || "Cultural data sources";
  metricsFile.lastUpdated = new Date().toISOString().split("T")[0];

  saveMetrics(dataDir, metricsFile);
  await logRefresh("cultural-cli", "success", updated);

  report.success(`Cultural: ${updated} cities updated`);
  return true;
}

/**
 * Pull recreation data from sources
 */
async function pullRecreation(dataDir: DataDirectory, report: ProgressReporter): Promise<boolean> {
  report.info("Pulling recreation data from sources...");
  
  const sourcePath = join(dataDir.path, "sources/recreation-data.json");
  if (!existsSync(sourcePath)) {
    report.error("sources/recreation-data.json not found");
    return false;
  }

  const sourceData = JSON.parse(readFileSync(sourcePath, "utf-8"));
  const metricsFile = loadMetrics(dataDir);

  let updated = 0;
  for (const [cityId, data] of Object.entries(sourceData.cities || {})) {
    if (!metricsFile.cities[cityId]) {
      metricsFile.cities[cityId] = {};
    }
    metricsFile.cities[cityId].recreation = data;
    updated++;
  }

  if (!metricsFile.sources) metricsFile.sources = {};
  metricsFile.sources.recreation = sourceData.sources || "Recreation data sources";
  metricsFile.lastUpdated = new Date().toISOString().split("T")[0];

  saveMetrics(dataDir, metricsFile);
  await logRefresh("recreation-cli", "success", updated);

  report.success(`Recreation: ${updated} cities updated`);
  return true;
}

/**
 * Pull urban lifestyle data from sources
 */
async function pullUrbanLife(dataDir: DataDirectory, report: ProgressReporter): Promise<boolean> {
  report.info("Pulling urban lifestyle data from sources...");
  
  const sourcePath = join(dataDir.path, "sources/urbanlife-data.json");
  if (!existsSync(sourcePath)) {
    report.error("sources/urbanlife-data.json not found");
    return false;
  }

  const sourceData = JSON.parse(readFileSync(sourcePath, "utf-8"));
  const metricsFile = loadMetrics(dataDir);

  let updated = 0;
  for (const [cityId, data] of Object.entries(sourceData.cities || {})) {
    if (!metricsFile.cities[cityId]) {
      metricsFile.cities[cityId] = {};
    }
    metricsFile.cities[cityId].urbanLife = data;
    updated++;
  }

  if (!metricsFile.sources) metricsFile.sources = {};
  metricsFile.sources.urbanLife = sourceData.sources || "Urban lifestyle data sources";
  metricsFile.lastUpdated = new Date().toISOString().split("T")[0];

  saveMetrics(dataDir, metricsFile);
  await logRefresh("urbanlife-cli", "success", updated);

  report.success(`Urban Life: ${updated} cities updated`);
  return true;
}

/**
 * Refresh database from JSON files
 */
async function refreshDatabase(dataDir: DataDirectory, report: ProgressReporter): Promise<boolean> {
  report.info("Refreshing database from JSON files...");

  interface CityData {
    id: string;
    name: string;
    state: string;
    latitude?: number;
    longitude?: number;
    regionId?: number;
    sports?: Record<string, string[]>;
  }

  const cities = loadCities<CityData>(dataDir);
  const metricsFile = loadMetrics(dataDir);

  let created = 0, updated = 0;

  for (const city of cities) {
    const cityMetrics = metricsFile.cities[city.id] || {};
    const climate = cityMetrics.climate as { avgTemp?: number; avgWinterTemp?: number; avgSummerTemp?: number; daysOfSunshine?: number; daysOfRain?: number } | undefined;

    const slug = city.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const cityData = {
      name: city.name,
      slug,
      state: city.state,
      regionId: city.regionId || null,
      latitude: city.latitude || null,
      longitude: city.longitude || null,
    };

    const metricsData = {
      avgTemp: climate?.avgTemp ?? null,
      avgWinterTemp: climate?.avgWinterTemp ?? null,
      avgSummerTemp: climate?.avgSummerTemp ?? null,
      daysOfSunshine: climate?.daysOfSunshine ?? null,
      daysOfRain: climate?.daysOfRain ?? null,
      nflTeams: city.sports?.nfl?.join(", ") || null,
      nbaTeams: city.sports?.nba?.join(", ") || null,
      mlbTeams: city.sports?.mlb?.join(", ") || null,
      nhlTeams: city.sports?.nhl?.join(", ") || null,
      mlsTeams: city.sports?.mls?.join(", ") || null,
      dataAsOf: new Date(),
    };

    const existing = await prisma.city.findUnique({ where: { name: city.name } });

    if (existing) {
      await prisma.city.update({
        where: { id: existing.id },
        data: cityData,
      });
      await prisma.cityMetrics.upsert({
        where: { cityId: existing.id },
        update: metricsData,
        create: { cityId: existing.id, ...metricsData },
      });
      updated++;
    } else {
      const newCity = await prisma.city.create({ data: cityData });
      await prisma.cityMetrics.create({
        data: { cityId: newCity.id, ...metricsData },
      });
      created++;
    }

    report.debug(`${existing ? "Updated" : "Created"} ${city.name}`);
  }

  await logRefresh("refresh-cli", "success", created + updated);

  report.success(`Database refresh: ${created} created, ${updated} updated`);
  return true;
}

// ============================================================================
// Utilities
// ============================================================================

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  
  const header = parseCSVLine(lines[0]);
  const data: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = values[j] || "";
    }
    data.push(row);
  }
  
  return data;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

async function logRefresh(source: string, status: "success" | "error", recordsUpdated?: number, errorMessage?: string): Promise<void> {
  try {
    await prisma.dataRefreshLog.create({
      data: {
        source,
        status,
        recordsUpdated: recordsUpdated ?? 0,
        errorMessage,
      },
    });
  } catch {
    // Ignore logging errors
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const { command, verbose } = parseArgs();
  const report = createCliReporter(verbose);

  if (command === "help") {
    showHelp();
    return;
  }

  // Find data directory
  const dataDir = findDataDirectory();
  if (!dataDir) {
    report.error("Data directory not found. Run from the cities-app directory.");
    process.exit(1);
  }

  report.info(`Data directory: ${dataDir.path}`);

  let success = true;

  try {
    switch (command) {
      case "zillow":
        success = await pullZillow(dataDir, report);
        break;
      
      case "cultural":
        success = await pullCultural(dataDir, report);
        break;
      
      case "recreation":
        success = await pullRecreation(dataDir, report);
        break;
      
      case "urbanlife":
        success = await pullUrbanLife(dataDir, report);
        break;
      
      case "refresh":
        success = await refreshDatabase(dataDir, report);
        break;
      
      case "bea":
        report.info("Pulling BEA Regional Price Parity data...");
        {
          const result = await pullBEAData(dataDir, (msg) => report.debug(msg));
          if (result.success) {
            report.success(`BEA: ${result.message}`);
            await logRefresh("bea-cli", "success", result.stats?.citiesUpdated);
          } else {
            report.error(`BEA: ${result.error}`);
            await logRefresh("bea-cli", "error", 0, result.error);
            success = false;
          }
        }
        break;
      
      case "climate":
        report.info("Pulling climate data (NOAA ACIS + Open-Meteo)...");
        {
          const result = await pullClimateData(dataDir, (msg) => report.debug(msg));
          if (result.success) {
            report.success(`Climate: ${result.message}`);
            await logRefresh("climate-cli", "success", result.stats?.acisUpdated as number | undefined);
          } else {
            report.error(`Climate: ${result.error}`);
            await logRefresh("climate-cli", "error", 0, result.error);
            success = false;
          }
        }
        break;
      
      case "census":
        report.info("Pulling Census demographic data...");
        {
          const result = await pullCensusData(dataDir, (msg) => report.debug(msg));
          if (result.success) {
            report.success(`Census: ${result.message}`);
            await logRefresh("census-cli", "success", result.stats?.citiesUpdated);
          } else {
            report.error(`Census: ${result.error}`);
            await logRefresh("census-cli", "error", 0, result.error);
            success = false;
          }
        }
        break;
      
      case "qol":
        report.info("Pulling Quality of Life data...\n");
        {
          // FBI Crime data
          const crimeResult = await pullFBICrimeData(dataDir, (msg) => report.debug(msg));
          if (crimeResult.success) {
            report.success(`FBI Crime: ${crimeResult.message}`);
            await logRefresh("fbi-crime-cli", "success", crimeResult.stats?.citiesUpdated);
          } else {
            report.warn(`FBI Crime: ${crimeResult.error || "failed"}`);
          }
          
          // EPA Air Quality
          const epaResult = await pullEPAAirData(dataDir, (msg) => report.debug(msg));
          if (epaResult.success) {
            report.success(`EPA Air: ${epaResult.message}`);
            await logRefresh("epa-air-cli", "success", epaResult.stats?.citiesUpdated);
          } else {
            report.warn(`EPA Air: ${epaResult.error || "failed"}`);
          }
          
          // FCC Broadband
          const fccResult = await pullFCCBroadbandData(dataDir, (msg) => report.debug(msg));
          if (fccResult.success) {
            report.success(`FCC Broadband: ${fccResult.message}`);
            await logRefresh("fcc-broadband-cli", "success", fccResult.stats?.citiesUpdated);
          } else {
            report.warn(`FCC Broadband: ${fccResult.error || "failed"}`);
          }
          
          // NCES Education
          const ncesResult = await pullNCESEducationData(dataDir, (msg) => report.debug(msg));
          if (ncesResult.success) {
            report.success(`NCES Education: ${ncesResult.message}`);
            await logRefresh("nces-education-cli", "success", ncesResult.stats?.citiesUpdated);
          } else {
            report.warn(`NCES Education: ${ncesResult.error || "failed"}`);
          }
          
          // HRSA Health
          const hrsaResult = await pullHRSAHealthData(dataDir, (msg) => report.debug(msg));
          if (hrsaResult.success) {
            report.success(`HRSA Health: ${hrsaResult.message}`);
            await logRefresh("hrsa-health-cli", "success", hrsaResult.stats?.citiesUpdated);
          } else {
            report.warn(`HRSA Health: ${hrsaResult.error || "failed"}`);
          }
          
          report.info("\nFor walkability data, use: npx tsx scripts/fetch-walkscore.ts");
        }
        break;
      
      case "all":
        report.info("Running all available pulls...\n");
        
        // Run source-based pulls (local JSON files)
        await pullCultural(dataDir, report);
        await pullRecreation(dataDir, report);
        await pullUrbanLife(dataDir, report);
        await pullZillow(dataDir, report);
        
        // Run API-based pulls
        {
          const censusResult = await pullCensusData(dataDir, (msg) => report.debug(msg));
          if (censusResult.success) {
            report.success(`Census: ${censusResult.message}`);
            await logRefresh("census-cli", "success", censusResult.stats?.citiesUpdated);
          } else {
            report.warn(`Census: ${censusResult.error || "failed"}`);
          }
        }
        
        {
          const beaResult = await pullBEAData(dataDir, (msg) => report.debug(msg));
          if (beaResult.success) {
            report.success(`BEA: ${beaResult.message}`);
            await logRefresh("bea-cli", "success", beaResult.stats?.citiesUpdated);
          } else {
            report.warn(`BEA: ${beaResult.error || "failed"}`);
          }
        }
        
        {
          const climateResult = await pullClimateData(dataDir, (msg) => report.debug(msg));
          if (climateResult.success) {
            report.success(`Climate: ${climateResult.message}`);
            await logRefresh("climate-cli", "success", climateResult.stats?.acisUpdated as number | undefined);
          } else {
            report.warn(`Climate: ${climateResult.error || "failed"}`);
          }
        }
        
        {
          const crimeResult = await pullFBICrimeData(dataDir, (msg) => report.debug(msg));
          if (crimeResult.success) {
            report.success(`FBI Crime: ${crimeResult.message}`);
            await logRefresh("fbi-crime-cli", "success", crimeResult.stats?.citiesUpdated);
          } else {
            report.warn(`FBI Crime: ${crimeResult.error || "failed"}`);
          }
        }
        
        {
          const epaResult = await pullEPAAirData(dataDir, (msg) => report.debug(msg));
          if (epaResult.success) {
            report.success(`EPA Air: ${epaResult.message}`);
            await logRefresh("epa-air-cli", "success", epaResult.stats?.citiesUpdated);
          } else {
            report.warn(`EPA Air: ${epaResult.error || "failed"}`);
          }
        }
        
        {
          const fccResult = await pullFCCBroadbandData(dataDir, (msg) => report.debug(msg));
          if (fccResult.success) {
            report.success(`FCC Broadband: ${fccResult.message}`);
            await logRefresh("fcc-broadband-cli", "success", fccResult.stats?.citiesUpdated);
          } else {
            report.warn(`FCC Broadband: ${fccResult.error || "failed"}`);
          }
        }
        
        {
          const ncesResult = await pullNCESEducationData(dataDir, (msg) => report.debug(msg));
          if (ncesResult.success) {
            report.success(`NCES Education: ${ncesResult.message}`);
            await logRefresh("nces-education-cli", "success", ncesResult.stats?.citiesUpdated);
          } else {
            report.warn(`NCES Education: ${ncesResult.error || "failed"}`);
          }
        }
        
        {
          const hrsaResult = await pullHRSAHealthData(dataDir, (msg) => report.debug(msg));
          if (hrsaResult.success) {
            report.success(`HRSA Health: ${hrsaResult.message}`);
            await logRefresh("hrsa-health-cli", "success", hrsaResult.stats?.citiesUpdated);
          } else {
            report.warn(`HRSA Health: ${hrsaResult.error || "failed"}`);
          }
        }
        
        // Refresh database
        await refreshDatabase(dataDir, report);
        break;
      
      default:
        report.error(`Unknown command: ${command}`);
        success = false;
    }
  } catch (error) {
    report.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    success = false;
  } finally {
    await prisma.$disconnect();
  }

  if (!success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
