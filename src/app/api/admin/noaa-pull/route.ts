/**
 * Admin API to pull climate data from NOAA ACIS
 * 
 * POST /api/admin/noaa-pull
 * Body: { password: string }
 * 
 * Pulls 30-year climate normals (1991-2020) from ACIS for each city's airport station.
 * 
 * Metrics fetched:
 * - Comfort days (65°F <= max temp <= 80°F)
 * - Extreme heat days (max temp > 95°F)
 * - Freeze days (min temp < 32°F)
 * - Rain days (precipitation > 0.01 in)
 * - Cooling Degree Days (CDD, base 65)
 * - Heating Degree Days (HDD, base 65)
 * - Growing season (last spring freeze to first fall freeze)
 * - Diurnal swing (avg daily temp range)
 * - Seasonal stability (std dev of monthly avg temps)
 * 
 * API: https://www.rcc-acis.org/docs_webservices.html
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";
const ACIS_API_URL = "https://data.rcc-acis.org/StnData";

// 30-year normal period
const NORMAL_START = "1991-01-01";
const NORMAL_END = "2020-12-31";

interface CityData {
  id: string;
  name: string;
  state: string;
  noaaStation?: string;
}

interface ACISResponse {
  meta?: {
    name?: string;
    state?: string;
    ll?: [number, number];
    elev?: number;
  };
  data?: Array<[string, ...Array<string | number | [number, string] | null>]>;
  smry?: Array<number | string | null>;
  error?: string;
}

interface NOAAClimateData {
  source: string;
  station: string;
  normalPeriod: string;
  lastUpdated: string;
  comfortDays: number | null;      // Days with 65 <= maxt <= 80
  extremeHeatDays: number | null;   // Days with maxt > 95
  freezeDays: number | null;        // Days with mint < 32
  rainDays: number | null;          // Days with pcpn > 0.01
  annualPrecipitation: number | null;
  coolingDegreeDays: number | null;
  heatingDegreeDays: number | null;
  growingSeasonDays: number | null;
  lastSpringFreeze: string | null;  // MM-DD format
  firstFallFreeze: string | null;   // MM-DD format
  diurnalSwing: number | null;      // Avg daily temp range (°F)
  seasonalStability: number | null; // StdDev of monthly avg temps
}

/**
 * Fetch climate data from ACIS for a single station
 */
