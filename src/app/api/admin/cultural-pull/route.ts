/**
 * Admin API to pull cultural data (political + religious)
 * 
 * POST /api/admin/cultural-pull
 * Body: { password: string }
 * 
 * Data sources:
 * - Political: MIT Election Lab County Presidential Returns 2024
 * - Religious: ARDA U.S. Religion Census 2020
 * 
 * Reads from: data/sources/cultural-data.json
 * Writes to: data/metrics.json
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { CulturalMetrics } from "@/types/city";
import { createAdminLogger } from "@/lib/admin-logger";

const logger = createAdminLogger("cultural-pull");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";

interface CityData {
  id: string;
  name: string;
  state: string;
}

interface CulturalSourceData {
  political: {
    democratPercent: number;
    republicanPercent: number;
    voterTurnout: number;
    dataYear: number;
  };
  religious: {
    catholic: number;
    evangelicalProtestant: number;
    mainlineProtestant: number;
    jewish: number;
    muslim: number;
    unaffiliated: number;
    lds?: number;
    dataYear: number;
  };
}

interface CulturalDataFile {
  version: string;
  description: string;
  sources: {
    political: string;
    religious: string;
  };
  nationalAverages: {
    political: {
      democratPercent: number;
      republicanPercent: number;
      voterTurnout: number;
    };
    religious: {
      catholic: number;
      evangelicalProtestant: number;
      mainlineProtestant: number;
      jewish: number;
      muslim: number;
      unaffiliated: number;
    };
  };
  cities: Record<string, CulturalSourceData>;
}

/**
 * Calculate Partisan Index from vote percentages
 * Range: -1.0 (100% Republican) to +1.0 (100% Democrat)
 */
function calculatePartisanIndex(demPercent: number, repPercent: number): number {
  return Math.round(((demPercent - repPercent) / 100) * 1000) / 1000;
}

/**
 * Calculate margin of victory (absolute value)
 */
function calculateMarginOfVictory(demPercent: number, repPercent: number): number {
  return Math.round(Math.abs(demPercent - repPercent) * 10) / 10;
}

/**
 * Calculate religious diversity index using Simpson's Diversity Index
 * Range: 0 (dominated by one tradition) to 100 (maximally diverse)
 */
function calculateReligiousDiversityIndex(religious: CulturalSourceData["religious"]): number {
  const total = religious.catholic + 
                religious.evangelicalProtestant + 
                religious.mainlineProtestant + 
                religious.jewish + 
                religious.muslim + 
                religious.unaffiliated + 
                (religious.lds || 0);
  
  if (total === 0) return 0;
  
  const proportions = [
    religious.catholic / total,
    religious.evangelicalProtestant / total,
    religious.mainlineProtestant / total,
    religious.jewish / total,
    religious.muslim / total,
    religious.unaffiliated / total,
    (religious.lds || 0) / total,
  ].filter(p => p > 0);
  
  // Simpson's Index: 1 - sum(p_i^2)
  const sumSquares = proportions.reduce((sum, p) => sum + p * p, 0);
  const simpsonsIndex = 1 - sumSquares;
  
  // Scale to 0-100
  return Math.round(simpsonsIndex * 100);
}

/**
 * Determine dominant religious tradition
 */
function getDominantTradition(religious: CulturalSourceData["religious"]): string {
  const traditions: [string, number][] = [
    ["Catholic", religious.catholic],
    ["Evangelical Protestant", religious.evangelicalProtestant],
    ["Mainline Protestant", religious.mainlineProtestant],
    ["Jewish", religious.jewish],
    ["Muslim", religious.muslim],
    ["Unaffiliated/Secular", religious.unaffiliated],
  ];
  
  if (religious.lds && religious.lds > 100) {
    traditions.push(["LDS/Mormon", religious.lds]);
  }
  
  traditions.sort((a, b) => b[1] - a[1]);
  return traditions[0][0];
}

/**
 * Transform source data to CulturalMetrics format
 */
