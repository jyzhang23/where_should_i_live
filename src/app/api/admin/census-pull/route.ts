/**
 * Admin API to pull demographic data from US Census Bureau ACS
 * 
 * POST /api/admin/census-pull
 * Body: { password: string }
 * 
 * Data source: American Community Survey (ACS) 5-Year Estimates
 * API: https://api.census.gov/data/2022/acs/acs5/profile
 * 
 * Metrics fetched:
 * - Population and age demographics
 * - Race/ethnicity breakdown
 * - Asian subgroup percentages
 * - Educational attainment
 * - Income statistics
 * - Foreign-born percentage
 * - Household composition
 * - Language spoken at home
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import prisma from "@/lib/db";
import { CensusDemographics } from "@/types/city";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cursorftw";
const CENSUS_API_KEY = process.env.CENSUS_API_KEY || "";
const ACS_YEAR = 2022; // Most recent 5-year ACS

// Census API base URL for ACS 5-Year Data Profile
const ACS_PROFILE_URL = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5/profile`;
const ACS_SUBJECT_URL = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5/subject`;
const ACS_DETAIL_URL = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5`;

interface CityData {
  id: string;
  name: string;
  state: string;
  censusFips?: {
    state: string;
    place: string;
  };
}

interface CensusResponse {
  [key: string]: string | number;
}

/**
 * Calculate diversity index using Simpson's Diversity Index
 * Probability that two randomly selected people are of different races
 * Range: 0 (homogeneous) to 100 (maximum diversity)
 */
function calculateDiversityIndex(racePercentages: number[]): number {
  // Convert percentages to proportions
  const proportions = racePercentages.map(p => p / 100);
  
  // Simpson's Index: 1 - sum(p_i^2)
  const sumSquares = proportions.reduce((sum, p) => sum + p * p, 0);
  const simpsonsIndex = 1 - sumSquares;
  
  // Scale to 0-100
  return Math.round(simpsonsIndex * 100);
}

/**
 * Fetch demographic data from Census API for a single city
 */
