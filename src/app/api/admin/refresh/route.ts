import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import * as XLSX from "xlsx";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";

// Types for Excel data
interface GeminiRawRow {
  __EMPTY: string; // City name
  State: string;
  "Avg Temp (F)": number;
  "Avg Winter Temp (F)": number;
  "Avg Summer Temp (F)": number;
  "Days of Sunshine": number;
  "Days of Rain": number;
  "Diversity Index": number;
  "Population (Thousands)": number;
  "East Asian Population %": number;
  "Median Single-Family Home Price": number;
  "State Income Tax Rate (Top Marginal)": number;
  "Property Tax Rate": number;
  "Cost of Living Index": number;
  "Violent Crime per 100,000": number;
  "Walk Score": number;
  "Transit Score": number;
  "Avg Broadband Speed (Mbps)": number;
  "Major International Airport": string;
  "Health Score": number;
  "Pollution Index": number;
  "Water Quality Index": number;
  "Traffic Index": number;
  "City Democrat Vote %": number;
  "State Democrat Vote %": number;
  "NFL Team(s)": string;
  "NBA Team(s)": string;
  RegionID?: number;
  Latitude?: number;
  Longitude?: number;
}

interface ZHVIRow {
  RegionID: number;
  [date: string]: number | string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify password
    const body = await request.json();
    const { password } = body;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Find the Excel file - prioritize project's data folder
    const cwd = process.cwd();
    const possiblePaths = [
      join(cwd, "data", "Cities.xlsx"),
      join(cwd, "Cities.xlsx"),
      join(cwd, "..", "Cities.xlsx"),
    ];

    let excelPath: string | null = null;
    for (const p of possiblePaths) {
      try {
        if (existsSync(p)) {
          excelPath = p;
          break;
        }
      } catch {
        // Continue to next path
      }
    }

    if (!excelPath) {
      return NextResponse.json(
        { 
          error: "Excel file not found", 
          details: `Checked paths: ${possiblePaths.join(", ")}. CWD: ${cwd}` 
        },
        { status: 404 }
      );
    }

    // Read the Excel file using buffer (more compatible with Next.js)
    let workbook: XLSX.WorkBook;
    try {
      const buffer = readFileSync(excelPath);
      workbook = XLSX.read(buffer, { type: "buffer" });
    } catch (readError) {
      return NextResponse.json(
        { 
          error: "Failed to read Excel file", 
          details: readError instanceof Error ? readError.message : "Unknown read error",
          path: excelPath 
        },
        { status: 500 }
      );
    }

    // Parse Gemini_raw sheet
    const geminiSheet = workbook.Sheets["Gemini_raw"];
    if (!geminiSheet) {
      return NextResponse.json(
        { error: "Gemini_raw sheet not found" },
        { status: 400 }
      );
    }
    const geminiData: GeminiRawRow[] = XLSX.utils.sheet_to_json(geminiSheet);

    // Parse ZHVI sheet
    const zhviSheet = workbook.Sheets["sfr_0.33_0.67_sm_sa"];
    let zhviData: ZHVIRow[] = [];
    if (zhviSheet) {
      zhviData = XLSX.utils.sheet_to_json(zhviSheet);
    }

    // Create a map of RegionID to ZHVI data
    const zhviMap = new Map<number, ZHVIRow>();
    for (const row of zhviData) {
      if (row.RegionID) {
        zhviMap.set(row.RegionID, row);
      }
    }

    // Track stats
    let citiesUpdated = 0;
    let citiesCreated = 0;
    let metricsUpdated = 0;
    let zhviPointsCreated = 0;

