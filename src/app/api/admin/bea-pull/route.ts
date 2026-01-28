/**
 * Admin API to pull Regional Price Parity data from BEA
 * 
 * POST /api/admin/bea-pull
 * Body: { password: string }
 * 
 * Pulls from BEA Regional dataset, MARPP table:
 * - LineCode 3: RPPs: All items (overall cost of living)
 * - LineCode 4: RPPs: Goods
 * - LineCode 5: RPPs: Services: Rents (housing costs)
 * - LineCode 6: RPPs: Services: Utilities
 * - LineCode 7: RPPs: Services: Other
 * 
 * RPP = Regional Price Parity (100 = national average)
 * Values > 100 = more expensive than average
 * Values < 100 = less expensive than average
 * 
 * API: https://apps.bea.gov/API/docs/index.htm
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";
const BEA_API_KEY = process.env.BEA_API_KEY;

const BEA_API_URL = "https://apps.bea.gov/api/data/";

interface CityData {
  id: string;
  name: string;
  beaGeoFips: string | null;
}

interface BEADataPoint {
  GeoFips: string;
  GeoName: string;
  TimePeriod: string;
  DataValue: string;
}

interface BEAResponse {
  BEAAPI: {
    Results?: {
      Data?: BEADataPoint[];
    };
    Error?: {
      ErrorDetail?: {
        Description?: string;
      };
    };
  };
}

interface RPPData {
  allItems: number | null;
  goods: number | null;
  rents: number | null;      // Housing costs
  utilities: number | null;
  otherServices: number | null;
  year: string;
}

async function fetchBEAData(
  geoFipsList: string[],
  lineCode: string,
  year: string
): Promise<Map<string, number>> {
  const geoFips = geoFipsList.join(",");
  const url = `${BEA_API_URL}?UserID=${BEA_API_KEY}&method=GetData&datasetname=Regional&TableName=MARPP&LineCode=${lineCode}&GeoFips=${geoFips}&Year=${year}&ResultFormat=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`BEA API returned ${response.status}`);
  }

  const data: BEAResponse = await response.json();

  if (data.BEAAPI.Error) {
    throw new Error(
      data.BEAAPI.Error.ErrorDetail?.Description || "BEA API error"
    );
  }

  const result = new Map<string, number>();
  const items = data.BEAAPI.Results?.Data || [];

  for (const item of items) {
    const value = parseFloat(item.DataValue);
    if (!isNaN(value)) {
      result.set(item.GeoFips, value);
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!BEA_API_KEY) {
      return NextResponse.json(
        { error: "BEA_API_KEY not configured in environment" },
        { status: 500 }
      );
    }

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

    // Load cities and metrics
    const citiesFile = JSON.parse(
      readFileSync(join(dataDir, "cities.json"), "utf-8")
    );
    const metricsFile = JSON.parse(
      readFileSync(join(dataDir, "metrics.json"), "utf-8")
    );

    const cities: CityData[] = citiesFile.cities;

    // Get list of GeoFips codes
    const geoFipsList = cities
      .filter((c) => c.beaGeoFips)
      .map((c) => c.beaGeoFips!);

    if (geoFipsList.length === 0) {
      return NextResponse.json(
        { error: "No cities have BEA GeoFips codes configured" },
        { status: 400 }
      );
    }

    // Use most recent year available (2022 is typically the latest)
    const year = "2022";

    console.log(`Fetching BEA data for ${geoFipsList.length} metros...`);

    // Fetch all RPP data types in parallel
    const [allItems, goods, rents, utilities, otherServices] = await Promise.all([
      fetchBEAData(geoFipsList, "3", year),  // All items
      fetchBEAData(geoFipsList, "4", year),  // Goods
      fetchBEAData(geoFipsList, "5", year),  // Services: Rents
      fetchBEAData(geoFipsList, "6", year),  // Services: Utilities
      fetchBEAData(geoFipsList, "7", year),  // Services: Other
    ]);

    console.log(`Received data for ${allItems.size} metros`);

    let successCount = 0;
    let skipCount = 0;

    // Update metrics for each city
    for (const city of cities) {
      if (!city.beaGeoFips) {
        skipCount++;
        continue;
      }

      const rppData: RPPData = {
        allItems: allItems.get(city.beaGeoFips) ?? null,
        goods: goods.get(city.beaGeoFips) ?? null,
        rents: rents.get(city.beaGeoFips) ?? null,
        utilities: utilities.get(city.beaGeoFips) ?? null,
        otherServices: otherServices.get(city.beaGeoFips) ?? null,
        year,
      };

      // Check if we got any data
      if (rppData.allItems === null) {
        console.log(`No BEA data for ${city.name} (GeoFips: ${city.beaGeoFips})`);
        skipCount++;
        continue;
      }

      // Update metrics.json
      if (!metricsFile.cities[city.id]) {
        metricsFile.cities[city.id] = {};
      }

      metricsFile.cities[city.id].bea = {
        regionalPriceParity: {
          allItems: rppData.allItems,
          goods: rppData.goods,
          housing: rppData.rents,      // Renamed for clarity
          utilities: rppData.utilities,
          otherServices: rppData.otherServices,
        },
        year: rppData.year,
        lastUpdated: new Date().toISOString().split("T")[0],
      };

      successCount++;
      console.log(
        `  ✓ ${city.name}: CoL=${rppData.allItems?.toFixed(1)}, Housing=${rppData.rents?.toFixed(1)}`
      );
    }

    // Update metrics source info
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources.bea = "Bureau of Economic Analysis (Regional Price Parities)";
    metricsFile.lastUpdated = new Date().toISOString().split("T")[0];

    // Save metrics.json
    writeFileSync(
      join(dataDir, "metrics.json"),
      JSON.stringify(metricsFile, null, 2)
    );

    // Log the refresh
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "bea-api",
          status: "success",
          recordsUpdated: successCount,
        },
      });
    } catch (logError) {
      console.error("Failed to log refresh:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "BEA Regional Price Parity data pulled successfully",
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        dataYear: year,
      },
    });
  } catch (error) {
    console.error("BEA pull error:", error);

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "bea-api",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "BEA pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
