/**
 * Convert Excel data to JSON format
 * 
 * Reads from Cities.xlsx and outputs:
 * - data/cities.json - City definitions and static info
 * - data/metrics.json - Current metrics (API-updateable)
 * - data/zhvi-history.json - Price time series
 */

import * as XLSX from "xlsx";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";

// City name to slug mapping
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// City name mapping between Gemini_raw and ZHVI sheet
const CITY_NAME_TO_ZHVI: Record<string, string> = {
  "San Francisco": "San Francisco, CA",
  "Seattle": "Seattle, WA",
  "New York City": "New York City, NY",
  "Los Angeles": "Los Angeles, CA",
  "Sacramento": "Sacramento, CA",
  "Boston": "Boston, MA",
  "Portland": "Portland, OR",
  "Las Vegas": "Las Vegas, NV",
  "Chicago": "Chicago, IL",
  "Washington D.C.": "Washington, DC",
  "Houston": "Houston, TX",
  "Atlanta": "Atlanta, GA",
  "Minneapolis": "Minneapolis, MN",
  "Philadelphia": "Philadelphia, PA",
  "Dallas": "Dallas, TX",
  "Tampa Bay": "Tampa, FL",
  "Denver": "Denver, CO",
  "Charlotte": "Charlotte, NC",
  "Oklahoma City": "Oklahoma City, OK",
  "Phoenix": "Phoenix, AZ",
  "Baltimore": "Baltimore, MD",
  "Orlando": "Orlando, FL",
  "Indianapolis": "Indianapolis, IN",
  "Nashville": "Nashville, TN",
  "Milwaukee": "Milwaukee, WI",
  "Salt Lake City": "Salt Lake City, UT",
  "Detroit": "Detroit, MI",
  "St. Louis": "St. Louis, MO",
  "San Antonio": "San Antonio, TX",
  "Jacksonville": "Jacksonville, FL",
  "New Orleans": "New Orleans, LA",
  "Kansas City": "Kansas City, MO",
  "Cincinnati": "Cincinnati, OH",
  "Cleveland": "Cleveland, OH",
  "Buffalo": "Buffalo, NY",
  "Pittsburgh": "Pittsburgh, PA",
  "Miami": "Miami, FL",
  "Green Bay": "Green Bay, WI",
  "Memphis": "Memphis, TN",
  "San Diego": "San Diego, CA",
  "Santa Barbara": "Santa Barbara, CA",
  "Raleigh": "Raleigh, NC",
  "Gainesville": "Gainesville, FL",
};

interface GeminiRow {
  __EMPTY: string;
  State: string;
  "NFL Team(s)": string;
  "NBA Team(s)": string;
  "Average Temp. (°F)": number;
  "Days of Sunshine (Avg. Annual)": number;
  "Avg. Winter Temp. (°F)": number;
  "Avg. Summer Temp. (°F)": number;
  "Days of Rain (Avg. Annual)": number;
  "Diversity Index (Out of 100)": number;
  "Total Population (Metro Area, 000s)": number;
  "East Asian Population (Approx. %)": number;
  "Cost of Living Index (US Avg=100)": number;
  "State Tax Rate (Max Income Tax)": number;
  "Property Tax Rate (Effective %)": number;
  "Median Single Family Home Price (Approx.)": number;
  "Purchasing Power (Relative to NYC)": string;
  "Crime Rate (Violent/100K)": number;
  "Quality of Life Score (Approx. 1-100)": number;
  "Walkability (Walk Score)": number;
  "Public Transit Quality (Transit Score)": number;
  "Avg. Broadband Speed (Mbps)": number;
  "International Airport": string;
  "Health Score (ACSM Rank)": number;
  "Pollution Index (Numbeo)": number;
  "Water Quality Index (Numbeo)": number;
  "Traffic Index (INRIX, Hr/Yr Lost)": number;
  "City Democrat % (Harris 2024)": number;
  "State Democrat % (Harris 2024)": number;
}

interface ZHVIRow {
  RegionID: number;
  SizeRank: number;
  RegionName: string;
  RegionType: string;
  [date: string]: string | number;
}

