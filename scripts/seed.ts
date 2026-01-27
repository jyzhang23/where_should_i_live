/**
 * Seed script to import city data from the Excel spreadsheet
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed.ts
 *
 * Or after adding to package.json scripts:
 *   npm run seed
 */

import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import "dotenv/config";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

// Path to the Excel file (relative to project root)
const EXCEL_PATH = path.join(__dirname, "../../Cities.xlsx");

interface GeminiRawRow {
  "Unnamed: 0": string; // City name
  State: string;
  "NFL Team(s)": string | null;
  "NBA Team(s)": string | null;
  "Average Temp. (°F)": number | null;
  "Days of Sunshine (Avg. Annual)": number | null;
  "Avg. Winter Temp. (°F)": number | null;
  "Avg. Summer Temp. (°F)": number | null;
  "Days of Rain (Avg. Annual)": number | null;
  "Diversity Index (Out of 100)": number | null;
  "Total Population (Metro Area, 000s)": number | null;
  "East Asian Population (Approx. %)": number | null;
  "Cost of Living Index (US Avg=100)": number | null;
  "State Tax Rate (Max Income Tax)": number | null;
  "Property Tax Rate (Effective %)": number | null;
  "Median Single Family Home Price (Approx.)": number | null;
  "Purchasing Power (Relative to NYC)": number | null;
  "Crime Rate (Violent/100K)": number | null;
  "Quality of Life Score (Approx. 1-100)": number | null;
  "Walkability (Walk Score)": number | null;
  "Public Transit Quality (Transit Score)": number | null;
  "Avg. Broadband Speed (Mbps)": number | null;
  "International Airport": string | null;
  "Health Score (ACSM Rank)": number | null;
  "Pollution Index (Numbeo)": number | null;
  "Water Quality Index (Numbeo)": number | null;
  "Traffic Index (INRIX, Hr/Yr Lost)": number | null;
  "City Democrat % (Harris 2024)": number | null;
  "State Democrat % (Harris 2024)": number | null;
}

interface ZHVIRow {
  RegionID: number;
  SizeRank: number;
  RegionName: string;
  RegionType: string;
  StateName: string;
  [date: string]: string | number; // Date columns
}

