#!/usr/bin/env npx tsx
/**
 * Fetch walkability data from walkscore.com
 * 
 * Usage:
 *   npx tsx scripts/fetch-walkscore.ts              # All cities
 *   npx tsx scripts/fetch-walkscore.ts --city=boise # Single city
 *   npx tsx scripts/fetch-walkscore.ts --dry-run    # Preview without saving
 *   npx tsx scripts/fetch-walkscore.ts --strict     # Fail on validation warnings
 *   npx tsx scripts/fetch-walkscore.ts --skip=boise # Skip a specific city
 * 
 * This script:
 * 1. Fetches Walk Score city page for each city
 * 2. Validates it's a city page (not an address page)
 * 3. Extracts Walk Score, Transit Score, and Bike Score
 * 4. Warns about suspicious scores (e.g., multiple 100s)
 * 5. Updates metrics.json with the new data
 * 
 * IMPORTANT: Walk Score URLs are inconsistent. If a city fails validation,
 * you may need to add it to CITY_URL_OVERRIDES with the correct URL path.
 * Check https://www.walkscore.com/STATE/City_Name manually.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(__dirname, "../data");
const CITIES_FILE = join(DATA_DIR, "cities.json");
const METRICS_FILE = join(DATA_DIR, "metrics.json");

interface CityData {
  id: string;
  name: string;
  state: string;
}

interface WalkScoreData {
  walkScore: number | null;
  transitScore: number | null;
  bikeScore: number | null;
  description: string;
  cityAvgWalkScore: number | null;
}

// Map city IDs to their Walk Score URL paths (when different from standard)
// Format: "state/City_Name" (state uppercase, city with underscores)
// IMPORTANT: Verify URLs manually - Walk Score may use different city names
const CITY_URL_OVERRIDES: Record<string, string> = {
  // Cities where the Walk Score URL differs from our naming
  "new-york-city": "NY/New_York",       // Walk Score uses "New_York" not "New_York_City"
  "washington-dc": "DC/Washington%2C_DC", // Walk Score uses "Washington,_DC" with comma
  "st-louis": "MO/Saint_Louis",
  "tampa-bay": "FL/Tampa",              // Walk Score uses "Tampa" not "Tampa Bay"
};

function getWalkScoreUrl(city: CityData): string {
  const override = CITY_URL_OVERRIDES[city.id];
  if (override) {
    return `https://www.walkscore.com/${override}`;
  }
  
  // Standard format: /STATE/City_Name (state uppercase, underscores for spaces)
  // Example: Los Angeles, CA → /CA/Los_Angeles
  const stateCode = city.state.toUpperCase().split("/")[0]; // Handle "NY/NJ" -> "NY"
  const citySlug = city.name.replace(/\s+/g, "_");
  
  return `https://www.walkscore.com/${stateCode}/${citySlug}`;
}

function getWalkScoreDescription(score: number | null): string {
  if (score === null) return "Unknown";
  if (score >= 90) return "Walker's Paradise";
  if (score >= 70) return "Very Walkable";
  if (score >= 50) return "Somewhat Walkable";
  if (score >= 25) return "Car-Dependent";
  return "Almost All Errands Require a Car";
}

interface ValidationResult {
  isValid: boolean;
  isCityPage: boolean;
  warnings: string[];
}

function validateCityPage(html: string, finalUrl: string, city: CityData): ValidationResult {
  const warnings: string[] = [];
  
  // Check 1: Final URL should NOT contain /score/ (that's an address page)
  if (finalUrl.includes("/score/")) {
    warnings.push("URL redirected to /score/ (address page, not city page)");
    return { isValid: false, isCityPage: false, warnings };
  }
  
  // Check 2: City pages have "has an average Walk Score of X" text
  const hasAvgText = /has an average Walk Score of \d+/i.test(html);
  
  // Check 3: City pages have neighborhood listings
  const hasNeighborhoods = /neighborhoods/i.test(html) && /Walk Score.*Transit Score.*Bike Score/i.test(html);
  
  // Check 4: City pages mention population "X residents"
  const hasPopulation = /[\d,]+ residents/i.test(html);
  
  // Check 5: Page should mention the city name
  const cityNamePattern = new RegExp(city.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const hasCityName = cityNamePattern.test(html);
  
  // Determine if this looks like a city page
  const cityPageSignals = [hasAvgText, hasNeighborhoods, hasPopulation, hasCityName].filter(Boolean).length;
  const isCityPage = cityPageSignals >= 2; // At least 2 of 4 signals
  
  if (!isCityPage) {
    if (!hasAvgText) warnings.push("Missing 'average Walk Score' text (city page marker)");
    if (!hasNeighborhoods) warnings.push("Missing neighborhood listings");
    if (!hasPopulation) warnings.push("Missing population info");
    if (!hasCityName) warnings.push(`City name "${city.name}" not found in page`);
  }
  
  return { isValid: isCityPage, isCityPage, warnings };
}

function validateScores(walkScore: number | null, transitScore: number | null, bikeScore: number | null): string[] {
  const warnings: string[] = [];
  
  // Perfect 100 scores are very rare for city-wide averages (only NYC transit is ~100)
  // Multiple 100s is highly suspicious
  const perfectScores = [walkScore, transitScore, bikeScore].filter(s => s === 100).length;
  if (perfectScores >= 2) {
    warnings.push(`SUSPICIOUS: ${perfectScores} perfect scores of 100 (likely address page data)`);
  }
  
  // Transit score of 100 is rare - only NYC has it
  if (transitScore === 100 && walkScore !== null && walkScore < 95) {
    warnings.push(`SUSPICIOUS: Transit 100 but Walk ${walkScore} (mismatch suggests address page)`);
  }
  
  return warnings;
}

async function fetchWalkScore(city: CityData, strictMode: boolean = false): Promise<WalkScoreData | null> {
  const url = getWalkScoreUrl(city);
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    
    if (!response.ok) {
      console.log(`    ⚠️  HTTP ${response.status} for ${url}`);
      return null;
    }
    
    // Get the final URL after redirects
    const finalUrl = response.url;
    const html = await response.text();
    
    // Validate this is a city page, not an address page
    const validation = validateCityPage(html, finalUrl, city);
    
    if (!validation.isValid) {
      console.log(`\n    ❌ VALIDATION FAILED:`);
      validation.warnings.forEach(w => console.log(`       - ${w}`));
      console.log(`       URL: ${url}`);
      console.log(`       Final URL: ${finalUrl}`);
      if (strictMode) {
        console.log(`       (strict mode: skipping this city)`);
        return null;
      }
      console.log(`       (continuing anyway - data may be incorrect!)`);
    }
    
    // Extract scores from city page format
    // City pages show scores in badge images: /badge/walk/score/69.svg
    // And in text like "69 Walk Score of Los Angeles, CA"
    
    // Method 1: Extract from badge image URLs (most reliable)
    const walkBadgeMatch = html.match(/badge\/walk\/score\/(\d+)/i);
    const transitBadgeMatch = html.match(/badge\/transit\/score\/(\d+)/i);
    const bikeBadgeMatch = html.match(/badge\/bike\/score\/(\d+)/i);
    
    // Method 2: Extract from alt text like "69 Walk Score of Los Angeles, CA"
    const walkAltMatch = html.match(/(\d+)\s*Walk Score of/i);
    const transitAltMatch = html.match(/(\d+)\s*Transit Score of/i);
    const bikeAltMatch = html.match(/(\d+)\s*Bike Score of/i);
    
    // Method 3: Extract from "has an average Walk Score of XX"
    const cityAvgMatch = html.match(/has an average Walk Score of (\d+)/i);
    
    // Prefer badge URLs, then alt text, then city average
    const walkScore = walkBadgeMatch ? parseInt(walkBadgeMatch[1]) :
                      walkAltMatch ? parseInt(walkAltMatch[1]) :
                      cityAvgMatch ? parseInt(cityAvgMatch[1]) : null;
    
    const transitScore = transitBadgeMatch ? parseInt(transitBadgeMatch[1]) :
                         transitAltMatch ? parseInt(transitAltMatch[1]) : null;
    
    const bikeScore = bikeBadgeMatch ? parseInt(bikeBadgeMatch[1]) :
                      bikeAltMatch ? parseInt(bikeAltMatch[1]) : null;
    
    const cityAvgWalkScore = cityAvgMatch ? parseInt(cityAvgMatch[1]) : null;
    
    // Validate the extracted scores
    const scoreWarnings = validateScores(walkScore, transitScore, bikeScore);
    if (scoreWarnings.length > 0) {
      console.log(`\n    ⚠️  SCORE WARNINGS:`);
      scoreWarnings.forEach(w => console.log(`       - ${w}`));
      if (strictMode) {
        console.log(`       (strict mode: skipping this city)`);
        return null;
      }
    }
    
    // Use city average if it differs from main score (city avg is more representative)
    const effectiveWalkScore = cityAvgWalkScore ?? walkScore;
    
    return {
      walkScore: effectiveWalkScore,
      transitScore,
      bikeScore,
      description: getWalkScoreDescription(effectiveWalkScore),
      cityAvgWalkScore,
    };
  } catch (error) {
    console.log(`    ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const strictMode = args.includes("--strict");
  const singleCity = args.find(a => a.startsWith("--city="))?.split("=")[1];
  const skipCity = args.find(a => a.startsWith("--skip="))?.split("=")[1];
  
  console.log("🚶 Walk Score Fetcher");
  if (strictMode) {
    console.log("   (strict mode: will skip cities with validation warnings)");
  }
  console.log();
  
  // Load cities
  const citiesData = JSON.parse(readFileSync(CITIES_FILE, "utf-8"));
  let cities: CityData[] = citiesData.cities;
  
  if (singleCity) {
    cities = cities.filter(c => c.id === singleCity);
    if (cities.length === 0) {
      console.error(`City "${singleCity}" not found`);
      process.exit(1);
    }
  }
  
  if (skipCity) {
    cities = cities.filter(c => c.id !== skipCity);
  }
  
  // Load metrics
  const metricsData = JSON.parse(readFileSync(METRICS_FILE, "utf-8"));
  
  console.log(`Fetching Walk Scores for ${cities.length} cities...\n`);
  
  let successCount = 0;
  let failCount = 0;
  const results: { city: string; data: WalkScoreData | null }[] = [];
  
  for (const city of cities) {
    process.stdout.write(`[${successCount + failCount + 1}/${cities.length}] ${city.name}, ${city.state}... `);
    
    // Rate limiting - be nice to the server
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const data = await fetchWalkScore(city, strictMode);
    results.push({ city: city.id, data });
    
    if (data && data.walkScore !== null) {
      console.log(`✓ Walk: ${data.walkScore}, Transit: ${data.transitScore ?? "N/A"}, Bike: ${data.bikeScore ?? "N/A"}`);
      successCount++;
      
      // Update metrics
      if (!metricsData.cities[city.id]) {
        metricsData.cities[city.id] = {};
      }
      if (!metricsData.cities[city.id].qol) {
        metricsData.cities[city.id].qol = {};
      }
      
      metricsData.cities[city.id].qol.walkability = {
        walkScore: data.walkScore,
        transitScore: data.transitScore,
        bikeScore: data.bikeScore,
        description: data.description,
        source: "walkscore.com",
        updatedAt: new Date().toISOString().split("T")[0],
      };
    } else {
      console.log("✗ Failed to fetch");
      failCount++;
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${successCount} success, ${failCount} failed`);
  console.log("=".repeat(60));
  
  if (!dryRun && successCount > 0) {
    writeFileSync(METRICS_FILE, JSON.stringify(metricsData, null, 2));
    console.log(`\n✅ Updated ${METRICS_FILE}`);
  } else if (dryRun) {
    console.log("\n(Dry run - no changes saved)");
  }
  
  // Show failures for manual review
  if (failCount > 0) {
    console.log("\nFailed cities (may need URL override):");
    for (const r of results) {
      if (!r.data || r.data.walkScore === null) {
        const city = cities.find(c => c.id === r.city);
        if (city) {
          console.log(`  - ${city.name}: ${getWalkScoreUrl(city)}`);
        }
      }
    }
  }
}

main().catch(console.error);
