# Adding New Cities

This guide documents the complete process for adding a new city to the Cities App, including all required identifiers and data sources.

> **Quick Start:** Use the automated script with auto-discovery to add a city:
> ```bash
> # Auto-discover mode (fetches data from external APIs automatically)
> npx tsx scripts/add-city.ts --auto-discover --city="Phoenix" --state="AZ"
> 
> # Interactive mode (prompts for each field, offers auto-discovery)
> npx tsx scripts/add-city.ts --interactive
> 
> # Or with a config file
> npx tsx scripts/add-city.ts --config=my-city.json
> ```
> See [Using the Add City Script](#using-the-add-city-script) below for details.

## Overview

Adding a city involves:
1. Adding the city definition to `data/cities.json` (automated via script)
2. Running automated data pulls via Admin CLI or Panel
3. Manual data entry for sources without APIs (Zillow ID, political data)

## Step 1: City Definition (`data/cities.json`)

Add a new entry to the `cities` array with these required fields:

```json
{
  "id": "city-name",              // URL-safe slug (lowercase, hyphens)
  "name": "City Name",            // Display name
  "state": "ST",                  // State abbreviation (or "ST1/ST2" for metro areas)
  "noaaStation": "KXXX",          // NOAA weather station code
  "latitude": 00.0000,            // Airport/weather station coordinates
  "longitude": -00.0000,
  "urbanCenter": {                // Downtown coordinates (for POI queries)
    "latitude": 00.0000,
    "longitude": -00.0000
  },
  "censusFips": {                 // Census geographic identifiers
    "state": "00",
    "place": "00000"
  },
  "zillowRegionId": 000000,       // Zillow region ID
  "zillowRegionName": "City, ST", // Zillow region name
  "sports": {                     // Professional sports teams
    "nfl": [],
    "nba": [],
    "mlb": [],
    "nhl": [],
    "mls": []
  },
  "beaGeoFips": "00000"           // BEA MSA FIPS code
}
```

### Finding Required Identifiers

#### NOAA Station Code
- Visit: https://www.weather.gov/
- Search for the city and find the nearest airport weather station
- Format: `K` + 3-letter airport code (e.g., `KSFO` for San Francisco)

#### Coordinates
- **latitude/longitude**: Airport coordinates (from Google Maps or the NOAA station)
- **urbanCenter**: Downtown city center coordinates (important for POI queries!)
  - Use Google Maps to find city center
  - This ensures bars/restaurants/museums are counted correctly

#### Census FIPS Codes
- Visit: https://www.census.gov/library/reference/code-lists/ansi.html
- **State FIPS**: 2-digit state code (e.g., "06" for California)
- **Place FIPS**: 5-digit place code for the city
- Tool: https://geocoding.geo.census.gov/geocoder/geographies/address

#### Zillow Region ID
- Visit: https://www.zillow.com/research/data/
- Download ZHVI data and search for the city
- Or use the Zillow API to look up the region
- The `zillowGeography` field can be added if using "msa" instead of "city"

#### BEA GeoFIPS (MSA Code)
- Visit: https://apps.bea.gov/regional/docs/msalist.cfm
- Find the Metropolitan Statistical Area (MSA) code
- 5-digit code (e.g., "41860" for San Francisco-Oakland-Fremont)

#### Sports Teams
- Research which NFL, NBA, MLB, NHL, and MLS teams are in the metro area
- Include team names (not city names) in arrays

## Using the Add City Script

The `scripts/add-city.ts` script automates the city addition process with **auto-discovery** capabilities that fetch data from external APIs.

### Option 1: Auto-Discover Mode (Recommended)

The fastest way to add a city - automatically fetches most required data:

```bash
npx tsx scripts/add-city.ts --auto-discover --city="Phoenix" --state="AZ"
```

This will:
1. **Auto-discover** coordinates, FIPS codes, NOAA station, BEA MSA, and sports teams
2. **Validate** all discovered data (coordinate bounds, reverse geocoding)
3. **Display** the configuration for your review
4. **Prompt** for confirmation before proceeding

#### Auto-Discovery APIs

| Data | API | Key Required |
|------|-----|--------------|
| Coordinates (airport + downtown) | OpenStreetMap Nominatim | No |
| Census Place FIPS | US Census Bureau Geocoder | No |
| NOAA Weather Station | NOAA Weather.gov API | No |
| BEA MSA Code | BEA Regional API | Yes (`BEA_API_KEY` in .env) |
| Sports Teams | Wikidata SPARQL | No |

#### Verification Methods

The auto-discovery includes built-in validation:
- **Coordinate boundary checks**: Ensures coordinates fall within expected state bounds
- **Reverse geocoding**: Confirms coordinates resolve back to the correct city name
- **NOAA station format validation**: Verifies standard US station code format (KXXX)
- **Sports team validation**: Filters results against known valid franchise names

#### What Auto-Discovery Cannot Find

Some data still requires manual lookup:
- **Zillow Region ID**: No public API available - find at zillow.com/home-values
- **Political data**: Requires election result research

### Option 2: Interactive Mode

```bash
npx tsx scripts/add-city.ts --interactive
```

The script will:
1. Prompt for city name and state
2. **Offer to run auto-discovery** for other fields
3. Show discovered values as defaults (press Enter to accept)
4. Allow manual override of any field

### Option 3: Config File

Create a JSON config file with the city details:

```json
{
  "id": "boise",
  "name": "Boise",
  "state": "ID",
  "noaaStation": "KBOI",
  "latitude": 43.6166,
  "longitude": -116.2009,
  "urbanCenter": { "latitude": 43.6150, "longitude": -116.2023 },
  "censusFips": { "state": "16", "place": "08830" },
  "zillowRegionId": 394399,
  "zillowRegionName": "Boise City, ID",
  "sports": { "nfl": [], "nba": [], "mlb": [], "nhl": [], "mls": [] },
  "beaGeoFips": "14260"
}
```

Then run:

```bash
npx tsx scripts/add-city.ts --config=boise.json
```

### What the Script Does

1. Adds the city to `cities.json`
2. Seeds the database
3. Pulls census data (required for lifestyle metrics)
4. Collects lifestyle data from OpenStreetMap
5. Runs all admin data pulls (BEA, climate, Zillow, etc.)
6. Refreshes the database
7. Runs data verification

### Skip Data Pulls

To only add to JSON without running data pulls:

```bash
npx tsx scripts/add-city.ts --config=city.json --skip-data-pull
```

### Requirements

- `ADMIN_PASSWORD` must be set in `.env` (for data pulls)
- `BEA_API_KEY` in `.env` (for BEA MSA auto-discovery)

### CLI Reference

```bash
npx tsx scripts/add-city.ts --help

# Modes:
#   --interactive, -i     Interactive mode with prompts (offers auto-discovery)
#   --auto-discover, -a   Auto-discover data from external APIs
#   --config=FILE         Load city config from JSON file

# Options:
#   --city="Name"         City name (required for auto-discover)
#   --state="XX"          State abbreviation (required for auto-discover)
#   --skip-data-pull      Skip automated data pulls (only add to JSON)

# Examples:
npx tsx scripts/add-city.ts -a --city="Denver" --state="CO"
npx tsx scripts/add-city.ts -i
npx tsx scripts/add-city.ts --config=denver.json
```

### Manual Identifier Lookup (Fallback)

If auto-discovery fails or you need to verify values:

| Field | How to Find |
|-------|-------------|
| Coordinates | OpenStreetMap Nominatim: `https://nominatim.openstreetmap.org/search?q=City,ST,USA&format=json` |
| Census FIPS | Census Geocoder: `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=LON&y=LAT&benchmark=Public_AR_Current&vintage=Current_Current&format=json` |
| Zillow Region ID | Search in Zillow ZHVI CSV: `curl -s "https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv" \| grep -i "cityname"` |
| BEA GeoFIPS | BEA MSA list: https://apps.bea.gov/regional/docs/msalist.cfm |
| NOAA Station | Usually `K` + airport code (e.g., `KBOI` for Boise)

## Step 2: Run Database Seed

After adding the city to `cities.json`:

```bash
cd cities-app
npx tsx scripts/seed.ts
```

This creates the city record in the database.

## Step 3: Automated Data Pulls

Use the Admin Panel (`/admin`) or API endpoints to pull data:

### Fully Automated (API-based)

| Data Source | Admin Route | What It Pulls |
|-------------|-------------|---------------|
| Census ACS | `/api/admin/census-pull` | Demographics, income, education, race/ethnicity |
| BEA | `/api/admin/bea-pull` | Regional Price Parity, purchasing power, taxes |
| NOAA Climate | `/api/admin/climate-pull` | Temperature, precipitation, comfort days |
| EPA Air Quality | `/api/admin/epa-air-pull` | Air quality metrics |
| FBI Crime | `/api/admin/fbi-crime-pull` | Crime rates |
| FCC Broadband | `/api/admin/fcc-broadband-pull` | Internet coverage |
| HRSA Health | `/api/admin/hrsa-health-pull` | Healthcare access |
| NCES Education | `/api/admin/nces-education-pull` | School quality |
| Zillow | `/api/admin/zillow-pull` | Home prices, price history |
| Urban Lifestyle | `/api/admin/urbanlife-pull` | Nightlife, dining, arts (from OSM) |
| Recreation | `/api/admin/recreation-pull` | Trails, parks, elevation (from OSM/USGS) |

### Data Collection Scripts

Some data requires running collection scripts:

```bash
# Collect lifestyle/recreation data from OpenStreetMap
npx tsx scripts/collect-lifestyle-data.ts

# Fetch Walk Score data from walkscore.com
npx tsx scripts/fetch-walkscore.ts --city=city-id

# Then run the admin pulls to import into metrics.json
```

## Step 4: Manual Data Entry

Some data must be manually researched and added to `data/metrics.json`:

### Political Data (`cultural.political`)
- **cityDemocratPercent**: Recent presidential/mayoral election results
- **stateDemocratPercent**: State-level election data
- Sources: Secretary of State websites, Ballotpedia

### Quality Scores (if not available via API)
- **qualityOfLifeScore**: ACSM Fitness Index or similar rankings
- **healthScore**: ACSM American Fitness Index rank
- **trafficIndex**: INRIX Traffic Scorecard

### Manual Entry Template

Add to `data/metrics.json` under the city ID:

```json
"new-city": {
  "climate": {
    "avgTemp": 00,
    "avgWinterTemp": 00,
    "avgSummerTemp": 00,
    "daysOfSunshine": 000,
    "daysOfRain": 00
  },
  "quality": {
    "qualityOfLifeScore": 00,
    "walkScore": 00,
    "transitScore": 00,
    "hasInternationalAirport": true/false,
    "airportCode": "XXX"
  },
  "political": {
    "cityDemocratPercent": 0.00,
    "stateDemocratPercent": 0.00
  }
}
```

## Step 5: Refresh Database

After all data is collected:

```bash
# Option 1: Full refresh via Admin Panel
# POST to /api/admin/refresh with password

# Option 2: Re-run seed
npx tsx scripts/seed.ts
```

## Step 6: Validation

Run the city verification script to check for missing data:

```bash
# Verify a specific city
npx tsx scripts/verify-city-data.ts boise

# Verify all cities
npx tsx scripts/verify-city-data.ts --all
```

The script checks:
- Required fields in `cities.json`
- Required metrics in `metrics.json` (census, BEA, climate, QoL, etc.)
- ZHVI price history data
- Reports errors (required fields) and warnings (optional fields)

Example output:
```
============================================================
City: boise (Boise, ID)
============================================================
✅ All checks passed!

📊 Summary:
   zhviDataPoints: 297
   latestZHVI: $479,944 (2025-12-31)
   population: 234,192
   costOfLiving: 94.2 (100=avg)
   comfortDays: 71
```

Also check the app to ensure:
- [ ] City appears in the list
- [ ] Scoring works correctly
- [ ] City detail page shows all metrics
- [ ] Comparison works with other cities

## Data Source Reference

### City Definition Auto-Discovery

| Field | Auto-Discovery | Source | Notes |
|-------|----------------|--------|-------|
| Coordinates | ✅ Yes | OpenStreetMap Nominatim | Airport + downtown |
| Census Place FIPS | ✅ Yes | Census Bureau Geocoder | Via coordinates |
| NOAA Station | ✅ Yes | NOAA Weather.gov API | Closest station |
| BEA MSA Code | ✅ Yes | BEA API | Requires `BEA_API_KEY` |
| Sports Teams | ✅ Yes | Wikidata SPARQL | Validated against known teams |
| Zillow Region ID | ❌ No | Manual lookup | zillow.com/home-values |

### Metrics Data Sources

| Category | Source | Update Frequency | API Available |
|----------|--------|------------------|---------------|
| Climate | NOAA ACIS + Open-Meteo | Annual | ✅ Yes |
| Demographics | Census ACS 5-Year | Annual | ✅ Yes |
| Economics | BEA | Annual | ✅ Yes |
| Housing | Zillow ZHVI | Monthly | ✅ Yes |
| Walkability | walkscore.com | On-demand | ✅ Via script |
| Crime | FBI UCR | Annual | ✅ Yes |
| Air Quality | EPA AQS | Annual | ✅ Yes |
| Broadband | FCC | Annual | ✅ Yes |
| Healthcare | HRSA | Annual | ✅ Yes |
| Education | NCES | Annual | ✅ Yes |
| Urban Life | OpenStreetMap | Live | ✅ Yes (Overpass) |
| Recreation | OSM + USGS | Live | ✅ Yes |
| Political | Manual Research | Per election | ❌ No |

## Troubleshooting

### City not appearing in list
- Check `cities.json` syntax (valid JSON)
- Run `npx tsx scripts/seed.ts`
- Check for errors in console

### Missing metrics
- Verify all identifiers are correct (FIPS codes, Zillow ID, etc.)
- Run individual admin pulls for specific data
- Check API response errors in browser console

### Incorrect POI counts (bars, restaurants)
- Verify `urbanCenter` coordinates are set to downtown (not airport)
- Re-run `scripts/collect-lifestyle-data.ts`

### Census data not loading
- Verify `censusFips.state` and `censusFips.place` are correct
- Check Census API for the specific place

## Quick Checklist

### Using Auto-Discovery (Recommended)

- [ ] Set `BEA_API_KEY` in `.env` (for MSA code lookup)
- [ ] Ran `npx tsx scripts/add-city.ts -a --city="Name" --state="XX"`
- [ ] Reviewed auto-discovered data and confirmed
- [ ] Found Zillow region ID manually (zillow.com/home-values)
- [ ] Updated `cities.json` with Zillow ID
- [ ] Verified data: `npx tsx scripts/verify-city-data.ts city-id`
- [ ] Added manual data (political, etc.) to `metrics.json`
- [ ] Tested in app at http://localhost:3000

### Using Config File

- [ ] Created config file with all required fields
- [ ] Found correct NOAA station code
- [ ] Set both airport and urbanCenter coordinates
- [ ] Found Census FIPS codes (state + place)
- [ ] Found Zillow region ID (from ZHVI CSV)
- [ ] Found BEA GeoFIPS (MSA code)
- [ ] Added sports teams
- [ ] Ran `npx tsx scripts/add-city.ts --config=city.json`
- [ ] Verified data: `npx tsx scripts/verify-city-data.ts city-id`
- [ ] Added manual data (political, etc.) if needed
- [ ] Tested in app at http://localhost:3000
