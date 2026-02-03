#!/usr/bin/env npx tsx
/**
 * Add a new city to the Cities App
 * 
 * Usage:
 *   npx tsx scripts/add-city.ts --interactive
 *   npx tsx scripts/add-city.ts --auto-discover --city "Austin" --state "TX"
 *   npx tsx scripts/add-city.ts --config city-config.json
 * 
 * This script:
 * 1. Prompts for or reads city configuration (or auto-discovers data)
 * 2. Adds the city to cities.json
 * 3. Runs the database seed
 * 4. Collects lifestyle data (recreation, urban)
 * 5. Runs all admin data pulls
 * 6. Validates the data
 * 
 * Auto-Discovery APIs:
 * - Coordinates: OpenStreetMap Nominatim (free, no key required)
 * - Census FIPS: US Census Bureau Geocoder API (free, no key required)
 * - NOAA Station: NOAA ISD station list lookup
 * - BEA MSA: BEA API metadata (uses BEA_API_KEY from .env)
 * - Sports Teams: Wikidata SPARQL (free, no key required)
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

// ============================================================================
// Auto-Discovery Types
// ============================================================================

interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

interface DiscoveredGeoData {
  airport: GeoCoordinates | null;
  downtown: GeoCoordinates;
  boundingBox?: { north: number; south: number; east: number; west: number };
}

interface DiscoveredData {
  coordinates: DiscoveredGeoData | null;
  placeFips: string | null;
  noaaStation: string | null;
  beaGeoFips: string | null;
  sports: { nfl: string[]; nba: string[]; mlb: string[]; nhl: string[]; mls: string[] };
  validationWarnings: string[];
}

// State bounding boxes for coordinate validation (approximate)
const STATE_BOUNDS: Record<string, { north: number; south: number; east: number; west: number }> = {
  AL: { north: 35.0, south: 30.2, east: -84.9, west: -88.5 },
  AK: { north: 71.4, south: 51.2, east: -130.0, west: -180.0 },
  AZ: { north: 37.0, south: 31.3, east: -109.0, west: -114.8 },
  AR: { north: 36.5, south: 33.0, east: -89.6, west: -94.6 },
  CA: { north: 42.0, south: 32.5, east: -114.1, west: -124.4 },
  CO: { north: 41.0, south: 37.0, east: -102.0, west: -109.1 },
  CT: { north: 42.1, south: 41.0, east: -71.8, west: -73.7 },
  DE: { north: 39.8, south: 38.5, east: -75.0, west: -75.8 },
  DC: { north: 39.0, south: 38.8, east: -76.9, west: -77.1 },
  FL: { north: 31.0, south: 24.5, east: -80.0, west: -87.6 },
  GA: { north: 35.0, south: 30.4, east: -80.8, west: -85.6 },
  HI: { north: 22.2, south: 18.9, east: -154.8, west: -160.2 },
  ID: { north: 49.0, south: 42.0, east: -111.0, west: -117.2 },
  IL: { north: 42.5, south: 37.0, east: -87.5, west: -91.5 },
  IN: { north: 41.8, south: 37.8, east: -84.8, west: -88.1 },
  IA: { north: 43.5, south: 40.4, east: -90.1, west: -96.6 },
  KS: { north: 40.0, south: 37.0, east: -94.6, west: -102.1 },
  KY: { north: 39.1, south: 36.5, east: -82.0, west: -89.6 },
  LA: { north: 33.0, south: 29.0, east: -89.0, west: -94.0 },
  ME: { north: 47.5, south: 43.1, east: -66.9, west: -71.1 },
  MD: { north: 39.7, south: 38.0, east: -75.0, west: -79.5 },
  MA: { north: 42.9, south: 41.2, east: -69.9, west: -73.5 },
  MI: { north: 48.2, south: 41.7, east: -82.4, west: -90.4 },
  MN: { north: 49.4, south: 43.5, east: -89.5, west: -97.2 },
  MS: { north: 35.0, south: 30.2, east: -88.1, west: -91.7 },
  MO: { north: 40.6, south: 36.0, east: -89.1, west: -95.8 },
  MT: { north: 49.0, south: 45.0, east: -104.0, west: -116.0 },
  NE: { north: 43.0, south: 40.0, east: -95.3, west: -104.1 },
  NV: { north: 42.0, south: 35.0, east: -114.0, west: -120.0 },
  NH: { north: 45.3, south: 42.7, east: -70.7, west: -72.6 },
  NJ: { north: 41.4, south: 39.0, east: -74.0, west: -75.6 },
  NM: { north: 37.0, south: 31.3, east: -103.0, west: -109.0 },
  NY: { north: 45.0, south: 40.5, east: -71.9, west: -79.8 },
  NC: { north: 36.6, south: 33.8, east: -75.5, west: -84.3 },
  ND: { north: 49.0, south: 45.9, east: -96.6, west: -104.0 },
  OH: { north: 42.0, south: 38.4, east: -80.5, west: -84.8 },
  OK: { north: 37.0, south: 33.6, east: -94.4, west: -103.0 },
  OR: { north: 46.3, south: 42.0, east: -116.5, west: -124.6 },
  PA: { north: 42.3, south: 39.7, east: -74.7, west: -80.5 },
  RI: { north: 42.0, south: 41.1, east: -71.1, west: -71.9 },
  SC: { north: 35.2, south: 32.0, east: -78.5, west: -83.4 },
  SD: { north: 46.0, south: 42.5, east: -96.4, west: -104.1 },
  TN: { north: 36.7, south: 35.0, east: -81.6, west: -90.3 },
  TX: { north: 36.5, south: 25.8, east: -93.5, west: -106.6 },
  UT: { north: 42.0, south: 37.0, east: -109.0, west: -114.1 },
  VT: { north: 45.0, south: 42.7, east: -71.5, west: -73.4 },
  VA: { north: 39.5, south: 36.5, east: -75.2, west: -83.7 },
  WA: { north: 49.0, south: 45.5, east: -116.9, west: -124.8 },
  WV: { north: 40.6, south: 37.2, east: -77.7, west: -82.6 },
  WI: { north: 47.1, south: 42.5, east: -86.8, west: -92.9 },
  WY: { north: 45.0, south: 41.0, east: -104.1, west: -111.1 },
};

// Valid professional sports teams for validation
const VALID_TEAMS: Record<string, string[]> = {
  nfl: ["49ers", "Bears", "Bengals", "Bills", "Broncos", "Browns", "Buccaneers", "Cardinals", "Chargers", "Chiefs", "Colts", "Commanders", "Cowboys", "Dolphins", "Eagles", "Falcons", "Giants", "Jaguars", "Jets", "Lions", "Packers", "Panthers", "Patriots", "Raiders", "Rams", "Ravens", "Saints", "Seahawks", "Steelers", "Texans", "Titans", "Vikings"],
  nba: ["76ers", "Bucks", "Bulls", "Cavaliers", "Celtics", "Clippers", "Grizzlies", "Hawks", "Heat", "Hornets", "Jazz", "Kings", "Knicks", "Lakers", "Magic", "Mavericks", "Nets", "Nuggets", "Pacers", "Pelicans", "Pistons", "Raptors", "Rockets", "Spurs", "Suns", "Thunder", "Timberwolves", "Trail Blazers", "Warriors", "Wizards"],
  mlb: ["Angels", "Astros", "Athletics", "Blue Jays", "Braves", "Brewers", "Cardinals", "Cubs", "Diamondbacks", "Dodgers", "Giants", "Guardians", "Mariners", "Marlins", "Mets", "Nationals", "Orioles", "Padres", "Phillies", "Pirates", "Rangers", "Rays", "Red Sox", "Reds", "Rockies", "Royals", "Tigers", "Twins", "White Sox", "Yankees"],
  nhl: ["Avalanche", "Blackhawks", "Blues", "Bruins", "Canadiens", "Canucks", "Capitals", "Coyotes", "Devils", "Ducks", "Flames", "Flyers", "Golden Knights", "Hockey Club", "Hurricanes", "Islanders", "Jets", "Kings", "Kraken", "Lightning", "Maple Leafs", "Oilers", "Panthers", "Penguins", "Predators", "Rangers", "Red Wings", "Sabres", "Senators", "Sharks", "Stars", "Wild"],
  mls: ["Atlanta United", "Austin FC", "Charlotte FC", "Chicago Fire", "Cincinnati FC", "Colorado Rapids", "Columbus Crew", "DC United", "Dynamo", "FC Dallas", "FC San Diego", "Galaxy", "Inter Miami", "LAFC", "Minnesota United", "Nashville SC", "New England Revolution", "NYCFC", "Orlando City", "Philadelphia Union", "Portland Timbers", "Real Salt Lake", "Red Bulls", "Republic", "San Jose Earthquakes", "Seattle Sounders", "Sporting KC", "St. Louis City SC", "Toronto FC", "Vancouver Whitecaps"],
};

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

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

// ============================================================================
// API Discovery Functions
// ============================================================================

/**
 * Fetch coordinates using OpenStreetMap Nominatim API (free, no key required)
 * Searches for downtown area and nearest airport
 */
