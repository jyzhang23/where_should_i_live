/**
 * Admin API to pull climate data from NOAA ACIS + Open-Meteo
 * 
 * POST /api/admin/climate-pull
 * Body: { password: string }
 * 
 * Data sources:
 * - NOAA ACIS (30-year normals 1991-2020): Temperature, precipitation, degree days, snowfall
 * - Open-Meteo (historical averages): Cloud cover, dewpoint/humidity
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createAdminLogger } from "@/lib/admin-logger";
import { getProductionGuardResponse, validateAdminPassword, findDataDirectory } from "@/lib/admin/helpers";
import { pullClimateData } from "@/lib/admin/pulls";

const logger = createAdminLogger("climate-pull");

export async function POST(request: NextRequest) {
  // Block in production
  const guardResponse = getProductionGuardResponse();
  if (guardResponse) return guardResponse;

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
    const auth = validateAdminPassword(body.password);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    // Find data directory
    const dataDir = findDataDirectory();
    if (!dataDir) {
      return NextResponse.json(
        { error: "Data directory not found" },
        { status: 404 }
      );
    }

    logger.info("Starting climate data pull");

    // Use shared pull module
    const result = await pullClimateData(dataDir, (msg) => logger.info(msg));

    // Log the refresh
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "climate-data",
          status: result.success ? "success" : "error",
          recordsUpdated: (result.stats?.acisUpdated as number) ?? 0,
          errorMessage: result.error || (result.stats?.errors ? `Failed: ${(result.stats.errors as string[]).join(", ")}` : undefined),
        },
      });
    } catch (logError) {
      logger.error("Failed to log refresh", { error: String(logError) });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Climate data pulled successfully",
      stats: result.stats,
    });
  } catch (error) {
    logger.error("Climate pull failed", { error: error instanceof Error ? error.message : String(error) });

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "climate-data",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "Climate pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
