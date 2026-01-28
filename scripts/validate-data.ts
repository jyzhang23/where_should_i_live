/**
 * Data Validation Script
 * 
 * Run: npx tsx scripts/validate-data.ts
 * 
 * Validates metrics.json data for:
 * - Percentage fields bounded 0-100
 * - Race percentages sum to ~100%
 * - Age percentages sum to ~100%
 * - Required fields present
 * - No obviously invalid values
 */

import { readFileSync } from "fs";
import { join } from "path";

interface ValidationError {
  city: string;
  field: string;
  value: unknown;
  message: string;
}

interface ValidationWarning {
  city: string;
  field: string;
  value: unknown;
  message: string;
}

const errors: ValidationError[] = [];
const warnings: ValidationWarning[] = [];

// Fields that should be percentages (0-100)
const PERCENTAGE_FIELDS = [
  "under18Percent",
  "age18to34Percent",
  "age35to54Percent",
  "age55PlusPercent",
  "whitePercent",
  "blackPercent",
  "hispanicPercent",
  "asianPercent",
  "pacificIslanderPercent",
  "nativeAmericanPercent",
  "otherRacePercent",
  "twoOrMoreRacesPercent",
  "chinesePercent",
  "indianPercent",
  "filipinoPercent",
  "vietnamesePercent",
  "koreanPercent",
  "japanesePercent",
  "mexicanPercent",
  "puertoRicanPercent",
  "cubanPercent",
  "salvadoranPercent",
  "guatemalanPercent",
  "colombianPercent",
  "highSchoolOrHigherPercent",
  "bachelorsOrHigherPercent",
  "graduateDegreePercent",
  "povertyRate",
  "foreignBornPercent",
  "familyHouseholdsPercent",
  "marriedCouplePercent",
  "singlePersonPercent",
  "englishOnlyPercent",
  "spanishAtHomePercent",
  "asianLanguageAtHomePercent",
  "healthyDaysPercent",
  "fiberCoveragePercent",
  "graduationRate",
  "voterTurnout",
  "democratPercent",
  "republicanPercent",
];

// Fields that should be 0-100 scores
const SCORE_FIELDS = [
  "walkScore",
  "transitScore",
  "bikeScore",
  "diversityIndex",
];

function validatePercentage(value: unknown, field: string, city: string): void {
  if (value === null || value === undefined) return; // null is okay
  
  if (typeof value !== "number") {
    errors.push({ city, field, value, message: `Expected number, got ${typeof value}` });
    return;
  }
  
  if (value < 0) {
    errors.push({ city, field, value, message: `Percentage cannot be negative` });
  }
  
  if (value > 100) {
    errors.push({ city, field, value, message: `Percentage cannot exceed 100` });
  }
}

function validateScore(value: unknown, field: string, city: string): void {
  if (value === null || value === undefined) return;
  
  if (typeof value !== "number") {
    errors.push({ city, field, value, message: `Expected number, got ${typeof value}` });
    return;
  }
  
  if (value < 0 || value > 100) {
    errors.push({ city, field, value, message: `Score must be 0-100` });
  }
}

function validateRacePercentagesSum(census: Record<string, unknown>, city: string): void {
  const raceFields = [
    "whitePercent",
    "blackPercent",
    "hispanicPercent",
    "asianPercent",
    "pacificIslanderPercent",
    "nativeAmericanPercent",
    "otherRacePercent",
    "twoOrMoreRacesPercent",
  ];
  
  let sum = 0;
  let hasData = false;
  
  for (const field of raceFields) {
    const val = census[field];
    if (typeof val === "number" && val !== null) {
      sum += val;
      hasData = true;
    }
  }
  
  if (hasData) {
    if (sum < 90) {
      warnings.push({ 
        city, 
        field: "racePercentages", 
        value: sum.toFixed(1), 
        message: `Race percentages sum to ${sum.toFixed(1)}% (expected ~100%)` 
      });
    }
    if (sum > 110) {
      errors.push({ 
        city, 
        field: "racePercentages", 
        value: sum.toFixed(1), 
        message: `Race percentages sum to ${sum.toFixed(1)}% (exceeds 100%)` 
      });
    }
  }
}

