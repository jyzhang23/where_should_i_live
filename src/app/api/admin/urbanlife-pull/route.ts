/**
 * Admin API to pull urban lifestyle data (nightlife, arts, dining)
 * 
 * POST /api/admin/urbanlife-pull
 * Body: { password: string }
 * 
 * Data sources:
 * - Nightlife: OpenStreetMap (Overpass API) for bars, clubs
 * - Arts: Google Places API / OpenStreetMap for museums, theaters
 * - Dining: Yelp/Google Places for restaurants, breweries
 * 
 * Reads from: data/sources/urbanlife-data.json
 * Writes to: data/metrics.json (into cultural.urbanLifestyle)
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { UrbanLifestyleMetrics } from "@/types/city";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";

interface CityData {
  id: string;
  name: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
}

interface UrbanLifestyleSourceData {
  nightlife: {
    barsAndClubsPer10K: number | null;
    totalVenues: number | null;
    lateNightVenues: number | null;
  };
  arts: {
    museums: number | null;
    theaters: number | null;
    artGalleries: number | null;
    musicVenues: number | null;
  };
  dining: {
    fineDiningCount: number | null;
    restaurantsPer10K: number | null;
    cuisineDiversity: number | null;
    breweries: number | null;
    coffeeshops: number | null;
  };
  population: number;
  dataYear: number;
}

interface UrbanLifestyleDataFile {
  version: string;
  description: string;
  sources: {
    nightlife: string;
    arts: string;
    dining: string;
  };
  nationalAverages: {
    barsAndClubsPer10K: number;
    museums: number;
    restaurantsPer10K: number;
    cuisineDiversity: number;
  };
  cities: Record<string, UrbanLifestyleSourceData>;
}

/**
 * Transform source data to UrbanLifestyleMetrics format
 */
function transformToUrbanLifestyleMetrics(sourceData: UrbanLifestyleSourceData): UrbanLifestyleMetrics {
  return {
    nightlife: {
      barsAndClubsPer10K: sourceData.nightlife.barsAndClubsPer10K,
      totalVenues: sourceData.nightlife.totalVenues,
      lateNightVenues: sourceData.nightlife.lateNightVenues,
    },
    arts: {
      museums: sourceData.arts.museums,
      theaters: sourceData.arts.theaters,
      artGalleries: sourceData.arts.artGalleries,
      musicVenues: sourceData.arts.musicVenues,
    },
    dining: {
      fineDiningCount: sourceData.dining.fineDiningCount,
      restaurantsPer10K: sourceData.dining.restaurantsPer10K,
      cuisineDiversity: sourceData.dining.cuisineDiversity,
      breweries: sourceData.dining.breweries,
      coffeeshops: sourceData.dining.coffeeshops,
    },
    dataYear: sourceData.dataYear,
    lastUpdated: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine data directory
    const dataDir = join(process.cwd(), "data");
    const sourcesDir = join(dataDir, "sources");
    const urbanlifeDataPath = join(sourcesDir, "urbanlife-data.json");

    // Check if source file exists
    if (!existsSync(urbanlifeDataPath)) {
      return NextResponse.json(
        { error: "Urban lifestyle data source file not found: data/sources/urbanlife-data.json" },
        { status: 400 }
      );
    }

    // Load source data
    const urbanlifeDataFile: UrbanLifestyleDataFile = JSON.parse(
      readFileSync(urbanlifeDataPath, "utf-8")
    );

    // Load cities and metrics
    const citiesFile = JSON.parse(
      readFileSync(join(dataDir, "cities.json"), "utf-8")
    );
    const metricsFile = JSON.parse(
      readFileSync(join(dataDir, "metrics.json"), "utf-8")
    );

    const cities: CityData[] = citiesFile.cities;

    console.log(`Processing urban lifestyle data for ${cities.length} cities...`);

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const city of cities) {
      const sourceData = urbanlifeDataFile.cities[city.id];
      
      if (!sourceData) {
        skipCount++;
        errors.push(`${city.name}: No urban lifestyle data found`);
        console.log(`  ✗ ${city.name}: No data`);
        continue;
      }

      const urbanLifestyleMetrics = transformToUrbanLifestyleMetrics(sourceData);

      // Ensure city entry exists in metrics
      if (!metricsFile.cities[city.id]) {
        metricsFile.cities[city.id] = {};
      }

      // Ensure cultural entry exists
      if (!metricsFile.cities[city.id].cultural) {
        metricsFile.cities[city.id].cultural = {};
      }

      // Store urban lifestyle data under cultural
      metricsFile.cities[city.id].cultural.urbanLifestyle = urbanLifestyleMetrics;

      successCount++;
      console.log(
        `  ✓ ${city.name}: ` +
        `Bars=${urbanLifestyleMetrics.nightlife?.barsAndClubsPer10K ?? 'N/A'}/10K, ` +
        `Museums=${urbanLifestyleMetrics.arts?.museums ?? 'N/A'}, ` +
        `Restaurants=${urbanLifestyleMetrics.dining?.restaurantsPer10K ?? 'N/A'}/10K, ` +
        `Cuisines=${urbanLifestyleMetrics.dining?.cuisineDiversity ?? 'N/A'}`
      );
    }

    // Update metrics source info
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources.urbanLifestyle = {
      nightlife: urbanlifeDataFile.sources.nightlife,
      arts: urbanlifeDataFile.sources.arts,
      dining: urbanlifeDataFile.sources.dining,
    };
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
          source: "urbanlife-data",
          status: successCount > 0 ? "success" : "error",
          recordsUpdated: successCount,
          errorMessage: errors.length > 0 ? `Skipped: ${errors.slice(0, 10).join(", ")}${errors.length > 10 ? `... and ${errors.length - 10} more` : ''}` : undefined,
        },
      });
    } catch (logError) {
      console.error("Failed to log refresh:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Urban lifestyle data pulled successfully",
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        dataYear: urbanlifeDataFile.cities[Object.keys(urbanlifeDataFile.cities)[0]]?.dataYear || 2024,
        nationalAverages: urbanlifeDataFile.nationalAverages,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
    });
  } catch (error) {
    console.error("Urban lifestyle data pull error:", error);

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "urbanlife-data",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "Urban lifestyle data pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