async function fetchGeoData(name: string, state: string): Promise<DiscoveredGeoData | null> {
  const stateName = STATE_NAMES[state.toUpperCase()] || state;
  
  try {
    // Search for the city center (downtown)
    const downtownQuery = encodeURIComponent(`${name}, ${stateName}, USA`);
    const downtownUrl = `https://nominatim.openstreetmap.org/search?q=${downtownQuery}&format=json&limit=5&countrycodes=us`;
    
    const downtownResponse = await fetch(downtownUrl, {
      headers: { "User-Agent": "CityApp/1.0 (city data collection script)" }
    });
    
    if (!downtownResponse.ok) {
      console.log(`  ⚠️  Nominatim API error: ${downtownResponse.status}`);
      return null;
    }
    
    const downtownResults = await downtownResponse.json();
    if (!downtownResults.length) {
      console.log(`  ⚠️  No geocoding results for ${name}, ${state}`);
      return null;
    }
    
    // Find the best match (prefer city/town class)
    const cityResult = downtownResults.find((r: { class: string; type: string }) => 
      r.class === "place" && ["city", "town", "village"].includes(r.type)
    ) || downtownResults[0];
    
    const downtown: GeoCoordinates = {
      latitude: parseFloat(cityResult.lat),
      longitude: parseFloat(cityResult.lon)
    };
    
    // Add delay to respect rate limits (1 req/sec for Nominatim)
    await sleep(1100);
    
    // Search for the airport
    const airportQuery = encodeURIComponent(`${name} international airport, ${stateName}, USA`);
    const airportUrl = `https://nominatim.openstreetmap.org/search?q=${airportQuery}&format=json&limit=5&countrycodes=us`;
    
    const airportResponse = await fetch(airportUrl, {
      headers: { "User-Agent": "CityApp/1.0 (city data collection script)" }
    });
    
    let airport: GeoCoordinates | null = null;
    if (airportResponse.ok) {
      const airportResults = await airportResponse.json();
      // Find actual airport results
      const airportResult = airportResults.find((r: { class: string; type: string }) =>
        r.class === "aeroway" || r.type === "aerodrome"
      );
      if (airportResult) {
        airport = {
          latitude: parseFloat(airportResult.lat),
          longitude: parseFloat(airportResult.lon)
        };
      }
    }
    
    // If no airport found, try a more generic search
    if (!airport) {
      await sleep(1100);
      const genericAirportQuery = encodeURIComponent(`${name} airport, ${stateName}`);
      const genericUrl = `https://nominatim.openstreetmap.org/search?q=${genericAirportQuery}&format=json&limit=5&countrycodes=us`;
      
      const genericResponse = await fetch(genericUrl, {
        headers: { "User-Agent": "CityApp/1.0 (city data collection script)" }
      });
      
      if (genericResponse.ok) {
        const genericResults = await genericResponse.json();
        const genericAirport = genericResults.find((r: { class: string; type: string }) =>
          r.class === "aeroway" || r.type === "aerodrome"
        );
        if (genericAirport) {
          airport = {
            latitude: parseFloat(genericAirport.lat),
            longitude: parseFloat(genericAirport.lon)
          };
        }
      }
    }
    
    // Parse bounding box if available
    let boundingBox: { north: number; south: number; east: number; west: number } | undefined;
    if (cityResult.boundingbox) {
      const [south, north, west, east] = cityResult.boundingbox.map(parseFloat);
      boundingBox = { north, south, east, west };
    }
    
    return { airport, downtown, boundingBox };
  } catch (error) {
    console.log(`  ⚠️  Geocoding error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Fetch Place FIPS code using Census Bureau Geocoder API
 */
async function fetchPlaceFips(name: string, state: string, coordinates?: GeoCoordinates): Promise<string | null> {
  try {
    // Method 1: Use coordinates if available (more accurate)
    if (coordinates) {
      const geoUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${coordinates.longitude}&y=${coordinates.latitude}&benchmark=Public_AR_Current&vintage=Current_Current&layers=160&format=json`;
      
      const geoResponse = await fetch(geoUrl);
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        const placeData = geoData.result?.geographies?.["Incorporated Places"];
        if (placeData && placeData.length > 0) {
          const placeFips = placeData[0].GEOID?.slice(-5) || placeData[0].PLACEFP;
          if (placeFips) {
            return placeFips.padStart(5, "0");
          }
        }
      }
    }
    
    await sleep(500);
    
    // Method 2: Address-based geocoding as fallback
    const stateName = STATE_NAMES[state.toUpperCase()] || state;
    const addressUrl = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(`${name}, ${stateName}`)}&benchmark=Public_AR_Current&vintage=Current_Current&layers=160&format=json`;
    
    const addressResponse = await fetch(addressUrl);
    if (addressResponse.ok) {
      const addressData = await addressResponse.json();
      const matches = addressData.result?.addressMatches;
      if (matches && matches.length > 0) {
        const placeData = matches[0].geographies?.["Incorporated Places"];
        if (placeData && placeData.length > 0) {
          const placeFips = placeData[0].GEOID?.slice(-5) || placeData[0].PLACEFP;
          if (placeFips) {
            return placeFips.padStart(5, "0");
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.log(`  ⚠️  Census FIPS lookup error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Find closest NOAA weather station using NOAA ISD station list
 */