function validateAgePercentagesSum(census: Record<string, unknown>, city: string): void {
  const ageFields = [
    "under18Percent",
    "age18to34Percent",
    "age35to54Percent",
    "age55PlusPercent",
  ];
  
  let sum = 0;
  let hasData = false;
  let nullCount = 0;
  
  for (const field of ageFields) {
    const val = census[field];
    if (val === null) {
      nullCount++;
    } else if (typeof val === "number") {
      sum += val;
      hasData = true;
    }
  }
  
  // Only validate if we have at least 3 non-null values
  if (hasData && nullCount <= 1) {
    if (sum < 90) {
      warnings.push({ 
        city, 
        field: "agePercentages", 
        value: sum.toFixed(1), 
        message: `Age percentages sum to ${sum.toFixed(1)}% (expected ~100%)` 
      });
    }
    if (sum > 110) {
      errors.push({ 
        city, 
        field: "agePercentages", 
        value: sum.toFixed(1), 
        message: `Age percentages sum to ${sum.toFixed(1)}% (exceeds 100%)` 
      });
    }
  }
}

function validatePoliticalPercentagesSum(political: Record<string, unknown>, city: string): void {
  const demPercent = political.democratPercent;
  const repPercent = political.republicanPercent;
  
  if (typeof demPercent === "number" && typeof repPercent === "number") {
    const sum = demPercent + repPercent;
    // Allow some room for third party votes
    if (sum > 105) {
      errors.push({ 
        city, 
        field: "politicalPercentages", 
        value: sum.toFixed(1), 
        message: `Dem + Rep = ${sum.toFixed(1)}% (exceeds 100%)` 
      });
    }
  }
}

function validatePositiveNumber(value: unknown, field: string, city: string, max?: number): void {
  if (value === null || value === undefined) return;
  
  if (typeof value !== "number") {
    errors.push({ city, field, value, message: `Expected number, got ${typeof value}` });
    return;
  }
  
  if (value < 0) {
    errors.push({ city, field, value, message: `Value cannot be negative` });
  }
  
  if (max !== undefined && value > max) {
    errors.push({ city, field, value, message: `Value ${value} exceeds max ${max}` });
  }
}

