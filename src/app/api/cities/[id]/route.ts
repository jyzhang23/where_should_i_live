import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { BEAMetrics } from "@/lib/cost-of-living";
import { NOAAClimateData, CensusDemographics, QoLMetrics, CulturalMetrics } from "@/types/city";

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

// Load ZHVI price for a specific city
function loadCityZHVIPrice(citySlug: string): number | null {
  const possiblePaths = [
    join(process.cwd(), "data", "zhvi-history.json"),
    join(process.cwd(), "../data", "zhvi-history.json"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        const zhviFile = JSON.parse(readFileSync(path, "utf-8"));
        const cityData = zhviFile.cities?.[citySlug] as { history?: { date: string; value: number }[] } | undefined;
        
        if (cityData?.history && cityData.history.length > 0) {
          // Get the latest value
          const latest = cityData.history[cityData.history.length - 1];
          return latest.value;
        }
      } catch (error) {
        console.error("Error loading ZHVI data:", error);
      }
    }
  }
  
  return null;
}

// Load supplementary data from metrics.json for a specific city
function loadCityMetricsData(citySlug: string): MetricsJsonData | null {
  const possiblePaths = [
    join(process.cwd(), "data", "metrics.json"),
    join(process.cwd(), "../data", "metrics.json"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        const metricsFile = JSON.parse(readFileSync(path, "utf-8"));
        const cityMetrics = metricsFile.cities?.[citySlug] as {
          bea?: BEAMetrics;
          climate?: { noaa?: NOAAClimateData };
          census?: CensusDemographics;
          qol?: QoLMetrics;
          cultural?: CulturalMetrics;
        } | undefined;

        if (!cityMetrics) {
          return null;
        }

        const result: MetricsJsonData = {};
        
        if (cityMetrics.bea) {
          result.bea = cityMetrics.bea;
        }
        
        // NOAA data is nested under climate.noaa
        if (cityMetrics.climate?.noaa) {
          result.noaa = cityMetrics.climate.noaa;
        }
        
        // Census demographics data
        if (cityMetrics.census) {
          result.census = cityMetrics.census;
        }
        
        // Quality of Life API data
        if (cityMetrics.qol) {
          result.qol = cityMetrics.qol;
        }
        
        // Cultural data (political lean, religious composition)
        if (cityMetrics.cultural) {
          result.cultural = cityMetrics.cultural;
        }
        
        return result;
      } catch (error) {
        console.error("Error loading metrics data:", error);
      }
    }
  }
  
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const city = await prisma.city.findUnique({
      where: { id },
      include: {
        metrics: true,
        zhviHistory: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!city) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    // Load supplementary data from metrics.json (BEA, NOAA, etc.)
    const slug = cityNameToSlug(city.name);
    const supplementary = loadCityMetricsData(slug);
    
    // Load ZHVI price for median home price
    const zhviPrice = loadCityZHVIPrice(slug);

    // Always merge supplementary data and ZHVI price into city metrics
    const mergedMetrics = {
      ...city.metrics,
      // Use ZHVI price if available
      medianHomePrice: zhviPrice ?? city.metrics?.medianHomePrice ?? null,
      ...(supplementary?.bea && { bea: supplementary.bea }),
      ...(supplementary?.noaa && { noaa: supplementary.noaa }),
      ...(supplementary?.census && { census: supplementary.census }),
      ...(supplementary?.qol && { qol: supplementary.qol }),
      ...(supplementary?.cultural && { cultural: supplementary.cultural }),
    };
    
    return NextResponse.json({
      ...city,
      metrics: mergedMetrics,
    });
  } catch (error) {
    console.error("Error fetching city:", error);
    return NextResponse.json(
      { error: "Failed to fetch city" },
      { status: 500 }
    );
  }
}
