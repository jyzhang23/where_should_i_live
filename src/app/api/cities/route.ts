import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { BEAMetrics } from "@/lib/cost-of-living";

export const dynamic = "force-dynamic";

// Load BEA data from metrics.json
function loadBEAData(): Record<string, BEAMetrics> {
  const possiblePaths = [
    join(process.cwd(), "data", "metrics.json"),
    join(process.cwd(), "../data", "metrics.json"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        const metricsFile = JSON.parse(readFileSync(path, "utf-8"));
        const beaData: Record<string, BEAMetrics> = {};
        
        // Extract BEA data for each city
        for (const [cityId, cityMetrics] of Object.entries(metricsFile.cities || {})) {
          const metrics = cityMetrics as { bea?: BEAMetrics };
          if (metrics.bea) {
            beaData[cityId] = metrics.bea;
          }
        }
        
        return beaData;
      } catch (error) {
        console.error("Error loading BEA data:", error);
      }
    }
  }
  
  return {};
}

export async function GET() {
  try {
    // Fetch all cities with their metrics from database
    const cities = await prisma.city.findMany({
      include: {
        metrics: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Load BEA data from metrics.json
    const beaData = loadBEAData();

    // Merge BEA data into city metrics
    const citiesWithBEA = cities.map((city) => {
      if (city.metrics && beaData[city.id]) {
        return {
          ...city,
          metrics: {
            ...city.metrics,
            bea: beaData[city.id],
          },
        };
      }
      return city;
    });

    // Get the last refresh timestamp
    const lastRefresh = await prisma.dataRefreshLog.findFirst({
      where: { status: "success" },
      orderBy: { refreshedAt: "desc" },
    });

    return NextResponse.json({
      cities: citiesWithBEA,
      lastUpdated: lastRefresh?.refreshedAt || null,
      count: citiesWithBEA.length,
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}
