/**
 * Admin API to pull latest ZHVI data from Zillow
 * 
 * POST /api/admin/zillow-pull
 * Body: { password: string }
 * 
 * Downloads:
 * - Metro (MSA) level ZHVI data
 * - City level ZHVI data (for cities not in MSA data)
 * 
 * Matches by RegionID (stable numeric identifier), not by name.
 * 
 * Updates:
 * - data/zhvi-history.json with new structure
 * - Database with new price history
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";

// Zillow public CSV URLs for ZHVI Single-Family Homes, Mid-Tier
const ZILLOW_MSA_URL = "https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv";
const ZILLOW_CITY_URL = "https://files.zillowstatic.com/research/public_csvs/zhvi/City_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv";

interface CityData {
  id: string;
  name: string;
  state: string;
  zillowRegionId: number | null;
  zillowRegionName: string | null;
  zillowGeography?: "msa" | "city";
}

interface ZHVIHistoryEntry {
  zillowRegionId: number;
  geography: "msa" | "city";
  history: { date: string; value: number }[];
}

interface ZHVIHistoryFile {
  version: string;
  description: string;
  source: string;
  metric: {
    homeType: string;
    tier: string;
    description: string;
  };
  lastUpdated: string;
  cities: Record<string, ZHVIHistoryEntry>;
}

// Parse CSV text into array of objects
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  
  // Parse header - handle quoted values
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

// Parse a single CSV line handling quoted values
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

// Extract date columns from CSV header
function getDateColumns(row: Record<string, string>): string[] {
  return Object.keys(row).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: { password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Verify password
    if (body.password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Find data directory
    const possiblePaths = [
      join(process.cwd(), "data"),
      join(process.cwd(), "../data"),
    ];

    let dataDir: string | null = null;
    for (const p of possiblePaths) {
      if (existsSync(join(p, "cities.json"))) {
        dataDir = p;
        break;
      }
    }

    if (!dataDir) {
      return NextResponse.json(
        { error: "Data directory not found" },
        { status: 404 }
      );
    }

    // Load cities.json to get our city list with RegionIDs
    const citiesFile = JSON.parse(readFileSync(join(dataDir, "cities.json"), "utf-8"));
    const cities: CityData[] = citiesFile.cities;

    console.log("Downloading Zillow MSA data...");
    const msaResponse = await fetch(ZILLOW_MSA_URL);
    if (!msaResponse.ok) {
      throw new Error(`Failed to download MSA data: ${msaResponse.status}`);
    }
    const msaCSV = await msaResponse.text();
    const msaData = parseCSV(msaCSV);
    console.log(`Parsed ${msaData.length} MSA rows`);

    console.log("Downloading Zillow City data...");
    const cityResponse = await fetch(ZILLOW_CITY_URL);
    if (!cityResponse.ok) {
      throw new Error(`Failed to download City data: ${cityResponse.status}`);
    }
    const cityCSV = await cityResponse.text();
    const cityData = parseCSV(cityCSV);
    console.log(`Parsed ${cityData.length} City rows`);

    // Build lookup maps by RegionID (the stable identifier)
    const msaByRegionId = new Map<number, Record<string, string>>();
    for (const row of msaData) {
      const regionId = parseInt(row.RegionID);
      if (!isNaN(regionId)) {
        msaByRegionId.set(regionId, row);
      }
    }
    console.log(`Built MSA lookup with ${msaByRegionId.size} entries`);

    const cityByRegionId = new Map<number, Record<string, string>>();
    for (const row of cityData) {
      const regionId = parseInt(row.RegionID);
      if (!isNaN(regionId)) {
        cityByRegionId.set(regionId, row);
      }
    }
    console.log(`Built City lookup with ${cityByRegionId.size} entries`);

    // Process each city by matching on RegionID
    const zhviHistory: Record<string, ZHVIHistoryEntry> = {};
    let msaMatches = 0;
    let cityMatches = 0;
    let noMatch = 0;
    let totalDataPoints = 0;

    for (const city of cities) {
      if (!city.zillowRegionId) {
        console.log(`No RegionID for ${city.name}, skipping`);
        noMatch++;
        continue;
      }

      // Determine which dataset to use based on zillowGeography or try both
      let row: Record<string, string> | undefined;
      let geography: "msa" | "city";

      if (city.zillowGeography === "city") {
        // City explicitly marked as city-level
        row = cityByRegionId.get(city.zillowRegionId);
        geography = "city";
        if (row) cityMatches++;
      } else {
        // Try MSA first, fall back to city
        row = msaByRegionId.get(city.zillowRegionId);
        if (row) {
          geography = "msa";
          msaMatches++;
        } else {
          row = cityByRegionId.get(city.zillowRegionId);
          if (row) {
            geography = "city";
            cityMatches++;
          } else {
            geography = "msa"; // Default
          }
        }
      }

      if (!row) {
        console.log(`No Zillow data for ${city.name} (RegionID: ${city.zillowRegionId})`);
        noMatch++;
        continue;
      }

      // Extract date columns and values
      const dateColumns = getDateColumns(row);
      const history: { date: string; value: number }[] = [];

      for (const date of dateColumns) {
        const value = parseFloat(row[date]);
        if (!isNaN(value) && value > 0) {
          history.push({ date, value: Math.round(value) });
        }
      }

      history.sort((a, b) => a.date.localeCompare(b.date));
      totalDataPoints += history.length;

      zhviHistory[city.id] = {
        zillowRegionId: city.zillowRegionId,
        geography,
        history,
      };

      console.log(`  ✓ ${city.name} (${geography}, ${history.length} points)`);
    }

    // Save updated zhvi-history.json
    const zhviOutput: ZHVIHistoryFile = {
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

    writeFileSync(
      join(dataDir, "zhvi-history.json"),
      JSON.stringify(zhviOutput, null, 2)
    );

    // Update database
    let dbPointsCreated = 0;
    for (const city of cities) {
      const zhvi = zhviHistory[city.id];
      if (!zhvi || zhvi.history.length === 0) continue;

      // Find city in database
      const dbCity = await prisma.city.findUnique({
        where: { name: city.name },
      });

      if (!dbCity) continue;

      // Delete existing history
      await prisma.zHVIDataPoint.deleteMany({
        where: { cityId: dbCity.id },
      });

      // Insert new history in batches
      const historyData = zhvi.history.map((point) => ({
        cityId: dbCity.id,
        date: new Date(point.date),
        value: point.value,
      }));

      for (let i = 0; i < historyData.length; i += 100) {
        const batch = historyData.slice(i, i + 100);
        await prisma.zHVIDataPoint.createMany({
          data: batch,
        });
        dbPointsCreated += batch.length;
      }
    }

    // Log the refresh
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "zillow-api",
          status: "success",
          recordsUpdated: dbPointsCreated,
        },
      });
    } catch (logError) {
      console.error("Failed to log refresh:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Zillow data pulled successfully",
      stats: {
        msaCitiesMatched: msaMatches,
        cityCitiesMatched: cityMatches,
        notMatched: noMatch,
        totalCities: msaMatches + cityMatches,
        dataPoints: totalDataPoints,
        zhviPointsCreated: dbPointsCreated,
      },
    });

  } catch (error) {
    console.error("Zillow pull error:", error);

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "zillow-api",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "Zillow pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
