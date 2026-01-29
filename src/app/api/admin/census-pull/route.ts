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
import { createAdminLogger } from "@/lib/admin-logger";

const logger = createAdminLogger("census-pull");
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
      // Age groups - Using discrete brackets and cumulative "18 years and over"
      "DP05_0019PE", // Under 18 years %
      "DP05_0021PE", // 18 years and over % (cumulative - used for subtraction calculation)
      "DP05_0011PE", // 35 to 44 years %
      "DP05_0012PE", // 45 to 54 years %
      "DP05_0013PE", // 55 to 59 years %
      "DP05_0014PE", // 60 to 64 years %
      "DP05_0015PE", // 65 to 74 years %
      "DP05_0016PE", // 75 to 84 years %
      "DP05_0017PE", // 85 years and over %
      // Race (percentages) - 2022 ACS variable codes
      "DP05_0079PE", // White alone, Not Hispanic or Latino
      "DP05_0080PE", // Black or African American alone, Not Hispanic
      "DP05_0073PE", // Hispanic or Latino (of any race)
      "DP05_0082PE", // Asian alone, Not Hispanic
      "DP05_0083PE", // Native Hawaiian/Pacific Islander alone, Not Hispanic
      "DP05_0081PE", // American Indian/Alaska Native alone, Not Hispanic
      "DP05_0084PE", // Some other race alone, Not Hispanic
      "DP05_0085PE", // Two or more races, Not Hispanic
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
    
    logger.debug("Fetching profile data");
    const profileResp = await fetch(profileUrl);
    
    if (!profileResp.ok) {
      const errorText = await profileResp.text();
      logger.error("Census Profile API error", { city: cityName, status: profileResp.status, error: errorText.substring(0, 200) });
      return null;
    }

    const profileData = await profileResp.json();
    
    if (!profileData || profileData.length < 2) {
      logger.error("No profile data returned", { city: cityName });
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
      logger.debug("Fetching Asian subgroup data");
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
      logger.warn("Could not fetch Asian subgroup data");
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
      logger.debug("Fetching Hispanic subgroup data");
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
      logger.warn("Could not fetch Hispanic subgroup data");
    }

    // Calculate age brackets
    // Guard against API returning counts instead of percentages (values > 100 are invalid)
    const sanitizePercent = (val: number | null): number => {
      if (val === null) return 0;
      // If value > 100, it's likely a count - skip it
      if (val > 100) return 0;
      return val;
    };
    
    // Calculate age groups using discrete brackets and subtraction from cumulative "18 years and over"
    // This approach is more accurate than using the misleading cumulative-only variables
    const over18 = sanitizePercent(data["DP05_0021PE"]); // 18 years and over (cumulative)
    const age35to44 = sanitizePercent(data["DP05_0011PE"]);
    const age45to54 = sanitizePercent(data["DP05_0012PE"]);
    const age55to59 = sanitizePercent(data["DP05_0013PE"]);
    const age60to64 = sanitizePercent(data["DP05_0014PE"]);
    const age65to74 = sanitizePercent(data["DP05_0015PE"]);
    const age75to84 = sanitizePercent(data["DP05_0016PE"]);
    const age85plus = sanitizePercent(data["DP05_0017PE"]);
    
    const age35to54 = age35to44 + age45to54;
    const age55Plus = age55to59 + age60to64 + age65to74 + age75to84 + age85plus;
    // age18to34 = (18 years and over) - (35-54) - (55+)
    const age18to34 = over18 - age35to54 - age55Plus;

    // Calculate diversity index from race percentages (2022 ACS variable codes)
    // Sanitize race percentages (must be 0-100)
    const racePercentages = [
      sanitizePercent(data["DP05_0079PE"]), // White alone, Not Hispanic
      sanitizePercent(data["DP05_0080PE"]), // Black alone, Not Hispanic
      sanitizePercent(data["DP05_0073PE"]), // Hispanic or Latino
      sanitizePercent(data["DP05_0082PE"]), // Asian alone, Not Hispanic
      sanitizePercent(data["DP05_0083PE"]), // Pacific Islander, Not Hispanic
      sanitizePercent(data["DP05_0081PE"]), // Native American, Not Hispanic
      sanitizePercent(data["DP05_0084PE"]), // Other, Not Hispanic
      sanitizePercent(data["DP05_0085PE"]), // Two or more, Not Hispanic
    ];
    
    // Validate: race percentages should sum to roughly 100% (allow some margin for rounding)
    const raceSum = racePercentages.reduce((a, b) => a + b, 0);
    if (raceSum < 50 || raceSum > 150) {
      logger.warn("Race percentages sum invalid", { sum: raceSum.toFixed(1) });
    }
    
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

    // Helper to sanitize percentage or return null if invalid
    const sanitizePercentOrNull = (val: number | null): number | null => {
      if (val === null) return null;
      if (val > 100 || val < 0) return null; // Invalid percentage
      return Math.round(val * 10) / 10;
    };

    return {
      source: `Census ACS 5-Year (${ACS_YEAR})`,
      year: ACS_YEAR,
      lastUpdated: new Date().toISOString().split("T")[0],
      
      // Population
      totalPopulation: data["DP05_0001E"],
      
      // Age
      medianAge: data["DP05_0018E"],
      under18Percent: sanitizePercentOrNull(data["DP05_0019PE"]),
      age18to34Percent: age18to34 > 0 && age18to34 <= 100 ? Math.round(age18to34 * 10) / 10 : null,
      age35to54Percent: age35to54 > 0 && age35to54 <= 100 ? Math.round(age35to54 * 10) / 10 : null,
      age55PlusPercent: age55Plus > 0 && age55Plus <= 100 ? Math.round(age55Plus * 10) / 10 : null,
      
      // Race/Ethnicity (sanitized) - 2022 ACS variable codes
      whitePercent: sanitizePercentOrNull(data["DP05_0079PE"]),
      blackPercent: sanitizePercentOrNull(data["DP05_0080PE"]),
      hispanicPercent: sanitizePercentOrNull(data["DP05_0073PE"]),
      asianPercent: sanitizePercentOrNull(data["DP05_0082PE"]),
      pacificIslanderPercent: sanitizePercentOrNull(data["DP05_0083PE"]),
      nativeAmericanPercent: sanitizePercentOrNull(data["DP05_0081PE"]),
      otherRacePercent: sanitizePercentOrNull(data["DP05_0084PE"]),
      twoOrMoreRacesPercent: sanitizePercentOrNull(data["DP05_0085PE"]),
      
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
      
      // Diversity (0-100 scale is valid)
      diversityIndex: diversityIndex >= 0 && diversityIndex <= 100 ? diversityIndex : null,
      
      // Education
      highSchoolOrHigherPercent: sanitizePercentOrNull(data["DP02_0067PE"]),
      bachelorsOrHigherPercent: sanitizePercentOrNull(data["DP02_0068PE"]),
      graduateDegreePercent: sanitizePercentOrNull(data["DP02_0065PE"]),
      
      // Income (these are dollar amounts, not percentages - keep as-is)
      medianHouseholdIncome: data["DP03_0062E"],
      perCapitaIncome: data["DP03_0088E"],
      povertyRate: sanitizePercentOrNull(data["DP03_0128PE"]),
      
      // Foreign born
      foreignBornPercent: sanitizePercentOrNull(data["DP02_0094PE"]),
      
      // Household
      familyHouseholdsPercent: sanitizePercentOrNull(data["DP02_0002PE"]),
      marriedCouplePercent: sanitizePercentOrNull(data["DP02_0003PE"]),
      singlePersonPercent: sanitizePercentOrNull(data["DP02_0012PE"]),
      
      // Language
      englishOnlyPercent: sanitizePercentOrNull(data["DP02_0113PE"]),
      spanishAtHomePercent: sanitizePercentOrNull(data["DP02_0114PE"]),
      asianLanguageAtHomePercent: sanitizePercentOrNull(data["DP02_0118PE"]),
    };
  } catch (error) {
    logger.error("Error fetching Census data", { city: cityName, error: error instanceof Error ? error.message : String(error) });
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

    logger.info("Fetching Census data", { cityCount: citiesWithFips.length });

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    // Process cities sequentially to avoid rate limiting
    for (const city of citiesWithFips) {
      logger.debug("Fetching city", { city: city.name, fips: `${city.censusFips!.state}-${city.censusFips!.place}` });
      
      const censusData = await fetchCensusData(
        city.censusFips!.state,
        city.censusFips!.place,
        city.name
      );
      
      if (!censusData) {
        skipCount++;
        errors.push(`${city.name}: Failed to fetch`);
        logger.warn("Failed to fetch city", { city: city.name });
        continue;
      }

      successCount++;
      logger.debug("Updated city", { city: city.name, pop: censusData.totalPopulation, diversity: censusData.diversityIndex, medianAge: censusData.medianAge, bachelors: censusData.bachelorsOrHigherPercent });

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
      logger.error("Failed to log refresh", { error: String(logError) });
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
    logger.error("Census pull failed", { error: error instanceof Error ? error.message : String(error) });

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