async function main() {
  console.log("🌱 Starting seed process...");
  console.log(`📁 Reading Excel file from: ${EXCEL_PATH}`);

  // Read the Excel file
  const workbook = XLSX.readFile(EXCEL_PATH);

  // Get sheet names
  console.log("📋 Available sheets:", workbook.SheetNames);

  // Parse Gemini_raw sheet (main city data)
  const geminiSheet = workbook.Sheets["Gemini_raw"];
  const geminiData: GeminiRawRow[] = XLSX.utils.sheet_to_json(geminiSheet);

  console.log(`📊 Found ${geminiData.length} cities in Gemini_raw sheet`);

  // Parse ZHVI sheet (home price history)
  const zhviSheet = workbook.Sheets["sfr_0.33_0.67_sm_sa"];
  const zhviData: ZHVIRow[] = XLSX.utils.sheet_to_json(zhviSheet);

  console.log(`📈 Found ${zhviData.length} regions in ZHVI sheet`);

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await prisma.zHVIDataPoint.deleteMany();
  await prisma.cityMetrics.deleteMany();
  await prisma.city.deleteMany();
  await prisma.dataRefreshLog.deleteMany();

  // Create cities and metrics
  console.log("🏙️  Creating cities...");

  for (const row of geminiData) {
    const cityName = row["Unnamed: 0"];
    if (!cityName) continue;

    // Find matching ZHVI data for this city
    const zhviMatch = zhviData.find((z) => {
      const regionName = z.RegionName?.toLowerCase() || "";
      const city = cityName.toLowerCase();
      // Match "New York City" with "New York City, NY" etc.
      return regionName.includes(city) || city.includes(regionName.split(",")[0]);
    });

    const city = await prisma.city.create({
      data: {
        name: cityName,
        state: row.State || "Unknown",
        regionId: zhviMatch?.RegionID || null,
        metrics: {
          create: {
            // Climate
            avgTemp: row["Average Temp. (°F)"] || null,
            avgWinterTemp: row["Avg. Winter Temp. (°F)"] || null,
            avgSummerTemp: row["Avg. Summer Temp. (°F)"] || null,
            daysOfSunshine: row["Days of Sunshine (Avg. Annual)"]
              ? Math.round(row["Days of Sunshine (Avg. Annual)"])
              : null,
            daysOfRain: row["Days of Rain (Avg. Annual)"]
              ? Math.round(row["Days of Rain (Avg. Annual)"])
              : null,

            // Demographics
            diversityIndex: row["Diversity Index (Out of 100)"] || null,
            population: row["Total Population (Metro Area, 000s)"]
              ? Math.round(row["Total Population (Metro Area, 000s)"])
              : null,
            eastAsianPercent: row["East Asian Population (Approx. %)"] || null,

            // Cost of Living
            medianHomePrice:
              row["Median Single Family Home Price (Approx.)"] || null,
            stateTaxRate: row["State Tax Rate (Max Income Tax)"] || null,
            propertyTaxRate: row["Property Tax Rate (Effective %)"] || null,
            costOfLivingIndex: row["Cost of Living Index (US Avg=100)"] || null,

            // Quality of Life
            crimeRate: row["Crime Rate (Violent/100K)"] || null,
            walkScore: row["Walkability (Walk Score)"]
              ? Math.round(row["Walkability (Walk Score)"])
              : null,
            transitScore: row["Public Transit Quality (Transit Score)"]
              ? Math.round(row["Public Transit Quality (Transit Score)"])
              : null,
            avgBroadbandSpeed: row["Avg. Broadband Speed (Mbps)"] || null,
            hasInternationalAirport:
              row["International Airport"]?.toLowerCase() === "yes" ||
              row["International Airport"]?.toLowerCase() === "true",
            healthScore: row["Health Score (ACSM Rank)"] || null,
            pollutionIndex: row["Pollution Index (Numbeo)"] || null,
            waterQualityIndex: row["Water Quality Index (Numbeo)"] || null,
            trafficIndex: row["Traffic Index (INRIX, Hr/Yr Lost)"] || null,

            // Political
            cityDemocratPercent: row["City Democrat % (Harris 2024)"] || null,
            stateDemocratPercent: row["State Democrat % (Harris 2024)"] || null,

            // Sports
            nflTeams: row["NFL Team(s)"] || null,
            nbaTeams: row["NBA Team(s)"] || null,
          },
        },
      },
    });

    console.log(`  ✓ Created: ${city.name}, ${city.state}`);

    // If we have matching ZHVI data, import the price history
    if (zhviMatch) {
      const zhviPoints: { cityId: string; date: Date; value: number }[] = [];

      // Get all date columns (they look like "2000-01-31 00:00:00" or similar)
      for (const [key, value] of Object.entries(zhviMatch)) {
        // Check if this is a date column (starts with a year)
        if (/^\d{4}-\d{2}-\d{2}/.test(key) && typeof value === "number") {
          const date = new Date(key.split(" ")[0]);
          if (!isNaN(date.getTime()) && value > 0) {
            zhviPoints.push({
              cityId: city.id,
              date,
              value,
            });
          }
        }
      }

      if (zhviPoints.length > 0) {
        await prisma.zHVIDataPoint.createMany({
          data: zhviPoints,
        });
        console.log(`    📈 Added ${zhviPoints.length} ZHVI data points`);
      }
    }
  }

  // Log the refresh
  await prisma.dataRefreshLog.create({
    data: {
      source: "excel_import",
      status: "success",
      recordsUpdated: geminiData.length,
    },
  });

  // Get final counts
  const cityCount = await prisma.city.count();
  const metricsCount = await prisma.cityMetrics.count();
  const zhviCount = await prisma.zHVIDataPoint.count();

  console.log("\n✅ Seed completed successfully!");
  console.log(`   Cities: ${cityCount}`);
  console.log(`   Metrics records: ${metricsCount}`);
  console.log(`   ZHVI data points: ${zhviCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
