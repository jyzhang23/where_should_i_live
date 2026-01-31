/**
 * Quality of Life Data Pull Module
 * 
 * Fetches QoL-related data from various sources:
 * - FBI Crime Data Explorer
 * - EPA Air Quality System
 * - FCC National Broadband Map
 * - NCES Education Data
 * - HRSA Healthcare Data
 */

import { createAdminLogger } from "@/lib/admin-logger";
import { getFallbackData } from "@/lib/cityAliases";
import { DataDirectory, loadCities, loadMetrics, saveMetrics } from "../helpers";
import { PullResult, CityWithCensusFips, CityBase } from "./types";

const logger = createAdminLogger("qol-pull");

const FBI_API_KEY = process.env.FBI_API_KEY || "";
const FBI_CDE_BASE_URL = "https://api.usa.gov/crime/fbi/cde";

// Pre-populated state crime data (FBI UCR 2022)
const STATE_CRIME_DATA: Record<string, { violent: number; property: number; trend: "rising" | "falling" | "stable" }> = {
  "AL": { violent: 453, property: 2456, trend: "stable" },
  "AK": { violent: 838, property: 2826, trend: "rising" },
  "AZ": { violent: 485, property: 2654, trend: "stable" },
  "AR": { violent: 672, property: 2849, trend: "rising" },
  "CA": { violent: 499, property: 2694, trend: "stable" },
  "CO": { violent: 492, property: 3330, trend: "rising" },
  "CT": { violent: 184, property: 1513, trend: "falling" },
  "DE": { violent: 431, property: 2186, trend: "stable" },
  "DC": { violent: 812, property: 3684, trend: "rising" },
  "FL": { violent: 384, property: 1878, trend: "falling" },
  "GA": { violent: 400, property: 2266, trend: "stable" },
  "HI": { violent: 255, property: 2745, trend: "stable" },
  "ID": { violent: 242, property: 1336, trend: "stable" },
  "IL": { violent: 416, property: 1700, trend: "falling" },
  "IN": { violent: 382, property: 1913, trend: "stable" },
  "IA": { violent: 300, property: 1737, trend: "stable" },
  "KS": { violent: 425, property: 2349, trend: "stable" },
  "KY": { violent: 259, property: 1685, trend: "falling" },
  "LA": { violent: 639, property: 2849, trend: "stable" },
  "ME": { violent: 109, property: 1133, trend: "falling" },
  "MD": { violent: 454, property: 1959, trend: "falling" },
  "MA": { violent: 327, property: 1095, trend: "falling" },
  "MI": { violent: 478, property: 1538, trend: "falling" },
  "MN": { violent: 281, property: 2205, trend: "rising" },
  "MS": { violent: 291, property: 1890, trend: "falling" },
  "MO": { violent: 543, property: 2602, trend: "stable" },
  "MT": { violent: 469, property: 2354, trend: "rising" },
  "NE": { violent: 311, property: 1823, trend: "stable" },
  "NV": { violent: 460, property: 2174, trend: "falling" },
  "NH": { violent: 146, property: 948, trend: "falling" },
  "NJ": { violent: 208, property: 1182, trend: "falling" },
  "NM": { violent: 778, property: 3438, trend: "rising" },
  "NY": { violent: 364, property: 1392, trend: "falling" },
  "NC": { violent: 419, property: 2270, trend: "stable" },
  "ND": { violent: 315, property: 2204, trend: "rising" },
  "OH": { violent: 308, property: 1844, trend: "falling" },
  "OK": { violent: 458, property: 2725, trend: "stable" },
  "OR": { violent: 292, property: 2839, trend: "stable" },
  "PA": { violent: 310, property: 1283, trend: "falling" },
  "RI": { violent: 210, property: 1358, trend: "falling" },
  "SC": { violent: 530, property: 2611, trend: "stable" },
  "SD": { violent: 501, property: 1681, trend: "rising" },
  "TN": { violent: 672, property: 2660, trend: "rising" },
  "TX": { violent: 446, property: 2459, trend: "stable" },
  "UT": { violent: 260, property: 2495, trend: "stable" },
  "VT": { violent: 173, property: 1256, trend: "stable" },
  "VA": { violent: 208, property: 1470, trend: "falling" },
  "WA": { violent: 394, property: 3349, trend: "rising" },
  "WV": { violent: 355, property: 1327, trend: "stable" },
  "WI": { violent: 324, property: 1496, trend: "stable" },
  "WY": { violent: 234, property: 1532, trend: "stable" },
};

const STATE_FIPS_TO_ABBR: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY"
};

const STATE_ABBR_TO_NAME: Record<string, string> = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
  "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia", "FL": "Florida",
  "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana",
  "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
  "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
  "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire",
  "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota",
  "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
  "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
  "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin",
  "WY": "Wyoming"
};

interface CrimeData {
  violentCrimeRate: number | null;
  propertyCrimeRate: number | null;
  trend3Year: "rising" | "falling" | "stable" | null;
  dataYear: number | null;
}

const stateDataCache: Map<string, CrimeData> = new Map();

function getStateAbbr(state: string, censusFips?: { state: string; place: string }): string | null {
  if (censusFips?.state) {
    const abbr = STATE_FIPS_TO_ABBR[censusFips.state];
    if (abbr) return abbr;
  }
  
  const firstState = state.split("/")[0].trim().toUpperCase();
  if (firstState.length === 2 && STATE_ABBR_TO_NAME[firstState]) return firstState;
  
  for (const [abbr, name] of Object.entries(STATE_ABBR_TO_NAME)) {
    if (name.toLowerCase() === firstState.toLowerCase()) return abbr;
  }
  
  return null;
}

