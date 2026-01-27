import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch all cities with their metrics
    const cities = await prisma.city.findMany({
      include: {
        metrics: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get the last refresh timestamp
    const lastRefresh = await prisma.dataRefreshLog.findFirst({
      where: { status: "success" },
      orderBy: { refreshedAt: "desc" },
    });

    return NextResponse.json({
      cities,
      lastUpdated: lastRefresh?.refreshedAt || null,
      count: cities.length,
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}
