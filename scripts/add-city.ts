#!/usr/bin/env npx tsx
/**
 * Add a new city to the Cities App
 * 
 * Usage:
 *   npx tsx scripts/add-city.ts --interactive
 *   npx tsx scripts/add-city.ts --config city-config.json
 *   npx tsx scripts/add-city.ts --city "Austin" --state "TX"
 * 
 * This script:
 * 1. Prompts for or reads city configuration
 * 2. Adds the city to cities.json
 * 3. Runs the database seed
 * 4. Collects lifestyle data (recreation, urban)
 * 5. Runs all admin data pulls
 * 6. Validates the data
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync, spawn } from "child_process";
import * as readline from "readline";

const DATA_DIR = join(__dirname, "../data");
const CITIES_FILE = join(DATA_DIR, "cities.json");

interface CityConfig {
  id: string;
  name: string;
  state: string;
  noaaStation: string;
  latitude: number;
  longitude: number;
  urbanCenter: { latitude: number; longitude: number };
  censusFips: { state: string; place: string };
  zillowRegionId: number;
  zillowRegionName: string;
  sports: { nfl: string[]; nba: string[]; mlb: string[]; nhl: string[]; mls: string[] };
  beaGeoFips: string;
}

// Common identifiers lookup
const STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
  DE: "10", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18",
  IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24", MA: "25",
  MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31", NV: "32",
  NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38", OH: "39",
  OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46", TN: "47",
  TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54", WI: "55",
  WY: "56", DC: "11"
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function runCommand(cmd: string, description: string): boolean {
  console.log(`\n⏳ ${description}...`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: join(__dirname, "..") });
    console.log(`✓ ${description} complete`);
    return true;
  } catch (error) {
    console.error(`✗ ${description} failed:`, error);
    return false;
  }
}

async function runAdminPull(endpoint: string, password: string): Promise<boolean> {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  try {
    const response = await fetch(`${baseUrl}/api/admin/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (data.success) {
      console.log(`  ✓ ${endpoint}: ${data.message || "success"}`);
      return true;
    } else {
      console.log(`  ✗ ${endpoint}: ${data.error || "failed"}`);
      return false;
    }
  } catch (error) {
    console.log(`  ✗ ${endpoint}: ${error}`);
    return false;
  }
}

async function addCityToJson(config: CityConfig): Promise<boolean> {
  try {
    const citiesData = JSON.parse(readFileSync(CITIES_FILE, "utf-8"));
    
    // Check if city already exists
    const existing = citiesData.cities.find((c: CityConfig) => c.id === config.id);
    if (existing) {
      console.log(`⚠️  City "${config.name}" already exists in cities.json`);
      return false;
    }
    
    // Add new city
    citiesData.cities.push(config);
    writeFileSync(CITIES_FILE, JSON.stringify(citiesData, null, 2) + "\n");
    console.log(`✓ Added "${config.name}" to cities.json`);
    return true;
  } catch (error) {
    console.error("Error updating cities.json:", error);
    return false;
  }
}

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function prompt(rl: readline.Interface, question: string, defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    const q = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(q, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

async function interactiveMode(): Promise<CityConfig | null> {
  const rl = createReadline();
  
  console.log("\n🏙️  Add New City - Interactive Mode\n");
  console.log("Enter the required information for the new city.");
  console.log("Reference: https://census.gov/library/reference/code-lists/ansi.html\n");
  
  try {
    const name = await prompt(rl, "City name (e.g., 'Austin')");
    if (!name) {
      console.log("City name is required");
      return null;
    }
    
    const state = await prompt(rl, "State abbreviation (e.g., 'TX')");
    if (!state) {
      console.log("State is required");
      return null;
    }
    
    const id = slugify(name);
    console.log(`  Generated ID: ${id}`);
    
    // NOAA Station
    console.log("\n📍 NOAA Weather Station (find at weather.gov)");
    const noaaStation = await prompt(rl, "NOAA station code (e.g., 'KAUS')", `K${state.substring(0, 3).toUpperCase()}`);
    
    // Coordinates
    console.log("\n🌍 Coordinates (from Google Maps)");
    const airportLat = parseFloat(await prompt(rl, "Airport latitude"));
    const airportLon = parseFloat(await prompt(rl, "Airport longitude"));
    const downtownLat = parseFloat(await prompt(rl, "Downtown latitude"));
    const downtownLon = parseFloat(await prompt(rl, "Downtown longitude"));
    
    // Census FIPS
    console.log("\n📊 Census FIPS Codes");
    const stateFips = STATE_FIPS[state.toUpperCase()] || await prompt(rl, "State FIPS (2 digits)");
    const placeFips = await prompt(rl, "Place FIPS (5 digits)");
    
    // Zillow
    console.log("\n🏠 Zillow (find region ID from zillow.com/home-values URL)");
    const zillowRegionId = parseInt(await prompt(rl, "Zillow Region ID"));
    const zillowRegionName = await prompt(rl, "Zillow Region Name", `${name}, ${state}`);
    
    // BEA
    console.log("\n💰 BEA MSA Code (find at apps.bea.gov/regional/docs/msalist.cfm)");
    const beaGeoFips = await prompt(rl, "BEA GeoFIPS (5 digits)");
    
    // Sports
    console.log("\n🏈 Sports Teams (comma-separated, or leave blank)");
    const nfl = (await prompt(rl, "NFL teams")).split(",").map(s => s.trim()).filter(Boolean);
    const nba = (await prompt(rl, "NBA teams")).split(",").map(s => s.trim()).filter(Boolean);
    const mlb = (await prompt(rl, "MLB teams")).split(",").map(s => s.trim()).filter(Boolean);
    const nhl = (await prompt(rl, "NHL teams")).split(",").map(s => s.trim()).filter(Boolean);
    const mls = (await prompt(rl, "MLS teams")).split(",").map(s => s.trim()).filter(Boolean);
    
    rl.close();
    
    return {
      id,
      name,
      state: state.toUpperCase(),
      noaaStation,
      latitude: airportLat,
      longitude: airportLon,
      urbanCenter: { latitude: downtownLat, longitude: downtownLon },
      censusFips: { state: stateFips, place: placeFips },
      zillowRegionId,
      zillowRegionName,
      sports: { nfl, nba, mlb, nhl, mls },
      beaGeoFips,
    };
  } catch (error) {
    rl.close();
    console.error("Error in interactive mode:", error);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const isInteractive = args.includes("--interactive") || args.includes("-i");
  const configFile = args.find(a => a.startsWith("--config="))?.split("=")[1];
  const cityName = args.find(a => a.startsWith("--city="))?.split("=")[1];
  const skipDataPull = args.includes("--skip-data-pull");
  const adminPassword = process.env.ADMIN_PASSWORD || "cursorftw";
  
  console.log("🏙️  Add City Script\n");
  
  let config: CityConfig | null = null;
  
  if (configFile) {
    // Load from config file
    try {
      config = JSON.parse(readFileSync(configFile, "utf-8"));
      console.log(`Loaded config from ${configFile}`);
    } catch (error) {
      console.error(`Failed to load config file: ${configFile}`);
      process.exit(1);
    }
  } else if (isInteractive) {
    // Interactive mode
    config = await interactiveMode();
  } else if (cityName) {
    console.log(`Note: --city flag requires manual identifier lookup.`);
    console.log(`For full automation, use --interactive or --config=file.json\n`);
    process.exit(1);
  } else {
    console.log("Usage:");
    console.log("  npx tsx scripts/add-city.ts --interactive");
    console.log("  npx tsx scripts/add-city.ts --config=city-config.json");
    console.log("  npx tsx scripts/add-city.ts --config=city-config.json --skip-data-pull");
    console.log("\nOptions:");
    console.log("  --interactive, -i    Interactive mode with prompts");
    console.log("  --config=FILE        Load city config from JSON file");
    console.log("  --skip-data-pull     Skip automated data pulls (only add to JSON)");
    process.exit(0);
  }
  
  if (!config) {
    console.log("No configuration provided. Exiting.");
    process.exit(1);
  }
  
  // Step 1: Add to cities.json
  console.log("\n📝 Step 1: Adding city to cities.json...");
  const added = await addCityToJson(config);
  if (!added) {
    console.log("Skipping database operations as city wasn't added.");
    process.exit(1);
  }
  
  // Step 2: Run database seed
  console.log("\n💾 Step 2: Seeding database...");
  runCommand("npx tsx scripts/seed.ts", "Database seed");
  
  if (!skipDataPull) {
    // Step 3: Pull census data first (needed for lifestyle data collection)
    console.log("\n📊 Step 3: Pulling census data (required for lifestyle metrics)...");
    await runAdminPull("census-pull", adminPassword);
    
    // Step 4: Collect lifestyle data (requires census population data)
    console.log("\n🌳 Step 4: Collecting lifestyle data (this may take a few minutes)...");
    runCommand(`npx tsx scripts/collect-lifestyle-data.ts --city="${config.name}"`, "Lifestyle data collection");
    
    // Step 5: Run remaining admin data pulls
    console.log("\n📊 Step 5: Running automated data pulls...");
    const pulls = [
      "bea-pull", 
      "climate-pull",
      "zillow-pull",
      "recreation-pull",
      "urbanlife-pull",
      "fbi-crime-pull",
      "fcc-broadband-pull",
      "hrsa-health-pull",
      "nces-education-pull",
      "epa-air-pull",
    ];
    
    for (const pull of pulls) {
      await runAdminPull(pull, adminPassword);
    }
    
    // Step 6: Refresh database
    console.log("\n🔄 Step 6: Refreshing database...");
    await runAdminPull("refresh", adminPassword);
    
    // Step 7: Re-seed to sync all data
    console.log("\n💾 Step 7: Final database sync...");
    runCommand("npx tsx scripts/seed.ts", "Final seed");
  }
  
  // Step 8: Validate
  console.log("\n✅ Step 8: Validating city data...");
  runCommand(`npx tsx scripts/verify-city-data.ts ${config.id}`, "City data verification");
  
  console.log("\n" + "=".repeat(60));
  console.log(`🎉 City "${config.name}" has been added!`);
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log("1. Check the app at http://localhost:3000");
  console.log(`2. Visit http://localhost:3000/city/${config.id}`);
  console.log("3. Add manual data (political lean, etc.) to metrics.json if needed");
  console.log("4. Commit the changes: git add . && git commit -m 'Add " + config.name + "'");
}

main().catch(console.error);
