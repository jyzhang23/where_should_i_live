/**
 * Admin API to refresh database from JSON data files
 * 
 * POST /api/admin/refresh
 * Body: { password: string }
 * 
 * Reads from:
 * - data/cities.json - City definitions
 * - data/metrics.json - Current metrics
 * - data/zhvi-history.json - Price history
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";

interface CityData {
  id: string;
  name: string;
  state: string;
  zillowRegionId: number | null;
  zillowRegionName: string | null;
  sports: {
    nfl: string[];
    nba: string[];
    mlb: string[];
    nhl: string[];
    mls: string[];
  };
}

interface MetricsData {
  climate: {
    avgTemp: number | null;
    avgWinterTemp: number | null;
    avgSummerTemp: number | null;
    daysOfSunshine: number | null;
    daysOfRain: number | null;
  };
  cost: {
    medianHomePrice: number | null;
    costOfLivingIndex: number | null;
    stateTaxRate: number | null;
    propertyTaxRate: number | null;
  };
  demographics: {
    population: number | null;
    diversityIndex: number | null;
    eastAsianPercent: number | null;
    crimeRate: number | null;
  };
  quality: {
    qualityOfLifeScore: number | null;
    walkScore: number | null;
    transitScore: number | null;
    hasInternationalAirport: boolean;
    airportCode: string | null;
    healthScore: number | null;
    pollutionIndex: number | null;
    waterQualityIndex: number | null;
    trafficIndex: number | null;
    broadbandSpeed: number | null;
  };
  political: {
    cityDemocratPercent: number | null;
    stateDemocratPercent: number | null;
  };
}

interface ZHVIData {
  zillowRegionId: number;
  history: { date: string; value: number }[];
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

    // Locate data files
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
        { error: "Data files not found. Run the conversion script first." },
        { status: 404 }
      );
    }

    // Read JSON files
    let citiesFile, metricsFile, zhviFile;
    try {
      citiesFile = JSON.parse(readFileSync(join(dataDir, "cities.json"), "utf-8"));
      metricsFile = JSON.parse(readFileSync(join(dataDir, "metrics.json"), "utf-8"));
      zhviFile = JSON.parse(readFileSync(join(dataDir, "zhvi-history.json"), "utf-8"));
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to read JSON files: ${err}` },
        { status: 500 }
      );
    }

    const cities: CityData[] = citiesFile.cities;
    const metrics: Record<string, MetricsData> = metricsFile.cities;
    const zhviHistory: Record<string, ZHVIData> = zhviFile.cities;

    let citiesCreated = 0;
    let citiesUpdated = 0;
    let zhviPointsCreated = 0;

    for (const city of cities) {
      const cityMetrics = metrics[city.id];
      if (!cityMetrics) {
        console.warn(`No metrics found for ${city.name}, skipping...`);
        continue;
      }

      const zhvi = zhviHistory[city.id];

      // Prepare city data
      const cityData = {
        name: city.name,
        state: city.state,
        regionId: city.zillowRegionId, // Prisma schema uses 'regionId'
      };

      // Prepare metrics data
      const metricsData = {
        avgTemp: cityMetrics.climate.avgTemp,
        avgWinterTemp: cityMetrics.climate.avgWinterTemp,
        avgSummerTemp: cityMetrics.climate.avgSummerTemp,
        daysOfSunshine: cityMetrics.climate.daysOfSunshine,
        daysOfRain: cityMetrics.climate.daysOfRain,
        diversityIndex: cityMetrics.demographics.diversityIndex,
        population: cityMetrics.demographics.population,
        eastAsianPercent: cityMetrics.demographics.eastAsianPercent,
        medianHomePrice: cityMetrics.cost.medianHomePrice,
        stateTaxRate: cityMetrics.cost.stateTaxRate,
        propertyTaxRate: cityMetrics.cost.propertyTaxRate,
        costOfLivingIndex: cityMetrics.cost.costOfLivingIndex,
        crimeRate: cityMetrics.demographics.crimeRate,
        walkScore: cityMetrics.quality.walkScore,
        transitScore: cityMetrics.quality.transitScore,
        avgBroadbandSpeed: cityMetrics.quality.broadbandSpeed,
        hasInternationalAirport: cityMetrics.quality.hasInternationalAirport,
        healthScore: cityMetrics.quality.healthScore,
        pollutionIndex: cityMetrics.quality.pollutionIndex,
        waterQualityIndex: cityMetrics.quality.waterQualityIndex,
        trafficIndex: cityMetrics.quality.trafficIndex,
        qualityOfLifeScore: cityMetrics.quality.qualityOfLifeScore,
        cityDemocratPercent: cityMetrics.political.cityDemocratPercent,
        stateDemocratPercent: cityMetrics.political.stateDemocratPercent,
        nflTeams: city.sports?.nfl?.join(", ") || null,
        nbaTeams: city.sports?.nba?.join(", ") || null,
        mlbTeams: city.sports?.mlb?.join(", ") || null,
        nhlTeams: city.sports?.nhl?.join(", ") || null,
        mlsTeams: city.sports?.mls?.join(", ") || null,
        dataAsOf: new Date(),
      };

      // Check if city exists
      const existingCity = await prisma.city.findUnique({
        where: { name: city.name },
      });

      let dbCity;
      if (existingCity) {
        // Update existing city
        dbCity = await prisma.city.update({
          where: { id: existingCity.id },
          data: {
            ...cityData,
            metrics: {
              upsert: {
                create: metricsData,
                update: metricsData,
              },
            },
          },
        });
        citiesUpdated++;
      } else {
        // Create new city
        dbCity = await prisma.city.create({
          data: {
            ...cityData,
            metrics: {
              create: metricsData,
            },
          },
        });
        citiesCreated++;
      }

      // Handle ZHVI history
      if (zhvi && zhvi.history.length > 0) {
        // Delete existing history
        await prisma.zHVIDataPoint.deleteMany({
          where: { cityId: dbCity.id },
        });

        // Insert new history (batch for performance)
        const historyData = zhvi.history.map((point) => ({
          cityId: dbCity.id,
          date: new Date(point.date),
          value: point.value,
        }));

        // Insert in batches of 100
        for (let i = 0; i < historyData.length; i += 100) {
          const batch = historyData.slice(i, i + 100);
          await prisma.zHVIDataPoint.createMany({
            data: batch,
          });
          zhviPointsCreated += batch.length;
        }
      }
    }

    // Log the refresh
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "admin-manual",
          status: "success",
          recordsUpdated: citiesCreated + citiesUpdated,
        },
      });
    } catch (logError) {
      console.error("Failed to log refresh:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Data refresh complete",
      stats: {
        citiesCreated,
        citiesUpdated,
        totalCities: citiesCreated + citiesUpdated,
        zhviPointsCreated,
        dataSource: "JSON files",
      },
    });

  } catch (error) {
    console.error("Refresh error:", error);

    // Log the failure
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "admin-manual",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { 
        error: "Refresh failed", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
