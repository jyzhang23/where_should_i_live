/**
 * Climate Data Pull Module
 * 
 * Fetches climate data from NOAA ACIS and Open-Meteo
 * Used by both CLI and API routes.
 */

import { createAdminLogger } from "@/lib/admin-logger";
import { DataDirectory, loadCities, loadMetrics, saveMetrics } from "../helpers";
import { PullResult, CityWithNoaa } from "./types";

const logger = createAdminLogger("climate-pull");

const ACIS_API_URL = "https://data.rcc-acis.org/StnData";
const OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive";

const NORMAL_START = "1991-01-01";
const NORMAL_END = "2020-12-31";

interface ACISResponse {
  meta?: { name?: string; state?: string; ll?: [number, number]; elev?: number };
  data?: Array<[string, ...Array<string | number | [number, string] | null>]>;
  smry?: Array<number | string | null>;
  error?: string;
}

interface ClimateData {
  source: string;
  station: string;
  normalPeriod: string;
  lastUpdated: string;
  comfortDays: number | null;
  extremeHeatDays: number | null;
  freezeDays: number | null;
  rainDays: number | null;
  annualPrecipitation: number | null;
  snowDays: number | null;
  annualSnowfall: number | null;
  coolingDegreeDays: number | null;
  heatingDegreeDays: number | null;
  growingSeasonDays: number | null;
  lastSpringFreeze: string | null;
  firstFallFreeze: string | null;
  diurnalSwing: number | null;
  seasonalStability: number | null;
  cloudyDays: number | null;
  avgCloudCover: number | null;
  julyDewpoint: number | null;
  summerHumidityIndex: number | null;
}

