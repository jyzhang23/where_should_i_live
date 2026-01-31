/**
 * Admin API to pull crime data from FBI Crime Data Explorer
 * 
 * POST /api/admin/fbi-crime-pull
 * Body: { password: string }
 * 
 * Data source: FBI Crime Data Explorer (CDE)
 * API: https://api.usa.gov/crime/fbi/cde/
 * 
 * Metrics fetched:
 * - Violent crime rate (per 100K)
 * - Property crime rate (per 100K)
 * - 3-year crime trend (rising/falling/stable)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createAdminLogger } from "@/lib/admin-logger";
import { getProductionGuardResponse, validateAdminPassword, findDataDirectory } from "@/lib/admin/helpers";
import { pullFBICrimeData } from "@/lib/admin/pulls";

const logger = createAdminLogger("fbi-crime-pull");

export async function POST(request: NextRequest) {
  // Block in production
  const guardResponse = getProductionGuardResponse();
  if (guardResponse) return guardResponse;

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate password
    const auth = validateAdminPassword(body.password);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Find data directory
    const dataDir = findDataDirectory();
    if (!dataDir) {
      return NextResponse.json(
        { error: "Data directory not found" },
        { status: 404 }
      );
    }

    logger.info("Starting FBI crime data pull");

    // Use shared pull module
    const result = await pullFBICrimeData(dataDir, (msg) => logger.info(msg));

    // Log to database
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "fbi-crime",
          status: result.success ? "success" : "error",
          recordsUpdated: result.stats?.citiesUpdated ?? 0,
          errorMessage: result.error || (result.stats?.errors ? `Failed: ${(result.stats.errors as string[]).slice(0, 5).join(", ")}` : undefined),
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
      message: "FBI crime data pull complete",
      stats: result.stats,
    });
  } catch (error) {
    logger.error("FBI crime pull failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        error: "Failed to pull FBI crime data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
