/**
 * Admin API to pull quality of life data from Teleport API
 * 
 * POST /api/admin/teleport-pull
 * Body: { password: string }
 * 
 * Pulls scores for:
 * - Housing
 * - Cost of Living  
 * - Taxation
 * 
 * API: https://developers.teleport.org/api/
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";

interface CityData {
  id: string;
  name: string;
  teleportSlug: string | null;
}

interface TeleportCategory {
  name: string;
  score_out_of_10: number;
}

interface TeleportScores {
  categories: TeleportCategory[];
  teleport_city_score: number;
}

interface TeleportData {
  housing: number | null;
  costOfLiving: number | null;
  taxation: number | null;
  teleportScore: number | null;
}

async function fetchTeleportScores(slug: string): Promise<TeleportData | null> {
  try {
    const url = `https://api.teleport.org/api/urban_areas/slug:${slug}/scores/`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/vnd.teleport.v1+json"
      }
    });

    if (!response.ok) {
      console.log(`  Teleport API returned ${response.status} for ${slug}`);
      return null;
    }

    const data: TeleportScores = await response.json();

    // Extract the scores we care about
    const getScore = (name: string): number | null => {
      const cat = data.categories.find(c => c.name === name);
      return cat ? cat.score_out_of_10 : null;
    };

    return {
      housing: getScore("Housing"),
      costOfLiving: getScore("Cost of Living"),
      taxation: getScore("Taxation"),
      teleportScore: data.teleport_city_score || null,
    };
  } catch (error) {
    console.error(`  Error fetching Teleport data for ${slug}:`, error);
    return null;
  }
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
    const citiesFile = JSON.parse(readFileSync(join(dataDir, "cities.json"), "utf-8"));
    const metricsFile = JSON.parse(readFileSync(join(dataDir, "metrics.json"), "utf-8"));
    
    const cities: CityData[] = citiesFile.cities;

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Process each city with a Teleport slug
    for (const city of cities) {
      if (!city.teleportSlug) {
        console.log(`Skipping ${city.name} - no Teleport slug`);
        skipCount++;
        continue;
      }

      console.log(`Fetching Teleport data for ${city.name} (${city.teleportSlug})...`);
      const scores = await fetchTeleportScores(city.teleportSlug);

      if (scores) {
        // Update metrics.json
        if (!metricsFile.cities[city.id]) {
          metricsFile.cities[city.id] = {};
        }
        
        // Add teleport section to metrics
        metricsFile.cities[city.id].teleport = {
          housing: scores.housing,
          costOfLiving: scores.costOfLiving,
          taxation: scores.taxation,
          overallScore: scores.teleportScore,
          lastUpdated: new Date().toISOString().split("T")[0],
        };

        successCount++;
        console.log(`  ✓ Housing: ${scores.housing?.toFixed(1)}, CoL: ${scores.costOfLiving?.toFixed(1)}, Tax: ${scores.taxation?.toFixed(1)}`);
      } else {
        errorCount++;
      }

      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Update metrics source info
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources.teleport = "Teleport Quality of Life API";
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
          source: "teleport-api",
          status: "success",
          recordsUpdated: successCount,
        },
      });
    } catch (logError) {
      console.error("Failed to log refresh:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Teleport data pulled successfully",
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        citiesErrored: errorCount,
      },
    });

  } catch (error) {
    console.error("Teleport pull error:", error);

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "teleport-api",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "Teleport pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