async function fetchCensusData(
  stateFips: string,
  placeFips: string,
  cityName: string
): Promise<CensusDemographics | null> {
  try {
    const apiKey = CENSUS_API_KEY ? `&key=${CENSUS_API_KEY}` : "";
    
    // Data Profile variables (DP02, DP03, DP05)
    // DP05 = Demographics and Housing
    // DP02 = Social Characteristics
    // DP03 = Economic Characteristics
    const profileVars = [
      "NAME",
      // Total population
      "DP05_0001E",
      // Median age
      "DP05_0018E",
      // Age groups
      "DP05_0019PE", // Under 18 %
      "DP05_0021PE", // 18-24 %
      "DP05_0022PE", // 25-34 %
      "DP05_0023PE", // 35-44 %
      "DP05_0024PE", // 45-54 %
      "DP05_0025PE", // 55-64 %
      "DP05_0026PE", // 65+ %
      // Race (percentages)
      "DP05_0077PE", // White alone, not Hispanic
      "DP05_0078PE", // Black alone
      "DP05_0071PE", // Hispanic or Latino
      "DP05_0080PE", // Asian alone
      "DP05_0081PE", // Native Hawaiian/Pacific Islander
      "DP05_0079PE", // American Indian/Alaska Native
      "DP05_0082PE", // Some other race
      "DP05_0083PE", // Two or more races
      // Education (25+)
      "DP02_0067PE", // High school graduate or higher
      "DP02_0068PE", // Bachelor's degree or higher
      "DP02_0065PE", // Graduate or professional degree
      // Income
      "DP03_0062E", // Median household income
      "DP03_0088E", // Per capita income
      "DP03_0128PE", // Poverty rate
      // Foreign born
      "DP02_0094PE", // Foreign born %
      // Household composition
      "DP02_0001E", // Total households
      "DP02_0002PE", // Family households %
      "DP02_0003PE", // Married couple family %
      "DP02_0012PE", // Householder living alone %
      // Language
      "DP02_0113PE", // English only %
      "DP02_0114PE", // Spanish %
      "DP02_0118PE", // Asian/Pacific Islander languages %
    ].join(",");

    const profileUrl = `${ACS_PROFILE_URL}?get=${profileVars}&for=place:${placeFips}&in=state:${stateFips}${apiKey}`;
    
    console.log(`    Fetching profile data...`);
    const profileResp = await fetch(profileUrl);
    
    if (!profileResp.ok) {
      const errorText = await profileResp.text();
      console.error(`Census Profile API error for ${cityName}: ${profileResp.status} - ${errorText.substring(0, 200)}`);
      return null;
    }

    const profileData = await profileResp.json();
    
    if (!profileData || profileData.length < 2) {
      console.error(`No profile data returned for ${cityName}`);
      return null;
    }

    // Census API returns array: [[headers], [values]]
    const headers = profileData[0] as string[];
    const values = profileData[1] as (string | number)[];
    
    // Create a map for easy lookup
    const data: Record<string, number | null> = {};
    headers.forEach((header, i) => {
      const val = values[i];
      data[header] = val === null || val === "" || val === "-" ? null : 
        typeof val === "number" ? val : parseFloat(String(val)) || null;
    });

    // Fetch Asian subgroup data from detailed tables
    const asianVars = [
      "B02015_002E", // Chinese
      "B02015_003E", // Filipino  
      "B02015_010E", // Asian Indian
      "B02015_007E", // Vietnamese
      "B02015_006E", // Korean
      "B02015_005E", // Japanese
    ].join(",");

    const detailUrl = `${ACS_DETAIL_URL}?get=NAME,B01003_001E,${asianVars}&for=place:${placeFips}&in=state:${stateFips}${apiKey}`;
    
    let asianData: Record<string, number | null> = {};
    try {
      console.log(`    Fetching Asian subgroup data...`);
      const detailResp = await fetch(detailUrl);
      if (detailResp.ok) {
        const detailJson = await detailResp.json();
        if (detailJson && detailJson.length >= 2) {
          const detailHeaders = detailJson[0] as string[];
          const detailValues = detailJson[1] as (string | number)[];
          detailHeaders.forEach((header, i) => {
            const val = detailValues[i];
            asianData[header] = val === null || val === "" || val === "-" ? null :
              typeof val === "number" ? val : parseFloat(String(val)) || null;
          });
        }
      }
    } catch (e) {
      console.log(`    Warning: Could not fetch Asian subgroup data`);
    }

    // Fetch Hispanic subgroup data from detailed tables
    // B03001 = Hispanic Origin by Specific Origin
    const hispanicVars = [
      "B03001_004E", // Mexican
      "B03001_005E", // Puerto Rican
      "B03001_006E", // Cuban
      "B03001_008E", // Salvadoran
      "B03001_010E", // Guatemalan
      "B03001_015E", // Colombian
    ].join(",");

    const hispanicUrl = `${ACS_DETAIL_URL}?get=NAME,B01003_001E,${hispanicVars}&for=place:${placeFips}&in=state:${stateFips}${apiKey}`;
    
    let hispanicData: Record<string, number | null> = {};
    try {
      console.log(`    Fetching Hispanic subgroup data...`);
      const hispanicResp = await fetch(hispanicUrl);
      if (hispanicResp.ok) {
        const hispanicJson = await hispanicResp.json();
        if (hispanicJson && hispanicJson.length >= 2) {
          const hispanicHeaders = hispanicJson[0] as string[];
          const hispanicValues = hispanicJson[1] as (string | number)[];
          hispanicHeaders.forEach((header, i) => {
            const val = hispanicValues[i];
            hispanicData[header] = val === null || val === "" || val === "-" ? null :
              typeof val === "number" ? val : parseFloat(String(val)) || null;
          });
        }
      }
    } catch (e) {
      console.log(`    Warning: Could not fetch Hispanic subgroup data`);
    }

    // Calculate age brackets
    const age18to34 = ((data["DP05_0021PE"] || 0) + (data["DP05_0022PE"] || 0));
    const age35to54 = ((data["DP05_0023PE"] || 0) + (data["DP05_0024PE"] || 0));
    const age55Plus = ((data["DP05_0025PE"] || 0) + (data["DP05_0026PE"] || 0));

    // Calculate diversity index from race percentages
    const racePercentages = [
      data["DP05_0077PE"] || 0, // White
      data["DP05_0078PE"] || 0, // Black
      data["DP05_0071PE"] || 0, // Hispanic
      data["DP05_0080PE"] || 0, // Asian
      data["DP05_0081PE"] || 0, // Pacific Islander
      data["DP05_0079PE"] || 0, // Native American
      data["DP05_0082PE"] || 0, // Other
      data["DP05_0083PE"] || 0, // Two or more
    ];
    const diversityIndex = calculateDiversityIndex(racePercentages);

    // Calculate Asian subgroup percentages (of total population)
    const totalPop = asianData["B01003_001E"] || hispanicData["B01003_001E"] || data["DP05_0001E"] || 1;
    const chinesePercent = asianData["B02015_002E"] ? 
      Math.round((asianData["B02015_002E"] / totalPop) * 10000) / 100 : null;
    const filipinoPercent = asianData["B02015_003E"] ?
      Math.round((asianData["B02015_003E"] / totalPop) * 10000) / 100 : null;
    const indianPercent = asianData["B02015_010E"] ?
      Math.round((asianData["B02015_010E"] / totalPop) * 10000) / 100 : null;
    const vietnamesePercent = asianData["B02015_007E"] ?
      Math.round((asianData["B02015_007E"] / totalPop) * 10000) / 100 : null;
    const koreanPercent = asianData["B02015_006E"] ?
      Math.round((asianData["B02015_006E"] / totalPop) * 10000) / 100 : null;
    const japanesePercent = asianData["B02015_005E"] ?
      Math.round((asianData["B02015_005E"] / totalPop) * 10000) / 100 : null;

    // Calculate Hispanic subgroup percentages (of total population)
    const mexicanPercent = hispanicData["B03001_004E"] ?
      Math.round((hispanicData["B03001_004E"] / totalPop) * 10000) / 100 : null;
    const puertoRicanPercent = hispanicData["B03001_005E"] ?
      Math.round((hispanicData["B03001_005E"] / totalPop) * 10000) / 100 : null;
    const cubanPercent = hispanicData["B03001_006E"] ?
      Math.round((hispanicData["B03001_006E"] / totalPop) * 10000) / 100 : null;
    const salvadoranPercent = hispanicData["B03001_008E"] ?
      Math.round((hispanicData["B03001_008E"] / totalPop) * 10000) / 100 : null;
    const guatemalanPercent = hispanicData["B03001_010E"] ?
      Math.round((hispanicData["B03001_010E"] / totalPop) * 10000) / 100 : null;
    const colombianPercent = hispanicData["B03001_015E"] ?
      Math.round((hispanicData["B03001_015E"] / totalPop) * 10000) / 100 : null;

    return {
      source: `Census ACS 5-Year (${ACS_YEAR})`,
      year: ACS_YEAR,
      lastUpdated: new Date().toISOString().split("T")[0],
      
      // Population
      totalPopulation: data["DP05_0001E"],
      
      // Age
      medianAge: data["DP05_0018E"],
      under18Percent: data["DP05_0019PE"],
      age18to34Percent: Math.round(age18to34 * 10) / 10,
      age35to54Percent: Math.round(age35to54 * 10) / 10,
      age55PlusPercent: Math.round(age55Plus * 10) / 10,
      
      // Race/Ethnicity
      whitePercent: data["DP05_0077PE"],
      blackPercent: data["DP05_0078PE"],
      hispanicPercent: data["DP05_0071PE"],
      asianPercent: data["DP05_0080PE"],
      pacificIslanderPercent: data["DP05_0081PE"],
      nativeAmericanPercent: data["DP05_0079PE"],
      otherRacePercent: data["DP05_0082PE"],
      twoOrMoreRacesPercent: data["DP05_0083PE"],
      
      // Asian subgroups
      chinesePercent,
      indianPercent,
      filipinoPercent,
      vietnamesePercent,
      koreanPercent,
      japanesePercent,
      
      // Hispanic subgroups
      mexicanPercent,
      puertoRicanPercent,
      cubanPercent,
      salvadoranPercent,
      guatemalanPercent,
      colombianPercent,
      
      // Diversity
      diversityIndex,
      
      // Education
      highSchoolOrHigherPercent: data["DP02_0067PE"],
      bachelorsOrHigherPercent: data["DP02_0068PE"],
      graduateDegreePercent: data["DP02_0065PE"],
      
      // Income
      medianHouseholdIncome: data["DP03_0062E"],
      perCapitaIncome: data["DP03_0088E"],
      povertyRate: data["DP03_0128PE"],
      
      // Foreign born
      foreignBornPercent: data["DP02_0094PE"],
      
      // Household
      familyHouseholdsPercent: data["DP02_0002PE"],
      marriedCouplePercent: data["DP02_0003PE"],
      singlePersonPercent: data["DP02_0012PE"],
      
      // Language
      englishOnlyPercent: data["DP02_0113PE"],
      spanishAtHomePercent: data["DP02_0114PE"],
      asianLanguageAtHomePercent: data["DP02_0118PE"],
    };
  } catch (error) {
    console.error(`Error fetching Census data for ${cityName}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: { password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Verify password
    if (body.password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
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

    // Load cities and metrics
    const citiesFile = JSON.parse(
      readFileSync(join(dataDir, "cities.json"), "utf-8")
    );
    const metricsFile = JSON.parse(
      readFileSync(join(dataDir, "metrics.json"), "utf-8")
    );

    const cities: CityData[] = citiesFile.cities;

    // Filter cities that have Census FIPS codes
    const citiesWithFips = cities.filter((c) => c.censusFips?.state && c.censusFips?.place);

    if (citiesWithFips.length === 0) {
      return NextResponse.json(
        { error: "No cities have Census FIPS codes configured" },
        { status: 400 }
      );
    }

    console.log(`Fetching Census data for ${citiesWithFips.length} cities...`);

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    // Process cities sequentially to avoid rate limiting
    for (const city of citiesWithFips) {
      console.log(`  Fetching ${city.name} (${city.censusFips!.state}-${city.censusFips!.place})...`);
      
      const censusData = await fetchCensusData(
        city.censusFips!.state,
        city.censusFips!.place,
        city.name
      );
      
      if (!censusData) {
        skipCount++;
        errors.push(`${city.name}: Failed to fetch`);
        console.log(`    ✗ Failed`);
        continue;
      }

      successCount++;
      console.log(
        `    ✓ Pop=${censusData.totalPopulation?.toLocaleString()}, ` +
        `Diversity=${censusData.diversityIndex}, ` +
        `MedianAge=${censusData.medianAge}, ` +
        `Bachelor+=${censusData.bachelorsOrHigherPercent}%`
      );

      // Ensure city entry exists in metrics
      if (!metricsFile.cities[city.id]) {
        metricsFile.cities[city.id] = {};
      }

      // Store census data
      metricsFile.cities[city.id].census = censusData;

      // Small delay between requests to be respectful to Census API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Update metrics source info
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources.demographics = `US Census Bureau ACS 5-Year Estimates (${ACS_YEAR})`;
    metricsFile.lastUpdated = new Date().toISOString().split("T")[0];

    // Save metrics.json
    writeFileSync(
      join(dataDir, "metrics.json"),
      JSON.stringify(metricsFile, null, 2)
    );

    // Log the refresh
    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "census-demographics",
          status: successCount > 0 ? "success" : "error",
          recordsUpdated: successCount,
          errorMessage: errors.length > 0 ? `Failed: ${errors.join(", ")}` : undefined,
        },
      });
    } catch (logError) {
      console.error("Failed to log refresh:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Census data pulled successfully",
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        acsYear: ACS_YEAR,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Census pull error:", error);

    try {
      await prisma.dataRefreshLog.create({
        data: {
          source: "census-demographics",
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "Census pull failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