async function fetchACISData(stationId: string): Promise<Partial<ClimateData> & { _lat?: number; _lon?: number } | null> {
  try {
    const countsParams = {
      sid: stationId,
      sdate: NORMAL_START,
      edate: NORMAL_END,
      elems: [
        { name: "maxt", interval: "yly", duration: "yly", reduce: "cnt_ge_65", smry: "mean" },
        { name: "maxt", interval: "yly", duration: "yly", reduce: "cnt_ge_80", smry: "mean" },
        { name: "maxt", interval: "yly", duration: "yly", reduce: "cnt_gt_95", smry: "mean" },
        { name: "mint", interval: "yly", duration: "yly", reduce: "cnt_le_32", smry: "mean" },
        { name: "pcpn", interval: "yly", duration: "yly", reduce: "cnt_ge_0.01", smry: "mean" },
        { name: "pcpn", interval: "yly", duration: "yly", reduce: "sum", smry: "mean" },
        { name: "cdd", interval: "yly", duration: "yly", reduce: "sum", smry: "mean" },
        { name: "hdd", interval: "yly", duration: "yly", reduce: "sum", smry: "mean" },
        { name: "snow", interval: "yly", duration: "yly", reduce: "cnt_ge_1", smry: "mean" },
        { name: "snow", interval: "yly", duration: "yly", reduce: "sum", smry: "mean" },
      ],
      meta: ["name", "state", "ll"],
    };

    const growingParams = {
      sid: stationId,
      sdate: NORMAL_START,
      edate: NORMAL_END,
      elems: [
        { name: "mint", interval: [1, 0, 0], duration: "std", season_start: "07-01", reduce: "last_le_32", smry: "mean", smry_only: 1 },
        { name: "mint", interval: [1, 0, 0], duration: "std", season_start: "07-01", reduce: "first_le_32", smry: "mean", smry_only: 1 },
      ],
    };

    const monthlyParams = {
      sid: stationId,
      sdate: NORMAL_START,
      edate: NORMAL_END,
      elems: [{ name: "avgt", interval: "mly", duration: 1, reduce: "mean", smry: "mean", smry_only: 1 }],
      meta: [],
    };

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

    const [countsResp, growingResp, monthlyResp, diurnalResp] = await Promise.all([
      fetch(ACIS_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(countsParams) }),
      fetch(ACIS_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(growingParams) }),
      fetch(ACIS_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(monthlyParams) }),
      fetch(ACIS_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(diurnalParams) }),
    ]);

    if (!countsResp.ok || !growingResp.ok || !monthlyResp.ok || !diurnalResp.ok) {
      return null;
    }

    const countsData: ACISResponse = await countsResp.json();
    const growingData: ACISResponse = await growingResp.json();
    const monthlyData: ACISResponse = await monthlyResp.json();
    const diurnalData: ACISResponse = await diurnalResp.json();

    if (countsData.error || growingData.error || monthlyData.error || diurnalData.error) {
      return null;
    }

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
      growingSeasonDays = firstFallDOY > lastSpringDOY 
        ? Math.round(firstFallDOY - lastSpringDOY)
        : Math.round(365 - lastSpringDOY + firstFallDOY);
    }

    const monthlySummary = monthlyData.smry || [];
    let seasonalStability: number | null = null;
    if (monthlySummary.length === 12) {
      const monthlyMeans = monthlySummary.map((v) => parseFloat(String(v)) || 0);
      const mean = monthlyMeans.reduce((a, b) => a + b, 0) / 12;
      const variance = monthlyMeans.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / 12;
      seasonalStability = Math.round(Math.sqrt(variance) * 10) / 10;
    }

    const diurnalSummary = diurnalData.smry || [];
    let diurnalSwing: number | null = null;
    if (diurnalSummary.length >= 2) {
      const avgMaxt = parseFloat(String(diurnalSummary[0])) || 0;
      const avgMint = parseFloat(String(diurnalSummary[1])) || 0;
      diurnalSwing = Math.round((avgMaxt - avgMint) * 10) / 10;
    }

    const coordinates = countsData.meta?.ll;

    return {
      source: "ACIS",
      station: stationId,
      normalPeriod: "1991-2020",
      comfortDays, extremeHeatDays, freezeDays, rainDays, annualPrecipitation,
      snowDays, annualSnowfall, coolingDegreeDays, heatingDegreeDays,
      growingSeasonDays, lastSpringFreeze, firstFallFreeze, diurnalSwing, seasonalStability,
      ...(coordinates && { _lat: coordinates[1], _lon: coordinates[0] }),
    };
  } catch (error) {
    logger.error("Error fetching ACIS data", { station: stationId, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function fetchOpenMeteoData(latitude: number, longitude: number): Promise<Partial<ClimateData> | null> {
  try {
    const url = new URL(OPEN_METEO_URL);
    url.searchParams.set("latitude", latitude.toString());
    url.searchParams.set("longitude", longitude.toString());
    url.searchParams.set("start_date", "2021-01-01");
    url.searchParams.set("end_date", "2023-12-31");
    url.searchParams.set("hourly", "cloud_cover,dew_point_2m,relative_humidity_2m");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("timezone", "UTC");

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.hourly || !data.hourly.time) return null;

    const times: string[] = data.hourly.time;
    const cloudCovers: (number | null)[] = data.hourly.cloud_cover || [];
    const dewpoints: (number | null)[] = data.hourly.dew_point_2m || [];
    const humidities: (number | null)[] = data.hourly.relative_humidity_2m || [];

    const dailyData: Map<string, { cloudSum: number; cloudCount: number }> = new Map();
    const julyData = { dewpointSum: 0, dewpointCount: 0 };
    const summerHumidity = { sum: 0, count: 0 };

    for (let i = 0; i < times.length; i++) {
      const dateTime = new Date(times[i]);
      const dateKey = times[i].substring(0, 10);
      const month = dateTime.getMonth();
      
      if (cloudCovers[i] !== null) {
        if (!dailyData.has(dateKey)) dailyData.set(dateKey, { cloudSum: 0, cloudCount: 0 });
        const day = dailyData.get(dateKey)!;
        day.cloudSum += cloudCovers[i]!;
        day.cloudCount++;
      }
      
      if (month === 6 && dewpoints[i] !== null) {
        julyData.dewpointSum += dewpoints[i]!;
        julyData.dewpointCount++;
      }
      
      if ((month === 6 || month === 7) && humidities[i] !== null) {
        summerHumidity.sum += humidities[i]!;
        summerHumidity.count++;
      }
    }

    let cloudyDays = 0;
    let totalCloudSum = 0;
    let totalCloudDays = 0;
    
    for (const [, day] of dailyData) {
      if (day.cloudCount > 0) {
        const avgCloud = day.cloudSum / day.cloudCount;
        totalCloudSum += avgCloud;
        totalCloudDays++;
        if (avgCloud > 75) cloudyDays++;
      }
    }
    
    cloudyDays = Math.round(cloudyDays / 3);
    const avgCloudCover = totalCloudDays > 0 ? Math.round(totalCloudSum / totalCloudDays) : null;
    const julyDewpoint = julyData.dewpointCount > 0 ? Math.round(julyData.dewpointSum / julyData.dewpointCount * 10) / 10 : null;
    const summerHumidityIndex = summerHumidity.count > 0 ? Math.round(summerHumidity.sum / summerHumidity.count) : null;

    return { cloudyDays, avgCloudCover, julyDewpoint, summerHumidityIndex };
  } catch (error) {
    logger.error("Error fetching Open-Meteo data", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Pull climate data for all cities
 */
export async function pullClimateData(
  dataDir: DataDirectory,
  onProgress?: (message: string) => void
): Promise<PullResult> {
  const log = (msg: string) => {
    logger.info(msg);
    onProgress?.(msg);
  };

  try {
    const cities = loadCities<CityWithNoaa>(dataDir);
    const metricsFile = loadMetrics(dataDir);

    const citiesWithStations = cities.filter((c) => c.noaaStation);

    if (citiesWithStations.length === 0) {
      return { success: false, error: "No cities have NOAA station codes configured" };
    }

    log(`Fetching climate data for ${citiesWithStations.length} cities...`);

    let acisSuccessCount = 0;
    let openMeteoSuccessCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const city of citiesWithStations) {
      const acisData = await fetchACISData(city.noaaStation!);
      
      if (!acisData) {
        skipCount++;
        errors.push(`${city.name}: ACIS failed`);
        continue;
      }

      acisSuccessCount++;

      const lat = acisData._lat || city.latitude;
      const lon = acisData._lon || city.longitude;
      
      let openMeteoData: Partial<ClimateData> | null = null;
      if (lat && lon) {
        openMeteoData = await fetchOpenMeteoData(lat, lon);
        if (openMeteoData) openMeteoSuccessCount++;
      }

      if (!metricsFile.cities[city.id]) metricsFile.cities[city.id] = {};
      const cityMetrics = metricsFile.cities[city.id] as Record<string, unknown>;
      if (!cityMetrics.climate) cityMetrics.climate = {};

      delete acisData._lat;
      delete acisData._lon;

      const climateData: ClimateData = {
        source: "ACIS+Open-Meteo",
        station: city.noaaStation!,
        normalPeriod: "1991-2020",
        lastUpdated: new Date().toISOString().split("T")[0],
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
        cloudyDays: openMeteoData?.cloudyDays ?? null,
        avgCloudCover: openMeteoData?.avgCloudCover ?? null,
        julyDewpoint: openMeteoData?.julyDewpoint ?? null,
        summerHumidityIndex: openMeteoData?.summerHumidityIndex ?? null,
      };

      (cityMetrics.climate as Record<string, unknown>).noaa = climateData;

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (!metricsFile.sources) metricsFile.sources = {};
    metricsFile.sources.climate = "NOAA ACIS (30-year normals) + Open-Meteo (2021-2023 averages)";
    metricsFile.lastUpdated = new Date().toISOString().split("T")[0];

    saveMetrics(dataDir, metricsFile);

    return {
      success: acisSuccessCount > 0,
      message: `Climate data pulled: ${acisSuccessCount} ACIS, ${openMeteoSuccessCount} Open-Meteo, ${skipCount} skipped`,
      stats: {
        acisUpdated: acisSuccessCount,
        openMeteoUpdated: openMeteoSuccessCount,
        citiesSkipped: skipCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error) {
    logger.error("Climate pull failed", { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
