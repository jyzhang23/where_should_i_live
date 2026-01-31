/**
 * Census Data Pull Module
 * 
 * Fetches demographic data from US Census Bureau ACS (American Community Survey)
 * Used by both CLI and API routes.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { CensusDemographics } from "@/types/city";
import { createAdminLogger } from "@/lib/admin-logger";
import { DataDirectory, loadCities, loadMetrics, saveMetrics } from "../helpers";
import { PullResult, CityWithCensusFips } from "./types";

const logger = createAdminLogger("census-pull");

// Configuration
const CENSUS_API_KEY = process.env.CENSUS_API_KEY || "";
const ACS_YEAR = 2022; // Most recent 5-year ACS

// Census API base URLs
const ACS_PROFILE_URL = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5/profile`;
const ACS_DETAIL_URL = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5`;

/**
 * Calculate diversity index using Simpson's Diversity Index
 * Probability that two randomly selected people are of different races
 * Range: 0 (homogeneous) to 100 (maximum diversity)
 */
function calculateDiversityIndex(racePercentages: number[]): number {
  const proportions = racePercentages.map(p => p / 100);
  const sumSquares = proportions.reduce((sum, p) => sum + p * p, 0);
  const simpsonsIndex = 1 - sumSquares;
  return Math.round(simpsonsIndex * 100);
}

/**
 * Fetch demographic data from Census API for a single city
 */