function transformToCulturalMetrics(sourceData: CulturalSourceData): CulturalMetrics {
  const partisanIndex = calculatePartisanIndex(
    sourceData.political.democratPercent,
    sourceData.political.republicanPercent
  );
  
  const marginOfVictory = calculateMarginOfVictory(
    sourceData.political.democratPercent,
    sourceData.political.republicanPercent
  );
  
  const diversityIndex = calculateReligiousDiversityIndex(sourceData.religious);
  const dominantTradition = getDominantTradition(sourceData.religious);
  
  return {
    political: {
      partisanIndex,
      democratPercent: sourceData.political.democratPercent,
      republicanPercent: sourceData.political.republicanPercent,
      voterTurnout: sourceData.political.voterTurnout,
      marginOfVictory,
      dataYear: sourceData.political.dataYear,
    },
    religious: {
      catholic: sourceData.religious.catholic,
      evangelicalProtestant: sourceData.religious.evangelicalProtestant,
      mainlineProtestant: sourceData.religious.mainlineProtestant,
      jewish: sourceData.religious.jewish,
      muslim: sourceData.religious.muslim,
      unaffiliated: sourceData.religious.unaffiliated,
      lds: sourceData.religious.lds || null,
      diversityIndex,
      dominantTradition,
      dataYear: sourceData.religious.dataYear,
    },
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
    const culturalDataPath = join(sourcesDir, "cultural-data.json");

    // Check if source file exists
    if (!existsSync(culturalDataPath)) {
      return NextResponse.json(
        { error: "Cultural data source file not found: data/sources/cultural-data.json" },
        { status: 400 }
      );
    }

    // Load source data
    const culturalDataFile: CulturalDataFile = JSON.parse(
      readFileSync(culturalDataPath, "utf-8")
    );

    // Load cities and metrics
    const citiesFile = JSON.parse(
      readFileSync(join(dataDir, "cities.json"), "utf-8")
    );
    const metricsFile = JSON.parse(
      readFileSync(join(dataDir, "metrics.json"), "utf-8")
    );

    const cities: CityData[] = citiesFile.cities;

    logger.info("Processing cultural data", { cityCount: cities.length });

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const city of cities) {
      const sourceData = culturalDataFile.cities[city.id];
      
      if (!sourceData) {
        skipCount++;
        errors.push(`${city.name}: No cultural data found`);
        logger.warn("No cultural data", { city: city.name });
        continue;
      }

      const culturalMetrics = transformToCulturalMetrics(sourceData);

      // Ensure city entry exists in metrics
      if (!metricsFile.cities[city.id]) {
        metricsFile.cities[city.id] = {};
      }

      // Ensure cultural entry exists (preserve existing data like urbanLifestyle)
      if (!metricsFile.cities[city.id].cultural) {
        metricsFile.cities[city.id].cultural = {};
      }

      // Merge cultural data (preserves urbanLifestyle if it exists)
      metricsFile.cities[city.id].cultural = {
        ...metricsFile.cities[city.id].cultural,
        political: culturalMetrics.political,
        religious: culturalMetrics.religious,
      };

      successCount++;
      logger.debug("Updated city", {
        city: city.name,
        partisanIndex: culturalMetrics.political?.partisanIndex,
        turnout: culturalMetrics.political?.voterTurnout,
        dominant: culturalMetrics.religious?.dominantTradition,
        religiousDiversity: culturalMetrics.religious?.diversityIndex,
      });
    }

    // Update metrics source info
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources.cultural = {
      political: culturalDataFile.sources.political,
      religious: culturalDataFile.sources.religious,
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
          source: "cultural-data",
          status: successCount > 0 ? "success" : "error",
          recordsUpdated: successCount,
          errorMessage: errors.length > 0 ? `Skipped: ${errors.join(", ")}` : undefined,
        },
      });
    } catch (logError) {
      logger.error("Failed to log refresh", { error: String(logError) });
    }

    return NextResponse.json({
      success: true,
      message: "Cultural data pulled successfully",
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        politicalDataYear: 2024,
        religiousDataYear: 2020,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    logger.error("Cultural data pull failed", { error: error instanceof Error ? error.message : String(error) });

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "cultural-data",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "Cultural data pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
