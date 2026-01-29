# Adding New Cities

This guide documents the complete process for adding a new city to the Cities App, including all required identifiers and data sources.

> **Quick Start:** Use the automated script to add a city with minimal manual work:
> ```bash
> npx tsx scripts/add-city.ts "City Name" "ST"
> ```
> The script will look up most identifiers automatically. See [Using the Add City Script](#using-the-add-city-script) below.

## Overview

Adding a city involves:
1. Adding the city definition to `data/cities.json`
2. Running automated data pulls via the Admin Panel
3. Manual data entry for sources without APIs

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

The `scripts/add-city.ts` script automates most of the identifier lookup:

```bash
npx tsx scripts/add-city.ts "Austin" "TX"
```

**What it does:**
- Looks up coordinates via OpenStreetMap Nominatim
- Finds Census FIPS codes via Census Geocoder
- Searches for Zillow region ID
- Looks up BEA MSA code
- Finds the nearest NOAA weather station
- Adds the city to `cities.json`

**What you still need to manually add:**
- Sports teams (edit `cities.json` after running)
- Verify the identifiers are correct
- Run data pulls

The script will prompt you to confirm before saving.

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
| Walk Score | `/api/admin/walkscore-pull` | Walk/Transit/Bike scores |
| EPA Air Quality | `/api/admin/epa-air-pull` | Air quality metrics |
| FBI Crime | `/api/admin/fbi-crime-pull` | Crime rates |
| FCC Broadband | `/api/admin/fcc-broadband-pull` | Internet coverage |
| HRSA Health | `/api/admin/hrsa-health-pull` | Healthcare access |
| NCES Education | `/api/admin/nces-education-pull` | School quality |
| Zillow | `/api/admin/zillow-pull` | Home prices, price history |
| Urban Lifestyle | `/api/admin/urbanlife-pull` | Nightlife, dining, arts (from OSM) |
| Recreation | `/api/admin/recreation-pull` | Trails, parks, elevation (from OSM/USGS) |

### Data Collection Scripts

Some data requires running collection scripts first:

```bash
# Collect lifestyle/recreation data from OpenStreetMap
npx tsx scripts/collect-lifestyle-data.ts

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

Run the validation script to check for missing data:

```bash
npx tsx scripts/validate-data.ts
```

Check the app to ensure:
- [ ] City appears in the list
- [ ] Scoring works correctly
- [ ] City detail page shows all metrics
- [ ] Comparison works with other cities

## Data Source Reference

| Category | Source | Update Frequency | API Available |
|----------|--------|------------------|---------------|
| Climate | NOAA ACIS + Open-Meteo | Annual | ✅ Yes |
| Demographics | Census ACS 5-Year | Annual | ✅ Yes |
| Economics | BEA | Annual | ✅ Yes |
| Housing | Zillow ZHVI | Monthly | ✅ Yes |
| Walkability | Walk Score | On-demand | ✅ Yes (limited) |
| Crime | FBI UCR | Annual | ✅ Yes |
| Air Quality | EPA AQS | Annual | ✅ Yes |
| Broadband | FCC | Annual | ✅ Yes |
| Healthcare | HRSA | Annual | ✅ Yes |
| Education | NCES | Annual | ✅ Yes |
| Urban Life | OpenStreetMap | Live | ✅ Yes (Overpass) |
| Recreation | OSM + USGS | Live | ✅ Yes |
| Political | Manual Research | Per election | ❌ No |
| Sports Teams | Manual | As needed | ❌ No |

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

- [ ] Added to `data/cities.json` with all required fields
- [ ] Found correct NOAA station code
- [ ] Set both airport and urbanCenter coordinates
- [ ] Found Census FIPS codes (state + place)
- [ ] Found Zillow region ID
- [ ] Found BEA GeoFIPS (MSA code)
- [ ] Added sports teams
- [ ] Ran `npx tsx scripts/seed.ts`
- [ ] Ran automated data pulls
- [ ] Added manual data (political, etc.)
- [ ] Ran validation script
- [ ] Tested in app
