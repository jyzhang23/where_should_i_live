/**
 * Admin API to pull education data from NCES (National Center for Education Statistics)
 * 
 * POST /api/admin/nces-education-pull
 * Body: { password: string }
 * 
 * Data source: NCES EDGE (Education Demographic and Geographic Estimates)
 * API: https://data-nces.opendata.arcgis.com/
 * 
 * Metrics fetched:
 * - Student-teacher ratio
 * - Graduation rate
 * - School count
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { QoLMetrics } from "@/types/city";
import { getFallbackData } from "@/lib/cityAliases";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";

// NCES ArcGIS REST API endpoint
// School District Characteristics data
const NCES_API_BASE = "https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services";

interface CityData {
  id: string;
  name: string;
  state: string;
  latitude?: number;
  longitude?: number;
  censusFips?: {
    state: string;
    place: string;
  };
}

interface EducationData {
  studentTeacherRatio: number | null;
  graduationRate: number | null;
  schoolCount: number | null;
}

// Pre-populated education data for major cities
// Source: NCES Common Core of Data and state education reports (2023)
// National average student-teacher ratio: ~16:1
// National average graduation rate: ~88%
const CITY_EDUCATION_DATA: Record<string, EducationData> = {
  "san-francisco": { studentTeacherRatio: 21, graduationRate: 87, schoolCount: 135 },
  "seattle": { studentTeacherRatio: 18, graduationRate: 83, schoolCount: 110 },
  "new-york-city": { studentTeacherRatio: 13, graduationRate: 82, schoolCount: 1800 },
  "los-angeles": { studentTeacherRatio: 22, graduationRate: 82, schoolCount: 900 },
  "sacramento": { studentTeacherRatio: 23, graduationRate: 86, schoolCount: 80 },
  "boston": { studentTeacherRatio: 12, graduationRate: 78, schoolCount: 135 },
  "portland": { studentTeacherRatio: 20, graduationRate: 81, schoolCount: 95 },
  "las-vegas": { studentTeacherRatio: 21, graduationRate: 84, schoolCount: 360 },
  "denver": { studentTeacherRatio: 16, graduationRate: 73, schoolCount: 220 },
  "austin": { studentTeacherRatio: 14, graduationRate: 89, schoolCount: 130 },
  "phoenix": { studentTeacherRatio: 19, graduationRate: 81, schoolCount: 240 },
  "san-diego": { studentTeacherRatio: 22, graduationRate: 87, schoolCount: 225 },
  "miami": { studentTeacherRatio: 16, graduationRate: 85, schoolCount: 470 },
  "dallas": { studentTeacherRatio: 14, graduationRate: 87, schoolCount: 230 },
  "houston": { studentTeacherRatio: 15, graduationRate: 85, schoolCount: 290 },
  "atlanta": { studentTeacherRatio: 15, graduationRate: 74, schoolCount: 105 },
  "chicago": { studentTeacherRatio: 15, graduationRate: 82, schoolCount: 650 },
  "detroit": { studentTeacherRatio: 16, graduationRate: 80, schoolCount: 140 },
  "minneapolis": { studentTeacherRatio: 16, graduationRate: 72, schoolCount: 100 },
  "philadelphia": { studentTeacherRatio: 15, graduationRate: 73, schoolCount: 340 },
  "washington-dc": { studentTeacherRatio: 12, graduationRate: 70, schoolCount: 230 },
  "raleigh": { studentTeacherRatio: 14, graduationRate: 90, schoolCount: 195 },
  "charlotte": { studentTeacherRatio: 15, graduationRate: 88, schoolCount: 185 },
  "nashville": { studentTeacherRatio: 14, graduationRate: 82, schoolCount: 170 },
  "san-antonio": { studentTeacherRatio: 14, graduationRate: 88, schoolCount: 270 },
  "kansas-city": { studentTeacherRatio: 14, graduationRate: 74, schoolCount: 90 },
  "indianapolis": { studentTeacherRatio: 15, graduationRate: 78, schoolCount: 160 },
  "columbus": { studentTeacherRatio: 16, graduationRate: 82, schoolCount: 130 },
  "salt-lake-city": { studentTeacherRatio: 22, graduationRate: 90, schoolCount: 65 },
  "pittsburgh": { studentTeacherRatio: 13, graduationRate: 83, schoolCount: 80 },
  "cincinnati": { studentTeacherRatio: 15, graduationRate: 77, schoolCount: 85 },
  "cleveland": { studentTeacherRatio: 15, graduationRate: 71, schoolCount: 115 },
  "st-louis": { studentTeacherRatio: 14, graduationRate: 70, schoolCount: 85 },
  "tampa-bay": { studentTeacherRatio: 15, graduationRate: 87, schoolCount: 275 },
  "orlando": { studentTeacherRatio: 15, graduationRate: 89, schoolCount: 205 },
  "baltimore": { studentTeacherRatio: 14, graduationRate: 72, schoolCount: 195 },
  "milwaukee": { studentTeacherRatio: 14, graduationRate: 65, schoolCount: 180 },
  "albuquerque": { studentTeacherRatio: 15, graduationRate: 75, schoolCount: 145 },
  "tucson": { studentTeacherRatio: 17, graduationRate: 78, schoolCount: 125 },
  "oklahoma-city": { studentTeacherRatio: 16, graduationRate: 81, schoolCount: 115 },
  "boise": { studentTeacherRatio: 18, graduationRate: 89, schoolCount: 60 },
  "gainesville": { studentTeacherRatio: 14, graduationRate: 85, schoolCount: 55 },
  "santa-barbara": { studentTeacherRatio: 20, graduationRate: 91, schoolCount: 35 },
  // Additional cities (estimates based on state education department data 2023)
  // Sources: FL DOE, LA DOE, NY DOE, TN DOE, WI DPI
  "jacksonville": { studentTeacherRatio: 15, graduationRate: 88, schoolCount: 200 },   // Duval County, FL avg ~89.7%
  "new-orleans": { studentTeacherRatio: 14, graduationRate: 78, schoolCount: 130 },    // NOLA-PS improved 25pts since 2004
  "buffalo": { studentTeacherRatio: 13, graduationRate: 75, schoolCount: 80 },         // NY state avg, urban district
  "green-bay": { studentTeacherRatio: 15, graduationRate: 91, schoolCount: 45 },       // WI avg ~91%, smaller district
  "memphis": { studentTeacherRatio: 15, graduationRate: 80, schoolCount: 180 },        // Shelby County Schools
};

/**
 * Attempt to fetch education data from NCES ArcGIS API
 * Falls back to pre-populated data if API fails
 */
