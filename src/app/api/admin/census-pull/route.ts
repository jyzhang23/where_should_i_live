/**
 * Admin API to pull demographic data from US Census Bureau ACS
 * 
 * POST /api/admin/census-pull
 * Body: { password: string }
 * 
 * Data source: American Community Survey (ACS) 5-Year Estimates
 * API: https://api.census.gov/data/2022/acs/acs5/profile
 * 
 * Metrics fetched:
 * - Population and age demographics
 * - Race/ethnicity breakdown
 * - Asian subgroup percentages
 * - Educational attainment
 * - Income statistics
 * - Foreign-born percentage
 * - Household composition
 * - Language spoken at home
 */

import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { createAdminLogger } from "@/lib/admin-logger";
import { getProductionGuardResponse, validateAdminPassword, findDataDirectory } from "@/lib/admin/helpers";
import { pullCensusData } from "@/lib/admin/pulls";

const logger = createAdminLogger("census-pull");

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

    logger.info("Starting Census data pull");

    // Use shared pull module
    const result = await pullCensusData(dataDir, (msg) => logger.info(msg));

    // Log the refresh
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "census-demographics",
          status: result.success ? "success" : "error",
          recordsUpdated: result.stats?.citiesUpdated ?? 0,
          errorMessage: result.error || (result.stats?.errors ? `Failed: ${result.stats.errors.join(", ")}` : undefined),
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
      message: "Census data pulled successfully",
      stats: result.stats,
    });
  } catch (error) {
    logger.error("Census pull failed", { error: error instanceof Error ? error.message : String(error) });

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "census-demographics",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "Census pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
