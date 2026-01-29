/**
 * Admin API to pull climate data from NOAA ACIS + Open-Meteo
 * 
 * POST /api/admin/climate-pull
 * Body: { password: string }
 * 
 * Data sources:
 * - NOAA ACIS (30-year normals 1991-2020): Temperature, precipitation, degree days, snowfall
 * - Open-Meteo (historical averages): Cloud cover, dewpoint/humidity
 * 
 * Metrics fetched:
 * - Comfort days (65°F <= max temp <= 80°F) [ACIS]
 * - Extreme heat days (max temp > 95°F) [ACIS]
 * - Freeze days (min temp < 32°F) [ACIS]
 * - Rain days (precipitation > 0.01 in) [ACIS]
 * - Snow days (snowfall > 1 in) [ACIS]
 * - Annual snowfall (total inches) [ACIS]
 * - Cooling/Heating Degree Days [ACIS]
 * - Growing season [ACIS]
 * - Diurnal swing (avg daily temp range) [ACIS]
 * - Seasonal stability (std dev of monthly temps) [ACIS]
 * - Cloudy days (cloud cover > 75%) [Open-Meteo]
 * - July dewpoint (humidity/stickiness) [Open-Meteo]
 * 
 * APIs:
 * - ACIS: https://www.rcc-acis.org/docs_webservices.html
 * - Open-Meteo: https://open-meteo.com/en/docs/historical-weather-api
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { createAdminLogger } from "@/lib/admin-logger";
import { getProductionGuardResponse, validateAdminPassword } from "@/lib/admin/helpers";

const logger = createAdminLogger("climate-pull");
const ACIS_API_URL = "https://data.rcc-acis.org/StnData";
const OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive";

// 30-year normal period for ACIS
const NORMAL_START = "1991-01-01";
const NORMAL_END = "2020-12-31";

// Recent years for Open-Meteo (they have data from 1940-present)
const METEO_START = "2014-01-01";
const METEO_END = "2023-12-31";

interface CityData {
  id: string;
  name: string;
  state: string;
  noaaStation?: string;
  latitude?: number;
  longitude?: number;
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

interface ClimateData {
  source: string;
  station: string;
  normalPeriod: string;
  lastUpdated: string;
  
  // From ACIS
  comfortDays: number | null;
  extremeHeatDays: number | null;
  freezeDays: number | null;
  rainDays: number | null;
  annualPrecipitation: number | null;
  snowDays: number | null;           // NEW: Days with snow > 1 inch
  annualSnowfall: number | null;     // NEW: Total annual snowfall (inches)
  coolingDegreeDays: number | null;
  heatingDegreeDays: number | null;
  growingSeasonDays: number | null;
  lastSpringFreeze: string | null;
  firstFallFreeze: string | null;
  diurnalSwing: number | null;
  seasonalStability: number | null;
  
  // From Open-Meteo
  cloudyDays: number | null;         // NEW: Days with cloud cover > 75%
  avgCloudCover: number | null;      // NEW: Annual avg cloud cover %
  julyDewpoint: number | null;       // NEW: July avg dewpoint (°F) for humidity
  summerHumidityIndex: number | null; // NEW: Avg July-Aug relative humidity %
}

/**
 * Fetch climate data from ACIS for a single station
 */