async function fetchNoaaStation(name: string, state: string, coordinates?: GeoCoordinates): Promise<string | null> {
  // First, try the common pattern: K + 3-letter airport code
  // Most major US cities use this format
  const citySlug = slugify(name);
  const guessedCode = `K${citySlug.substring(0, 3).toUpperCase()}`;
  
  // If we have coordinates, try to find the closest station from NOAA's station list
  if (coordinates) {
    try {
      // Use NOAA's weather.gov API to find nearby stations
      const pointsUrl = `https://api.weather.gov/points/${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}`;
      const pointsResponse = await fetch(pointsUrl, {
        headers: { "User-Agent": "CityApp/1.0" }
      });
      
      if (pointsResponse.ok) {
        const pointsData = await pointsResponse.json();
        const stationsUrl = pointsData.properties?.observationStations;
        
        if (stationsUrl) {
          await sleep(300);
          const stationsResponse = await fetch(stationsUrl, {
            headers: { "User-Agent": "CityApp/1.0" }
          });
          
          if (stationsResponse.ok) {
            const stationsData = await stationsResponse.json();
            // Get the first (closest) station
            if (stationsData.features && stationsData.features.length > 0) {
              const stationId = stationsData.features[0].properties?.stationIdentifier;
              if (stationId) {
                return stationId;
              }
            }
          }
        }
      }
    } catch (error) {
      // Fall back to guessed code
    }
  }
  
  return guessedCode;
}

