/**
 * Admin API to pull Regional Price Parity data from BEA
 * 
 * POST /api/admin/bea-pull
 * Body: { password: string }
 * 
 * Pulls from BEA Regional dataset, MARPP table:
 * - LineCode 1: Real personal income (purchasing power)
 * - LineCode 2: Real per capita personal income (purchasing power per person)
 * - LineCode 3: RPPs: All items (overall cost of living)
 * - LineCode 4: RPPs: Goods
 * - LineCode 5: RPPs: Services: Rents (housing costs)
 * - LineCode 6: RPPs: Services: Utilities
 * - LineCode 7: RPPs: Services: Other
 * 
 * RPP = Regional Price Parity (100 = national average)
 * Values > 100 = more expensive than average
 * Values < 100 = less expensive than average
 * 
 * API: https://apps.bea.gov/API/docs/index.htm
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createAdminLogger } from "@/lib/admin-logger";
import { getProductionGuardResponse, validateAdminPassword, findDataDirectory } from "@/lib/admin/helpers";
import { pullBEAData } from "@/lib/admin/pulls";

const logger = createAdminLogger("bea-pull");

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

    logger.info("Starting BEA data pull");

    // Use shared pull module
    const result = await pullBEAData(dataDir, (msg) => logger.info(msg));

    // Log the refresh
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "bea-api",
          status: result.success ? "success" : "error",
          recordsUpdated: result.stats?.citiesUpdated ?? 0,
          errorMessage: result.error,
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
      message: "BEA Regional Price Parity data pulled successfully",
      stats: result.stats,
    });
  } catch (error) {
    logger.error("BEA pull failed", { error: error instanceof Error ? error.message : String(error) });

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "bea-api",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "BEA pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