async function fetchEducationData(
  cityId: string,
  latitude?: number,
  longitude?: number
): Promise<{ data: EducationData | null; usedFallback: boolean }> {
  // Try NCES API if we have coordinates
  if (latitude && longitude) {
    try {
      // NCES School District Boundaries layer
      const url = `${NCES_API_BASE}/School_District_Characteristics_2021_22/FeatureServer/0/query?` +
        `geometry=${longitude},${latitude}&geometryType=esriGeometryPoint&inSR=4326&` +
        `spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;
      
      const response = await fetch(url, {
        headers: { "Accept": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.features && data.features.length > 0) {
          // Aggregate data from nearby districts
          let totalStudents = 0;
          let totalTeachers = 0;
          let schoolCount = 0;
          const gradRates: number[] = [];
          
          for (const feature of data.features) {
            const attrs = feature.attributes;
            if (attrs.ENROLLMENT) totalStudents += attrs.ENROLLMENT;
            if (attrs.FTE_TEACHERS) totalTeachers += attrs.FTE_TEACHERS;
            if (attrs.SCHOOL_COUNT) schoolCount += attrs.SCHOOL_COUNT;
            if (attrs.GRAD_RATE) gradRates.push(attrs.GRAD_RATE);
          }
          
          if (totalTeachers > 0) {
            return {
              data: {
                studentTeacherRatio: Math.round((totalStudents / totalTeachers) * 10) / 10,
                graduationRate: gradRates.length > 0 
                  ? Math.round(gradRates.reduce((a, b) => a + b, 0) / gradRates.length)
                  : null,
                schoolCount: schoolCount || null,
              },
              usedFallback: false,
            };
          }
        }
      }
    } catch (error) {
      console.log(`    NCES API failed, using fallback data`);
    }
  }

  // Fallback to pre-populated data with fuzzy matching
  const fallbackData = getFallbackData(cityId, CITY_EDUCATION_DATA);
  return { data: fallbackData, usedFallback: fallbackData !== null };
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
    let fallbackCount = 0;
    const errors: string[] = [];
    const fallbackCities: string[] = [];

    console.log(`Processing ${cities.length} cities for NCES education data...`);

    for (const city of cities) {
      console.log(`  Processing ${city.name}, ${city.state}...`);
      
      try {
        // Fetch education data
        const { data: educationData, usedFallback } = await fetchEducationData(
          city.id,
          city.latitude,
          city.longitude
        );

        if (!educationData) {
          console.log(`    No education data available for ${city.id}`);
          skipCount++;
          continue;
        }

        // Track fallback usage
        if (usedFallback) {
          fallbackCount++;
          fallbackCities.push(city.name);
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

        // Update education data
        metricsFile.cities[city.id].qol!.education = {
          studentTeacherRatio: educationData.studentTeacherRatio,
          graduationRate: educationData.graduationRate,
          schoolCount: educationData.schoolCount,
        };

        successCount++;
        console.log(`    S/T Ratio: ${educationData.studentTeacherRatio}:1, Grad Rate: ${educationData.graduationRate}%${usedFallback ? " (fallback)" : ""}`);

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`    Error processing ${city.name}:`, error);
        errors.push(`${city.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Update metadata
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources["ncesEducation"] = {
      name: "NCES (National Center for Education Statistics)",
      url: "https://nces.ed.gov/",
      description: "School district characteristics including student-teacher ratios and graduation rates",
      dataYear: "2022-23",
      lastUpdated: new Date().toISOString(),
    };
    metricsFile.lastUpdated = new Date().toISOString();

    // Save metrics
    writeFileSync(metricsPath, JSON.stringify(metricsFile, null, 2));

    // Log to database
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "nces-education",
          status: successCount > 0 ? "success" : "error",
          recordsUpdated: successCount,
          errorMessage: errors.length > 0 ? `Failed: ${errors.slice(0, 5).join(", ")}` : undefined,
        },
      });
    } catch (logError) {
      console.error("Failed to log refresh:", logError);
    }

    return NextResponse.json({
      success: true,
      message: `NCES education data pull complete`,
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        citiesUsedFallback: fallbackCount,
        fallbackCities: fallbackCities.length > 0 && fallbackCities.length <= 15 ? fallbackCities : undefined,
        dataYear: "2022-23",
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
    });
  } catch (error) {
    console.error("NCES education pull error:", error);
    return NextResponse.json(
      {
        error: "Failed to pull NCES education data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
