/**
 * Add BEA GeoFips codes to cities.json
 * 
 * BEA API uses GeoFips codes for MSAs (Metropolitan Statistical Areas)
 * This maps our cities to their corresponding BEA GeoFips codes.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Mapping of our city IDs to BEA GeoFips codes
// Found via BEA API: Regional dataset, MARPP table
const BEA_GEOFIPS_MAP: Record<string, string | null> = {
  "san-francisco": "41860",    // San Francisco-Oakland-Berkeley, CA
  "seattle": "42660",          // Seattle-Tacoma-Bellevue, WA
  "new-york-city": "35620",    // New York-Newark-Jersey City, NY-NJ-PA
  "los-angeles": "31080",      // Los Angeles-Long Beach-Anaheim, CA
  "sacramento": "40900",       // Sacramento-Roseville-Folsom, CA
  "boston": "14460",           // Boston-Cambridge-Newton, MA-NH
  "portland": "38900",         // Portland-Vancouver-Hillsboro, OR-WA
  "las-vegas": "29820",        // Las Vegas-Henderson-Paradise, NV
  "chicago": "16980",          // Chicago-Naperville-Elgin, IL-IN-WI
  "washington-dc": "47900",    // Washington-Arlington-Alexandria, DC-VA-MD-WV
  "houston": "26420",          // Houston-The Woodlands-Sugar Land, TX
  "atlanta": "12060",          // Atlanta-Sandy Springs-Alpharetta, GA
  "minneapolis": "33460",      // Minneapolis-St. Paul-Bloomington, MN-WI
  "philadelphia": "37980",     // Philadelphia-Camden-Wilmington, PA-NJ-DE-MD
  "dallas": "19100",           // Dallas-Fort Worth-Arlington, TX
  "tampa-bay": "45300",        // Tampa-St. Petersburg-Clearwater, FL
  "denver": "19740",           // Denver-Aurora-Lakewood, CO
  "charlotte": "16740",        // Charlotte-Concord-Gastonia, NC-SC
  "oklahoma-city": "36420",    // Oklahoma City, OK
  "phoenix": "38060",          // Phoenix-Mesa-Chandler, AZ
  "baltimore": "12580",        // Baltimore-Columbia-Towson, MD
  "orlando": "36740",          // Orlando-Kissimmee-Sanford, FL
  "indianapolis": "26900",     // Indianapolis-Carmel-Anderson, IN
  "nashville": "34980",        // Nashville-Davidson--Murfreesboro--Franklin, TN
  "milwaukee": "33340",        // Milwaukee-Waukesha, WI
  "salt-lake-city": "41620",   // Salt Lake City, UT
  "detroit": "19820",          // Detroit-Warren-Dearborn, MI
  "st-louis": "41180",         // St. Louis, MO-IL
  "san-antonio": "41700",      // San Antonio-New Braunfels, TX
  "jacksonville": "27260",     // Jacksonville, FL
  "new-orleans": "35380",      // New Orleans-Metairie, LA
  "kansas-city": "28140",      // Kansas City, MO-KS
  "cincinnati": "17140",       // Cincinnati, OH-KY-IN
  "cleveland": "17460",        // Cleveland-Elyria, OH
  "buffalo": "15380",          // Buffalo-Cheektowaga, NY
  "pittsburgh": "38300",       // Pittsburgh, PA
  "miami": "33100",            // Miami-Fort Lauderdale-Pompano Beach, FL
  "green-bay": "24580",        // Green Bay, WI
  "memphis": "32820",          // Memphis, TN-MS-AR
  "san-diego": "41740",        // San Diego-Chula Vista-Carlsbad, CA
  "santa-barbara": "42200",    // Santa Maria-Santa Barbara, CA
  "raleigh": "39580",          // Raleigh-Cary, NC
  "gainesville": "23540",      // Gainesville, FL
};

async function main() {
  const dataDir = join(__dirname, "../data");
  const citiesPath = join(dataDir, "cities.json");

  // Read cities.json
  const citiesFile = JSON.parse(readFileSync(citiesPath, "utf-8"));

  // Add beaGeoFips to each city
  for (const city of citiesFile.cities) {
    const geoFips = BEA_GEOFIPS_MAP[city.id];
    city.beaGeoFips = geoFips || null;
  }

  // Write back
  writeFileSync(citiesPath, JSON.stringify(citiesFile, null, 2));

  const withFips = citiesFile.cities.filter((c: any) => c.beaGeoFips).length;
  const withoutFips = citiesFile.cities.filter((c: any) => !c.beaGeoFips).length;

  console.log(`Updated cities.json:`);
  console.log(`  ${withFips} cities with BEA GeoFips codes`);
  console.log(`  ${withoutFips} cities without BEA coverage`);
}

main().catch(console.error);
