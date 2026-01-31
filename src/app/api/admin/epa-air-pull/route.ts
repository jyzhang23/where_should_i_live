/**
 * Admin API to pull air quality data from EPA AQS
 * 
 * POST /api/admin/epa-air-pull
 * Body: { password: string }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createAdminLogger } from "@/lib/admin-logger";
import { getProductionGuardResponse, validateAdminPassword, findDataDirectory } from "@/lib/admin/helpers";
import { pullEPAAirData } from "@/lib/admin/pulls";

const logger = createAdminLogger("epa-air-pull");

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

    logger.info("Starting EPA air quality pull");
    const result = await pullEPAAirData(dataDir, (msg) => logger.info(msg));

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "epa-air-quality",
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

    return NextResponse.json({ success: true, message: "EPA air quality data pull complete", stats: result.stats });
  } catch (error) {
    logger.error("EPA air quality pull failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to pull EPA air quality data", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
