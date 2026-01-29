/**
 * Admin API to pull walkability data from EPA National Walkability Index
 * 
 * POST /api/admin/walkscore-pull
 * Body: { password: string }
 * 
 * Data source: EPA National Walkability Index (ArcGIS Open Data)
 * API: https://geodata.epa.gov/arcgis/rest/services/OA/WalkabilityIndex/MapServer
 * 
 * Metrics fetched:
 * - National Walkability Index (1-20, converted to 0-100 scale)
 * - Transit accessibility component
 * - Employment mix component
 * - Description based on index
 * 
 * Note: Free public API, no registration required
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { QoLMetrics } from "@/types/city";
import { getFallbackData } from "@/lib/cityAliases";
import { createAdminLogger } from "@/lib/admin-logger";

const logger = createAdminLogger("walkscore-pull");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";

// EPA National Walkability Index ArcGIS endpoint
const EPA_WALKABILITY_URL = "https://geodata.epa.gov/arcgis/rest/services/OA/WalkabilityIndex/MapServer/0/query";

interface CityData {
  id: string;
  name: string;
  state: string;
  latitude?: number;
  longitude?: number;
}

interface WalkabilityData {
  walkScore: number | null;
  bikeScore: number | null;
  transitScore: number | null;
  description: string | null;
  updatedAt: string | null;
}

// Pre-populated walkability data for major cities
// Source: Manually researched from walkscore.com (January 2025)
// Transit scores are manual because EPA Smart Location Database metrics (D4A, D4C, D5BR)
// proved too noisy at metro scale - suburban census blocks dilute city-center scores.
// Walk/Bike scores now come from EPA API; transit uses this fallback data.
const CITY_WALKSCORE_DATA: Record<string, WalkabilityData> = {
  "san-francisco": { walkScore: 88, bikeScore: 72, transitScore: 80, description: "Very Walkable", updatedAt: null },
  "seattle": { walkScore: 74, bikeScore: 70, transitScore: 64, description: "Very Walkable", updatedAt: null },
  "new-york-city": { walkScore: 88, bikeScore: 69, transitScore: 89, description: "Very Walkable", updatedAt: null },
  "los-angeles": { walkScore: 68, bikeScore: 58, transitScore: 53, description: "Somewhat Walkable", updatedAt: null },
  "sacramento": { walkScore: 45, bikeScore: 71, transitScore: 30, description: "Car-Dependent", updatedAt: null },
  "boston": { walkScore: 81, bikeScore: 69, transitScore: 74, description: "Very Walkable", updatedAt: null },
  "portland": { walkScore: 66, bikeScore: 82, transitScore: 51, description: "Somewhat Walkable", updatedAt: null },
  "las-vegas": { walkScore: 41, bikeScore: 43, transitScore: 31, description: "Car-Dependent", updatedAt: null },
  "denver": { walkScore: 60, bikeScore: 71, transitScore: 46, description: "Somewhat Walkable", updatedAt: null },
  "austin": { walkScore: 42, bikeScore: 51, transitScore: 34, description: "Car-Dependent", updatedAt: null },
  "phoenix": { walkScore: 40, bikeScore: 55, transitScore: 29, description: "Car-Dependent", updatedAt: null },
  "san-diego": { walkScore: 51, bikeScore: 50, transitScore: 37, description: "Somewhat Walkable", updatedAt: null },
  "miami": { walkScore: 78, bikeScore: 64, transitScore: 57, description: "Very Walkable", updatedAt: null },
  "dallas": { walkScore: 46, bikeScore: 44, transitScore: 39, description: "Car-Dependent", updatedAt: null },
  "houston": { walkScore: 48, bikeScore: 50, transitScore: 36, description: "Car-Dependent", updatedAt: null },
  "atlanta": { walkScore: 48, bikeScore: 44, transitScore: 48, description: "Car-Dependent", updatedAt: null },
  "chicago": { walkScore: 78, bikeScore: 72, transitScore: 65, description: "Very Walkable", updatedAt: null },
  "detroit": { walkScore: 55, bikeScore: 54, transitScore: 32, description: "Somewhat Walkable", updatedAt: null },
  "minneapolis": { walkScore: 69, bikeScore: 81, transitScore: 55, description: "Somewhat Walkable", updatedAt: null },
  "philadelphia": { walkScore: 79, bikeScore: 67, transitScore: 67, description: "Very Walkable", updatedAt: null },
  "washington-dc": { walkScore: 77, bikeScore: 69, transitScore: 69, description: "Very Walkable", updatedAt: null },
  "raleigh": { walkScore: 29, bikeScore: 35, transitScore: 17, description: "Car-Dependent", updatedAt: null },
  "charlotte": { walkScore: 26, bikeScore: 30, transitScore: 21, description: "Car-Dependent", updatedAt: null },
  "nashville": { walkScore: 28, bikeScore: 28, transitScore: 23, description: "Car-Dependent", updatedAt: null },
  "san-antonio": { walkScore: 37, bikeScore: 45, transitScore: 28, description: "Car-Dependent", updatedAt: null },
  "kansas-city": { walkScore: 34, bikeScore: 45, transitScore: 26, description: "Car-Dependent", updatedAt: null },
  "indianapolis": { walkScore: 30, bikeScore: 41, transitScore: 22, description: "Car-Dependent", updatedAt: null },
  "columbus": { walkScore: 34, bikeScore: 47, transitScore: 26, description: "Car-Dependent", updatedAt: null },
  "salt-lake-city": { walkScore: 56, bikeScore: 75, transitScore: 42, description: "Somewhat Walkable", updatedAt: null },
  "pittsburgh": { walkScore: 62, bikeScore: 40, transitScore: 52, description: "Somewhat Walkable", updatedAt: null },
  "cincinnati": { walkScore: 49, bikeScore: 46, transitScore: 38, description: "Car-Dependent", updatedAt: null },
  "cleveland": { walkScore: 59, bikeScore: 51, transitScore: 45, description: "Somewhat Walkable", updatedAt: null },
  "st-louis": { walkScore: 62, bikeScore: 58, transitScore: 45, description: "Somewhat Walkable", updatedAt: null },
  "tampa-bay": { walkScore: 49, bikeScore: 56, transitScore: 28, description: "Car-Dependent", updatedAt: null },
  "orlando": { walkScore: 42, bikeScore: 53, transitScore: 26, description: "Car-Dependent", updatedAt: null },
  "baltimore": { walkScore: 67, bikeScore: 53, transitScore: 54, description: "Somewhat Walkable", updatedAt: null },
  "milwaukee": { walkScore: 62, bikeScore: 64, transitScore: 49, description: "Somewhat Walkable", updatedAt: null },
  "albuquerque": { walkScore: 42, bikeScore: 61, transitScore: 26, description: "Car-Dependent", updatedAt: null },
  "tucson": { walkScore: 41, bikeScore: 65, transitScore: 28, description: "Car-Dependent", updatedAt: null },
  "oklahoma-city": { walkScore: 33, bikeScore: 43, transitScore: 14, description: "Car-Dependent", updatedAt: null },
  "boise": { walkScore: 39, bikeScore: 62, transitScore: 18, description: "Car-Dependent", updatedAt: null },
  "gainesville": { walkScore: 35, bikeScore: 68, transitScore: 22, description: "Car-Dependent", updatedAt: null },
  "santa-barbara": { walkScore: 68, bikeScore: 76, transitScore: 38, description: "Somewhat Walkable", updatedAt: null },
  // Additional cities (verified from walkscore.com 2024)
  "jacksonville": { walkScore: 26, bikeScore: 42, transitScore: 22, description: "Car-Dependent", updatedAt: null },      // 50th most walkable large city
  "new-orleans": { walkScore: 58, bikeScore: 62, transitScore: 48, description: "Somewhat Walkable", updatedAt: null },   // French Quarter much higher
  "buffalo": { walkScore: 67, bikeScore: 60, transitScore: 50, description: "Somewhat Walkable", updatedAt: null },       // Downtown scores 89+
  "green-bay": { walkScore: 42, bikeScore: 47, transitScore: 28, description: "Car-Dependent", updatedAt: null },         // Downtown is 82
  "memphis": { walkScore: 35, bikeScore: 45, transitScore: 30, description: "Car-Dependent", updatedAt: null },           // 40th most walkable, downtown 89
};

/**
 * Convert EPA Walkability Index (1-20) to Walk Score equivalent (0-100)
 */
