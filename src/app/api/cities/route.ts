import { NextResponse } from "next/server";
import { readFile, access } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { BEAMetrics } from "@/lib/cost-of-living";
import { NOAAClimateData, CensusDemographics, QoLMetrics, CulturalMetrics } from "@/types/city";

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
  census?: CensusDemographics;
  qol?: QoLMetrics;
  cultural?: CulturalMetrics;
}

// Helper to check if a file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

// Load ZHVI history data for median home prices (async)
async function loadZHVIData(): Promise<Record<string, number>> {
  const possiblePaths = [
    join(process.cwd(), "data", "zhvi-history.json"),
    join(process.cwd(), "../data", "zhvi-history.json"),
  ];

  for (const path of possiblePaths) {
    if (await fileExists(path)) {
      try {
        const content = await readFile(path, "utf-8");
        const zhviFile = JSON.parse(content);
        const latestPrices: Record<string, number> = {};
        
        for (const [cityId, data] of Object.entries(zhviFile.cities || {})) {
          const cityData = data as { history?: { date: string; value: number }[] };
          if (cityData.history && cityData.history.length > 0) {
            // Get the latest value
            const latest = cityData.history[cityData.history.length - 1];
            latestPrices[cityId] = latest.value;
          }
        }
        
        return latestPrices;
      } catch (error) {
        console.error("Error loading ZHVI data:", error);
      }
    }
  }
  
  return {};
}

// Load supplementary data from metrics.json (BEA, NOAA, Census, QoL, Cultural, etc.) (async)
async function loadMetricsData(): Promise<Record<string, MetricsJsonData>> {
  const possiblePaths = [
    join(process.cwd(), "data", "metrics.json"),
    join(process.cwd(), "../data", "metrics.json"),
  ];

  for (const path of possiblePaths) {
    if (await fileExists(path)) {
      try {
        const content = await readFile(path, "utf-8");
        const metricsFile = JSON.parse(content);
        const metricsData: Record<string, MetricsJsonData> = {};
        
        // Extract supplementary data for each city
        for (const [cityId, cityMetrics] of Object.entries(metricsFile.cities || {})) {
          const metrics = cityMetrics as { 
            bea?: BEAMetrics;
            climate?: { noaa?: NOAAClimateData };
            census?: CensusDemographics;
            qol?: QoLMetrics;
            cultural?: CulturalMetrics;
          };
          
          metricsData[cityId] = {};
          
          if (metrics.bea) {
            metricsData[cityId].bea = metrics.bea;
          }
          
          // NOAA data is nested under climate.noaa
          if (metrics.climate?.noaa) {
            metricsData[cityId].noaa = metrics.climate.noaa;
          }
          
          // Census demographics data
          if (metrics.census) {
            metricsData[cityId].census = metrics.census;
          }
          
          // Quality of Life API data
          if (metrics.qol) {
            metricsData[cityId].qol = metrics.qol;
          }
          
          // Cultural data (political lean, religious composition)
          if (metrics.cultural) {
            metricsData[cityId].cultural = metrics.cultural;
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

    // Load supplementary data from JSON files in parallel (async)
    const [metricsData, zhviPrices] = await Promise.all([
      loadMetricsData(),
      loadZHVIData(),
    ]);

    // Merge supplementary data into city metrics (using slug derived from city name)
    const citiesWithData = cities.map((city) => {
      const slug = cityNameToSlug(city.name);
      const supplementary = metricsData[slug];
      const zhviPrice = zhviPrices[slug];
      
      // Build merged metrics
      const mergedMetrics = {
        ...city.metrics,
        // medianHomePrice comes from ZHVI history (latest price)
        medianHomePrice: zhviPrice ?? null,
        ...(supplementary?.bea && { bea: supplementary.bea }),
        ...(supplementary?.noaa && { noaa: supplementary.noaa }),
        ...(supplementary?.census && { census: supplementary.census }),
        ...(supplementary?.qol && { qol: supplementary.qol }),
        ...(supplementary?.cultural && { cultural: supplementary.cultural }),
      };
      
      return {
        ...city,
        metrics: mergedMetrics,
      };
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to fetch cities",
        details: errorMessage,
        hint: "Check DATABASE_URL environment variable in Vercel"
      },
      { status: 500 }
    );
  }
}
