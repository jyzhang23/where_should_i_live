/**
 * Admin API to pull Regional Price Parity data from BEA
 * 
 * POST /api/admin/bea-pull
 * Body: { password: string }
 * 
 * Pulls from BEA Regional dataset, MARPP table:
 * - LineCode 1: Real personal income (purchasing power)
 * - LineCode 2: Real per capita personal income (purchasing power per person)
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
 * Real income = nominal income adjusted for regional price differences
 * (i.e., purchasing power)
 * 
 * API: https://apps.bea.gov/API/docs/index.htm
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { createAdminLogger } from "@/lib/admin-logger";

const logger = createAdminLogger("bea-pull");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";
const BEA_API_KEY = process.env.BEA_API_KEY;

const BEA_API_URL = "https://apps.bea.gov/api/data/";

// State abbreviation to BEA FIPS code mapping
const STATE_FIPS: Record<string, string> = {
  AL: "01000", AK: "02000", AZ: "04000", AR: "05000", CA: "06000",
  CO: "08000", CT: "09000", DE: "10000", DC: "11000", FL: "12000",
  GA: "13000", HI: "15000", ID: "16000", IL: "17000", IN: "18000",
  IA: "19000", KS: "20000", KY: "21000", LA: "22000", ME: "23000",
  MD: "24000", MA: "25000", MI: "26000", MN: "27000", MS: "28000",
  MO: "29000", MT: "30000", NE: "31000", NV: "32000", NH: "33000",
  NJ: "34000", NM: "35000", NY: "36000", NC: "37000", ND: "38000",
  OH: "39000", OK: "40000", OR: "41000", PA: "42000", RI: "44000",
  SC: "45000", SD: "46000", TN: "47000", TX: "48000", UT: "49000",
  VT: "50000", VA: "51000", WA: "53000", WV: "54000", WI: "55000",
  WY: "56000",
};

interface CityData {
  id: string;
  name: string;
  state: string;
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
  realPersonalIncome: number | null;      // Purchasing power (total)
  realPerCapitaIncome: number | null;     // Purchasing power per person
  allItems: number | null;
  goods: number | null;
  rents: number | null;                   // Housing costs
  utilities: number | null;
  otherServices: number | null;
  year: string;
}

async function fetchBEAData(
  geoFipsList: string[],
  lineCode: string,
  year: string,
  tableName: string = "MARPP"
): Promise<Map<string, number>> {
  const geoFips = geoFipsList.join(",");
  const url = `${BEA_API_URL}?UserID=${BEA_API_KEY}&method=GetData&datasetname=Regional&TableName=${tableName}&LineCode=${lineCode}&GeoFips=${geoFips}&Year=${year}&ResultFormat=json`;

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

// Helper to get primary state from state field (handles "NY/NJ" -> "NY")
function getPrimaryState(stateField: string): string {
  return stateField.split("/")[0].trim();
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

    // Get list of GeoFips codes for MSAs
    const geoFipsList = cities
      .filter((c) => c.beaGeoFips)
      .map((c) => c.beaGeoFips!);

    if (geoFipsList.length === 0) {
      return NextResponse.json(
        { error: "No cities have BEA GeoFips codes configured" },
        { status: 400 }
      );
    }

    // Get unique state FIPS codes for tax data
    const stateFipsList = [...new Set(
      cities
        .map((c) => STATE_FIPS[getPrimaryState(c.state)])
        .filter((f): f is string => !!f)
    )];

    // Use most recent year available (2022 is typically the latest)
    const year = "2022";

    logger.info("Fetching BEA data", { metros: geoFipsList.length, states: stateFipsList.length });

    // Fetch all data types in parallel
    const [
      // MSA-level data (MARPP table)
      realPersonalIncome,
      realPerCapitaIncome,
      allItems,
      goods,
      rents,
      utilities,
      otherServices,
      // State-level tax data (SAINC50 table)
      statePersonalIncome,
      statePersonalTaxes,
      stateDisposableIncome,
      statePerCapitaIncome,
      statePerCapitaDisposable,
      stateFederalTaxes,
      stateStateTaxes,
      stateLocalTaxes,
    ] = await Promise.all([
      // MSA-level
      fetchBEAData(geoFipsList, "1", year),       // Real personal income (purchasing power)
      fetchBEAData(geoFipsList, "2", year),       // Real per capita personal income
      fetchBEAData(geoFipsList, "3", year),       // RPP: All items
      fetchBEAData(geoFipsList, "4", year),       // RPP: Goods
      fetchBEAData(geoFipsList, "5", year),       // RPP: Services: Rents
      fetchBEAData(geoFipsList, "6", year),       // RPP: Services: Utilities
      fetchBEAData(geoFipsList, "7", year),       // RPP: Services: Other
      // State-level (SAINC50)
      fetchBEAData(stateFipsList, "10", year, "SAINC50"),  // Personal income (thousands)
      fetchBEAData(stateFipsList, "15", year, "SAINC50"),  // Personal current taxes (thousands)
      fetchBEAData(stateFipsList, "16", year, "SAINC50"),  // Disposable personal income (thousands)
      fetchBEAData(stateFipsList, "30", year, "SAINC50"),  // Per capita personal income
      fetchBEAData(stateFipsList, "50", year, "SAINC50"),  // Per capita disposable personal income
      fetchBEAData(stateFipsList, "70", year, "SAINC50"),  // Federal government taxes (thousands)
      fetchBEAData(stateFipsList, "120", year, "SAINC50"), // State government taxes (thousands)
      fetchBEAData(stateFipsList, "180", year, "SAINC50"), // Local government taxes (thousands)
    ]);

    logger.info("Received data", { msaCount: allItems.size, stateCount: statePersonalTaxes.size });

    let successCount = 0;
    let skipCount = 0;

    // Update metrics for each city
    for (const city of cities) {
      if (!city.beaGeoFips) {
        skipCount++;
        continue;
      }

      const rppData: RPPData = {
        realPersonalIncome: realPersonalIncome.get(city.beaGeoFips) ?? null,
        realPerCapitaIncome: realPerCapitaIncome.get(city.beaGeoFips) ?? null,
        allItems: allItems.get(city.beaGeoFips) ?? null,
        goods: goods.get(city.beaGeoFips) ?? null,
        rents: rents.get(city.beaGeoFips) ?? null,
        utilities: utilities.get(city.beaGeoFips) ?? null,
        otherServices: otherServices.get(city.beaGeoFips) ?? null,
        year,
      };

      // Check if we got any data
      if (rppData.allItems === null) {
        logger.warn("No BEA data found", { city: city.name, geoFips: city.beaGeoFips });
        skipCount++;
        continue;
      }

      // Update metrics.json
      if (!metricsFile.cities[city.id]) {
        metricsFile.cities[city.id] = {};
      }

      // Get state tax data
      const stateFips = STATE_FIPS[getPrimaryState(city.state)];
      const stateIncome = stateFips ? statePersonalIncome.get(stateFips) : null;
      const stateTaxes = stateFips ? statePersonalTaxes.get(stateFips) : null;
      const federalTaxes = stateFips ? stateFederalTaxes.get(stateFips) : null;
      const stateTaxesOnly = stateFips ? stateStateTaxes.get(stateFips) : null;
      const localTaxes = stateFips ? stateLocalTaxes.get(stateFips) : null;
      const perCapitaIncome = stateFips ? statePerCapitaIncome.get(stateFips) : null;
      const perCapitaDisposable = stateFips ? statePerCapitaDisposable.get(stateFips) : null;

      // Calculate effective tax rate
      const effectiveTaxRate = stateIncome && stateTaxes 
        ? Math.round((stateTaxes / stateIncome) * 10000) / 100  // Two decimal places
        : null;

      metricsFile.cities[city.id].bea = {
        purchasingPower: {
          realPersonalIncome: rppData.realPersonalIncome,        // Total (thousands of dollars)
          realPerCapitaIncome: rppData.realPerCapitaIncome,      // Per person (dollars)
        },
        regionalPriceParity: {
          allItems: rppData.allItems,
          goods: rppData.goods,
          housing: rppData.rents,      // Renamed for clarity
          utilities: rppData.utilities,
          otherServices: rppData.otherServices,
        },
        taxes: {
          // State-level tax data (applied to city based on state)
          state: getPrimaryState(city.state),
          effectiveTaxRate,                              // Percentage of income paid in taxes
          perCapitaIncome,                               // Per capita personal income ($)
          perCapitaDisposable,                           // Per capita disposable income ($)
          // Tax breakdown (thousands of dollars, state total)
          federalTaxes,
          stateTaxes: stateTaxesOnly,
          localTaxes,
          totalTaxes: stateTaxes,
        },
        year: rppData.year,
        lastUpdated: new Date().toISOString().split("T")[0],
      };

      successCount++;
      logger.debug("Updated city", {
        city: city.name,
        costOfLiving: rppData.allItems,
        housing: rppData.rents,
        taxRate: effectiveTaxRate,
      });
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
      logger.error("Failed to log refresh", { error: String(logError) });
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
    logger.error("BEA pull failed", { error: error instanceof Error ? error.message : String(error) });

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