function convertIndexToScore(index: number): number {
  // EPA index: 1 = least walkable, 20 = most walkable
  // Walk Score: 0 = car-dependent, 100 = walker's paradise
  return Math.round(((index - 1) / 19) * 100);
}

/**
 * Get description based on walkability score
 */
function getWalkabilityDescription(score: number): string {
  if (score >= 90) return "Walker's Paradise";
  if (score >= 70) return "Very Walkable";
  if (score >= 50) return "Somewhat Walkable";
  if (score >= 25) return "Car-Dependent";
  return "Almost All Errands Require a Car";
}

/**
 * Fetch walkability data from EPA National Walkability Index API
 */
async function fetchEPAWalkabilityData(
  latitude: number,
  longitude: number
): Promise<WalkabilityData | null> {
  try {
    // Query EPA ArcGIS for walkability data at the given point
    // Use a larger buffer to get a more representative sample of the metro area
    // (not just downtown which has transit even in car-dependent cities)
    const buffer = 0.05; // ~5km buffer for better metro-level sampling
    const geometry = JSON.stringify({
      xmin: longitude - buffer,
      ymin: latitude - buffer,
      xmax: longitude + buffer,
      ymax: latitude + buffer,
      spatialReference: { wkid: 4326 }
    });

    const params = new URLSearchParams({
      geometry: geometry,
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      // NatWalkInd: National Walkability Index (1-20)
      // D3B: Street intersection density (for bikeability)
      // TotPop: Population weight for averaging
      // Note: Transit fields (D4A, D4C, D5BR) excluded - too noisy at metro scale
      outFields: "NatWalkInd,D3B,TotPop,Ac_Total",
      returnGeometry: "false",
      f: "json"
    });

    const url = `${EPA_WALKABILITY_URL}?${params.toString()}`;
    logger.debug("Fetching EPA Walkability Index");
    
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      logger.warn("EPA Walkability API error", { status: response.status });
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      logger.debug("No EPA walkability data found");
      return null;
    }

    // Average walkability across all matching census block groups, weighted by population
    let totalWeight = 0;
    let weightedWalkIndex = 0;
    let weightedD3B = 0; // Street intersection density

    for (const feature of data.features) {
      const attrs = feature.attributes;
      const pop = attrs.TotPop || 1;
      
      if (attrs.NatWalkInd !== null && attrs.NatWalkInd !== undefined) {
        weightedWalkIndex += attrs.NatWalkInd * pop;
        totalWeight += pop;
      }
      
      // D3B = Street intersection density (proxy for bikeability)
      if (attrs.D3B !== null && attrs.D3B !== undefined) {
        weightedD3B += attrs.D3B * pop;
      }
    }

    if (totalWeight === 0) {
      return null;
    }

    const avgWalkIndex = weightedWalkIndex / totalWeight;
    const avgD3B = weightedD3B / totalWeight;

    // Convert to Walk Score scale (0-100)
    const walkScore = Math.max(0, Math.min(100, convertIndexToScore(avgWalkIndex)));
    
    // Bike score: based on walk score and intersection density
    // D3B typical range is 0-200, higher = more bikeable
    const intersectionBonus = Math.min(10, avgD3B / 20);
    const bikeScore = Math.max(0, Math.min(100, Math.round(walkScore * 0.85 + intersectionBonus)));
    
    // Note: EPA Smart Location Database transit metrics (D4A, D4C, D5BR) are too noisy
    // at metro scale - suburban areas dilute city-center scores significantly.
    // Transit scores will be sourced from verified Walk Score fallback data instead.
    // The EPA data is best for walkability (NatWalkInd) which we do use above.
    
    return {
      walkScore,
      bikeScore,
      transitScore: null, // Will be filled from Walk Score fallback data
      description: getWalkabilityDescription(walkScore),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("EPA Walkability API error", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate password
    if (body.password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find data directory
    const possiblePaths = [
      join(process.cwd(), "data"),
      join(process.cwd(), "../data"),
    ];

    let dataDir: string | null = null;
    for (const p of possiblePaths) {
      if (existsSync(join(p, "cities.json"))) {
        dataDir = p;
        break;
      }
    }

    if (!dataDir) {
      return NextResponse.json(
        { error: "Data directory not found" },
        { status: 404 }
      );
    }

    // Load cities
    const citiesPath = join(dataDir, "cities.json");
    const citiesFile = JSON.parse(readFileSync(citiesPath, "utf-8"));
    const cities: CityData[] = citiesFile.cities;

    // Load existing metrics
    const metricsPath = join(dataDir, "metrics.json");
    let metricsFile: {
      cities: Record<string, { qol?: Partial<QoLMetrics>; [key: string]: unknown }>;
      sources?: Record<string, unknown>;
      lastUpdated?: string;
    };

    if (existsSync(metricsPath)) {
      metricsFile = JSON.parse(readFileSync(metricsPath, "utf-8"));
    } else {
      metricsFile = { cities: {} };
    }

    // Process each city
    let successCount = 0;
    let skipCount = 0;
    let apiCount = 0;
    let fallbackCount = 0;
    const errors: string[] = [];
    const fallbackCities: string[] = [];

    logger.info("Processing cities for EPA Walkability Index data", { cityCount: cities.length });

    for (const city of cities) {
      logger.debug("Processing city", { city: city.name, state: city.state });
      
      try {
        let walkabilityData: WalkabilityData | null = null;
        let usedFallback = false;

        // Try EPA API first if we have coordinates
        if (city.latitude && city.longitude) {
          walkabilityData = await fetchEPAWalkabilityData(
            city.latitude,
            city.longitude
          );
          
          if (walkabilityData) {
            apiCount++;
          }
          
          // Rate limiting for EPA API
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Fallback to pre-populated data with fuzzy matching
        if (!walkabilityData) {
          walkabilityData = getFallbackData(city.id, CITY_WALKSCORE_DATA);
          if (walkabilityData) {
            usedFallback = true;
            fallbackCount++;
            fallbackCities.push(city.name);
          }
        }

        if (!walkabilityData) {
          logger.warn("No walkability data available", { city: city.id });
          skipCount++;
          continue;
        }

        // Initialize city metrics if not exists
        if (!metricsFile.cities[city.id]) {
          metricsFile.cities[city.id] = {};
        }

        // Initialize qol if not exists
        if (!metricsFile.cities[city.id].qol) {
          metricsFile.cities[city.id].qol = {
            walkability: null,
            crime: null,
            airQuality: null,
            broadband: null,
            education: null,
            health: null,
          };
        }

        // Get fallback transit score if EPA data doesn't have one
        let transitScore = walkabilityData.transitScore;
        if (transitScore === null || transitScore === undefined) {
          const fallback = getFallbackData(city.id, CITY_WALKSCORE_DATA);
          transitScore = fallback?.transitScore ?? null;
        }
        
        // Ensure all scores are bounded 0-100
        const boundScore = (s: number | null) => s === null ? null : Math.max(0, Math.min(100, s));
        
        // Update walkability data
        metricsFile.cities[city.id].qol!.walkability = {
          walkScore: boundScore(walkabilityData.walkScore),
          bikeScore: boundScore(walkabilityData.bikeScore),
          transitScore: boundScore(transitScore),
          description: walkabilityData.description,
          updatedAt: walkabilityData.updatedAt || new Date().toISOString(),
        };

        successCount++;
        logger.debug("Updated city", { city: city.name, walk: walkabilityData.walkScore, bike: walkabilityData.bikeScore, transit: walkabilityData.transitScore, fallback: usedFallback });
      } catch (error) {
        logger.error("Error processing city", { city: city.name, error: error instanceof Error ? error.message : String(error) });
        errors.push(`${city.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Update metadata
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources["walkability"] = {
      name: "EPA National Walkability Index",
      url: "https://www.epa.gov/smartgrowth/smart-location-mapping#walkability",
      description: "Walkability scores based on intersection density, transit access, and employment mix",
      dataSource: apiCount > 0 ? "EPA ArcGIS API" : "Pre-populated data",
      lastUpdated: new Date().toISOString(),
    };
    metricsFile.lastUpdated = new Date().toISOString();

    // Save metrics
    writeFileSync(metricsPath, JSON.stringify(metricsFile, null, 2));

    // Log to database
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "epa-walkability",
          status: successCount > 0 ? "success" : "error",
          recordsUpdated: successCount,
          errorMessage: errors.length > 0 ? `Failed: ${errors.slice(0, 5).join(", ")}` : undefined,
        },
      });
    } catch (logError) {
      logger.error("Failed to log refresh", { error: String(logError) });
    }

    return NextResponse.json({
      success: true,
      message: `EPA Walkability Index data pull complete`,
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        citiesUsedFallback: fallbackCount,
        fallbackCities: fallbackCities.length > 0 && fallbackCities.length <= 15 ? fallbackCities : undefined,
        apiCalls: apiCount,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
    });
  } catch (error) {
    logger.error("EPA Walkability pull failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        error: "Failed to pull EPA Walkability data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