function validateCity(cityId: string, cityData: Record<string, unknown>): void {
  const census = cityData.census as Record<string, unknown> | undefined;
  const cultural = cityData.cultural as Record<string, unknown> | undefined;
  const qol = cityData.qol as Record<string, unknown> | undefined;
  const bea = cityData.bea as Record<string, unknown> | undefined;
  
  // Validate Census data
  if (census) {
    // Check individual percentage fields
    for (const field of PERCENTAGE_FIELDS) {
      if (field in census) {
        validatePercentage(census[field], `census.${field}`, cityId);
      }
    }
    
    // Check diversity index
    validateScore(census.diversityIndex, "census.diversityIndex", cityId);
    
    // Check race percentages sum
    validateRacePercentagesSum(census, cityId);
    
    // Check age percentages sum
    validateAgePercentagesSum(census, cityId);
    
    // Check population is reasonable
    validatePositiveNumber(census.totalPopulation, "census.totalPopulation", cityId, 20000000);
    
    // Check median age is reasonable
    const medianAge = census.medianAge;
    if (typeof medianAge === "number" && (medianAge < 20 || medianAge > 60)) {
      warnings.push({ city: cityId, field: "census.medianAge", value: medianAge, message: `Unusual median age` });
    }
    
    // Check income is reasonable
    const medianIncome = census.medianHouseholdIncome;
    if (typeof medianIncome === "number" && (medianIncome < 20000 || medianIncome > 300000)) {
      warnings.push({ city: cityId, field: "census.medianHouseholdIncome", value: medianIncome, message: `Unusual median income` });
    }
  }
  
  // Validate Cultural/Political data
  if (cultural) {
    const political = cultural.political as Record<string, unknown> | undefined;
    if (political) {
      validatePercentage(political.democratPercent, "cultural.political.democratPercent", cityId);
      validatePercentage(political.republicanPercent, "cultural.political.republicanPercent", cityId);
      validatePercentage(political.voterTurnout, "cultural.political.voterTurnout", cityId);
      validatePoliticalPercentagesSum(political, cityId);
      
      // Partisan index should be -1 to 1
      const pi = political.partisanIndex;
      if (typeof pi === "number" && (pi < -1 || pi > 1)) {
        errors.push({ city: cityId, field: "cultural.political.partisanIndex", value: pi, message: `Must be -1 to 1` });
      }
    }
    
    const religious = cultural.religious as Record<string, unknown> | undefined;
    if (religious) {
      validateScore(religious.diversityIndex, "cultural.religious.diversityIndex", cityId);
    }
  }
  
  // Validate QoL data
  if (qol) {
    const walkability = qol.walkability as Record<string, unknown> | undefined;
    if (walkability) {
      validateScore(walkability.walkScore, "qol.walkability.walkScore", cityId);
      validateScore(walkability.bikeScore, "qol.walkability.bikeScore", cityId);
      validateScore(walkability.transitScore, "qol.walkability.transitScore", cityId);
    }
    
    const airQuality = qol.airQuality as Record<string, unknown> | undefined;
    if (airQuality) {
      validatePercentage(airQuality.healthyDaysPercent, "qol.airQuality.healthyDaysPercent", cityId);
      // AQI typically 0-500
      validatePositiveNumber(airQuality.annualAQI, "qol.airQuality.annualAQI", cityId, 500);
    }
    
    const broadband = qol.broadband as Record<string, unknown> | undefined;
    if (broadband) {
      validatePercentage(broadband.fiberCoveragePercent, "qol.broadband.fiberCoveragePercent", cityId);
    }
    
    const education = qol.education as Record<string, unknown> | undefined;
    if (education) {
      validatePercentage(education.graduationRate, "qol.education.graduationRate", cityId);
    }
  }
  
  // Validate BEA data
  if (bea) {
    const rpp = bea.regionalPriceParity as Record<string, unknown> | undefined;
    if (rpp) {
      // RPP is typically 80-150
      const allItems = rpp.allItems;
      if (typeof allItems === "number" && (allItems < 50 || allItems > 200)) {
        warnings.push({ city: cityId, field: "bea.regionalPriceParity.allItems", value: allItems, message: `Unusual RPP value` });
      }
    }
    
    const taxes = bea.taxes as Record<string, unknown> | undefined;
    if (taxes) {
      // Effective tax rate should be 0-50%
      const taxRate = taxes.effectiveTaxRate;
      if (typeof taxRate === "number" && (taxRate < 0 || taxRate > 50)) {
        errors.push({ city: cityId, field: "bea.taxes.effectiveTaxRate", value: taxRate, message: `Tax rate must be 0-50%` });
      }
    }
  }
}

async function main() {
  console.log("🔍 Validating metrics.json data...\n");
  
  const dataPath = join(__dirname, "../data/metrics.json");
  const metricsFile = JSON.parse(readFileSync(dataPath, "utf-8"));
  const cities = metricsFile.cities as Record<string, Record<string, unknown>>;
  
  const cityIds = Object.keys(cities);
  console.log(`Found ${cityIds.length} cities to validate\n`);
  
  for (const cityId of cityIds) {
    validateCity(cityId, cities[cityId]);
  }
  
  // Print results
  console.log("=" .repeat(60));
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ All validations passed!");
  } else {
    if (errors.length > 0) {
      console.log(`\n❌ ERRORS (${errors.length}):\n`);
      for (const err of errors) {
        console.log(`  ${err.city}: ${err.field}`);
        console.log(`    Value: ${JSON.stringify(err.value)}`);
        console.log(`    ${err.message}\n`);
      }
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${warnings.length}):\n`);
      for (const warn of warnings) {
        console.log(`  ${warn.city}: ${warn.field}`);
        console.log(`    Value: ${JSON.stringify(warn.value)}`);
        console.log(`    ${warn.message}\n`);
      }
    }
  }
  
  console.log("=" .repeat(60));
  console.log(`\nSummary: ${errors.length} errors, ${warnings.length} warnings`);
  
  // Exit with error code if there are errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Validation failed:", e);
  process.exit(1);
});
