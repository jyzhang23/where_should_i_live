/**
 * Data Collection Script for Recreation & Urban Lifestyle Metrics
 * 
 * This script collects data from various APIs and generates source JSON files
 * that can be imported via the admin pull routes.
 * 
 * Usage:
 *   npx tsx scripts/collect-lifestyle-data.ts [--dry-run] [--city=CityName]
 * 
 * Data Sources:
 * - OpenStreetMap (Overpass API): POIs, trails, parks
 * - USGS National Map API: Elevation data
 * - Simple geographic calculations: Coastline distance
 * 
 * Output:
 * - data/sources/recreation-data.json
 * - data/sources/urbanlife-data.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// Rate limiting settings
const OVERPASS_DELAY_MS = 5000; // 5 seconds between Overpass requests (public API needs longer pauses)
const USGS_DELAY_MS = 500;      // 0.5 seconds between USGS requests
const MAX_RETRIES = 4;          // Max retries on rate limit/timeout

interface CityData {
  id: string;
  name: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  // Urban center coordinates for POI queries (airports coordinates are often offset)
  urbanCenter?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Get the best coordinates for urban POI queries
 * Prefers urbanCenter (downtown) over main coords (often at airports)
 */
function getUrbanCoords(city: CityData): { lat: number; lon: number } {
  if (city.urbanCenter) {
    return { lat: city.urbanCenter.latitude, lon: city.urbanCenter.longitude };
  }
  return { lat: city.latitude ?? 0, lon: city.longitude ?? 0 };
}

interface RecreationSourceData {
  nature: {
    parkAcresPer1K: number | null;
    trailMilesWithin10Mi: number | null;
    protectedLandPercent: number | null;
    stateParksWithin50Mi: number | null;
  };
  geography: {
    coastlineWithin15Mi: boolean;
    coastlineDistanceMi: number | null;
    waterQualityIndex: number | null;
    maxElevationDelta: number | null;
    nearestMountainDistMi: number | null;
    nearestSkiResortMi: number | null;
  };
  dataYear: number;
}

interface UrbanLifestyleSourceData {
  nightlife: {
    barsAndClubsPer10K: number | null;
    totalVenues: number | null;
    lateNightVenues: number | null;
  };
  arts: {
    museums: number | null;
    theaters: number | null;
    artGalleries: number | null;
    musicVenues: number | null;
  };
  dining: {
    fineDiningCount: number | null;
    restaurantsPer10K: number | null;
    cuisineDiversity: number | null;
    breweries: number | null;
    coffeeshops: number | null;
  };
  population: number;
  dataYear: number;
}

// US coastline approximation (major coastal points)
const COASTLINE_POINTS: [number, number][] = [
  // West Coast
  [-122.4194, 37.7749], // San Francisco
  [-118.2437, 34.0522], // Los Angeles
  [-117.1611, 32.7157], // San Diego
  [-122.3321, 47.6062], // Seattle
  [-122.6765, 45.5152], // Portland (Columbia River)
  // East Coast
  [-74.0060, 40.7128],  // New York
  [-71.0589, 42.3601],  // Boston
  [-75.1652, 39.9526],  // Philadelphia
  [-76.6122, 39.2904],  // Baltimore
  [-77.0369, 38.9072],  // DC (Potomac)
  [-80.1918, 25.7617],  // Miami
  [-81.6557, 30.3322],  // Jacksonville
  [-79.9311, 32.7765],  // Charleston
  // Gulf Coast
  [-90.0715, 29.9511],  // New Orleans
  [-95.3698, 29.7604],  // Houston
  [-96.7970, 32.7767],  // (not coastal but near)
  [-87.9073, 30.6954],  // Pensacola
  [-82.4572, 27.9506],  // Tampa
  // Great Lakes (major cities)
  [-87.6298, 41.8781],  // Chicago (Lake Michigan)
  [-83.0458, 42.3314],  // Detroit (Detroit River)
  [-79.3832, 43.6532],  // Toronto area
  [-81.6944, 41.4993],  // Cleveland (Lake Erie)
  [-78.8784, 42.8864],  // Buffalo (Lake Erie)
];