    // Process each city
    for (const row of geminiData) {
      const cityName = row["__EMPTY"];
      if (!cityName || typeof cityName !== "string") continue;

      // Check if city exists
      let city = await prisma.city.findUnique({
        where: { name: cityName },
        include: { metrics: true },
      });

      const cityData = {
        name: cityName,
        state: row.State || "",
        regionId: row.RegionID || null,
        latitude: row.Latitude || null,
        longitude: row.Longitude || null,
      };

      if (city) {
        // Update existing city
        city = await prisma.city.update({
          where: { id: city.id },
          data: cityData,
          include: { metrics: true },
        });
        citiesUpdated++;
      } else {
        // Create new city
        city = await prisma.city.create({
          data: cityData,
          include: { metrics: true },
        });
        citiesCreated++;
      }

      // Prepare metrics data
      const metricsData = {
        avgTemp: row["Avg Temp (F)"] ?? null,
        avgWinterTemp: row["Avg Winter Temp (F)"] ?? null,
        avgSummerTemp: row["Avg Summer Temp (F)"] ?? null,
        daysOfSunshine: row["Days of Sunshine"] ?? null,
        daysOfRain: row["Days of Rain"] ?? null,
        diversityIndex: row["Diversity Index"] ?? null,
        population: row["Population (Thousands)"] ?? null,
        eastAsianPercent: row["East Asian Population %"] ?? null,
        medianHomePrice: row["Median Single-Family Home Price"] ?? null,
        stateTaxRate: row["State Income Tax Rate (Top Marginal)"] ?? null,
        propertyTaxRate: row["Property Tax Rate"] ?? null,
        costOfLivingIndex: row["Cost of Living Index"] ?? null,
        crimeRate: row["Violent Crime per 100,000"] ?? null,
        walkScore: row["Walk Score"] ?? null,
        transitScore: row["Transit Score"] ?? null,
        avgBroadbandSpeed: row["Avg Broadband Speed (Mbps)"] ?? null,
        hasInternationalAirport: row["Major International Airport"] === "Yes",
        healthScore: row["Health Score"] ?? null,
        pollutionIndex: row["Pollution Index"] ?? null,
        waterQualityIndex: row["Water Quality Index"] ?? null,
        trafficIndex: row["Traffic Index"] ?? null,
        cityDemocratPercent: row["City Democrat Vote %"] ?? null,
        stateDemocratPercent: row["State Democrat Vote %"] ?? null,
        nflTeams: row["NFL Team(s)"] || null,
        nbaTeams: row["NBA Team(s)"] || null,
        dataAsOf: new Date(),
      };

      // Upsert metrics
      if (city.metrics) {
        await prisma.cityMetrics.update({
          where: { id: city.metrics.id },
          data: metricsData,
        });
      } else {
        await prisma.cityMetrics.create({
          data: {
            ...metricsData,
            cityId: city.id,
          },
        });
      }
      metricsUpdated++;

      // Process ZHVI data if available
      if (row.RegionID && zhviMap.has(row.RegionID)) {
        const zhviRow = zhviMap.get(row.RegionID)!;

        // Delete existing ZHVI data for this city
        await prisma.zHVIDataPoint.deleteMany({
          where: { cityId: city.id },
        });

        // Insert new ZHVI data
        const zhviPoints: { cityId: string; date: Date; value: number }[] = [];

        for (const [key, value] of Object.entries(zhviRow)) {
          // Check if key is a date (YYYY-MM-DD format)
          if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === "number") {
            zhviPoints.push({
              cityId: city.id,
              date: new Date(key),
              value: value,
            });
          }
        }

        if (zhviPoints.length > 0) {
          await prisma.zHVIDataPoint.createMany({
            data: zhviPoints,
          });
          zhviPointsCreated += zhviPoints.length;
        }
      }
    }

    // Log the refresh
    await prisma.dataRefreshLog.create({
      data: {
        triggeredBy: "admin",
        status: "success",
        recordsUpdated: citiesUpdated + citiesCreated,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        citiesCreated,
        citiesUpdated,
        metricsUpdated,
        zhviPointsCreated,
      },
      message: `Refresh complete. Created ${citiesCreated} cities, updated ${citiesUpdated} cities, ${metricsUpdated} metrics records, ${zhviPointsCreated} ZHVI data points.`,
    });
  } catch (error) {
    console.error("Refresh error:", error);

    // Try to log the failure, but don't let logging failure break the response
    try {
      await prisma.dataRefreshLog.create({
        data: {
          triggeredBy: "admin",
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });
    } catch (logError) {
      console.error("Failed to log refresh error:", logError);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