export async function fetchCensusDataForCity(
  stateFips: string,
  placeFips: string,
  cityName: string
): Promise<CensusDemographics | null> {
  try {
    const apiKey = CENSUS_API_KEY ? `&key=${CENSUS_API_KEY}` : "";
    
    // Data Profile variables (DP02, DP03, DP05)
    const profileVars = [
      "NAME",
      "DP05_0001E", // Total population
      "DP05_0018E", // Median age
      "DP05_0019PE", "DP05_0021PE", // Age groups
      "DP05_0011PE", "DP05_0012PE", "DP05_0013PE", "DP05_0014PE",
      "DP05_0015PE", "DP05_0016PE", "DP05_0017PE",
      // Race percentages
      "DP05_0079PE", "DP05_0080PE", "DP05_0073PE", "DP05_0082PE",
      "DP05_0083PE", "DP05_0081PE", "DP05_0084PE", "DP05_0085PE",
      // Education
      "DP02_0067PE", "DP02_0068PE", "DP02_0065PE",
      // Income
      "DP03_0062E", "DP03_0088E", "DP03_0128PE",
      // Foreign born, Household, Language, Marital
      "DP02_0094PE", "DP02_0001E", "DP02_0002PE", "DP02_0003PE",
      "DP02_0012PE", "DP02_0113PE", "DP02_0114PE", "DP02_0118PE",
      "DP02_0026PE", "DP02_0032PE",
    ].join(",");

    const profileUrl = `${ACS_PROFILE_URL}?get=${profileVars}&for=place:${placeFips}&in=state:${stateFips}${apiKey}`;
    
    const profileResp = await fetch(profileUrl);
    
    if (!profileResp.ok) {
      logger.error("Census Profile API error", { city: cityName, status: profileResp.status });
      return null;
    }

    const profileData = await profileResp.json();
    
    if (!profileData || profileData.length < 2) {
      logger.error("No profile data returned", { city: cityName });
      return null;
    }

    const headers = profileData[0] as string[];
    const values = profileData[1] as (string | number)[];
    
    const data: Record<string, number | null> = {};
    headers.forEach((header, i) => {
      const val = values[i];
      data[header] = val === null || val === "" || val === "-" ? null : 
        typeof val === "number" ? val : parseFloat(String(val)) || null;
    });

    // Fetch Asian subgroup data
    const asianVars = "B02015_002E,B02015_003E,B02015_010E,B02015_007E,B02015_006E,B02015_005E";
    const detailUrl = `${ACS_DETAIL_URL}?get=NAME,B01003_001E,${asianVars}&for=place:${placeFips}&in=state:${stateFips}${apiKey}`;
    
    let asianData: Record<string, number | null> = {};
    try {
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
    } catch {
      logger.warn("Could not fetch Asian subgroup data", { city: cityName });
    }

    // Fetch Hispanic subgroup data
    const hispanicVars = "B03001_004E,B03001_005E,B03001_006E,B03001_008E,B03001_010E,B03001_015E";
    const hispanicUrl = `${ACS_DETAIL_URL}?get=NAME,B01003_001E,${hispanicVars}&for=place:${placeFips}&in=state:${stateFips}${apiKey}`;
    
    let hispanicData: Record<string, number | null> = {};
    try {
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
    } catch {
      logger.warn("Could not fetch Hispanic subgroup data", { city: cityName });
    }

    // Fetch Sex by Age data for gender ratio calculations
    const sexByAgeVars = [
      "B01001_007E", "B01001_008E", "B01001_009E", "B01001_010E",
      "B01001_011E", "B01001_012E", "B01001_013E", "B01001_014E",
      "B01001_031E", "B01001_032E", "B01001_033E", "B01001_034E",
      "B01001_035E", "B01001_036E", "B01001_037E", "B01001_038E",
      "B01001_002E", "B01001_026E",
    ].join(",");

    const sexByAgeUrl = `${ACS_DETAIL_URL}?get=NAME,${sexByAgeVars}&for=place:${placeFips}&in=state:${stateFips}${apiKey}`;
    
    let sexByAgeData: Record<string, number | null> = {};
    try {
      const sexByAgeResp = await fetch(sexByAgeUrl);
      if (sexByAgeResp.ok) {
        const sexByAgeJson = await sexByAgeResp.json();
        if (sexByAgeJson && sexByAgeJson.length >= 2) {
          const sexByAgeHeaders = sexByAgeJson[0] as string[];
          const sexByAgeValues = sexByAgeJson[1] as (string | number)[];
          sexByAgeHeaders.forEach((header, i) => {
            const val = sexByAgeValues[i];
            sexByAgeData[header] = val === null || val === "" || val === "-" ? null :
              typeof val === "number" ? val : parseFloat(String(val)) || null;
          });
        }
      }
    } catch {
      logger.warn("Could not fetch sex by age data", { city: cityName });
    }

    // Calculate gender ratios
    const calculateGenderRatio = (maleCount: number | null, femaleCount: number | null) => {
      if (maleCount === null || femaleCount === null || femaleCount === 0) return null;
      return {
        male: maleCount,
        female: femaleCount,
        ratio: Math.round((maleCount / femaleCount) * 1000) / 10,
      };
    };

    const male20to29 = (sexByAgeData["B01001_007E"] || 0) + (sexByAgeData["B01001_008E"] || 0) + 
                       (sexByAgeData["B01001_009E"] || 0) + (sexByAgeData["B01001_010E"] || 0);
    const female20to29 = (sexByAgeData["B01001_031E"] || 0) + (sexByAgeData["B01001_032E"] || 0) + 
                         (sexByAgeData["B01001_033E"] || 0) + (sexByAgeData["B01001_034E"] || 0);
    
    const male30to39 = (sexByAgeData["B01001_011E"] || 0) + (sexByAgeData["B01001_012E"] || 0);
    const female30to39 = (sexByAgeData["B01001_035E"] || 0) + (sexByAgeData["B01001_036E"] || 0);
    
    const male40to49 = (sexByAgeData["B01001_013E"] || 0) + (sexByAgeData["B01001_014E"] || 0);
    const female40to49 = (sexByAgeData["B01001_037E"] || 0) + (sexByAgeData["B01001_038E"] || 0);
    
    const maleTotal = sexByAgeData["B01001_002E"];
    const femaleTotal = sexByAgeData["B01001_026E"];

    const genderRatios = {
      age20to29: male20to29 > 0 && female20to29 > 0 ? calculateGenderRatio(male20to29, female20to29) : null,
      age30to39: male30to39 > 0 && female30to39 > 0 ? calculateGenderRatio(male30to39, female30to39) : null,
      age40to49: male40to49 > 0 && female40to49 > 0 ? calculateGenderRatio(male40to49, female40to49) : null,
      overall: calculateGenderRatio(maleTotal, femaleTotal),
    };

    // Helper functions
    const sanitizePercent = (val: number | null): number => {
      if (val === null) return 0;
      if (val > 100) return 0;
      return val;
    };
    
    const sanitizePercentOrNull = (val: number | null): number | null => {
      if (val === null) return null;
      if (val > 100 || val < 0) return null;
      return Math.round(val * 10) / 10;
    };

    // Calculate age brackets
    const over18 = sanitizePercent(data["DP05_0021PE"]);
    const age35to44 = sanitizePercent(data["DP05_0011PE"]);
    const age45to54 = sanitizePercent(data["DP05_0012PE"]);
    const age55to59 = sanitizePercent(data["DP05_0013PE"]);
    const age60to64 = sanitizePercent(data["DP05_0014PE"]);
    const age65to74 = sanitizePercent(data["DP05_0015PE"]);
    const age75to84 = sanitizePercent(data["DP05_0016PE"]);
    const age85plus = sanitizePercent(data["DP05_0017PE"]);
    
    const age35to54 = age35to44 + age45to54;
    const age55Plus = age55to59 + age60to64 + age65to74 + age75to84 + age85plus;
    const age18to34 = over18 - age35to54 - age55Plus;

    // Calculate diversity index
    const racePercentages = [
      sanitizePercent(data["DP05_0079PE"]),
      sanitizePercent(data["DP05_0080PE"]),
      sanitizePercent(data["DP05_0073PE"]),
      sanitizePercent(data["DP05_0082PE"]),
      sanitizePercent(data["DP05_0083PE"]),
      sanitizePercent(data["DP05_0081PE"]),
      sanitizePercent(data["DP05_0084PE"]),
      sanitizePercent(data["DP05_0085PE"]),
    ];
    
    const diversityIndex = calculateDiversityIndex(racePercentages);

    // Calculate subgroup percentages
    const totalPop = asianData["B01003_001E"] || hispanicData["B01003_001E"] || data["DP05_0001E"] || 1;
    
    const calcSubgroupPercent = (count: number | null): number | null => {
      if (count === null || count === 0) return null;
      return Math.round((count / totalPop) * 10000) / 100;
    };

    return {
      source: `Census ACS 5-Year (${ACS_YEAR})`,
      year: ACS_YEAR,
      lastUpdated: new Date().toISOString().split("T")[0],
      
      totalPopulation: data["DP05_0001E"],
      medianAge: data["DP05_0018E"],
      under18Percent: sanitizePercentOrNull(data["DP05_0019PE"]),
      age18to34Percent: age18to34 > 0 && age18to34 <= 100 ? Math.round(age18to34 * 10) / 10 : null,
      age35to54Percent: age35to54 > 0 && age35to54 <= 100 ? Math.round(age35to54 * 10) / 10 : null,
      age55PlusPercent: age55Plus > 0 && age55Plus <= 100 ? Math.round(age55Plus * 10) / 10 : null,
      
      genderRatios,
      
      whitePercent: sanitizePercentOrNull(data["DP05_0079PE"]),
      blackPercent: sanitizePercentOrNull(data["DP05_0080PE"]),
      hispanicPercent: sanitizePercentOrNull(data["DP05_0073PE"]),
      asianPercent: sanitizePercentOrNull(data["DP05_0082PE"]),
      pacificIslanderPercent: sanitizePercentOrNull(data["DP05_0083PE"]),
      nativeAmericanPercent: sanitizePercentOrNull(data["DP05_0081PE"]),
      otherRacePercent: sanitizePercentOrNull(data["DP05_0084PE"]),
      twoOrMoreRacesPercent: sanitizePercentOrNull(data["DP05_0085PE"]),
      
      chinesePercent: calcSubgroupPercent(asianData["B02015_002E"]),
      indianPercent: calcSubgroupPercent(asianData["B02015_010E"]),
      filipinoPercent: calcSubgroupPercent(asianData["B02015_003E"]),
      vietnamesePercent: calcSubgroupPercent(asianData["B02015_007E"]),
      koreanPercent: calcSubgroupPercent(asianData["B02015_006E"]),
      japanesePercent: calcSubgroupPercent(asianData["B02015_005E"]),
      
      mexicanPercent: calcSubgroupPercent(hispanicData["B03001_004E"]),
      puertoRicanPercent: calcSubgroupPercent(hispanicData["B03001_005E"]),
      cubanPercent: calcSubgroupPercent(hispanicData["B03001_006E"]),
      salvadoranPercent: calcSubgroupPercent(hispanicData["B03001_008E"]),
      guatemalanPercent: calcSubgroupPercent(hispanicData["B03001_010E"]),
      colombianPercent: calcSubgroupPercent(hispanicData["B03001_015E"]),
      
      diversityIndex: diversityIndex >= 0 && diversityIndex <= 100 ? diversityIndex : null,
      
      highSchoolOrHigherPercent: sanitizePercentOrNull(data["DP02_0067PE"]),
      bachelorsOrHigherPercent: sanitizePercentOrNull(data["DP02_0068PE"]),
      graduateDegreePercent: sanitizePercentOrNull(data["DP02_0065PE"]),
      
      medianHouseholdIncome: data["DP03_0062E"],
      perCapitaIncome: data["DP03_0088E"],
      povertyRate: sanitizePercentOrNull(data["DP03_0128PE"]),
      
      foreignBornPercent: sanitizePercentOrNull(data["DP02_0094PE"]),
      
      familyHouseholdsPercent: sanitizePercentOrNull(data["DP02_0002PE"]),
      marriedCouplePercent: sanitizePercentOrNull(data["DP02_0003PE"]),
      singlePersonPercent: sanitizePercentOrNull(data["DP02_0012PE"]),
      
      neverMarriedMalePercent: sanitizePercentOrNull(data["DP02_0026PE"]),
      neverMarriedFemalePercent: sanitizePercentOrNull(data["DP02_0032PE"]),
      
      englishOnlyPercent: sanitizePercentOrNull(data["DP02_0113PE"]),
      spanishAtHomePercent: sanitizePercentOrNull(data["DP02_0114PE"]),
      asianLanguageAtHomePercent: sanitizePercentOrNull(data["DP02_0118PE"]),
    };
  } catch (error) {
    logger.error("Error fetching Census data", { city: cityName, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Pull Census data for all cities
 */
export async function pullCensusData(
  dataDir: DataDirectory,
  onProgress?: (message: string) => void
): Promise<PullResult> {
  const log = (msg: string) => {
    logger.info(msg);
    onProgress?.(msg);
  };

  try {
    const cities = loadCities<CityWithCensusFips>(dataDir);
    const metricsFile = loadMetrics(dataDir);

    const citiesWithFips = cities.filter((c) => c.censusFips?.state && c.censusFips?.place);

    if (citiesWithFips.length === 0) {
      return {
        success: false,
        error: "No cities have Census FIPS codes configured",
      };
    }

    log(`Fetching Census data for ${citiesWithFips.length} cities...`);

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const city of citiesWithFips) {
      const censusData = await fetchCensusDataForCity(
        city.censusFips!.state,
        city.censusFips!.place,
        city.name
      );
      
      if (!censusData) {
        skipCount++;
        errors.push(`${city.name}: Failed to fetch`);
        continue;
      }

      successCount++;

      if (!metricsFile.cities[city.id]) {
        metricsFile.cities[city.id] = {};
      }
      metricsFile.cities[city.id].census = censusData;

      // Rate limit: 200ms between requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Update source info
    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources.demographics = `US Census Bureau ACS 5-Year Estimates (${ACS_YEAR})`;
    metricsFile.lastUpdated = new Date().toISOString().split("T")[0];

    saveMetrics(dataDir, metricsFile);

    return {
      success: successCount > 0,
      message: `Census data pulled: ${successCount} cities updated, ${skipCount} skipped`,
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        acsYear: ACS_YEAR,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error) {
    logger.error("Census pull failed", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
