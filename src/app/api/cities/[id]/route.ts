import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { BEAMetrics } from "@/lib/cost-of-living";
import { NOAAClimateData, CensusDemographics } from "@/types/city";

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

    // Merge supplementary data into city metrics
    if (city.metrics && supplementary) {
      const mergedCity = {
        ...city,
        metrics: {
          ...city.metrics,
          ...(supplementary.bea && { bea: supplementary.bea }),
          ...(supplementary.noaa && { noaa: supplementary.noaa }),
          ...(supplementary.census && { census: supplementary.census }),
        },
      };
      return NextResponse.json(mergedCity);
    }

    return NextResponse.json(city);
  } catch (error) {
    console.error("Error fetching city:", error);
    return NextResponse.json(
      { error: "Failed to fetch city" },
      { status: 500 }
    );
  }
}
