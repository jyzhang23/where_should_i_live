/**
 * Admin API to pull recreation/outdoor data
 * 
 * POST /api/admin/recreation-pull
 * Body: { password: string }
 * 
 * Data sources:
 * - Nature: OpenStreetMap (Overpass API) for trails, parks
 * - Geography: USGS National Map (elevation), NOAA (coastline)
 * 
 * Reads from: data/sources/recreation-data.json
 * Writes to: data/metrics.json (into qol.recreation)
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { RecreationMetrics } from "@/types/city";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";

interface CityData {
  id: string;
  name: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
}

interface RecreationSourceData {
  nature: {
    parkAcresPer1K: number | null;
    trailMilesWithin10Mi: number | null;
    protectedLandPercent: number | null;
    stateParksWithin50Mi: number | null;
  };
  geography: {
    coastlineWithin15Mi: boolean;
    coastlineDistanceMi: number | null;
    waterQualityIndex: number | null;
    maxElevationDelta: number | null;
    nearestMountainDistMi: number | null;
    nearestSkiResortMi: number | null;
  };
  dataYear: number;
}

interface RecreationDataFile {
  version: string;
  description: string;
  sources: {
    nature: string;
    geography: string;
  };
  nationalAverages: {
    parkAcresPer1K: number;
    trailMilesWithin10Mi: number;
    protectedLandPercent: number;
    coastlineAccessPercent: number;
    avgElevationDelta: number;
  };
  cities: Record<string, RecreationSourceData>;
}

/**
 * Transform source data to RecreationMetrics format
 */
function transformToRecreationMetrics(sourceData: RecreationSourceData): RecreationMetrics {
  return {
    nature: {
      parkAcresPer1K: sourceData.nature.parkAcresPer1K,
      trailMilesWithin10Mi: sourceData.nature.trailMilesWithin10Mi,
      protectedLandPercent: sourceData.nature.protectedLandPercent,
      stateParksWithin50Mi: sourceData.nature.stateParksWithin50Mi,
    },
    geography: {
      coastlineWithin15Mi: sourceData.geography.coastlineWithin15Mi,
      coastlineDistanceMi: sourceData.geography.coastlineDistanceMi,
      waterQualityIndex: sourceData.geography.waterQualityIndex,
      maxElevationDelta: sourceData.geography.maxElevationDelta,
      nearestMountainDistMi: sourceData.geography.nearestMountainDistMi,
      nearestSkiResortMi: sourceData.geography.nearestSkiResortMi,
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
    const recreationDataPath = join(sourcesDir, "recreation-data.json");

    // Check if source file exists
    if (!existsSync(recreationDataPath)) {
      return NextResponse.json(
        { error: "Recreation data source file not found: data/sources/recreation-data.json" },
        { status: 400 }
      );
    }

    // Load source data
    const recreationDataFile: RecreationDataFile = JSON.parse(
      readFileSync(recreationDataPath, "utf-8")
    );

    // Load cities and metrics
    const citiesFile = JSON.parse(
      readFileSync(join(dataDir, "cities.json"), "utf-8")
    );
    const metricsFile = JSON.parse(
      readFileSync(join(dataDir, "metrics.json"), "utf-8")
    );

    const cities: CityData[] = citiesFile.cities;

    console.log(`Processing recreation data for ${cities.length} cities...`);

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const city of cities) {
      const sourceData = recreationDataFile.cities[city.id];
      
      if (!sourceData) {
        skipCount++;
        errors.push(`${city.name}: No recreation data found`);
        console.log(`  ✗ ${city.name}: No data`);
        continue;
      }

      const recreationMetrics = transformToRecreationMetrics(sourceData);

      // Ensure city entry exists in metrics
      if (!metricsFile.cities[city.id]) {
        metricsFile.cities[city.id] = {};
      }

      // Ensure qol entry exists
      if (!metricsFile.cities[city.id].qol) {
        metricsFile.cities[city.id].qol = {};
      }

      // Store recreation data under qol
      metricsFile.cities[city.id].qol.recreation = recreationMetrics;

      successCount++;
      console.log(
        `  ✓ ${city.name}: ` +
        `Trails=${recreationMetrics.nature?.trailMilesWithin10Mi ?? 'N/A'}mi, ` +
        `Parks=${recreationMetrics.nature?.parkAcresPer1K ?? 'N/A'}/1K, ` +
        `Coast=${recreationMetrics.geography?.coastlineWithin15Mi ? 'Yes' : 'No'}, ` +
        `Elevation=${recreationMetrics.geography?.maxElevationDelta ?? 'N/A'}ft`
      );
    }

    // Update metrics source info
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources.recreation = {
      nature: recreationDataFile.sources.nature,
      geography: recreationDataFile.sources.geography,
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
          source: "recreation-data",
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
      message: "Recreation data pulled successfully",
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        dataYear: recreationDataFile.cities[Object.keys(recreationDataFile.cities)[0]]?.dataYear || 2024,
        nationalAverages: recreationDataFile.nationalAverages,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
    });
  } catch (error) {
    console.error("Recreation data pull error:", error);

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "recreation-data",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "Recreation data pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