async function fetchACISData(stationId: string): Promise<NOAAClimateData | null> {
  try {
    // Query 1: Annual counts and degree days with 30-year averages
    const countsParams = {
      sid: stationId,
      sdate: NORMAL_START,
      edate: NORMAL_END,
      elems: [
        // Days >= 65°F (for comfort calculation)
        { name: "maxt", interval: "yly", duration: "yly", reduce: "cnt_ge_65", smry: "mean" },
        // Days >= 80°F (to subtract from above for comfort)
        { name: "maxt", interval: "yly", duration: "yly", reduce: "cnt_ge_80", smry: "mean" },
        // Days > 95°F (extreme heat)
        { name: "maxt", interval: "yly", duration: "yly", reduce: "cnt_gt_95", smry: "mean" },
        // Days <= 32°F (freeze)
        { name: "mint", interval: "yly", duration: "yly", reduce: "cnt_le_32", smry: "mean" },
        // Rain days (> 0.01 in)
        { name: "pcpn", interval: "yly", duration: "yly", reduce: "cnt_ge_0.01", smry: "mean" },
        // Total precipitation
        { name: "pcpn", interval: "yly", duration: "yly", reduce: "sum", smry: "mean" },
        // Cooling degree days
        { name: "cdd", interval: "yly", duration: "yly", reduce: "sum", smry: "mean" },
        // Heating degree days  
        { name: "hdd", interval: "yly", duration: "yly", reduce: "sum", smry: "mean" },
      ],
      meta: ["name", "state"],
    };

    // Query 2: Growing season (last spring freeze, first fall freeze)
    const growingParams = {
      sid: stationId,
      sdate: NORMAL_START,
      edate: NORMAL_END,
      elems: [
        // Last spring freeze (last day <= 32 before July 1)
        { 
          name: "mint", 
          interval: [1, 0, 0], 
          duration: "std", 
          season_start: "07-01", 
          reduce: "last_le_32",
          smry: "mean",
          smry_only: 1
        },
        // First fall freeze (first day <= 32 after July 1)
        { 
          name: "mint", 
          interval: [1, 0, 0], 
          duration: "std", 
          season_start: "07-01", 
          reduce: "first_le_32",
          smry: "mean",
          smry_only: 1
        },
      ],
    };

    // Query 3: Monthly averages for seasonal stability calculation
    const monthlyParams = {
      sid: stationId,
      sdate: NORMAL_START,
      edate: NORMAL_END,
      elems: [
        // Monthly average temperature
        { name: "avgt", interval: "mly", duration: 1, reduce: "mean", smry: "mean", smry_only: 1 },
      ],
      meta: [],
    };

    // Query 4: Daily temperature range for diurnal swing
    const diurnalParams = {
      sid: stationId,
      sdate: NORMAL_START,
      edate: NORMAL_END,
      elems: [
        // We need to calculate (maxt - mint) average
        // Get yearly mean of maxt and mint separately, then calculate
        { name: "maxt", interval: "yly", duration: "yly", reduce: "mean", smry: "mean" },
        { name: "mint", interval: "yly", duration: "yly", reduce: "mean", smry: "mean" },
      ],
      meta: [],
    };

    // Execute queries in parallel
    const [countsResp, growingResp, monthlyResp, diurnalResp] = await Promise.all([
      fetch(ACIS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(countsParams),
      }),
      fetch(ACIS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(growingParams),
      }),
      fetch(ACIS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(monthlyParams),
      }),
      fetch(ACIS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diurnalParams),
      }),
    ]);

    if (!countsResp.ok || !growingResp.ok || !monthlyResp.ok || !diurnalResp.ok) {
      console.error(`ACIS API returned non-200 for ${stationId}`);
      return null;
    }

    const countsData: ACISResponse = await countsResp.json();
    const growingData: ACISResponse = await growingResp.json();
    const monthlyData: ACISResponse = await monthlyResp.json();
    const diurnalData: ACISResponse = await diurnalResp.json();

    if (countsData.error || growingData.error || monthlyData.error || diurnalData.error) {
      console.error(`ACIS error for ${stationId}:`, 
        countsData.error || growingData.error || monthlyData.error || diurnalData.error);
      return null;
    }

    // Extract summary values from counts query
    const countsSummary = countsData.smry || [];
    const daysGe65 = parseFloat(String(countsSummary[0])) || 0;
    const daysGe80 = parseFloat(String(countsSummary[1])) || 0;
    const comfortDays = Math.round(daysGe65 - daysGe80); // Days between 65-80
    const extremeHeatDays = Math.round(parseFloat(String(countsSummary[2])) || 0);
    const freezeDays = Math.round(parseFloat(String(countsSummary[3])) || 0);
    const rainDays = Math.round(parseFloat(String(countsSummary[4])) || 0);
    const annualPrecipitation = Math.round((parseFloat(String(countsSummary[5])) || 0) * 10) / 10;
    const coolingDegreeDays = Math.round(parseFloat(String(countsSummary[6])) || 0);
    const heatingDegreeDays = Math.round(parseFloat(String(countsSummary[7])) || 0);

    // Extract growing season dates
    const growingSummary = growingData.smry || [];
    const lastSpringDOY = parseFloat(String(growingSummary[0])) || null;
    const firstFallDOY = parseFloat(String(growingSummary[1])) || null;
    
    let growingSeasonDays: number | null = null;
    let lastSpringFreeze: string | null = null;
    let firstFallFreeze: string | null = null;
    
    if (lastSpringDOY !== null && firstFallDOY !== null) {
      // Convert day of year to MM-DD format (approximate, ignoring leap years)
      const doyToMMDD = (doy: number): string => {
        const date = new Date(2020, 0, 1); // Use a leap year for calculation
        date.setDate(date.getDate() + Math.round(doy) - 1);
        return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      
      lastSpringFreeze = doyToMMDD(lastSpringDOY);
      firstFallFreeze = doyToMMDD(firstFallDOY);
      
      // Growing season is days between last spring and first fall freeze
      // Handle wrap-around for very mild climates
      if (firstFallDOY > lastSpringDOY) {
        growingSeasonDays = Math.round(firstFallDOY - lastSpringDOY);
      } else {
        // If first fall freeze DOY is earlier, it means almost year-round growing
        growingSeasonDays = Math.round(365 - lastSpringDOY + firstFallDOY);
      }
    }

    // Calculate seasonal stability (std dev of monthly means)
    const monthlySummary = monthlyData.smry || [];
    let seasonalStability: number | null = null;
    
    if (monthlySummary.length === 12) {
      const monthlyMeans = monthlySummary.map((v) => parseFloat(String(v)) || 0);
      const mean = monthlyMeans.reduce((a, b) => a + b, 0) / 12;
      const variance = monthlyMeans.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / 12;
      seasonalStability = Math.round(Math.sqrt(variance) * 10) / 10;
    }

    // Calculate diurnal swing (avg daily temp range)
    const diurnalSummary = diurnalData.smry || [];
    let diurnalSwing: number | null = null;
    
    if (diurnalSummary.length >= 2) {
      const avgMaxt = parseFloat(String(diurnalSummary[0])) || 0;
      const avgMint = parseFloat(String(diurnalSummary[1])) || 0;
      diurnalSwing = Math.round((avgMaxt - avgMint) * 10) / 10;
    }

    return {
      source: "ACIS",
      station: stationId,
      normalPeriod: "1991-2020",
      lastUpdated: new Date().toISOString().split("T")[0],
      comfortDays,
      extremeHeatDays,
      freezeDays,
      rainDays,
      annualPrecipitation,
      coolingDegreeDays,
      heatingDegreeDays,
      growingSeasonDays,
      lastSpringFreeze,
      firstFallFreeze,
      diurnalSwing,
      seasonalStability,
    };
  } catch (error) {
    console.error(`Error fetching ACIS data for ${stationId}:`, error);
    return null;
  }
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

    // Load cities and metrics
    const citiesFile = JSON.parse(
      readFileSync(join(dataDir, "cities.json"), "utf-8")
    );
    const metricsFile = JSON.parse(
      readFileSync(join(dataDir, "metrics.json"), "utf-8")
    );

    const cities: CityData[] = citiesFile.cities;

    // Filter cities that have NOAA station codes
    const citiesWithStations = cities.filter((c) => c.noaaStation);

    if (citiesWithStations.length === 0) {
      return NextResponse.json(
        { error: "No cities have NOAA station codes configured" },
        { status: 400 }
      );
    }

    console.log(`Fetching NOAA ACIS data for ${citiesWithStations.length} cities...`);

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    // Process cities sequentially to avoid overwhelming the API
    // (ACIS is a free government API, be respectful)
    for (const city of citiesWithStations) {
      console.log(`  Fetching ${city.name} (${city.noaaStation})...`);
      
      const climateData = await fetchACISData(city.noaaStation!);
      
      if (climateData) {
        // Ensure city entry exists in metrics
        if (!metricsFile.cities[city.id]) {
          metricsFile.cities[city.id] = {};
        }
        if (!metricsFile.cities[city.id].climate) {
          metricsFile.cities[city.id].climate = {};
        }

        // Add NOAA data to climate section
        metricsFile.cities[city.id].climate.noaa = climateData;

        successCount++;
        console.log(
          `    ✓ Comfort: ${climateData.comfortDays} days, Heat: ${climateData.extremeHeatDays} days, ` +
          `Freeze: ${climateData.freezeDays} days, CDD: ${climateData.coolingDegreeDays}, HDD: ${climateData.heatingDegreeDays}`
        );
      } else {
        skipCount++;
        errors.push(`${city.name} (${city.noaaStation})`);
        console.log(`    ✗ No data available`);
      }

      // Small delay between requests to be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Update metrics source info
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources.noaa = "NOAA ACIS (30-year Climate Normals)";
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
          source: "noaa-acis",
          status: successCount > 0 ? "success" : "error",
          recordsUpdated: successCount,
          errorMessage: errors.length > 0 ? `Failed: ${errors.join(", ")}` : undefined,
        },
      });
    } catch (logError) {
      console.error("Failed to log refresh:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "NOAA ACIS climate data pulled successfully",
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        normalPeriod: "1991-2020",
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("NOAA pull error:", error);

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "noaa-acis",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "NOAA pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
