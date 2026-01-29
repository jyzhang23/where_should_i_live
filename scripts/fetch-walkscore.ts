#!/usr/bin/env npx tsx
/**
 * Fetch walkability data from walkscore.com
 * 
 * Usage:
 *   npx tsx scripts/fetch-walkscore.ts           # All cities
 *   npx tsx scripts/fetch-walkscore.ts --city=boise  # Single city
 *   npx tsx scripts/fetch-walkscore.ts --dry-run # Preview without saving
 * 
 * This script:
 * 1. Fetches Walk Score page for each city
 * 2. Extracts Walk Score, Transit Score, and Bike Score
 * 3. Updates metrics.json with the new data
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

// Map city names to their Walk Score URL slugs (when different from standard)
const CITY_URL_OVERRIDES: Record<string, string> = {
  "new-york-city": "new-york-city-ny",
  "washington-dc": "washington-d.c.",
  "st-louis": "saint-louis-mo",
  "tampa-bay": "tampa-fl",
  "green-bay": "green-bay-wi",
};

function getWalkScoreUrl(city: CityData): string {
  const override = CITY_URL_OVERRIDES[city.id];
  if (override) {
    return `https://www.walkscore.com/score/${override}`;
  }
  
  // Standard format: city-state (lowercase, hyphens)
  const citySlug = city.name.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-");
  const stateSlug = city.state.toLowerCase().split("/")[0]; // Handle "NY/NJ" -> "ny"
  
  return `https://www.walkscore.com/score/${citySlug}-${stateSlug}`;
}

function getWalkScoreDescription(score: number | null): string {
  if (score === null) return "Unknown";
  if (score >= 90) return "Walker's Paradise";
  if (score >= 70) return "Very Walkable";
  if (score >= 50) return "Somewhat Walkable";
  if (score >= 25) return "Car-Dependent";
  return "Almost All Errands Require a Car";
}

async function fetchWalkScore(city: CityData): Promise<WalkScoreData | null> {
  const url = getWalkScoreUrl(city);
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    
    if (!response.ok) {
      console.log(`    ⚠️  HTTP ${response.status} for ${url}`);
      return null;
    }
    
    const html = await response.text();
    
    // Extract scores using regex patterns
    // Walk Score: look for the main score display
    const walkScoreMatch = html.match(/(\d+)\s*Walk Score/i) || 
                           html.match(/Walk Score[^0-9]*(\d+)/i) ||
                           html.match(/"walkscore"[^0-9]*(\d+)/i);
    
    // Transit Score
    const transitScoreMatch = html.match(/(\d+)\s*Transit Score/i) ||
                              html.match(/Transit Score[^0-9]*(\d+)/i) ||
                              html.match(/"transitscore"[^0-9]*(\d+)/i);
    
    // Bike Score
    const bikeScoreMatch = html.match(/(\d+)\s*Bike Score/i) ||
                           html.match(/Bike Score[^0-9]*(\d+)/i) ||
                           html.match(/"bikescore"[^0-9]*(\d+)/i);
    
    // City average Walk Score (more reliable for city-wide comparison)
    // Pattern: "CityName has an average Walk Score of XX"
    const cityAvgMatch = html.match(/has an average Walk Score of (\d+)/i);
    
    const walkScore = walkScoreMatch ? parseInt(walkScoreMatch[1]) : null;
    const transitScore = transitScoreMatch ? parseInt(transitScoreMatch[1]) : null;
    const bikeScore = bikeScoreMatch ? parseInt(bikeScoreMatch[1]) : null;
    const cityAvgWalkScore = cityAvgMatch ? parseInt(cityAvgMatch[1]) : null;
    
    // Use city average if available, otherwise use the location score
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
  const singleCity = args.find(a => a.startsWith("--city="))?.split("=")[1];
  const skipCity = args.find(a => a.startsWith("--skip="))?.split("=")[1];
  
  console.log("🚶 Walk Score Fetcher\n");
  
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
    
    const data = await fetchWalkScore(city);
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
