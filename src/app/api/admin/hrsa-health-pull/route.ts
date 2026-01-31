/**
 * Admin API to pull healthcare data from HRSA
 * 
 * POST /api/admin/hrsa-health-pull
 * Body: { password: string }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createAdminLogger } from "@/lib/admin-logger";
import { getProductionGuardResponse, validateAdminPassword, findDataDirectory } from "@/lib/admin/helpers";
import { pullHRSAHealthData } from "@/lib/admin/pulls";

const logger = createAdminLogger("hrsa-health-pull");

export async function POST(request: NextRequest) {
  const guardResponse = getProductionGuardResponse();
  if (guardResponse) return guardResponse;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const auth = validateAdminPassword(body.password);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const dataDir = findDataDirectory();
    if (!dataDir) {
      return NextResponse.json({ error: "Data directory not found" }, { status: 404 });
    }

    logger.info("Starting HRSA health pull");
    const result = await pullHRSAHealthData(dataDir, (msg) => logger.info(msg));

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "hrsa-health",
          status: result.success ? "success" : "error",
          recordsUpdated: result.stats?.citiesUpdated ?? 0,
          errorMessage: result.error,
        },
      });
    } catch (logError) {
      logger.error("Failed to log refresh", { error: String(logError) });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "HRSA health data pull complete", stats: result.stats });
  } catch (error) {
    logger.error("HRSA health pull failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to pull HRSA health data", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
