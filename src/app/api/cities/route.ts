import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { BEAMetrics } from "@/lib/cost-of-living";
import { NOAAClimateData } from "@/types/city";

export const dynamic = "force-dynamic";

// Convert city name to slug (e.g., "San Francisco" -> "san-francisco")
function cityNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

interface MetricsJsonData {
  bea?: BEAMetrics;
  noaa?: NOAAClimateData;
}

// Load supplementary data from metrics.json (BEA, NOAA, etc.)
function loadMetricsData(): Record<string, MetricsJsonData> {
  const possiblePaths = [
    join(process.cwd(), "data", "metrics.json"),
    join(process.cwd(), "../data", "metrics.json"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        const metricsFile = JSON.parse(readFileSync(path, "utf-8"));
        const metricsData: Record<string, MetricsJsonData> = {};
        
        // Extract supplementary data for each city
        for (const [cityId, cityMetrics] of Object.entries(metricsFile.cities || {})) {
          const metrics = cityMetrics as { 
            bea?: BEAMetrics;
            climate?: { noaa?: NOAAClimateData };
          };
          
          metricsData[cityId] = {};
          
          if (metrics.bea) {
            metricsData[cityId].bea = metrics.bea;
          }
          
          // NOAA data is nested under climate.noaa
          if (metrics.climate?.noaa) {
            metricsData[cityId].noaa = metrics.climate.noaa;
          }
        }
        
        return metricsData;
      } catch (error) {
        console.error("Error loading metrics data:", error);
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

    // Load supplementary data from metrics.json (BEA, NOAA, etc.)
    const metricsData = loadMetricsData();

    // Merge supplementary data into city metrics (using slug derived from city name)
    const citiesWithData = cities.map((city) => {
      const slug = cityNameToSlug(city.name);
      const supplementary = metricsData[slug];
      
      if (city.metrics && supplementary) {
        return {
          ...city,
          metrics: {
            ...city.metrics,
            ...(supplementary.bea && { bea: supplementary.bea }),
            ...(supplementary.noaa && { noaa: supplementary.noaa }),
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
      cities: citiesWithData,
      lastUpdated: lastRefresh?.refreshedAt || null,
      count: citiesWithData.length,
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}
