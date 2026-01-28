/**
 * Add Teleport urban area slugs to cities.json
 * 
 * Teleport API uses slugs like "san-francisco-bay-area", "seattle", etc.
 * This maps our cities to their corresponding Teleport urban areas.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Mapping of our city IDs to Teleport urban area slugs
// See: https://api.teleport.org/api/urban_areas/
const TELEPORT_SLUG_MAP: Record<string, string> = {
  "san-francisco": "san-francisco-bay-area",
  "seattle": "seattle",
  "new-york-city": "new-york",
  "los-angeles": "los-angeles",
  "sacramento": "sacramento",
  "boston": "boston",
  "portland": "portland-or",
  "las-vegas": "las-vegas",
  "chicago": "chicago",
  "washington-dc": "washington-dc",
  "houston": "houston",
  "atlanta": "atlanta",
  "minneapolis": "minneapolis-saint-paul",
  "philadelphia": "philadelphia",
  "dallas": "dallas-fort-worth",
  "tampa-bay": "tampa-bay-area",
  "denver": "denver",
  "charlotte": "charlotte",
  "oklahoma-city": "oklahoma-city",
  "phoenix": "phoenix",
  "baltimore": "baltimore",
  "orlando": "orlando",
  "indianapolis": "indianapolis",
  "nashville": "nashville",
  "milwaukee": "milwaukee",
  "salt-lake-city": "salt-lake-city",
  "detroit": "detroit",
  "st-louis": "st-louis",
  "san-antonio": "san-antonio",
  "jacksonville": "jacksonville",
  "new-orleans": "new-orleans",
  "kansas-city": "kansas-city",
  "cincinnati": "cincinnati",
  "cleveland": "cleveland",
  "buffalo": "buffalo",
  "pittsburgh": "pittsburgh",
  "miami": "miami",
  "green-bay": null, // Not in Teleport
  "memphis": "memphis",
  "san-diego": "san-diego",
  "santa-barbara": null, // Not in Teleport
  "raleigh": "raleigh",
  "gainesville": null, // Not in Teleport
};

async function main() {
  const dataDir = join(__dirname, "../data");
  const citiesPath = join(dataDir, "cities.json");

  // Read cities.json
  const citiesFile = JSON.parse(readFileSync(citiesPath, "utf-8"));

  // Add teleportSlug to each city
  for (const city of citiesFile.cities) {
    const slug = TELEPORT_SLUG_MAP[city.id];
    city.teleportSlug = slug || null;
  }

  // Write back
  writeFileSync(citiesPath, JSON.stringify(citiesFile, null, 2));

  const withSlug = citiesFile.cities.filter((c: any) => c.teleportSlug).length;
  const withoutSlug = citiesFile.cities.filter((c: any) => !c.teleportSlug).length;

  console.log(`Updated cities.json:`);
  console.log(`  ${withSlug} cities with Teleport slugs`);
  console.log(`  ${withoutSlug} cities without Teleport coverage`);
}

main().catch(console.error);