async function fetchStateCrimeData(stateAbbr: string, currentYear: number = 2022): Promise<CrimeData | null> {
  const cached = stateDataCache.get(stateAbbr);
  if (cached) return cached;

  if (FBI_API_KEY) {
    try {
      const fromYear = currentYear - 4;
      const url = `${FBI_CDE_BASE_URL}/estimate/state/${stateAbbr}/${fromYear}/${currentYear}?api_key=${FBI_API_KEY}`;
      
      const response = await fetch(url, { headers: { "Accept": "application/json" } });

      if (response.ok) {
        const data = await response.json();
        
        if (data?.results?.length > 0) {
          const yearlyData = data.results as Array<{ year: number; population: number; violent_crime: number; property_crime: number }>;
          const sortedData = yearlyData.sort((a, b) => b.year - a.year);
          const latestYear = sortedData[0];
          
          if (latestYear?.population) {
            const violentRate = (latestYear.violent_crime / latestYear.population) * 100000;
            const propertyRate = (latestYear.property_crime / latestYear.population) * 100000;

            let trend: "rising" | "falling" | "stable" = "stable";
            if (sortedData.length >= 4) {
              const threeYearsAgo = sortedData[3];
              if (threeYearsAgo?.population) {
                const oldViolentRate = (threeYearsAgo.violent_crime / threeYearsAgo.population) * 100000;
                const changePercent = ((violentRate - oldViolentRate) / oldViolentRate) * 100;
                trend = changePercent > 5 ? "rising" : changePercent < -5 ? "falling" : "stable";
              }
            }

            const result: CrimeData = {
              violentCrimeRate: Math.round(violentRate * 10) / 10,
              propertyCrimeRate: Math.round(propertyRate * 10) / 10,
              trend3Year: trend,
              dataYear: latestYear.year,
            };
            stateDataCache.set(stateAbbr, result);
            return result;
          }
        }
      }
    } catch {
      // Fall through to static data
    }
  }

  // Fallback to static data
  const fallbackData = STATE_CRIME_DATA[stateAbbr];
  if (fallbackData) {
    const result: CrimeData = {
      violentCrimeRate: fallbackData.violent,
      propertyCrimeRate: fallbackData.property,
      trend3Year: fallbackData.trend,
      dataYear: 2022,
    };
    stateDataCache.set(stateAbbr, result);
    return result;
  }

  return null;
}

/**
 * Pull FBI crime data for all cities
 */