/**
 * Calculate distance between two points in miles (Haversine formula)
 */
function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find distance to nearest coastline point
 */
function findNearestCoastlineDistance(lat: number, lon: number): number | null {
  let minDist = Infinity;
  for (const [coastLon, coastLat] of COASTLINE_POINTS) {
    const dist = distanceMiles(lat, lon, coastLat, coastLon);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist < 500 ? Math.round(minDist) : null;
}

/**
 * Query Overpass API for POI counts with retry logic
 */
async function queryOverpass(query: string, retryCount = 0): Promise<unknown> {
  const endpoint = "https://overpass-api.de/api/interpreter";
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    
    // Handle rate limiting and timeouts with retry
    if (response.status === 429 || response.status === 504) {
      if (retryCount < MAX_RETRIES) {
        const backoffMs = Math.pow(2, retryCount + 1) * 2000; // 4s, 8s, 16s
        console.log(`    ⏳ Rate limited (${response.status}), waiting ${backoffMs/1000}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return queryOverpass(query, retryCount + 1);
      }
      console.error(`    ✗ Max retries exceeded for Overpass query`);
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const backoffMs = Math.pow(2, retryCount + 1) * 2000;
      console.log(`    ⏳ Network error, waiting ${backoffMs/1000}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return queryOverpass(query, retryCount + 1);
    }
    console.error("Overpass query failed:", error);
    return null;
  }
}

/**
 * Count POIs around a city using Overpass
 * Now includes nodes, ways, AND relations (buildings/areas mapped as polygons)
 * Uses regex pattern for efficiency
 * Supports custom tag key (default: amenity)
 */
async function countPOIsNearCity(
  lat: number, 
  lon: number, 
  radiusMiles: number,
  tagValues: string[],
  tagKey: string = "amenity"
): Promise<number> {
  if (tagValues.length === 0) return 0;
  
  const radiusMeters = radiusMiles * 1609.34;
  // Use regex pattern to combine tag values (e.g., "bar|pub|nightclub")
  const tagFilter = tagValues.join("|");
  
  // Query nodes, ways, AND relations - many POIs are mapped as building polygons
  const query = `
    [out:json][timeout:60];
    (
      node["${tagKey}"~"^(${tagFilter})$"](around:${radiusMeters},${lat},${lon});
      way["${tagKey}"~"^(${tagFilter})$"](around:${radiusMeters},${lat},${lon});
      relation["${tagKey}"~"^(${tagFilter})$"](around:${radiusMeters},${lat},${lon});
    );
    out count;
  `;
  
  const result = await queryOverpass(query) as { elements?: { tags?: { total: string } }[] } | null;
  if (result?.elements?.[0]?.tags?.total) {
    return parseInt(result.elements[0].tags.total, 10);
  }
  return 0;
}

/**
 * Count unique cuisine types to measure dining diversity
 * Returns the number of distinct cuisine values found on restaurants
 */
async function countCuisineDiversity(lat: number, lon: number, radiusMiles: number): Promise<number> {
  const radiusMeters = radiusMiles * 1609.34;
  
  // Query restaurants with cuisine tags and return unique values
  const query = `
    [out:json][timeout:90];
    (
      node["amenity"="restaurant"]["cuisine"](around:${radiusMeters},${lat},${lon});
      way["amenity"="restaurant"]["cuisine"](around:${radiusMeters},${lat},${lon});
    );
    out tags;
  `;
  
  interface OsmElement {
    tags?: { cuisine?: string };
  }
  
  const result = await queryOverpass(query) as { elements?: OsmElement[] } | null;
  if (!result?.elements) return 0;
  
  // Extract unique cuisine types (some have multiple like "italian;pizza")
  const cuisineSet = new Set<string>();
  for (const el of result.elements) {
    const cuisine = el.tags?.cuisine;
    if (cuisine) {
      // Split on semicolons and commas (OSM allows multiple cuisines)
      const types = cuisine.split(/[;,]/).map(c => c.trim().toLowerCase());
      types.forEach(t => {
        if (t && t.length > 0) cuisineSet.add(t);
      });
    }
  }
  
  return cuisineSet.size;
}

/**
 * Count hiking/walking trails near a city
 * Loosened filters to catch more trails (removed strict sac_scale requirement)
 */
async function countTrailsMiles(lat: number, lon: number, radiusMiles: number): Promise<number> {
  const radiusMeters = radiusMiles * 1609.34;
  
  // More inclusive trail query:
  // - highway=path (any path, not just rated ones)
  // - highway=footway with unpaved or no surface specified
  // - highway=bridleway (multi-use trails)
  // - route=hiking relations
  // - leisure=track for running/walking tracks
  const query = `
    [out:json][timeout:90];
    (
      way["highway"="path"](around:${radiusMeters},${lat},${lon});
      way["highway"="footway"]["surface"!~"asphalt|concrete|paved"](around:${radiusMeters},${lat},${lon});
      way["highway"="bridleway"](around:${radiusMeters},${lat},${lon});
      way["highway"="cycleway"]["foot"~"yes|designated"](around:${radiusMeters},${lat},${lon});
      relation["route"="hiking"](around:${radiusMeters},${lat},${lon});
      relation["route"="foot"](around:${radiusMeters},${lat},${lon});
    );
    out geom;
  `;
  
  const result = await queryOverpass(query) as { elements?: { geometry?: { lat: number; lon: number }[] }[] } | null;
  if (!result?.elements) return 0;
  
  // Calculate total trail length in miles
  let totalMiles = 0;
  for (const way of result.elements) {
    if (way.geometry && way.geometry.length >= 2) {
      for (let i = 0; i < way.geometry.length - 1; i++) {
        totalMiles += distanceMiles(
          way.geometry[i].lat,
          way.geometry[i].lon,
          way.geometry[i + 1].lat,
          way.geometry[i + 1].lon
        );
      }
    }
  }
  
  return Math.round(totalMiles);
}

/**
 * Get elevation data from USGS
 */
async function getElevation(lat: number, lon: number): Promise<number | null> {
  try {
    const url = `https://epqs.nationalmap.gov/v1/json?x=${lon}&y=${lat}&units=Feet&wkid=4326&includeDate=false`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json() as { value?: number };
    return data.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Calculate max elevation delta in a radius
 */
async function getMaxElevationDelta(
  cityLat: number, 
  cityLon: number, 
  radiusMiles: number
): Promise<number | null> {
  // Sample points in cardinal directions
  const cityElev = await getElevation(cityLat, cityLon);
  if (cityElev === null) return null;
  
  let maxDelta = 0;
  const degPerMile = 1 / 69; // Approximate degrees per mile
  
  // Sample at 10mi, 20mi, 30mi in 8 directions
  const distances = [10, 20, 30];
  const directions = [
    [0, 1], [1, 1], [1, 0], [1, -1],
    [0, -1], [-1, -1], [-1, 0], [-1, 1]
  ];
  
  for (const dist of distances) {
    if (dist > radiusMiles) continue;
    
    for (const [dLat, dLon] of directions) {
      const sampleLat = cityLat + dLat * dist * degPerMile;
      const sampleLon = cityLon + dLon * dist * degPerMile;
      
      await new Promise(resolve => setTimeout(resolve, USGS_DELAY_MS));
      
      const sampleElev = await getElevation(sampleLat, sampleLon);
      if (sampleElev !== null) {
        const delta = Math.abs(sampleElev - cityElev);
        if (delta > maxDelta) {
          maxDelta = delta;
        }
      }
    }
  }
  
  return Math.round(maxDelta);
}

/**
 * Collect recreation data for a city
 */
async function collectRecreationData(city: CityData, population: number): Promise<RecreationSourceData | null> {
  if (!city.latitude || !city.longitude) return null;
  
  const lat = city.latitude;
  const lon = city.longitude;
  
  // Count parks (local parks within 5mi) - using leisure tag
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const parkCount = await countPOIsNearCity(lat, lon, 5, ["park", "nature_reserve", "garden"], "leisure");
  // Estimate 20 acres avg per park, formula: (parkCount * 20 acres) / (population / 1000)
  const parkAcresPer1K = population > 0 ? Math.round(parkCount * 20 * 1000 / population * 10) / 10 : null;
  
  // Count trail miles
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const trailMiles = await countTrailsMiles(lat, lon, 10);
  
  // Count state/national parks within 50mi using boundary tag
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const stateParks = await countPOIsNearCity(lat, lon, 50, ["national_park", "protected_area"], "boundary");
  // Query for protected areas separately
  
  // Coastline distance
  const coastDist = findNearestCoastlineDistance(lat, lon);
  const coastlineWithin15Mi = coastDist !== null && coastDist <= 15;
  
  // Elevation delta
  console.log(`    Getting elevation data...`);
  const elevDelta = await getMaxElevationDelta(lat, lon, 30);
  
  return {
    nature: {
      parkAcresPer1K,
      trailMilesWithin10Mi: trailMiles,
      protectedLandPercent: null, // Requires more complex calculation
      stateParksWithin50Mi: stateParks,
    },
    geography: {
      coastlineWithin15Mi,
      coastlineDistanceMi: coastDist,
      waterQualityIndex: null, // Would need EPA BEACON data
      maxElevationDelta: elevDelta,
      nearestMountainDistMi: elevDelta && elevDelta > 2000 ? 0 : null,
      nearestSkiResortMi: null, // Would need ski resort database
    },
    dataYear: new Date().getFullYear(),
  };
}

/**
 * Collect urban lifestyle data for a city
 * Uses urbanCenter coordinates when available (airports are often far from downtown)
 */
async function collectUrbanLifestyleData(city: CityData, population: number): Promise<UrbanLifestyleSourceData | null> {
  if (!city.latitude || !city.longitude) return null;
  
  // Use urban center for POI queries (downtown vs airport)
  const { lat, lon } = getUrbanCoords(city);
  const pop10K = population / 10000;
  
  // Nightlife - bars and clubs
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const barsCount = await countPOIsNearCity(lat, lon, 5, ["bar", "pub", "nightclub"]);
  const barsAndClubsPer10K = pop10K > 0 ? Math.round(barsCount / pop10K * 10) / 10 : null;
  
  // Late night venues - nightclubs specifically (proxy for late-night scene)
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const lateNightVenues = await countPOIsNearCity(lat, lon, 10, ["nightclub"]);
  
  // Arts - museums (use tourism tag, not amenity!)
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const museums = await countPOIsNearCity(lat, lon, 10, ["museum"], "tourism");
  
  // Arts - theaters
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const theaters = await countPOIsNearCity(lat, lon, 10, ["theatre", "cinema"]);
  
  // Arts - art galleries (use tourism tag)
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const galleries = await countPOIsNearCity(lat, lon, 5, ["gallery", "artwork"], "tourism");
  
  // Arts - music venues (concerts, live music)
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const musicVenues = await countPOIsNearCity(lat, lon, 10, ["music_venue", "concert_hall"], "amenity");
  
  // Dining - restaurants
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const restaurants = await countPOIsNearCity(lat, lon, 5, ["restaurant", "fast_food", "cafe"]);
  const restaurantsPer10K = pop10K > 0 ? Math.round(restaurants / pop10K * 10) / 10 : null;
  
  // Dining - cuisine diversity (unique cuisine types)
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const cuisineDiversity = await countCuisineDiversity(lat, lon, 10);
  
  // Dining - breweries
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const breweries = await countPOIsNearCity(lat, lon, 10, ["brewery"]);
  
  // Dining - coffee shops
  await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
  const coffeeshops = await countPOIsNearCity(lat, lon, 5, ["cafe"]);
  
  return {
    nightlife: {
      barsAndClubsPer10K,
      totalVenues: barsCount,
      lateNightVenues,
    },
    arts: {
      museums,
      theaters,
      artGalleries: galleries,
      musicVenues,
    },
    dining: {
      fineDiningCount: null, // Would need Michelin/Yelp data
      restaurantsPer10K,
      cuisineDiversity,
      breweries,
      coffeeshops,
    },
    population,
    dataYear: new Date().getFullYear(),
  };
}

/**
 * Check if a city's recreation data has gaps (failed API calls)
 * Returns list of fields that need to be retried
 */
function getRecreationGaps(data: RecreationSourceData | undefined): string[] {
  if (!data) return ["all"];
  const gaps: string[] = [];
  
  // Nature fields - 0 might indicate rate limiting
  if (data.nature.parkAcresPer1K === 0 || data.nature.parkAcresPer1K === null) gaps.push("parks");
  if (data.nature.trailMilesWithin10Mi === 0 || data.nature.trailMilesWithin10Mi === null) gaps.push("trails");
  if (data.nature.stateParksWithin50Mi === 0 || data.nature.stateParksWithin50Mi === null) gaps.push("stateParks");
  
  // Geography fields - elevation 0 is suspicious
  if (data.geography.maxElevationDelta === 0 || data.geography.maxElevationDelta === null) gaps.push("elevation");
  
  return gaps;
}

/**
 * Check if a city's urban lifestyle data has gaps (failed API calls)
 * Returns list of fields that need to be retried
 */
function getUrbanLifestyleGaps(data: UrbanLifestyleSourceData | undefined): string[] {
  if (!data) return ["all"];
  const gaps: string[] = [];
  
  // Nightlife - 0 is suspicious for any real city
  if (data.nightlife.barsAndClubsPer10K === 0 || data.nightlife.barsAndClubsPer10K === null) gaps.push("bars");
  if (data.nightlife.totalVenues === 0 || data.nightlife.totalVenues === null) gaps.push("bars");
  if (data.nightlife.lateNightVenues === null) gaps.push("lateNightVenues");
  
  // Arts - 0 museums is suspicious for most cities
  if (data.arts.museums === 0 || data.arts.museums === null) gaps.push("museums");
  if (data.arts.theaters === 0 || data.arts.theaters === null) gaps.push("theaters");
  if (data.arts.artGalleries === 0 || data.arts.artGalleries === null) gaps.push("galleries");
  if (data.arts.musicVenues === 0 || data.arts.musicVenues === null) gaps.push("musicVenues");
  
  // Dining - 0 restaurants is definitely rate-limited
  if (data.dining.restaurantsPer10K === 0 || data.dining.restaurantsPer10K === null) gaps.push("restaurants");
  if (data.dining.cuisineDiversity === 0 || data.dining.cuisineDiversity === null) gaps.push("cuisineDiversity");
  if (data.dining.breweries === 0 || data.dining.breweries === null) gaps.push("breweries");
  if (data.dining.coffeeshops === 0 || data.dining.coffeeshops === null) gaps.push("coffeeshops");
  
  return gaps;
}

/**
 * Collect only specific urban lifestyle fields that failed
 * Uses urbanCenter coordinates when available
 */
async function fillUrbanLifestyleGaps(
  city: CityData,
  population: number,
  existing: UrbanLifestyleSourceData,
  gaps: string[]
): Promise<UrbanLifestyleSourceData> {
  // Use urban center for POI queries (downtown vs airport)
  const { lat, lon } = getUrbanCoords(city);
  const pop10K = population / 10000;
  
  const result = { ...existing };
  
  if (gaps.includes("bars")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const barsCount = await countPOIsNearCity(lat, lon, 5, ["bar", "pub", "nightclub"]);
    result.nightlife = {
      ...result.nightlife,
      barsAndClubsPer10K: pop10K > 0 ? Math.round(barsCount / pop10K * 10) / 10 : null,
      totalVenues: barsCount,
    };
  }
  
  if (gaps.includes("museums")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const museums = await countPOIsNearCity(lat, lon, 10, ["museum"], "tourism");
    result.arts = { ...result.arts, museums };
  }
  
  if (gaps.includes("theaters")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const theaters = await countPOIsNearCity(lat, lon, 10, ["theatre", "cinema"]);
    result.arts = { ...result.arts, theaters };
  }
  
  if (gaps.includes("galleries")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const artGalleries = await countPOIsNearCity(lat, lon, 5, ["gallery", "artwork"], "tourism");
    result.arts = { ...result.arts, artGalleries };
  }
  
  if (gaps.includes("musicVenues")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const musicVenues = await countPOIsNearCity(lat, lon, 10, ["music_venue", "concert_hall"], "amenity");
    result.arts = { ...result.arts, musicVenues };
  }
  
  if (gaps.includes("restaurants")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const restaurants = await countPOIsNearCity(lat, lon, 5, ["restaurant", "fast_food", "cafe"]);
    result.dining = {
      ...result.dining,
      restaurantsPer10K: pop10K > 0 ? Math.round(restaurants / pop10K * 10) / 10 : null,
    };
  }
  
  if (gaps.includes("breweries")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const breweries = await countPOIsNearCity(lat, lon, 10, ["brewery"]);
    result.dining = { ...result.dining, breweries };
  }
  
  if (gaps.includes("coffeeshops")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const coffeeshops = await countPOIsNearCity(lat, lon, 5, ["cafe"]);
    result.dining = { ...result.dining, coffeeshops };
  }
  
  if (gaps.includes("lateNightVenues")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const lateNightVenues = await countPOIsNearCity(lat, lon, 10, ["nightclub"]);
    result.nightlife = { ...result.nightlife, lateNightVenues };
  }
  
  if (gaps.includes("cuisineDiversity")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const cuisineDiversity = await countCuisineDiversity(lat, lon, 10);
    result.dining = { ...result.dining, cuisineDiversity };
  }
  
  return result;
}

/**
 * Collect only specific recreation fields that failed
 */
async function fillRecreationGaps(
  city: CityData,
  population: number,
  existing: RecreationSourceData,
  gaps: string[]
): Promise<RecreationSourceData> {
  // For recreation, use main coordinates (larger search areas, airports are fine)
  const lat = city.latitude ?? 0;
  const lon = city.longitude ?? 0;
  
  const result = { ...existing };
  
  if (gaps.includes("parks")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const parkCount = await countPOIsNearCity(lat, lon, 5, ["park", "nature_reserve", "garden"], "leisure");
    const parkAcresPer1K = population > 0 ? Math.round(parkCount * 20 * 1000 / population * 10) / 10 : null;
    result.nature = { ...result.nature, parkAcresPer1K };
  }
  
  if (gaps.includes("trails")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const trailMilesWithin10Mi = await countTrailsMiles(lat, lon, 10);
    result.nature = { ...result.nature, trailMilesWithin10Mi };
  }
  
  if (gaps.includes("stateParks")) {
    await new Promise(resolve => setTimeout(resolve, OVERPASS_DELAY_MS));
    const stateParksWithin50Mi = await countPOIsNearCity(lat, lon, 50, ["national_park", "protected_area"], "boundary");
    result.nature = { ...result.nature, stateParksWithin50Mi };
  }
  
  if (gaps.includes("elevation")) {
    // Re-collect elevation data
    const cityElev = await getElevation(lat, lon) || 0;
    let maxElev = cityElev;
    let minElev = cityElev;
    
    const degPerMile = 1 / 69.0;
    for (const [dist, dir] of [[10, 0], [10, 90], [10, 180], [10, 270], [20, 45], [20, 135], [20, 225], [20, 315]] as const) {
      const dLat = Math.cos((dir * Math.PI) / 180);
      const dLon = Math.sin((dir * Math.PI) / 180);
      const sampleLat = lat + dLat * dist * degPerMile;
      const sampleLon = lon + dLon * dist * degPerMile;
      
      await new Promise(resolve => setTimeout(resolve, USGS_DELAY_MS));
      const sampleElev = await getElevation(sampleLat, sampleLon);
      if (sampleElev !== null) {
        maxElev = Math.max(maxElev, sampleElev);
        minElev = Math.min(minElev, sampleElev);
      }
    }
    
    result.geography = {
      ...result.geography,
      maxElevationDelta: Math.round(maxElev - minElev),
    };
  }
  
  return result;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fillGaps = args.includes("--fill-gaps");
  const cityFilter = args.find(a => a.startsWith("--city="))?.split("=")[1];
  
  const dataDir = join(process.cwd(), "data");
  const sourcesDir = join(dataDir, "sources");
  
  // Ensure sources directory exists
  if (!existsSync(sourcesDir)) {
    mkdirSync(sourcesDir, { recursive: true });
  }
  
  // Load cities
  const citiesFile = JSON.parse(readFileSync(join(dataDir, "cities.json"), "utf-8"));
  const metricsFile = JSON.parse(readFileSync(join(dataDir, "metrics.json"), "utf-8"));
  let cities: CityData[] = citiesFile.cities;
  
  // Filter by city name if specified
  if (cityFilter) {
    cities = cities.filter(c => 
      c.name.toLowerCase().includes(cityFilter.toLowerCase())
    );
    console.log(`Filtered to ${cities.length} cities matching "${cityFilter}"`);
  }
  
  // Load existing data if fill-gaps mode
  let existingRecreation: Record<string, RecreationSourceData> = {};
  let existingUrbanlife: Record<string, UrbanLifestyleSourceData> = {};
  
  if (fillGaps) {
    const recPath = join(sourcesDir, "recreation-data.json");
    const urbPath = join(sourcesDir, "urbanlife-data.json");
    
    if (existsSync(recPath)) {
      existingRecreation = JSON.parse(readFileSync(recPath, "utf-8")).cities || {};
    }
    if (existsSync(urbPath)) {
      existingUrbanlife = JSON.parse(readFileSync(urbPath, "utf-8")).cities || {};
    }
    
    console.log(`\n🔧 FILL-GAPS MODE: Will only retry null/zero values`);
    console.log(`  Existing recreation data: ${Object.keys(existingRecreation).length} cities`);
    console.log(`  Existing urban life data: ${Object.keys(existingUrbanlife).length} cities`);
  }
  
  // Initialize output data structures
  const recreationData: {
    version: string;
    description: string;
    sources: { nature: string; geography: string };
    nationalAverages: {
      parkAcresPer1K: number;
      trailMilesWithin10Mi: number;
      protectedLandPercent: number;
      coastlineAccessPercent: number;
      avgElevationDelta: number;
    };
    cities: Record<string, RecreationSourceData>;
  } = {
    version: "1.0",
    description: "Recreation and outdoor access metrics",
    sources: {
      nature: "OpenStreetMap Overpass API",
      geography: "USGS National Map API, NOAA Coastline",
    },
    nationalAverages: {
      parkAcresPer1K: 25,
      trailMilesWithin10Mi: 50,
      protectedLandPercent: 12,
      coastlineAccessPercent: 30,
      avgElevationDelta: 800,
    },
    cities: fillGaps ? { ...existingRecreation } : {},
  };
  
  const urbanlifeData: {
    version: string;
    description: string;
    sources: { nightlife: string; arts: string; dining: string };
    nationalAverages: {
      barsAndClubsPer10K: number;
      museums: number;
      restaurantsPer10K: number;
      cuisineDiversity: number;
    };
    cities: Record<string, UrbanLifestyleSourceData>;
  } = {
    version: "1.0",
    description: "Urban lifestyle and entertainment metrics",
    sources: {
      nightlife: "OpenStreetMap Overpass API",
      arts: "OpenStreetMap Overpass API",
      dining: "OpenStreetMap Overpass API",
    },
    nationalAverages: {
      barsAndClubsPer10K: 15,
      museums: 10,
      restaurantsPer10K: 40,
      cuisineDiversity: 25,
    },
    cities: fillGaps ? { ...existingUrbanlife } : {},
  };
  
  console.log(`\nCollecting data for ${cities.length} cities...\n`);
  
  let processed = 0;
  let skipped = 0;
  let filled = 0;
  
  for (const city of cities) {
    processed++;
    
    // Get population from metrics
    const cityMetrics = metricsFile.cities[city.id];
    const population = cityMetrics?.census?.totalPopulation || cityMetrics?.population || 100000;
    
    if (dryRun) {
      console.log(`[${processed}/${cities.length}] ${city.name}, ${city.state} [DRY RUN]`);
      continue;
    }
    
    // Fill-gaps mode: check what needs to be collected
    if (fillGaps) {
      const recGaps = getRecreationGaps(existingRecreation[city.id]);
      const urbGaps = getUrbanLifestyleGaps(existingUrbanlife[city.id]);
      
      if (recGaps.length === 0 && urbGaps.length === 0) {
        skipped++;
        continue; // Skip this city, all data is complete
      }
      
      console.log(`[${processed}/${cities.length}] ${city.name}, ${city.state}`);
      console.log(`    Gaps: Recreation=[${recGaps.join(',')}] Urban=[${urbGaps.join(',')}]`);
      filled++;
      
      try {
        // Fill recreation gaps
        if (recGaps.length > 0) {
          if (recGaps.includes("all")) {
            const recData = await collectRecreationData(city, population);
            if (recData) recreationData.cities[city.id] = recData;
          } else {
            const existing = existingRecreation[city.id];
            const filledData = await fillRecreationGaps(city, population, existing, recGaps);
            recreationData.cities[city.id] = filledData;
          }
          console.log(`    ✓ Recreation gaps filled`);
        }
        
        // Fill urban lifestyle gaps
        if (urbGaps.length > 0) {
          if (urbGaps.includes("all")) {
            const urbData = await collectUrbanLifestyleData(city, population);
            if (urbData) urbanlifeData.cities[city.id] = urbData;
          } else {
            const existing = existingUrbanlife[city.id];
            const filledData = await fillUrbanLifestyleGaps(city, population, existing, urbGaps);
            urbanlifeData.cities[city.id] = filledData;
          }
          console.log(`    ✓ Urban lifestyle gaps filled`);
        }
        
      } catch (error) {
        console.error(`    ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      
    } else {
      // Normal mode: collect everything
      console.log(`[${processed}/${cities.length}] ${city.name}, ${city.state}`);
      
      try {
        // Collect recreation data
        console.log(`  Collecting recreation data for ${city.name}...`);
        const recData = await collectRecreationData(city, population);
        if (recData) {
          recreationData.cities[city.id] = recData;
          console.log(`    ✓ Recreation: Trails=${recData.nature.trailMilesWithin10Mi}mi, Coast=${recData.geography.coastlineWithin15Mi ? 'Y' : 'N'}, Elev=${recData.geography.maxElevationDelta}ft`);
        }
        
        // Collect urban lifestyle data
        console.log(`  Collecting urban lifestyle data for ${city.name}...`);
        const urbData = await collectUrbanLifestyleData(city, population);
        if (urbData) {
          urbanlifeData.cities[city.id] = urbData;
          console.log(`    ✓ Urban: Bars=${urbData.nightlife.barsAndClubsPer10K}/10K, Museums=${urbData.arts.museums}, Restaurants=${urbData.dining.restaurantsPer10K}/10K`);
        }
        
      } catch (error) {
        console.error(`    ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Progress save every 10 cities (or every 5 in fill-gaps mode)
    const saveInterval = fillGaps ? 5 : 10;
    if (processed % saveInterval === 0 && !dryRun) {
      writeFileSync(
        join(sourcesDir, "recreation-data.json"),
        JSON.stringify(recreationData, null, 2)
      );
      writeFileSync(
        join(sourcesDir, "urbanlife-data.json"),
        JSON.stringify(urbanlifeData, null, 2)
      );
      console.log(`  [Saved progress: ${processed} cities processed]\n`);
    }
  }
  
  // Final save
  if (!dryRun) {
    writeFileSync(
      join(sourcesDir, "recreation-data.json"),
      JSON.stringify(recreationData, null, 2)
    );
    writeFileSync(
      join(sourcesDir, "urbanlife-data.json"),
      JSON.stringify(urbanlifeData, null, 2)
    );
    
    console.log(`\n✓ Data collection complete!`);
    console.log(`  Recreation data: ${Object.keys(recreationData.cities).length} cities`);
    console.log(`  Urban lifestyle data: ${Object.keys(urbanlifeData.cities).length} cities`);
    
    if (fillGaps) {
      console.log(`\n  Fill-gaps summary:`);
      console.log(`    Skipped (complete): ${skipped} cities`);
      console.log(`    Filled gaps: ${filled} cities`);
    }
    
    console.log(`\nNext steps:`);
    console.log(`  1. Review data in data/sources/recreation-data.json`);
    console.log(`  2. Review data in data/sources/urbanlife-data.json`);
    console.log(`  3. Run admin pull routes to import into metrics.json`);
  } else {
    console.log(`\n[DRY RUN] No data was collected or saved.`);
  }
}

main().catch(console.error);