async function fetchACISData(stationId: string): Promise<Partial<ClimateData> | null> {
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
        // Snow days > 1 inch
        { name: "snow", interval: "yly", duration: "yly", reduce: "cnt_ge_1", smry: "mean" },
        // Total annual snowfall
        { name: "snow", interval: "yly", duration: "yly", reduce: "sum", smry: "mean" },
      ],
      meta: ["name", "state", "ll"],
    };

    // Query 2: Growing season (last spring freeze, first fall freeze)
    const growingParams = {
      sid: stationId,
      sdate: NORMAL_START,
      edate: NORMAL_END,
      elems: [
        { 
          name: "mint", 
          interval: [1, 0, 0], 
          duration: "std", 
          season_start: "07-01", 
          reduce: "last_le_32",
          smry: "mean",
          smry_only: 1
        },
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
      logger.error("ACIS API returned non-200", { station: stationId });
      return null;
    }

    const countsData: ACISResponse = await countsResp.json();
    const growingData: ACISResponse = await growingResp.json();
    const monthlyData: ACISResponse = await monthlyResp.json();
    const diurnalData: ACISResponse = await diurnalResp.json();

    if (countsData.error || growingData.error || monthlyData.error || diurnalData.error) {
      logger.error("ACIS error", { station: stationId, error: countsData.error || growingData.error || monthlyData.error || diurnalData.error });
      return null;
    }

    // Extract summary values from counts query
    const countsSummary = countsData.smry || [];
    const daysGe65 = parseFloat(String(countsSummary[0])) || 0;
    const daysGe80 = parseFloat(String(countsSummary[1])) || 0;
    const comfortDays = Math.round(daysGe65 - daysGe80);
    const extremeHeatDays = Math.round(parseFloat(String(countsSummary[2])) || 0);
    const freezeDays = Math.round(parseFloat(String(countsSummary[3])) || 0);
    const rainDays = Math.round(parseFloat(String(countsSummary[4])) || 0);
    const annualPrecipitation = Math.round((parseFloat(String(countsSummary[5])) || 0) * 10) / 10;
    const coolingDegreeDays = Math.round(parseFloat(String(countsSummary[6])) || 0);
    const heatingDegreeDays = Math.round(parseFloat(String(countsSummary[7])) || 0);
    const snowDays = Math.round(parseFloat(String(countsSummary[8])) || 0);
    const annualSnowfall = Math.round((parseFloat(String(countsSummary[9])) || 0) * 10) / 10;

    // Extract growing season dates
    const growingSummary = growingData.smry || [];
    const lastSpringDOY = parseFloat(String(growingSummary[0])) || null;
    const firstFallDOY = parseFloat(String(growingSummary[1])) || null;
    
    let growingSeasonDays: number | null = null;
    let lastSpringFreeze: string | null = null;
    let firstFallFreeze: string | null = null;
    
    if (lastSpringDOY !== null && firstFallDOY !== null) {
      const doyToMMDD = (doy: number): string => {
        const date = new Date(2020, 0, 1);
        date.setDate(date.getDate() + Math.round(doy) - 1);
        return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      
      lastSpringFreeze = doyToMMDD(lastSpringDOY);
      firstFallFreeze = doyToMMDD(firstFallDOY);
      
      if (firstFallDOY > lastSpringDOY) {
        growingSeasonDays = Math.round(firstFallDOY - lastSpringDOY);
      } else {
        growingSeasonDays = Math.round(365 - lastSpringDOY + firstFallDOY);
      }
    }

    // Calculate seasonal stability
    const monthlySummary = monthlyData.smry || [];
    let seasonalStability: number | null = null;
    
    if (monthlySummary.length === 12) {
      const monthlyMeans = monthlySummary.map((v) => parseFloat(String(v)) || 0);
      const mean = monthlyMeans.reduce((a, b) => a + b, 0) / 12;
      const variance = monthlyMeans.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / 12;
      seasonalStability = Math.round(Math.sqrt(variance) * 10) / 10;
    }

    // Calculate diurnal swing
    const diurnalSummary = diurnalData.smry || [];
    let diurnalSwing: number | null = null;
    
    if (diurnalSummary.length >= 2) {
      const avgMaxt = parseFloat(String(diurnalSummary[0])) || 0;
      const avgMint = parseFloat(String(diurnalSummary[1])) || 0;
      diurnalSwing = Math.round((avgMaxt - avgMint) * 10) / 10;
    }

    // Get coordinates from ACIS response if available
    const coordinates = countsData.meta?.ll;

    return {
      source: "ACIS",
      station: stationId,
      normalPeriod: "1991-2020",
      comfortDays,
      extremeHeatDays,
      freezeDays,
      rainDays,
      annualPrecipitation,
      snowDays,
      annualSnowfall,
      coolingDegreeDays,
      heatingDegreeDays,
      growingSeasonDays,
      lastSpringFreeze,
      firstFallFreeze,
      diurnalSwing,
      seasonalStability,
      // Include coordinates for Open-Meteo lookup
      ...(coordinates && { _lat: coordinates[1], _lon: coordinates[0] }),
    };
  } catch (error) {
    logger.error("Error fetching ACIS data", { station: stationId, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Fetch cloud cover and humidity data from Open-Meteo
 * 
 * Note: The Historical Archive API only has cloud_cover, dew_point_2m, and 
 * relative_humidity_2m as HOURLY variables, not daily. We need to fetch hourly
 * data and aggregate it ourselves.
 * 
 * To keep the request size reasonable, we only fetch 3 recent years (2021-2023)
 * and use daily aggregation via the API where available.
 */
async function fetchOpenMeteoData(
  latitude: number,
  longitude: number
): Promise<Partial<ClimateData> | null> {
  try {
    // Use a shorter date range to keep data manageable (3 years)
    // and request hourly data for cloud cover, dewpoint, humidity
    const startDate = "2021-01-01";
    const endDate = "2023-12-31";
    
    const url = new URL(OPEN_METEO_URL);
    url.searchParams.set("latitude", latitude.toString());
    url.searchParams.set("longitude", longitude.toString());
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
    // Request hourly data - these variables ARE available hourly
    url.searchParams.set("hourly", "cloud_cover,dew_point_2m,relative_humidity_2m");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("timezone", "UTC");

    logger.debug("Fetching Open-Meteo data", { url: url.toString().substring(0, 100) });
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Open-Meteo error", { status: response.status, error: errorText.substring(0, 200) });
      return null;
    }

    const data = await response.json();
    
    if (!data.hourly || !data.hourly.time) {
      logger.error("Open-Meteo returned no hourly data");
      return null;
    }

    const times: string[] = data.hourly.time;
    const cloudCovers: (number | null)[] = data.hourly.cloud_cover || [];
    const dewpoints: (number | null)[] = data.hourly.dew_point_2m || [];
    const humidities: (number | null)[] = data.hourly.relative_humidity_2m || [];

    // Group by day and calculate daily averages
    const dailyData: Map<string, { cloudSum: number; cloudCount: number; maxCloud: number }> = new Map();
    const julyData: { dewpointSum: number; dewpointCount: number } = { dewpointSum: 0, dewpointCount: 0 };
    const summerHumidity: { sum: number; count: number } = { sum: 0, count: 0 };

    for (let i = 0; i < times.length; i++) {
      const dateTime = new Date(times[i]);
      const dateKey = times[i].substring(0, 10); // YYYY-MM-DD
      const month = dateTime.getMonth(); // 0-indexed
      
      // Track daily cloud cover
      if (cloudCovers[i] !== null) {
        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, { cloudSum: 0, cloudCount: 0, maxCloud: 0 });
        }
        const day = dailyData.get(dateKey)!;
        day.cloudSum += cloudCovers[i]!;
        day.cloudCount++;
        day.maxCloud = Math.max(day.maxCloud, cloudCovers[i]!);
      }
      
      // July dewpoint (for humidity/stickiness indicator)
      if (month === 6 && dewpoints[i] !== null) {
        julyData.dewpointSum += dewpoints[i]!;
        julyData.dewpointCount++;
      }
      
      // July-August humidity
      if ((month === 6 || month === 7) && humidities[i] !== null) {
        summerHumidity.sum += humidities[i]!;
        summerHumidity.count++;
      }
    }

    // Calculate cloudy days (days where avg cloud cover > 75%)
    let cloudyDays = 0;
    let totalCloudSum = 0;
    let totalCloudDays = 0;
    
    for (const [, day] of dailyData) {
      if (day.cloudCount > 0) {
        const avgCloud = day.cloudSum / day.cloudCount;
        totalCloudSum += avgCloud;
        totalCloudDays++;
        if (avgCloud > 75) {
          cloudyDays++;
        }
      }
    }
    
    // Average cloudy days per year (we have 3 years of data)
    const yearsOfData = 3;
    cloudyDays = Math.round(cloudyDays / yearsOfData);
    const avgCloudCover = totalCloudDays > 0 ? Math.round(totalCloudSum / totalCloudDays) : null;

    const julyDewpoint = julyData.dewpointCount > 0 
      ? Math.round(julyData.dewpointSum / julyData.dewpointCount * 10) / 10 
      : null;
    
    const summerHumidityIndex = summerHumidity.count > 0
      ? Math.round(summerHumidity.sum / summerHumidity.count)
      : null;

    return {
      cloudyDays,
      avgCloudCover,
      julyDewpoint,
      summerHumidityIndex,
    };
  } catch (error) {
    logger.error("Error fetching Open-Meteo data", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Block in production
  const guardResponse = getProductionGuardResponse();
  if (guardResponse) return guardResponse;

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
    const auth = validateAdminPassword(body.password);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
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

    logger.info("Fetching climate data", { cityCount: citiesWithStations.length });

    let acisSuccessCount = 0;
    let openMeteoSuccessCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    // Process cities sequentially to avoid overwhelming the APIs
    for (const city of citiesWithStations) {
      logger.debug("Fetching city", { city: city.name, station: city.noaaStation });
      
      // Fetch ACIS data
      const acisData = await fetchACISData(city.noaaStation!);
      
      if (!acisData) {
        skipCount++;
        errors.push(`${city.name}: ACIS failed`);
        logger.warn("ACIS: No data available", { city: city.name });
        continue;
      }

      acisSuccessCount++;
      logger.debug("ACIS data fetched", { city: city.name, comfort: acisData.comfortDays, snowDays: acisData.snowDays, snowfall: acisData.annualSnowfall });

      // Get coordinates for Open-Meteo
      // First try from ACIS response, then from city data
      const lat = (acisData as { _lat?: number })._lat || city.latitude;
      const lon = (acisData as { _lon?: number })._lon || city.longitude;
      
      let openMeteoData: Partial<ClimateData> | null = null;
      
      if (lat && lon) {
        openMeteoData = await fetchOpenMeteoData(lat, lon);
        
        if (openMeteoData) {
          openMeteoSuccessCount++;
          logger.debug("Open-Meteo data fetched", { city: city.name, cloudyDays: openMeteoData.cloudyDays, julyDewpoint: openMeteoData.julyDewpoint });
        } else {
          logger.warn("Open-Meteo: Failed to fetch", { city: city.name });
        }
      } else {
        logger.warn("Open-Meteo: No coordinates available", { city: city.name });
      }

      // Ensure city entry exists in metrics
      if (!metricsFile.cities[city.id]) {
        metricsFile.cities[city.id] = {};
      }
      if (!metricsFile.cities[city.id].climate) {
        metricsFile.cities[city.id].climate = {};
      }

      // Clean up internal fields
      delete (acisData as { _lat?: number })._lat;
      delete (acisData as { _lon?: number })._lon;

      // Merge ACIS and Open-Meteo data
      const climateData: ClimateData = {
        source: "ACIS+Open-Meteo",
        station: city.noaaStation!,
        normalPeriod: "1991-2020",
        lastUpdated: new Date().toISOString().split("T")[0],
        // ACIS data
        comfortDays: acisData.comfortDays ?? null,
        extremeHeatDays: acisData.extremeHeatDays ?? null,
        freezeDays: acisData.freezeDays ?? null,
        rainDays: acisData.rainDays ?? null,
        annualPrecipitation: acisData.annualPrecipitation ?? null,
        snowDays: acisData.snowDays ?? null,
        annualSnowfall: acisData.annualSnowfall ?? null,
        coolingDegreeDays: acisData.coolingDegreeDays ?? null,
        heatingDegreeDays: acisData.heatingDegreeDays ?? null,
        growingSeasonDays: acisData.growingSeasonDays ?? null,
        lastSpringFreeze: acisData.lastSpringFreeze ?? null,
        firstFallFreeze: acisData.firstFallFreeze ?? null,
        diurnalSwing: acisData.diurnalSwing ?? null,
        seasonalStability: acisData.seasonalStability ?? null,
        // Open-Meteo data
        cloudyDays: openMeteoData?.cloudyDays ?? null,
        avgCloudCover: openMeteoData?.avgCloudCover ?? null,
        julyDewpoint: openMeteoData?.julyDewpoint ?? null,
        summerHumidityIndex: openMeteoData?.summerHumidityIndex ?? null,
      };

      // Store in metrics.json
      metricsFile.cities[city.id].climate.noaa = climateData;

      // Small delay between requests to be respectful to APIs
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Update metrics source info
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources.climate = "NOAA ACIS (30-year normals) + Open-Meteo (2014-2023 averages)";
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
          source: "climate-data",
          status: acisSuccessCount > 0 ? "success" : "error",
          recordsUpdated: acisSuccessCount,
          errorMessage: errors.length > 0 ? `Failed: ${errors.join(", ")}` : undefined,
        },
      });
    } catch (logError) {
      logger.error("Failed to log refresh", { error: String(logError) });
    }

    return NextResponse.json({
      success: true,
      message: "Climate data pulled successfully",
      stats: {
        acisUpdated: acisSuccessCount,
        openMeteoUpdated: openMeteoSuccessCount,
        citiesSkipped: skipCount,
        normalPeriod: "1991-2020",
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    logger.error("Climate pull failed", { error: error instanceof Error ? error.message : String(error) });

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "climate-data",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "Climate pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