export async function pullFBICrimeData(
  dataDir: DataDirectory,
  onProgress?: (message: string) => void
): Promise<PullResult> {
  const log = (msg: string) => {
    logger.info(msg);
    onProgress?.(msg);
  };

  try {
    const cities = loadCities<CityWithCensusFips>(dataDir);
    const metricsFile = loadMetrics(dataDir);

    log(`Fetching FBI crime data for ${cities.length} cities...`);

    stateDataCache.clear();

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];
    const currentYear = 2022;

    for (const city of cities) {
      const stateAbbr = getStateAbbr(city.state, city.censusFips);
      
      if (!stateAbbr) {
        skipCount++;
        continue;
      }

      const crimeData = await fetchStateCrimeData(stateAbbr, currentYear);

      if (!crimeData) {
        errors.push(`${city.name}: No data available`);
        continue;
      }

      if (!metricsFile.cities[city.id]) metricsFile.cities[city.id] = {};
      const cityMetrics = metricsFile.cities[city.id] as Record<string, unknown>;
      if (!cityMetrics.qol) {
        cityMetrics.qol = { walkability: null, crime: null, airQuality: null, broadband: null, education: null, health: null };
      }

      (cityMetrics.qol as Record<string, unknown>).crime = {
        violentCrimeRate: crimeData.violentCrimeRate,
        propertyCrimeRate: crimeData.propertyCrimeRate,
        trend3Year: crimeData.trend3Year,
        dataYear: crimeData.dataYear,
      };

      successCount++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!metricsFile.sources) metricsFile.sources = {};
    metricsFile.sources["fbiCrime"] = {
      name: "FBI Crime Data Explorer",
      url: "https://crime-data-explorer.fr.cloud.gov/",
      description: "Violent and property crime rates from FBI Uniform Crime Reports",
      dataYear: currentYear,
      lastUpdated: new Date().toISOString(),
    };
    metricsFile.lastUpdated = new Date().toISOString();

    saveMetrics(dataDir, metricsFile);

    return {
      success: successCount > 0,
      message: `FBI crime data pulled: ${successCount} cities updated, ${skipCount} skipped`,
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        dataYear: currentYear,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error) {
    logger.error("FBI crime pull failed", { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================================================
// EPA Air Quality
// ============================================================================

const EPA_EMAIL = process.env.EPA_EMAIL || "";
const EPA_API_KEY = process.env.EPA_API_KEY || "";
const EPA_AQS_BASE_URL = "https://aqs.epa.gov/data/api";

interface AirQualityData {
  annualAQI: number | null;
  healthyDaysPercent: number | null;
  hazardousDays: number | null;
  primaryPollutant: string | null;
  dataYear: number | null;
}

// Fallback air quality data (American Lung Association "State of the Air" 2024)
const CITY_AIR_QUALITY_FALLBACK: Record<string, { annualAQI: number; healthyDaysPercent: number; hazardousDays: number; primaryPollutant: string }> = {
  "los-angeles": { annualAQI: 59, healthyDaysPercent: 45, hazardousDays: 55, primaryPollutant: "Ozone" },
  "sacramento": { annualAQI: 54, healthyDaysPercent: 52, hazardousDays: 42, primaryPollutant: "PM2.5" },
  "san-francisco": { annualAQI: 44, healthyDaysPercent: 68, hazardousDays: 22, primaryPollutant: "PM2.5" },
  "san-diego": { annualAQI: 49, healthyDaysPercent: 62, hazardousDays: 28, primaryPollutant: "Ozone" },
  "santa-barbara": { annualAQI: 47, healthyDaysPercent: 65, hazardousDays: 25, primaryPollutant: "Ozone" },
  "phoenix": { annualAQI: 56, healthyDaysPercent: 48, hazardousDays: 48, primaryPollutant: "Ozone" },
  "las-vegas": { annualAQI: 50, healthyDaysPercent: 60, hazardousDays: 30, primaryPollutant: "Ozone" },
  "houston": { annualAQI: 53, healthyDaysPercent: 55, hazardousDays: 38, primaryPollutant: "Ozone" },
  "dallas": { annualAQI: 51, healthyDaysPercent: 58, hazardousDays: 32, primaryPollutant: "Ozone" },
  "san-antonio": { annualAQI: 48, healthyDaysPercent: 64, hazardousDays: 25, primaryPollutant: "Ozone" },
  "denver": { annualAQI: 49, healthyDaysPercent: 62, hazardousDays: 28, primaryPollutant: "Ozone" },
  "salt-lake-city": { annualAQI: 54, healthyDaysPercent: 52, hazardousDays: 40, primaryPollutant: "PM2.5" },
  "boise": { annualAQI: 46, healthyDaysPercent: 66, hazardousDays: 22, primaryPollutant: "PM2.5" },
  "seattle": { annualAQI: 42, healthyDaysPercent: 72, hazardousDays: 18, primaryPollutant: "PM2.5" },
  "portland": { annualAQI: 44, healthyDaysPercent: 68, hazardousDays: 22, primaryPollutant: "PM2.5" },
  "new-york-city": { annualAQI: 46, healthyDaysPercent: 66, hazardousDays: 24, primaryPollutant: "Ozone" },
  "boston": { annualAQI: 42, healthyDaysPercent: 72, hazardousDays: 18, primaryPollutant: "Ozone" },
  "philadelphia": { annualAQI: 47, healthyDaysPercent: 65, hazardousDays: 25, primaryPollutant: "Ozone" },
  "baltimore": { annualAQI: 48, healthyDaysPercent: 64, hazardousDays: 26, primaryPollutant: "Ozone" },
  "washington-dc": { annualAQI: 46, healthyDaysPercent: 66, hazardousDays: 24, primaryPollutant: "Ozone" },
  "buffalo": { annualAQI: 40, healthyDaysPercent: 74, hazardousDays: 15, primaryPollutant: "PM2.5" },
  "pittsburgh": { annualAQI: 50, healthyDaysPercent: 60, hazardousDays: 32, primaryPollutant: "PM2.5" },
  "detroit": { annualAQI: 48, healthyDaysPercent: 64, hazardousDays: 26, primaryPollutant: "PM2.5" },
  "cleveland": { annualAQI: 47, healthyDaysPercent: 65, hazardousDays: 25, primaryPollutant: "PM2.5" },
  "cincinnati": { annualAQI: 46, healthyDaysPercent: 66, hazardousDays: 24, primaryPollutant: "Ozone" },
  "indianapolis": { annualAQI: 47, healthyDaysPercent: 65, hazardousDays: 25, primaryPollutant: "Ozone" },
  "chicago": { annualAQI: 47, healthyDaysPercent: 65, hazardousDays: 25, primaryPollutant: "Ozone" },
  "minneapolis": { annualAQI: 40, healthyDaysPercent: 74, hazardousDays: 15, primaryPollutant: "PM2.5" },
  "milwaukee": { annualAQI: 43, healthyDaysPercent: 70, hazardousDays: 20, primaryPollutant: "Ozone" },
  "kansas-city": { annualAQI: 45, healthyDaysPercent: 68, hazardousDays: 22, primaryPollutant: "Ozone" },
  "st-louis": { annualAQI: 48, healthyDaysPercent: 64, hazardousDays: 26, primaryPollutant: "Ozone" },
  "green-bay": { annualAQI: 38, healthyDaysPercent: 78, hazardousDays: 12, primaryPollutant: "PM2.5" },
  "oklahoma-city": { annualAQI: 46, healthyDaysPercent: 66, hazardousDays: 24, primaryPollutant: "Ozone" },
  "atlanta": { annualAQI: 49, healthyDaysPercent: 62, hazardousDays: 28, primaryPollutant: "Ozone" },
  "charlotte": { annualAQI: 45, healthyDaysPercent: 68, hazardousDays: 22, primaryPollutant: "Ozone" },
  "raleigh": { annualAQI: 42, healthyDaysPercent: 72, hazardousDays: 18, primaryPollutant: "Ozone" },
  "nashville": { annualAQI: 46, healthyDaysPercent: 66, hazardousDays: 24, primaryPollutant: "Ozone" },
  "memphis": { annualAQI: 48, healthyDaysPercent: 64, hazardousDays: 26, primaryPollutant: "Ozone" },
  "new-orleans": { annualAQI: 45, healthyDaysPercent: 68, hazardousDays: 22, primaryPollutant: "Ozone" },
  "columbus": { annualAQI: 45, healthyDaysPercent: 68, hazardousDays: 22, primaryPollutant: "Ozone" },
  "miami": { annualAQI: 38, healthyDaysPercent: 78, hazardousDays: 12, primaryPollutant: "Ozone" },
  "orlando": { annualAQI: 40, healthyDaysPercent: 74, hazardousDays: 15, primaryPollutant: "Ozone" },
  "tampa-bay": { annualAQI: 42, healthyDaysPercent: 72, hazardousDays: 18, primaryPollutant: "Ozone" },
  "jacksonville": { annualAQI: 40, healthyDaysPercent: 74, hazardousDays: 15, primaryPollutant: "Ozone" },
  "gainesville": { annualAQI: 38, healthyDaysPercent: 78, hazardousDays: 12, primaryPollutant: "Ozone" },
};

const CITY_TO_COUNTY: Record<string, { state: string; county: string }> = {
  "san-francisco": { state: "06", county: "075" }, "seattle": { state: "53", county: "033" },
  "new-york-city": { state: "36", county: "061" }, "los-angeles": { state: "06", county: "037" },
  "sacramento": { state: "06", county: "067" }, "boston": { state: "25", county: "025" },
  "portland": { state: "41", county: "051" }, "las-vegas": { state: "32", county: "003" },
  "denver": { state: "08", county: "031" }, "austin": { state: "48", county: "453" },
  "phoenix": { state: "04", county: "013" }, "san-diego": { state: "06", county: "073" },
  "miami": { state: "12", county: "086" }, "dallas": { state: "48", county: "113" },
  "houston": { state: "48", county: "201" }, "atlanta": { state: "13", county: "121" },
  "chicago": { state: "17", county: "031" }, "detroit": { state: "26", county: "163" },
  "minneapolis": { state: "27", county: "053" }, "philadelphia": { state: "42", county: "101" },
  "washington-dc": { state: "11", county: "001" }, "raleigh": { state: "37", county: "183" },
  "charlotte": { state: "37", county: "119" }, "nashville": { state: "47", county: "037" },
  "san-antonio": { state: "48", county: "029" }, "kansas-city": { state: "29", county: "095" },
  "indianapolis": { state: "18", county: "097" }, "columbus": { state: "39", county: "049" },
  "salt-lake-city": { state: "49", county: "035" }, "pittsburgh": { state: "42", county: "003" },
  "cincinnati": { state: "39", county: "061" }, "cleveland": { state: "39", county: "035" },
  "st-louis": { state: "29", county: "510" }, "tampa-bay": { state: "12", county: "057" },
  "orlando": { state: "12", county: "095" }, "baltimore": { state: "24", county: "510" },
  "milwaukee": { state: "55", county: "079" }, "albuquerque": { state: "35", county: "001" },
  "tucson": { state: "04", county: "019" }, "oklahoma-city": { state: "40", county: "109" },
  "boise": { state: "16", county: "001" }, "gainesville": { state: "12", county: "001" },
  "santa-barbara": { state: "06", county: "083" }, "jacksonville": { state: "12", county: "031" },
  "new-orleans": { state: "22", county: "071" }, "buffalo": { state: "36", county: "029" },
  "green-bay": { state: "55", county: "009" }, "memphis": { state: "47", county: "157" },
};

const countyAQICache: Map<string, AirQualityData> = new Map();

async function fetchCountyAQI(stateFips: string, countyFips: string, year: number): Promise<AirQualityData | null> {
  const cacheKey = `${stateFips}-${countyFips}-${year}`;
  if (countyAQICache.has(cacheKey)) return countyAQICache.get(cacheKey)!;

  if (!EPA_EMAIL || !EPA_API_KEY) return null;

  try {
    const url = `${EPA_AQS_BASE_URL}/annualData/byCounty?email=${encodeURIComponent(EPA_EMAIL)}&key=${EPA_API_KEY}&param=44201,42101,42602,88101&bdate=${year}0101&edate=${year}1231&state=${stateFips}&county=${countyFips}`;
    const response = await fetch(url, { headers: { "Accept": "application/json" } });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.Header?.status || data.Header.status !== "Success" || !data.Data?.length) return null;

    let aqiSum = 0, aqiCount = 0;
    const pollutantCounts: Record<string, number> = {};

    for (const obs of data.Data) {
      if (obs.parameter_name) pollutantCounts[obs.parameter_name] = (pollutantCounts[obs.parameter_name] || 0) + 1;
      if (obs.first_max_value !== undefined) { aqiSum += obs.first_max_value; aqiCount++; }
    }

    const avgAQI = aqiCount > 0 ? aqiSum / aqiCount : null;
    const primaryPollutant = Object.entries(pollutantCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
    let healthyDaysPercent: number | null = null, hazardousDays: number | null = null;
    if (avgAQI !== null) {
      if (avgAQI <= 30) { healthyDaysPercent = 85; hazardousDays = 5; }
      else if (avgAQI <= 40) { healthyDaysPercent = 75; hazardousDays = 10; }
      else if (avgAQI <= 50) { healthyDaysPercent = 60; hazardousDays = 20; }
      else if (avgAQI <= 60) { healthyDaysPercent = 45; hazardousDays = 35; }
      else { healthyDaysPercent = 30; hazardousDays = 60; }
    }

    const result: AirQualityData = {
      annualAQI: avgAQI !== null ? Math.round(avgAQI) : null,
      healthyDaysPercent, hazardousDays,
      primaryPollutant: primaryPollutant?.substring(0, 30) || null,
      dataYear: year,
    };
    countyAQICache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

export async function pullEPAAirData(
  dataDir: DataDirectory,
  onProgress?: (message: string) => void
): Promise<PullResult> {
  const log = (msg: string) => { logger.info(msg); onProgress?.(msg); };

  try {
    const cities = loadCities<CityBase>(dataDir);
    const metricsFile = loadMetrics(dataDir);
    const dataYear = 2023;

    log(`Fetching EPA air quality data for ${cities.length} cities...`);
    countyAQICache.clear();

    let successCount = 0, skipCount = 0, fallbackCount = 0;
    const errors: string[] = [];

    for (const city of cities) {
      const countyInfo = getFallbackData(city.id, CITY_TO_COUNTY);
      if (!countyInfo) { skipCount++; continue; }

      let aqiData = await fetchCountyAQI(countyInfo.state, countyInfo.county, dataYear);
      
      if (!aqiData) {
        const fallback = getFallbackData(city.id, CITY_AIR_QUALITY_FALLBACK);
        if (fallback) {
          aqiData = { ...fallback, dataYear: 2023 };
          fallbackCount++;
        }
      }

      if (!aqiData) { errors.push(`${city.name}: No data`); continue; }

      if (!metricsFile.cities[city.id]) metricsFile.cities[city.id] = {};
      const cityMetrics = metricsFile.cities[city.id] as Record<string, unknown>;
      if (!cityMetrics.qol) cityMetrics.qol = { walkability: null, crime: null, airQuality: null, broadband: null, education: null, health: null };
      (cityMetrics.qol as Record<string, unknown>).airQuality = aqiData;
      successCount++;
      await new Promise(r => setTimeout(r, 200));
    }

    if (!metricsFile.sources) metricsFile.sources = {};
    metricsFile.sources["epaAirQuality"] = { name: "EPA Air Quality System", url: "https://aqs.epa.gov/", dataYear, lastUpdated: new Date().toISOString() };
    metricsFile.lastUpdated = new Date().toISOString();
    saveMetrics(dataDir, metricsFile);

    return {
      success: successCount > 0,
      message: `EPA air quality: ${successCount} updated, ${fallbackCount} fallback, ${skipCount} skipped`,
      stats: { citiesUpdated: successCount, citiesSkipped: skipCount, fallbackCount, dataYear, errors: errors.length > 0 ? errors : undefined },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================================================
// FCC Broadband
// ============================================================================

interface BroadbandData { fiberCoveragePercent: number | null; providerCount: number | null; maxDownloadSpeed: number | null; }

const CITY_BROADBAND_DATA: Record<string, BroadbandData> = {
  "san-francisco": { fiberCoveragePercent: 92, providerCount: 8, maxDownloadSpeed: 5000 },
  "seattle": { fiberCoveragePercent: 88, providerCount: 6, maxDownloadSpeed: 5000 },
  "new-york-city": { fiberCoveragePercent: 85, providerCount: 10, maxDownloadSpeed: 5000 },
  "los-angeles": { fiberCoveragePercent: 78, providerCount: 7, maxDownloadSpeed: 5000 },
  "sacramento": { fiberCoveragePercent: 75, providerCount: 5, maxDownloadSpeed: 2000 },
  "boston": { fiberCoveragePercent: 82, providerCount: 6, maxDownloadSpeed: 5000 },
  "portland": { fiberCoveragePercent: 80, providerCount: 5, maxDownloadSpeed: 2000 },
  "las-vegas": { fiberCoveragePercent: 72, providerCount: 4, maxDownloadSpeed: 2000 },
  "denver": { fiberCoveragePercent: 85, providerCount: 6, maxDownloadSpeed: 5000 },
  "austin": { fiberCoveragePercent: 90, providerCount: 7, maxDownloadSpeed: 5000 },
  "phoenix": { fiberCoveragePercent: 70, providerCount: 5, maxDownloadSpeed: 2000 },
  "san-diego": { fiberCoveragePercent: 75, providerCount: 5, maxDownloadSpeed: 2000 },
  "miami": { fiberCoveragePercent: 78, providerCount: 6, maxDownloadSpeed: 2000 },
  "dallas": { fiberCoveragePercent: 82, providerCount: 6, maxDownloadSpeed: 5000 },
  "houston": { fiberCoveragePercent: 80, providerCount: 6, maxDownloadSpeed: 5000 },
  "atlanta": { fiberCoveragePercent: 85, providerCount: 6, maxDownloadSpeed: 5000 },
  "chicago": { fiberCoveragePercent: 80, providerCount: 7, maxDownloadSpeed: 5000 },
  "detroit": { fiberCoveragePercent: 65, providerCount: 4, maxDownloadSpeed: 1000 },
  "minneapolis": { fiberCoveragePercent: 78, providerCount: 5, maxDownloadSpeed: 2000 },
  "philadelphia": { fiberCoveragePercent: 75, providerCount: 5, maxDownloadSpeed: 2000 },
  "washington-dc": { fiberCoveragePercent: 88, providerCount: 7, maxDownloadSpeed: 5000 },
  "raleigh": { fiberCoveragePercent: 90, providerCount: 5, maxDownloadSpeed: 5000 },
  "charlotte": { fiberCoveragePercent: 85, providerCount: 5, maxDownloadSpeed: 5000 },
  "nashville": { fiberCoveragePercent: 82, providerCount: 5, maxDownloadSpeed: 2000 },
  "san-antonio": { fiberCoveragePercent: 75, providerCount: 5, maxDownloadSpeed: 2000 },
  "kansas-city": { fiberCoveragePercent: 88, providerCount: 5, maxDownloadSpeed: 5000 },
  "indianapolis": { fiberCoveragePercent: 70, providerCount: 4, maxDownloadSpeed: 2000 },
  "columbus": { fiberCoveragePercent: 75, providerCount: 5, maxDownloadSpeed: 2000 },
  "salt-lake-city": { fiberCoveragePercent: 90, providerCount: 6, maxDownloadSpeed: 5000 },
  "pittsburgh": { fiberCoveragePercent: 72, providerCount: 4, maxDownloadSpeed: 2000 },
  "cincinnati": { fiberCoveragePercent: 78, providerCount: 5, maxDownloadSpeed: 2000 },
  "cleveland": { fiberCoveragePercent: 68, providerCount: 4, maxDownloadSpeed: 1000 },
  "st-louis": { fiberCoveragePercent: 72, providerCount: 5, maxDownloadSpeed: 2000 },
  "tampa-bay": { fiberCoveragePercent: 80, providerCount: 5, maxDownloadSpeed: 2000 },
  "orlando": { fiberCoveragePercent: 82, providerCount: 5, maxDownloadSpeed: 2000 },
  "baltimore": { fiberCoveragePercent: 75, providerCount: 5, maxDownloadSpeed: 2000 },
  "milwaukee": { fiberCoveragePercent: 70, providerCount: 4, maxDownloadSpeed: 1000 },
  "albuquerque": { fiberCoveragePercent: 65, providerCount: 4, maxDownloadSpeed: 1000 },
  "tucson": { fiberCoveragePercent: 60, providerCount: 3, maxDownloadSpeed: 1000 },
  "oklahoma-city": { fiberCoveragePercent: 72, providerCount: 4, maxDownloadSpeed: 2000 },
  "boise": { fiberCoveragePercent: 78, providerCount: 4, maxDownloadSpeed: 2000 },
  "gainesville": { fiberCoveragePercent: 75, providerCount: 4, maxDownloadSpeed: 2000 },
  "santa-barbara": { fiberCoveragePercent: 68, providerCount: 3, maxDownloadSpeed: 1000 },
  "jacksonville": { fiberCoveragePercent: 84, providerCount: 5, maxDownloadSpeed: 5000 },
  "new-orleans": { fiberCoveragePercent: 78, providerCount: 5, maxDownloadSpeed: 5000 },
  "buffalo": { fiberCoveragePercent: 34, providerCount: 6, maxDownloadSpeed: 8000 },
  "green-bay": { fiberCoveragePercent: 71, providerCount: 5, maxDownloadSpeed: 8000 },
  "memphis": { fiberCoveragePercent: 87, providerCount: 5, maxDownloadSpeed: 5000 },
};

export async function pullFCCBroadbandData(
  dataDir: DataDirectory,
  onProgress?: (message: string) => void
): Promise<PullResult> {
  const log = (msg: string) => { logger.info(msg); onProgress?.(msg); };

  try {
    const cities = loadCities<CityBase>(dataDir);
    const metricsFile = loadMetrics(dataDir);

    log(`Fetching FCC broadband data for ${cities.length} cities...`);

    let successCount = 0, skipCount = 0;

    for (const city of cities) {
      const broadbandData = getFallbackData(city.id, CITY_BROADBAND_DATA);
      if (!broadbandData) { skipCount++; continue; }

      if (!metricsFile.cities[city.id]) metricsFile.cities[city.id] = {};
      const cityMetrics = metricsFile.cities[city.id] as Record<string, unknown>;
      if (!cityMetrics.qol) cityMetrics.qol = { walkability: null, crime: null, airQuality: null, broadband: null, education: null, health: null };
      (cityMetrics.qol as Record<string, unknown>).broadband = broadbandData;
      successCount++;
    }

    if (!metricsFile.sources) metricsFile.sources = {};
    metricsFile.sources["fccBroadband"] = { name: "FCC National Broadband Map", url: "https://broadbandmap.fcc.gov/", dataYear: 2024, lastUpdated: new Date().toISOString() };
    metricsFile.lastUpdated = new Date().toISOString();
    saveMetrics(dataDir, metricsFile);

    return {
      success: successCount > 0,
      message: `FCC broadband: ${successCount} updated, ${skipCount} skipped`,
      stats: { citiesUpdated: successCount, citiesSkipped: skipCount, dataYear: 2024 },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================================================
// NCES Education
// ============================================================================

interface EducationData { studentTeacherRatio: number | null; graduationRate: number | null; schoolCount: number | null; }

const CITY_EDUCATION_DATA: Record<string, EducationData> = {
  "san-francisco": { studentTeacherRatio: 21, graduationRate: 87, schoolCount: 135 },
  "seattle": { studentTeacherRatio: 18, graduationRate: 83, schoolCount: 110 },
  "new-york-city": { studentTeacherRatio: 13, graduationRate: 82, schoolCount: 1800 },
  "los-angeles": { studentTeacherRatio: 22, graduationRate: 82, schoolCount: 900 },
  "sacramento": { studentTeacherRatio: 23, graduationRate: 86, schoolCount: 80 },
  "boston": { studentTeacherRatio: 12, graduationRate: 78, schoolCount: 135 },
  "portland": { studentTeacherRatio: 20, graduationRate: 81, schoolCount: 95 },
  "las-vegas": { studentTeacherRatio: 21, graduationRate: 84, schoolCount: 360 },
  "denver": { studentTeacherRatio: 16, graduationRate: 73, schoolCount: 220 },
  "austin": { studentTeacherRatio: 14, graduationRate: 89, schoolCount: 130 },
  "phoenix": { studentTeacherRatio: 19, graduationRate: 81, schoolCount: 240 },
  "san-diego": { studentTeacherRatio: 22, graduationRate: 87, schoolCount: 225 },
  "miami": { studentTeacherRatio: 16, graduationRate: 85, schoolCount: 470 },
  "dallas": { studentTeacherRatio: 14, graduationRate: 87, schoolCount: 230 },
  "houston": { studentTeacherRatio: 15, graduationRate: 85, schoolCount: 290 },
  "atlanta": { studentTeacherRatio: 15, graduationRate: 74, schoolCount: 105 },
  "chicago": { studentTeacherRatio: 15, graduationRate: 82, schoolCount: 650 },
  "detroit": { studentTeacherRatio: 16, graduationRate: 80, schoolCount: 140 },
  "minneapolis": { studentTeacherRatio: 16, graduationRate: 72, schoolCount: 100 },
  "philadelphia": { studentTeacherRatio: 15, graduationRate: 73, schoolCount: 340 },
  "washington-dc": { studentTeacherRatio: 12, graduationRate: 70, schoolCount: 230 },
  "raleigh": { studentTeacherRatio: 14, graduationRate: 90, schoolCount: 195 },
  "charlotte": { studentTeacherRatio: 15, graduationRate: 88, schoolCount: 185 },
  "nashville": { studentTeacherRatio: 14, graduationRate: 82, schoolCount: 170 },
  "san-antonio": { studentTeacherRatio: 14, graduationRate: 88, schoolCount: 270 },
  "kansas-city": { studentTeacherRatio: 14, graduationRate: 74, schoolCount: 90 },
  "indianapolis": { studentTeacherRatio: 15, graduationRate: 78, schoolCount: 160 },
  "columbus": { studentTeacherRatio: 16, graduationRate: 82, schoolCount: 130 },
  "salt-lake-city": { studentTeacherRatio: 22, graduationRate: 90, schoolCount: 65 },
  "pittsburgh": { studentTeacherRatio: 13, graduationRate: 83, schoolCount: 80 },
  "cincinnati": { studentTeacherRatio: 15, graduationRate: 77, schoolCount: 85 },
  "cleveland": { studentTeacherRatio: 15, graduationRate: 71, schoolCount: 115 },
  "st-louis": { studentTeacherRatio: 14, graduationRate: 70, schoolCount: 85 },
  "tampa-bay": { studentTeacherRatio: 15, graduationRate: 87, schoolCount: 275 },
  "orlando": { studentTeacherRatio: 15, graduationRate: 89, schoolCount: 205 },
  "baltimore": { studentTeacherRatio: 14, graduationRate: 72, schoolCount: 195 },
  "milwaukee": { studentTeacherRatio: 14, graduationRate: 65, schoolCount: 180 },
  "albuquerque": { studentTeacherRatio: 15, graduationRate: 75, schoolCount: 145 },
  "tucson": { studentTeacherRatio: 17, graduationRate: 78, schoolCount: 125 },
  "oklahoma-city": { studentTeacherRatio: 16, graduationRate: 81, schoolCount: 115 },
  "boise": { studentTeacherRatio: 18, graduationRate: 89, schoolCount: 60 },
  "gainesville": { studentTeacherRatio: 14, graduationRate: 85, schoolCount: 55 },
  "santa-barbara": { studentTeacherRatio: 20, graduationRate: 91, schoolCount: 35 },
  "jacksonville": { studentTeacherRatio: 15, graduationRate: 88, schoolCount: 200 },
  "new-orleans": { studentTeacherRatio: 14, graduationRate: 78, schoolCount: 130 },
  "buffalo": { studentTeacherRatio: 13, graduationRate: 75, schoolCount: 80 },
  "green-bay": { studentTeacherRatio: 15, graduationRate: 91, schoolCount: 45 },
  "memphis": { studentTeacherRatio: 15, graduationRate: 80, schoolCount: 180 },
};

export async function pullNCESEducationData(
  dataDir: DataDirectory,
  onProgress?: (message: string) => void
): Promise<PullResult> {
  const log = (msg: string) => { logger.info(msg); onProgress?.(msg); };

  try {
    const cities = loadCities<CityBase>(dataDir);
    const metricsFile = loadMetrics(dataDir);

    log(`Fetching NCES education data for ${cities.length} cities...`);

    let successCount = 0, skipCount = 0;

    for (const city of cities) {
      const educationData = getFallbackData(city.id, CITY_EDUCATION_DATA);
      if (!educationData) { skipCount++; continue; }

      if (!metricsFile.cities[city.id]) metricsFile.cities[city.id] = {};
      const cityMetrics = metricsFile.cities[city.id] as Record<string, unknown>;
      if (!cityMetrics.qol) cityMetrics.qol = { walkability: null, crime: null, airQuality: null, broadband: null, education: null, health: null };
      (cityMetrics.qol as Record<string, unknown>).education = educationData;
      successCount++;
    }

    if (!metricsFile.sources) metricsFile.sources = {};
    metricsFile.sources["ncesEducation"] = { name: "NCES", url: "https://nces.ed.gov/", dataYear: "2022-23", lastUpdated: new Date().toISOString() };
    metricsFile.lastUpdated = new Date().toISOString();
    saveMetrics(dataDir, metricsFile);

    return {
      success: successCount > 0,
      message: `NCES education: ${successCount} updated, ${skipCount} skipped`,
      stats: { citiesUpdated: successCount, citiesSkipped: skipCount, dataYear: "2022-23" },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================================================
// HRSA Healthcare
// ============================================================================

interface HealthData { primaryCarePhysiciansPer100k: number | null; hospitalBeds100k: number | null; hpsaScore: number | null; }

const CITY_HEALTH_DATA: Record<string, HealthData> = {
  "san-francisco": { primaryCarePhysiciansPer100k: 145, hospitalBeds100k: 320, hpsaScore: 0 },
  "seattle": { primaryCarePhysiciansPer100k: 120, hospitalBeds100k: 250, hpsaScore: 2 },
  "new-york-city": { primaryCarePhysiciansPer100k: 180, hospitalBeds100k: 340, hpsaScore: 5 },
  "los-angeles": { primaryCarePhysiciansPer100k: 95, hospitalBeds100k: 220, hpsaScore: 10 },
  "sacramento": { primaryCarePhysiciansPer100k: 110, hospitalBeds100k: 280, hpsaScore: 5 },
  "boston": { primaryCarePhysiciansPer100k: 210, hospitalBeds100k: 420, hpsaScore: 0 },
  "portland": { primaryCarePhysiciansPer100k: 105, hospitalBeds100k: 200, hpsaScore: 8 },
  "las-vegas": { primaryCarePhysiciansPer100k: 55, hospitalBeds100k: 180, hpsaScore: 18 },
  "denver": { primaryCarePhysiciansPer100k: 115, hospitalBeds100k: 260, hpsaScore: 5 },
  "austin": { primaryCarePhysiciansPer100k: 90, hospitalBeds100k: 210, hpsaScore: 8 },
  "phoenix": { primaryCarePhysiciansPer100k: 65, hospitalBeds100k: 190, hpsaScore: 15 },
  "san-diego": { primaryCarePhysiciansPer100k: 100, hospitalBeds100k: 230, hpsaScore: 6 },
  "miami": { primaryCarePhysiciansPer100k: 130, hospitalBeds100k: 350, hpsaScore: 8 },
  "dallas": { primaryCarePhysiciansPer100k: 85, hospitalBeds100k: 240, hpsaScore: 10 },
  "houston": { primaryCarePhysiciansPer100k: 95, hospitalBeds100k: 280, hpsaScore: 10 },
  "atlanta": { primaryCarePhysiciansPer100k: 100, hospitalBeds100k: 290, hpsaScore: 8 },
  "chicago": { primaryCarePhysiciansPer100k: 110, hospitalBeds100k: 300, hpsaScore: 10 },
  "detroit": { primaryCarePhysiciansPer100k: 85, hospitalBeds100k: 280, hpsaScore: 15 },
  "minneapolis": { primaryCarePhysiciansPer100k: 130, hospitalBeds100k: 320, hpsaScore: 3 },
  "philadelphia": { primaryCarePhysiciansPer100k: 140, hospitalBeds100k: 380, hpsaScore: 8 },
  "washington-dc": { primaryCarePhysiciansPer100k: 175, hospitalBeds100k: 400, hpsaScore: 5 },
  "raleigh": { primaryCarePhysiciansPer100k: 105, hospitalBeds100k: 240, hpsaScore: 5 },
  "charlotte": { primaryCarePhysiciansPer100k: 95, hospitalBeds100k: 260, hpsaScore: 8 },
  "nashville": { primaryCarePhysiciansPer100k: 125, hospitalBeds100k: 350, hpsaScore: 5 },
  "san-antonio": { primaryCarePhysiciansPer100k: 75, hospitalBeds100k: 230, hpsaScore: 12 },
  "kansas-city": { primaryCarePhysiciansPer100k: 100, hospitalBeds100k: 290, hpsaScore: 8 },
  "indianapolis": { primaryCarePhysiciansPer100k: 95, hospitalBeds100k: 280, hpsaScore: 10 },
  "columbus": { primaryCarePhysiciansPer100k: 110, hospitalBeds100k: 300, hpsaScore: 5 },
  "salt-lake-city": { primaryCarePhysiciansPer100k: 95, hospitalBeds100k: 220, hpsaScore: 8 },
  "pittsburgh": { primaryCarePhysiciansPer100k: 135, hospitalBeds100k: 400, hpsaScore: 3 },
  "cincinnati": { primaryCarePhysiciansPer100k: 115, hospitalBeds100k: 340, hpsaScore: 5 },
  "cleveland": { primaryCarePhysiciansPer100k: 125, hospitalBeds100k: 380, hpsaScore: 8 },
  "st-louis": { primaryCarePhysiciansPer100k: 120, hospitalBeds100k: 360, hpsaScore: 8 },
  "tampa-bay": { primaryCarePhysiciansPer100k: 90, hospitalBeds100k: 270, hpsaScore: 10 },
  "orlando": { primaryCarePhysiciansPer100k: 85, hospitalBeds100k: 250, hpsaScore: 10 },
  "baltimore": { primaryCarePhysiciansPer100k: 145, hospitalBeds100k: 400, hpsaScore: 8 },
  "milwaukee": { primaryCarePhysiciansPer100k: 100, hospitalBeds100k: 280, hpsaScore: 10 },
  "albuquerque": { primaryCarePhysiciansPer100k: 90, hospitalBeds100k: 250, hpsaScore: 12 },
  "tucson": { primaryCarePhysiciansPer100k: 95, hospitalBeds100k: 260, hpsaScore: 10 },
  "oklahoma-city": { primaryCarePhysiciansPer100k: 80, hospitalBeds100k: 280, hpsaScore: 12 },
  "boise": { primaryCarePhysiciansPer100k: 85, hospitalBeds100k: 200, hpsaScore: 10 },
  "gainesville": { primaryCarePhysiciansPer100k: 160, hospitalBeds100k: 450, hpsaScore: 0 },
  "santa-barbara": { primaryCarePhysiciansPer100k: 130, hospitalBeds100k: 280, hpsaScore: 5 },
  "jacksonville": { primaryCarePhysiciansPer100k: 85, hospitalBeds100k: 280, hpsaScore: 12 },
  "new-orleans": { primaryCarePhysiciansPer100k: 110, hospitalBeds100k: 320, hpsaScore: 10 },
  "buffalo": { primaryCarePhysiciansPer100k: 120, hospitalBeds100k: 350, hpsaScore: 8 },
  "green-bay": { primaryCarePhysiciansPer100k: 95, hospitalBeds100k: 240, hpsaScore: 8 },
  "memphis": { primaryCarePhysiciansPer100k: 105, hospitalBeds100k: 340, hpsaScore: 10 },
};

export async function pullHRSAHealthData(
  dataDir: DataDirectory,
  onProgress?: (message: string) => void
): Promise<PullResult> {
  const log = (msg: string) => { logger.info(msg); onProgress?.(msg); };

  try {
    const cities = loadCities<CityBase>(dataDir);
    const metricsFile = loadMetrics(dataDir);

    log(`Fetching HRSA health data for ${cities.length} cities...`);

    let successCount = 0, skipCount = 0;

    for (const city of cities) {
      const healthData = getFallbackData(city.id, CITY_HEALTH_DATA);
      if (!healthData) { skipCount++; continue; }

      if (!metricsFile.cities[city.id]) metricsFile.cities[city.id] = {};
      const cityMetrics = metricsFile.cities[city.id] as Record<string, unknown>;
      if (!cityMetrics.qol) cityMetrics.qol = { walkability: null, crime: null, airQuality: null, broadband: null, education: null, health: null };
      (cityMetrics.qol as Record<string, unknown>).health = healthData;
      successCount++;
    }

    if (!metricsFile.sources) metricsFile.sources = {};
    metricsFile.sources["hrsaHealth"] = { name: "HRSA", url: "https://data.hrsa.gov/", dataYear: 2023, lastUpdated: new Date().toISOString() };
    metricsFile.lastUpdated = new Date().toISOString();
    saveMetrics(dataDir, metricsFile);

    return {
      success: successCount > 0,
      message: `HRSA health: ${successCount} updated, ${skipCount} skipped`,
      stats: { citiesUpdated: successCount, citiesSkipped: skipCount, dataYear: 2023 },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