async function main() {
  const excelPath = join(__dirname, "../data/Cities.xlsx");
  
  if (!existsSync(excelPath)) {
    console.error("Excel file not found at:", excelPath);
    process.exit(1);
  }

  console.log("Reading Excel file...");
  const workbook = XLSX.readFile(excelPath);

  // Parse Gemini_raw sheet
  const geminiData = XLSX.utils.sheet_to_json<GeminiRow>(
    workbook.Sheets["Gemini_raw"]
  );
  console.log(`Found ${geminiData.length} cities in Gemini_raw`);

  // Parse ZHVI sheet
  const zhviData = XLSX.utils.sheet_to_json<ZHVIRow>(
    workbook.Sheets["sfr_0.33_0.67_sm_sa"]
  );
  const zhviMetros = zhviData.filter((r) => r.RegionType === "msa");
  console.log(`Found ${zhviMetros.length} metros in ZHVI sheet`);

  // Build ZHVI lookup by region name
  const zhviByName = new Map<string, ZHVIRow>();
  zhviMetros.forEach((row) => {
    zhviByName.set(row.RegionName, row);
  });

  // Build cities.json
  const cities: any[] = [];
  const metrics: Record<string, any> = {};
  const zhviHistory: Record<string, any> = {};

  for (const row of geminiData) {
    const cityName = row.__EMPTY;
    if (!cityName) continue;

    const slug = toSlug(cityName);
    const zhviName = CITY_NAME_TO_ZHVI[cityName];
    const zhviRow = zhviName ? zhviByName.get(zhviName) : null;

    // Parse sports teams
    const parseTeams = (str: string | undefined): string[] => {
      if (!str || str === "-" || str === "None") return [];
      return str.split(/[,/]/).map((t) => t.trim()).filter(Boolean);
    };

    // Parse airport
    const airportStr = String(row["International Airport"] || "");
    const hasAirport = airportStr.toLowerCase().startsWith("yes");
    const airportMatch = airportStr.match(/\(([A-Z]{3})\)/);
    const airportCode = airportMatch ? airportMatch[1] : null;

    // City definition
    cities.push({
      id: slug,
      name: cityName,
      state: row.State,
      zillowRegionId: zhviRow?.RegionID || null,
      zillowRegionName: zhviName || null,
      sports: {
        nfl: parseTeams(row["NFL Team(s)"]),
        nba: parseTeams(row["NBA Team(s)"]),
      },
    });

    // Metrics
    metrics[slug] = {
      climate: {
        avgTemp: row["Average Temp. (°F)"] ?? null,
        avgWinterTemp: row["Avg. Winter Temp. (°F)"] ?? null,
        avgSummerTemp: row["Avg. Summer Temp. (°F)"] ?? null,
        daysOfSunshine: row["Days of Sunshine (Avg. Annual)"] ?? null,
        daysOfRain: row["Days of Rain (Avg. Annual)"] ?? null,
      },
      cost: {
        medianHomePrice: row["Median Single Family Home Price (Approx.)"] ?? null,
        costOfLivingIndex: row["Cost of Living Index (US Avg=100)"] ?? null,
        stateTaxRate: row["State Tax Rate (Max Income Tax)"] ?? null,
        propertyTaxRate: row["Property Tax Rate (Effective %)"] ?? null,
      },
      demographics: {
        population: row["Total Population (Metro Area, 000s)"] ?? null,
        diversityIndex: row["Diversity Index (Out of 100)"] ?? null,
        eastAsianPercent: row["East Asian Population (Approx. %)"] ?? null,
        crimeRate: row["Crime Rate (Violent/100K)"] ?? null,
      },
      quality: {
        qualityOfLifeScore: row["Quality of Life Score (Approx. 1-100)"] ?? null,
        walkScore: row["Walkability (Walk Score)"] ?? null,
        transitScore: row["Public Transit Quality (Transit Score)"] ?? null,
        hasInternationalAirport: hasAirport,
        airportCode: airportCode,
        healthScore: row["Health Score (ACSM Rank)"] ?? null,
        pollutionIndex: row["Pollution Index (Numbeo)"] ?? null,
        waterQualityIndex: row["Water Quality Index (Numbeo)"] ?? null,
        trafficIndex: row["Traffic Index (INRIX, Hr/Yr Lost)"] ?? null,
        broadbandSpeed: row["Avg. Broadband Speed (Mbps)"] ?? null,
      },
      political: {
        cityDemocratPercent: row["City Democrat % (Harris 2024)"] ?? null,
        stateDemocratPercent: row["State Democrat % (Harris 2024)"] ?? null,
      },
    };

    // ZHVI History
    if (zhviRow) {
      const history: { date: string; value: number }[] = [];
      
      // Extract date columns (format: YYYY-MM-DD)
      for (const [key, value] of Object.entries(zhviRow)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === "number") {
          history.push({ date: key, value: Math.round(value) });
        }
      }
      
      // Sort by date
      history.sort((a, b) => a.date.localeCompare(b.date));

      zhviHistory[slug] = {
        zillowRegionId: zhviRow.RegionID,
        history,
      };
    }
  }

  // Write cities.json
  const citiesOutput = {
    version: "1.0",
    description: "City definitions and static information",
    cities,
  };
  writeFileSync(
    join(__dirname, "../data/cities.json"),
    JSON.stringify(citiesOutput, null, 2)
  );
  console.log(`Wrote data/cities.json (${cities.length} cities)`);

  // Write metrics.json
  const metricsOutput = {
    version: "1.0",
    description: "Current city metrics (updateable via APIs)",
    lastUpdated: new Date().toISOString().split("T")[0],
    sources: {
      climate: "NOAA / Weather data",
      cost: "BLS / Zillow",
      demographics: "US Census",
      quality: "WalkScore, Numbeo, ACSM, etc.",
      political: "2024 Election Results",
    },
    cities: metrics,
  };
  writeFileSync(
    join(__dirname, "../data/metrics.json"),
    JSON.stringify(metricsOutput, null, 2)
  );
  console.log(`Wrote data/metrics.json`);

  // Write zhvi-history.json
  const zhviOutput = {
    version: "1.0",
    description: "Zillow Home Value Index historical data",
    source: "Zillow ZHVI",
    metric: "sfr_0.33_0.67_sm_sa (Single Family Homes, 33rd-67th percentile, smoothed, seasonally adjusted)",
    lastUpdated: new Date().toISOString().split("T")[0],
    cities: zhviHistory,
  };
  writeFileSync(
    join(__dirname, "../data/zhvi-history.json"),
    JSON.stringify(zhviOutput, null, 2)
  );
  console.log(`Wrote data/zhvi-history.json (${Object.keys(zhviHistory).length} cities with history)`);

  console.log("\nConversion complete!");
}

main().catch(console.error);