/**
 * Fetch BEA MSA GeoFips code using BEA API
 */
async function fetchBeaMsaCode(name: string, state: string): Promise<string | null> {
  const beaApiKey = process.env.BEA_API_KEY;
  if (!beaApiKey) {
    console.log(`  ⚠️  BEA_API_KEY not set, skipping MSA lookup`);
    return null;
  }
  
  try {
    // Get the list of all MSAs from BEA
    const msaUrl = `https://apps.bea.gov/api/data/?UserID=${beaApiKey}&method=GetParameterValuesFiltered&DataSetName=Regional&TargetParameter=GeoFips&TableName=CAGDP1&ResultFormat=JSON`;
    
    const msaResponse = await fetch(msaUrl);
    if (!msaResponse.ok) {
      console.log(`  ⚠️  BEA API error: ${msaResponse.status}`);
      return null;
    }
    
    const msaData = await msaResponse.json();
    const geoFipsList = msaData.BEAAPI?.Results?.ParamValue;
    
    if (!geoFipsList || !Array.isArray(geoFipsList)) {
      return null;
    }
    
    // Search for MSA matching the city name
    const cityNameLower = name.toLowerCase();
    const stateName = STATE_NAMES[state.toUpperCase()]?.toLowerCase() || state.toLowerCase();
    
    // Look for exact or close matches
    for (const item of geoFipsList) {
      const desc = (item.Description || item.GeoName || "").toLowerCase();
      const key = item.Key || item.GeoFips || "";
      
      // MSA codes are 5 digits
      if (key.length !== 5) continue;
      
      // Check if this MSA contains our city name
      if (desc.includes(cityNameLower) && (desc.includes(stateName) || desc.includes(state.toLowerCase()))) {
        return key;
      }
    }
    
    // Try partial matches
    for (const item of geoFipsList) {
      const desc = (item.Description || item.GeoName || "").toLowerCase();
      const key = item.Key || item.GeoFips || "";
      
      if (key.length !== 5) continue;
      
      // Check if description starts with city name (e.g., "Austin-Round Rock, TX")
      if (desc.startsWith(cityNameLower)) {
        return key;
      }
    }
    
    return null;
  } catch (error) {
    console.log(`  ⚠️  BEA MSA lookup error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Fetch sports teams using Wikidata SPARQL query
 */
async function fetchSportsTeams(name: string, state: string): Promise<{ nfl: string[]; nba: string[]; mlb: string[]; nhl: string[]; mls: string[] }> {
  const sports = { nfl: [] as string[], nba: [] as string[], mlb: [] as string[], nhl: [] as string[], mls: [] as string[] };
  
  try {
    // Wikidata SPARQL query to find professional sports teams in the city
    const sparqlQuery = `
      SELECT DISTINCT ?team ?teamLabel ?leagueLabel WHERE {
        ?team wdt:P31/wdt:P279* wd:Q476028 .  # instance of sports team
        ?team wdt:P115 ?homeVenue .           # home venue
        ?homeVenue wdt:P131* ?city .          # located in city
        ?city rdfs:label "${name}"@en .
        ?team wdt:P118 ?league .              # league
        VALUES ?league { 
          wd:Q1215884   # NFL
          wd:Q155223    # NBA  
          wd:Q743654    # MLB
          wd:Q1215892   # NHL
          wd:Q14056     # MLS
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
    `;
    
    const wikidataUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
    
    const response = await fetch(wikidataUrl, {
      headers: { 
        "User-Agent": "CityApp/1.0 (city data collection script)",
        "Accept": "application/sparql-results+json"
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      for (const binding of data.results?.bindings || []) {
        const teamName = binding.teamLabel?.value || "";
        const league = binding.leagueLabel?.value || "";
        
        // Extract team nickname (usually last word or known pattern)
        let nickname = extractTeamNickname(teamName);
        
        // Validate against known teams
        if (league.includes("NFL") && VALID_TEAMS.nfl.includes(nickname)) {
          if (!sports.nfl.includes(nickname)) sports.nfl.push(nickname);
        } else if (league.includes("NBA") && VALID_TEAMS.nba.includes(nickname)) {
          if (!sports.nba.includes(nickname)) sports.nba.push(nickname);
        } else if (league.includes("MLB") && VALID_TEAMS.mlb.includes(nickname)) {
          if (!sports.mlb.includes(nickname)) sports.mlb.push(nickname);
        } else if (league.includes("NHL") && VALID_TEAMS.nhl.includes(nickname)) {
          if (!sports.nhl.includes(nickname)) sports.nhl.push(nickname);
        } else if (league.includes("MLS")) {
          // MLS team names are more varied
          const mlsMatch = findMlsTeamMatch(teamName, name);
          if (mlsMatch && !sports.mls.includes(mlsMatch)) {
            sports.mls.push(mlsMatch);
          }
        }
      }
    }
  } catch (error) {
    // Wikidata lookup failed, return empty
  }
  
  return sports;
}

/**
 * Extract team nickname from full team name
 */
function extractTeamNickname(fullName: string): string {
  // Common patterns: "City Nickname" or "City State Nickname"
  const parts = fullName.split(/\s+/);
  if (parts.length >= 2) {
    // Check if last 2 words form a known team name (e.g., "Red Sox", "White Sox", "Trail Blazers")
    const lastTwo = parts.slice(-2).join(" ");
    for (const teams of Object.values(VALID_TEAMS)) {
      if (teams.includes(lastTwo)) return lastTwo;
    }
    // Otherwise return just the last word
    return parts[parts.length - 1];
  }
  return fullName;
}

/**
 * Match MLS team names (more complex naming patterns)
 */
function findMlsTeamMatch(fullName: string, cityName: string): string | null {
  const fullNameLower = fullName.toLowerCase();
  const cityLower = cityName.toLowerCase();
  
  // Check for exact matches in valid teams
  for (const team of VALID_TEAMS.mls) {
    if (fullNameLower.includes(team.toLowerCase())) {
      return team;
    }
  }
  
  // Check for city-based matches
  if (fullNameLower.includes(cityLower)) {
    // Extract the team identity
    if (fullNameLower.includes("fc") || fullNameLower.includes("f.c.")) {
      return `${cityName} FC`;
    }
    if (fullNameLower.includes("united")) {
      return "United";
    }
    if (fullNameLower.includes("city")) {
      return "City SC";
    }
  }
  
  return null;
}

// ============================================================================
// Verification Functions
// ============================================================================

/**
 * Verify coordinates fall within expected state boundaries
 */
function verifyCoordinatesInState(coords: GeoCoordinates, state: string): { valid: boolean; message?: string } {
  const bounds = STATE_BOUNDS[state.toUpperCase()];
  if (!bounds) {
    return { valid: true, message: "No boundary data for state validation" };
  }
  
  const { latitude, longitude } = coords;
  
  if (latitude < bounds.south || latitude > bounds.north) {
    return { 
      valid: false, 
      message: `Latitude ${latitude.toFixed(4)} outside ${state} bounds (${bounds.south}-${bounds.north})` 
    };
  }
  
  if (longitude < bounds.west || longitude > bounds.east) {
    return { 
      valid: false, 
      message: `Longitude ${longitude.toFixed(4)} outside ${state} bounds (${bounds.west}-${bounds.east})` 
    };
  }
  
  return { valid: true };
}

/**
 * Verify NOAA station code format
 */
function verifyNoaaStation(code: string): { valid: boolean; message?: string } {
  // US NOAA stations typically start with K and are 4 characters
  if (!/^K[A-Z]{3}$/.test(code)) {
    return { valid: false, message: `Station code "${code}" doesn't match expected US format (KXXX)` };
  }
  return { valid: true };
}

/**
 * Perform reverse geocoding to verify coordinates match the expected city
 */
async function reverseGeocodeVerify(coords: GeoCoordinates, expectedCity: string, expectedState: string): Promise<{ valid: boolean; message?: string }> {
  try {
    await sleep(1100); // Respect Nominatim rate limits
    
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`;
    
    const response = await fetch(url, {
      headers: { "User-Agent": "CityApp/1.0" }
    });
    
    if (!response.ok) {
      return { valid: true, message: "Reverse geocoding unavailable" };
    }
    
    const data = await response.json();
    const address = data.address || {};
    const returnedCity = address.city || address.town || address.village || address.municipality || "";
    const returnedState = address.state || "";
    
    const expectedStateName = STATE_NAMES[expectedState.toUpperCase()] || expectedState;
    
    if (returnedCity.toLowerCase().includes(expectedCity.toLowerCase()) || 
        expectedCity.toLowerCase().includes(returnedCity.toLowerCase())) {
      return { valid: true };
    }
    
    return { 
      valid: false, 
      message: `Reverse geocode returned "${returnedCity}, ${returnedState}" instead of "${expectedCity}, ${expectedStateName}"` 
    };
  } catch {
    return { valid: true, message: "Reverse geocoding check skipped" };
  }
}

// ============================================================================
// Main Auto-Discovery Function
// ============================================================================

/**
 * Auto-discover city data from external APIs
 */
async function autoDiscoverCityData(name: string, state: string): Promise<DiscoveredData> {
  console.log(`\n🔍 Auto-discovering data for ${name}, ${state}...`);
  
  const warnings: string[] = [];
  const result: DiscoveredData = {
    coordinates: null,
    placeFips: null,
    noaaStation: null,
    beaGeoFips: null,
    sports: { nfl: [], nba: [], mlb: [], nhl: [], mls: [] },
    validationWarnings: warnings,
  };
  
  // 1. Fetch coordinates via geocoding
  console.log("  📍 Looking up coordinates...");
  const geoData = await fetchGeoData(name, state);
  if (geoData) {
    result.coordinates = geoData;
    
    // Verify downtown coordinates are in the right state
    const downtownCheck = verifyCoordinatesInState(geoData.downtown, state);
    if (!downtownCheck.valid) {
      warnings.push(`Downtown: ${downtownCheck.message}`);
    }
    
    // Verify airport coordinates if found
    if (geoData.airport) {
      const airportCheck = verifyCoordinatesInState(geoData.airport, state);
      if (!airportCheck.valid) {
        warnings.push(`Airport: ${airportCheck.message}`);
      }
    }
    
    console.log(`    ✓ Downtown: ${geoData.downtown.latitude.toFixed(4)}, ${geoData.downtown.longitude.toFixed(4)}`);
    if (geoData.airport) {
      console.log(`    ✓ Airport: ${geoData.airport.latitude.toFixed(4)}, ${geoData.airport.longitude.toFixed(4)}`);
    } else {
      console.log(`    ⚠️  No airport found, using downtown coordinates`);
    }
  } else {
    warnings.push("Could not auto-discover coordinates");
  }
  
  // 2. Fetch Census Place FIPS
  console.log("  📊 Looking up Census Place FIPS...");
  await sleep(500);
  const placeFips = await fetchPlaceFips(name, state, geoData?.downtown);
  if (placeFips) {
    result.placeFips = placeFips;
    console.log(`    ✓ Place FIPS: ${placeFips}`);
  } else {
    warnings.push("Could not auto-discover Place FIPS code");
    console.log(`    ⚠️  Place FIPS not found`);
  }
  
  // 3. Fetch NOAA weather station
  console.log("  🌤️  Looking up NOAA weather station...");
  await sleep(500);
  const noaaStation = await fetchNoaaStation(name, state, geoData?.downtown);
  if (noaaStation) {
    result.noaaStation = noaaStation;
    const stationCheck = verifyNoaaStation(noaaStation);
    if (!stationCheck.valid) {
      warnings.push(`NOAA: ${stationCheck.message}`);
    }
    console.log(`    ✓ NOAA Station: ${noaaStation}`);
  }
  
  // 4. Fetch BEA MSA code
  console.log("  💰 Looking up BEA MSA code...");
  await sleep(500);
  const beaGeoFips = await fetchBeaMsaCode(name, state);
  if (beaGeoFips) {
    result.beaGeoFips = beaGeoFips;
    console.log(`    ✓ BEA GeoFIPS: ${beaGeoFips}`);
  } else {
    warnings.push("Could not auto-discover BEA MSA code");
    console.log(`    ⚠️  BEA MSA code not found`);
  }
  
  // 5. Fetch sports teams
  console.log("  🏈 Looking up sports teams...");
  await sleep(500);
  const sports = await fetchSportsTeams(name, state);
  result.sports = sports;
  
  const totalTeams = Object.values(sports).reduce((sum, arr) => sum + arr.length, 0);
  if (totalTeams > 0) {
    console.log(`    ✓ Found ${totalTeams} team(s):`);
    if (sports.nfl.length) console.log(`      NFL: ${sports.nfl.join(", ")}`);
    if (sports.nba.length) console.log(`      NBA: ${sports.nba.join(", ")}`);
    if (sports.mlb.length) console.log(`      MLB: ${sports.mlb.join(", ")}`);
    if (sports.nhl.length) console.log(`      NHL: ${sports.nhl.join(", ")}`);
    if (sports.mls.length) console.log(`      MLS: ${sports.mls.join(", ")}`);
  } else {
    console.log(`    ℹ️  No major league teams found`);
  }
  
  // 6. Reverse geocoding verification
  if (geoData?.downtown) {
    console.log("  🔄 Verifying coordinates with reverse geocoding...");
    const reverseCheck = await reverseGeocodeVerify(geoData.downtown, name, state);
    if (!reverseCheck.valid && reverseCheck.message) {
      warnings.push(reverseCheck.message);
      console.log(`    ⚠️  ${reverseCheck.message}`);
    } else {
      console.log(`    ✓ Coordinates verified`);
    }
  }
  
  // Summary
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} validation warning(s):`);
    warnings.forEach(w => console.log(`   - ${w}`));
  }
  
  return result;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    
    // Ask if user wants auto-discovery
    const useAutoDiscovery = await prompt(rl, "\nWould you like to auto-discover data from external APIs? (y/n)", "y");
    
    let discovered: DiscoveredData | null = null;
    if (useAutoDiscovery.toLowerCase() === "y") {
      rl.close(); // Close readline during async API calls
      discovered = await autoDiscoverCityData(name, state);
      // Re-create readline for remaining prompts
    }
    
    const rl2 = createReadline();
    
    // NOAA Station
    console.log("\n📍 NOAA Weather Station");
    const noaaDefault = discovered?.noaaStation || `K${state.substring(0, 3).toUpperCase()}`;
    const noaaStation = await prompt(rl2, `NOAA station code`, noaaDefault);
    
    // Coordinates
    console.log("\n🌍 Coordinates");
    const airportLatDefault = discovered?.coordinates?.airport?.latitude.toString() || 
                             discovered?.coordinates?.downtown?.latitude.toString() || "";
    const airportLonDefault = discovered?.coordinates?.airport?.longitude.toString() ||
                             discovered?.coordinates?.downtown?.longitude.toString() || "";
    const downtownLatDefault = discovered?.coordinates?.downtown?.latitude.toString() || "";
    const downtownLonDefault = discovered?.coordinates?.downtown?.longitude.toString() || "";
    
    const airportLat = parseFloat(await prompt(rl2, "Airport latitude", airportLatDefault));
    const airportLon = parseFloat(await prompt(rl2, "Airport longitude", airportLonDefault));
    const downtownLat = parseFloat(await prompt(rl2, "Downtown latitude", downtownLatDefault));
    const downtownLon = parseFloat(await prompt(rl2, "Downtown longitude", downtownLonDefault));
    
    // Census FIPS
    console.log("\n📊 Census FIPS Codes");
    const stateFips = STATE_FIPS[state.toUpperCase()] || await prompt(rl2, "State FIPS (2 digits)");
    const placeFipsDefault = discovered?.placeFips || "";
    const placeFips = await prompt(rl2, "Place FIPS (5 digits)", placeFipsDefault);
    
    // Zillow (still requires manual entry)
    console.log("\n🏠 Zillow (find region ID from zillow.com/home-values URL)");
    const zillowRegionId = parseInt(await prompt(rl2, "Zillow Region ID", "0"));
    const zillowRegionName = await prompt(rl2, "Zillow Region Name", `${name}, ${state}`);
    
    // BEA
    console.log("\n💰 BEA MSA Code");
    const beaDefault = discovered?.beaGeoFips || "";
    const beaGeoFips = await prompt(rl2, "BEA GeoFIPS (5 digits)", beaDefault);
    
    // Sports
    console.log("\n🏈 Sports Teams (comma-separated, or leave blank)");
    const nflDefault = discovered?.sports.nfl.join(", ") || "";
    const nbaDefault = discovered?.sports.nba.join(", ") || "";
    const mlbDefault = discovered?.sports.mlb.join(", ") || "";
    const nhlDefault = discovered?.sports.nhl.join(", ") || "";
    const mlsDefault = discovered?.sports.mls.join(", ") || "";
    
    const nfl = (await prompt(rl2, "NFL teams", nflDefault)).split(",").map(s => s.trim()).filter(Boolean);
    const nba = (await prompt(rl2, "NBA teams", nbaDefault)).split(",").map(s => s.trim()).filter(Boolean);
    const mlb = (await prompt(rl2, "MLB teams", mlbDefault)).split(",").map(s => s.trim()).filter(Boolean);
    const nhl = (await prompt(rl2, "NHL teams", nhlDefault)).split(",").map(s => s.trim()).filter(Boolean);
    const mls = (await prompt(rl2, "MLS teams", mlsDefault)).split(",").map(s => s.trim()).filter(Boolean);
    
    rl2.close();
    
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
    console.error("Error in interactive mode:", error);
    return null;
  }
}

/**
 * Auto-discover mode - minimal user input with API-driven data collection
 */
async function autoDiscoverMode(name: string, state: string): Promise<CityConfig | null> {
  console.log("\n🏙️  Add New City - Auto-Discovery Mode\n");
  
  const id = slugify(name);
  const stateUpper = state.toUpperCase();
  const stateFips = STATE_FIPS[stateUpper];
  
  if (!stateFips) {
    console.error(`❌ Unknown state abbreviation: ${state}`);
    return null;
  }
  
  // Run auto-discovery
  const discovered = await autoDiscoverCityData(name, stateUpper);
  
  // Check for critical missing data
  const criticalMissing: string[] = [];
  if (!discovered.coordinates) {
    criticalMissing.push("coordinates");
  }
  if (!discovered.placeFips) {
    criticalMissing.push("Place FIPS");
  }
  
  if (criticalMissing.length > 0) {
    console.log(`\n⚠️  Critical data missing: ${criticalMissing.join(", ")}`);
    console.log("   Consider using --interactive mode for manual entry.");
  }
  
  // Build config with discovered data
  const config: CityConfig = {
    id,
    name,
    state: stateUpper,
    noaaStation: discovered.noaaStation || `K${id.substring(0, 3).toUpperCase()}`,
    latitude: discovered.coordinates?.airport?.latitude || discovered.coordinates?.downtown?.latitude || 0,
    longitude: discovered.coordinates?.airport?.longitude || discovered.coordinates?.downtown?.longitude || 0,
    urbanCenter: {
      latitude: discovered.coordinates?.downtown?.latitude || 0,
      longitude: discovered.coordinates?.downtown?.longitude || 0,
    },
    censusFips: {
      state: stateFips,
      place: discovered.placeFips || "00000",
    },
    zillowRegionId: 0, // Requires manual lookup
    zillowRegionName: `${name}, ${stateUpper}`,
    sports: discovered.sports,
    beaGeoFips: discovered.beaGeoFips || "",
  };
  
  // Display summary for user confirmation
  console.log("\n" + "=".repeat(60));
  console.log("📋 Auto-Discovered City Configuration:");
  console.log("=".repeat(60));
  console.log(JSON.stringify(config, null, 2));
  console.log("=".repeat(60));
  
  // Warnings summary
  if (discovered.validationWarnings.length > 0) {
    console.log("\n⚠️  Validation Warnings:");
    discovered.validationWarnings.forEach(w => console.log(`   - ${w}`));
  }
  
  // Prompt for confirmation
  const rl = createReadline();
  const confirm = await prompt(rl, "\nProceed with this configuration? (y/n)", "y");
  rl.close();
  
  if (confirm.toLowerCase() !== "y") {
    console.log("Aborted. Use --interactive mode for manual entry.");
    return null;
  }
  
  // Warn about missing Zillow ID
  if (config.zillowRegionId === 0) {
    console.log("\n💡 Note: Zillow Region ID was not auto-discovered.");
    console.log("   You can update it later in cities.json after finding it at:");
    console.log("   https://www.zillow.com/home-values/");
  }
  
  return config;
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const isInteractive = args.includes("--interactive") || args.includes("-i");
  const isAutoDiscover = args.includes("--auto-discover") || args.includes("-a");
  const configFile = args.find(a => a.startsWith("--config="))?.split("=")[1];
  const cityArg = args.find(a => a.startsWith("--city="))?.split("=")[1];
  const stateArg = args.find(a => a.startsWith("--state="))?.split("=")[1];
  const skipDataPull = args.includes("--skip-data-pull");
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  console.log("🏙️  Add City Script\n");
  
  // Require ADMIN_PASSWORD for data pulls
  if (!skipDataPull && !adminPassword) {
    console.error("❌ Error: ADMIN_PASSWORD environment variable is required for data pulls.");
    console.error("   Set it in your .env file or run with --skip-data-pull to skip API calls.\n");
    process.exit(1);
  }
  
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
  } else if (isAutoDiscover) {
    // Auto-discover mode
    if (!cityArg || !stateArg) {
      console.error("❌ Error: --auto-discover requires --city=\"City Name\" and --state=\"XX\"");
      console.error("   Example: npx tsx scripts/add-city.ts --auto-discover --city=\"Denver\" --state=\"CO\"");
      process.exit(1);
    }
    config = await autoDiscoverMode(cityArg, stateArg);
  } else if (isInteractive) {
    // Interactive mode
    config = await interactiveMode();
  } else if (cityArg && stateArg) {
    // Legacy: redirect to auto-discover
    console.log("💡 Tip: Use --auto-discover for automatic data lookup from external APIs.");
    console.log("   Running auto-discovery...\n");
    config = await autoDiscoverMode(cityArg, stateArg);
  } else {
    console.log("Usage:");
    console.log("  npx tsx scripts/add-city.ts --interactive");
    console.log("  npx tsx scripts/add-city.ts --auto-discover --city=\"Austin\" --state=\"TX\"");
    console.log("  npx tsx scripts/add-city.ts --config=city-config.json");
    console.log("  npx tsx scripts/add-city.ts --config=city-config.json --skip-data-pull");
    console.log("\nModes:");
    console.log("  --interactive, -i     Interactive mode with prompts (offers auto-discovery)");
    console.log("  --auto-discover, -a   Auto-discover data from external APIs");
    console.log("  --config=FILE         Load city config from JSON file");
    console.log("\nOptions:");
    console.log("  --city=\"Name\"         City name (required for auto-discover)");
    console.log("  --state=\"XX\"          State abbreviation (required for auto-discover)");
    console.log("  --skip-data-pull      Skip automated data pulls (only add to JSON)");
    console.log("\nAuto-Discovery APIs:");
    console.log("  - Coordinates:  OpenStreetMap Nominatim (free)");
    console.log("  - Census FIPS:  US Census Bureau Geocoder API");
    console.log("  - NOAA Station: NOAA Weather API");
    console.log("  - BEA MSA:      BEA API (requires BEA_API_KEY in .env)");
    console.log("  - Sports Teams: Wikidata SPARQL (free)");
    console.log("\nExamples:");
    console.log("  npx tsx scripts/add-city.ts -a --city=\"Phoenix\" --state=\"AZ\"");
    console.log("  npx tsx scripts/add-city.ts -i");
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
    await runAdminPull("census-pull", adminPassword!);
    
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
      await runAdminPull(pull, adminPassword!);
    }
    
    // Step 6: Fetch walkability data from walkscore.com
    console.log("\n🚶 Step 6: Fetching walkability data from walkscore.com...");
    runCommand(`npx tsx scripts/fetch-walkscore.ts --city=${config.id}`, "Walk Score fetch");
    
    // Step 7: Refresh database
    console.log("\n🔄 Step 7: Refreshing database...");
    await runAdminPull("refresh", adminPassword!);
    
    // Step 8: Re-seed to sync all data
    console.log("\n💾 Step 8: Final database sync...");
    runCommand("npx tsx scripts/seed.ts", "Final seed");
  }
  
  // Step 9: Validate
  console.log("\n✅ Step 9: Validating city data...");
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
