# Data Sources Reference

> Detailed API documentation for each data source integrated into the application.  
> For architecture overview, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Table of Contents

1. [Auto-Discovery APIs (Add City)](#auto-discovery-apis-add-city)
2. [Census API (Demographics)](#census-api-demographics)
3. [BEA API (Cost of Living)](#bea-api-cost-of-living)
4. [NOAA / Open-Meteo (Climate)](#noaa--open-meteo-climate)
5. [Zillow ZHVI (Housing)](#zillow-zhvi-housing)
6. [FBI Crime Data Explorer](#fbi-crime-data-explorer)
7. [EPA Air Quality](#epa-air-quality)
8. [Walk Score](#walk-score)
9. [FCC Broadband](#fcc-broadband)
10. [NCES Education](#nces-education)
11. [HRSA Healthcare](#hrsa-healthcare)
12. [Political / Religious Data](#political--religious-data)
13. [Implementation Status](#implementation-status)
14. [API Key Management](#api-key-management)

---

## Auto-Discovery APIs (Add City)

**Status:** ✅ Implemented in `scripts/add-city.ts`

The add-city script uses external APIs to automatically discover city configuration data. This reduces manual lookup and ensures data accuracy.

### OpenStreetMap Nominatim (Coordinates)

**URL:** https://nominatim.openstreetmap.org/

**Used For:**
- Downtown (urban center) coordinates
- Airport coordinates
- Bounding box for validation

**Endpoints:**
```
# Forward geocoding (city to coordinates)
GET https://nominatim.openstreetmap.org/search?q=Austin,Texas,USA&format=json&limit=5&countrycodes=us

# Reverse geocoding (coordinates to city - for validation)
GET https://nominatim.openstreetmap.org/reverse?lat=30.2672&lon=-97.7431&format=json
```

**Rate Limit:** 1 request/second (enforced by script)

**Cost:** Free (no API key required)

### US Census Bureau Geocoder (FIPS Codes)

**URL:** https://geocoding.geo.census.gov/geocoder/

**Used For:**
- Census Place FIPS code (5 digits)

**Endpoints:**
```
# Coordinate-based lookup (preferred)
GET https://geocoding.geo.census.gov/geocoder/geographies/coordinates?
    x={longitude}&y={latitude}&
    benchmark=Public_AR_Current&vintage=Current_Current&
    layers=160&format=json

# Address-based fallback
GET https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?
    address=Austin,Texas&
    benchmark=Public_AR_Current&vintage=Current_Current&
    layers=160&format=json
```

**Cost:** Free (no API key required)

### NOAA Weather.gov API (Weather Station)

**URL:** https://www.weather.gov/documentation/services-web-api

**Used For:**
- Nearest NOAA weather observation station ID

**Endpoints:**
```
# Get metadata for location
GET https://api.weather.gov/points/{latitude},{longitude}

# Get observation stations near point
GET https://api.weather.gov/gridpoints/{office}/{gridX},{gridY}/stations
```

**Cost:** Free (no API key required)

### BEA Regional Data API (MSA Code)

**URL:** https://apps.bea.gov/api/

**Used For:**
- Metropolitan Statistical Area (MSA) GeoFIPS code (5 digits)

**Endpoint:**
```
GET https://apps.bea.gov/api/data/?
    UserID={BEA_API_KEY}&
    method=GetParameterValuesFiltered&
    DataSetName=Regional&
    TargetParameter=GeoFips&
    TableName=CAGDP1&
    ResultFormat=JSON
```

**Cost:** Free (requires `BEA_API_KEY` in .env)

### Wikidata SPARQL (Sports Teams)

**URL:** https://query.wikidata.org/

**Used For:**
- Professional sports teams (NFL, NBA, MLB, NHL, MLS)

**SPARQL Query:**
```sparql
SELECT DISTINCT ?team ?teamLabel ?leagueLabel WHERE {
  ?team wdt:P31/wdt:P279* wd:Q476028 .  # instance of sports team
  ?team wdt:P115 ?homeVenue .           # home venue
  ?homeVenue wdt:P131* ?city .          # located in city
  ?city rdfs:label "Austin"@en .
  ?team wdt:P118 ?league .              # league
  VALUES ?league { wd:Q1215884 wd:Q155223 wd:Q743654 wd:Q1215892 wd:Q14056 }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

**Validation:** Results are filtered against a static list of valid franchise names to exclude defunct teams, minor leagues, and incorrect matches.

**Cost:** Free (no API key required)

### Validation Methods

The auto-discovery includes built-in validation:

| Check | Description |
|-------|-------------|
| State Boundary | Coordinates verified against state bounding boxes |
| Reverse Geocoding | Coordinates confirmed via Nominatim reverse lookup |
| NOAA Station Format | Station codes validated as US format (KXXX) |
| Sports Team Names | Filtered against known valid franchises |

---

## Census API (Demographics)

**Status:** ✅ Fully integrated via `/api/admin/census-pull`

**URL:** https://api.census.gov/data.html

**Data Source:** American Community Survey (ACS) 5-Year Estimates

**Integrated Metrics:**
- **Population:** Total city population
- **Age Demographics:** Median age, age bracket percentages (under 18, 18-34, 35-54, 55+)
- **Race/Ethnicity:** White, Black, Hispanic, Asian, Pacific Islander, Native American, Two+ races
- **Asian Subgroups:** Chinese, Indian, Filipino, Vietnamese, Korean, Japanese (% of total population)
- **Diversity Index:** Simpson's Diversity Index (calculated from race/ethnicity data)
- **Education:** High school or higher %, Bachelor's or higher %, Graduate degree %
- **Income:** Median household income, Per capita income, Poverty rate
- **Foreign-Born:** % born outside US (proxy for international culture)
- **Household Composition:** Family households %, Married couples %, Single-person households %
- **Language:** English only %, Spanish at home %, Asian language at home %

**API Endpoints Used:**
```
# Data Profile variables (DP02, DP03, DP05)
https://api.census.gov/data/2022/acs/acs5/profile?get=NAME,DP05_0001E,...&for=place:{placeFips}&in=state:{stateFips}

# Detailed tables for Asian subgroups
https://api.census.gov/data/2022/acs/acs5?get=NAME,B02015_002E,...&for=place:{placeFips}&in=state:{stateFips}
```

**Geographic Targeting:**
- Uses FIPS codes for "Places" (cities) instead of MSAs for more accurate city-level data
- Each city in `cities.json` has a `censusFips: { state: "XX", place: "XXXXX" }` field
- Example: San Francisco = state: "06", place: "67000"

**Cost:** Free (API key optional but recommended for higher rate limits)

---

## BEA API (Cost of Living)

**Status:** ✅ Fully integrated via `/api/admin/bea-pull`

**URL:** https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area

**Integrated Metrics:**
- Regional Price Parity (RPP) - overall and by category
- Housing costs (renter vs owner)
- Goods and services costs
- Per capita income
- Tax burden estimates

**Used For:** Persona-based cost scoring (renter/owner/buyer × standard/local/retiree)

**Cost:** Free (requires API key)

---

## NOAA / Open-Meteo (Climate)

**Status:** ✅ Fully integrated via `/api/admin/climate-pull`

### NOAA ACIS (Primary)

**URL:** https://www.rcc-acis.org/docs_webservices.html

**Integrated Metrics:**
- Comfort days (65-80°F)
- Extreme heat days (>90°F)
- Freeze days (<32°F)
- Rain days, snow days
- Cloudy days
- Heating/cooling degree days
- Growing season length

### Open-Meteo (Supplemental)

**URL:** https://open-meteo.com/en/docs/climate-api

```
GET https://climate-api.open-meteo.com/v1/climate?
    latitude=37.77&longitude=-122.42&
    start_date=1990-01-01&end_date=2020-12-31&
    models=ERA5&daily=temperature_2m_mean
```

**Cost:** Free (no API key required)

---

## Zillow ZHVI (Housing)

**Status:** ✅ Implemented via `/api/admin/zillow-pull` (manual CSV)

**URL:** https://www.zillow.com/research/data/

**Available Datasets:**
- ZHVI (Zillow Home Value Index) - Currently using
- ZORI (Zillow Observed Rent Index)
- Inventory data (for sale, new listings)
- Days on market
- Price cuts percentage

**Integration Approach:**
- Download CSV files from Zillow Research
- Parse and import during refresh
- Update monthly (data updates monthly)

**Future Enhancement:**
- [ ] Automate CSV download
- [ ] Add rental price data (ZORI)

**Cost:** Free (public CSV downloads)

---

## FBI Crime Data Explorer

**Status:** ✅ Integrated via `/api/admin/fbi-crime-pull`

**URL:** https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi

**Available Data:**
- Violent crime rates
- Property crime rates
- Crime trends by year
- Agency-level data

**Key Endpoints:**
```
# State-level crime estimates
GET /api/estimates/states/{stateAbbr}/{variable}

# Agency crime data
GET /api/agencies/byStateAbbr/{stateAbbr}
```

**Cost:** Free (requires API key)

---

## EPA Air Quality

**Status:** ✅ Integrated via `/api/admin/epa-air-pull`

**URL:** https://docs.airnowapi.org/

**Integrated Metrics:**
- Healthy days percentage
- Good days percentage
- Hazardous days count

**Endpoint:**
```
GET https://www.airnowapi.org/aq/observation/latLong/historical/?
    format=application/json&
    latitude={lat}&longitude={lon}&
    date={date}&distance=25&
    API_KEY={key}
```

**Cost:** Free (requires API key)

---

## Walk Score

**Status:** ⚠️ Partially implemented

**Official API:** https://www.walkscore.com/professional/api.php
- NOT INTEGRATED (requires API key with paid tier for commercial use)

**Current Implementation:**
- **Walk Score & Bike Score:** Derived from EPA National Walkability Index (free ArcGIS API)
  - NatWalkInd (1-20) converted to 0-100 scale for walk score
  - D3B (street intersection density) normalized for bike score
- **Transit Score:** Manually researched from walkscore.com (January 2025)
  - EPA transit metrics (D4A, D4C, D5BR) were tested but proved too noisy at metro scale
  - Suburban census blocks dilute city-center scores, producing inaccurate national comparisons
  - Hardcoded fallback data for ~45 major metros

**Alternative Considered:** AllTransit API (Center for Neighborhood Technology)
- Provides 0-10 Performance Score based on GTFS data
- Would be more accurate but requires paid access

**Future Improvements:**
- [ ] Request Walk Score API key for automated transit data
- [ ] Or integrate AllTransit if budget allows
- Current manual data should be refreshed annually

---

## FCC Broadband

**Status:** ✅ Integrated via `/api/admin/fcc-broadband-pull`

**Integrated Metrics:**
- Fiber coverage percentage
- Provider count
- Average speeds

**Update Frequency:** Annual

---

## NCES Education

**Status:** ✅ Integrated via `/api/admin/nces-education-pull`

**URL:** NCES EDGE API

**Integrated Metrics:**
- Student-teacher ratio
- Graduation rates
- School quality indicators

**Update Frequency:** Annual

---

## HRSA Healthcare

**Status:** ✅ Integrated via `/api/admin/hrsa-health-pull`

**Integrated Metrics:**
- Physicians per capita
- Health professional shortage areas
- Healthcare access indicators

**Update Frequency:** Annual

---

## Urban Lifestyle Data (Entertainment)

**Status:** ✅ Integrated via `/api/admin/urbanlife-pull`

**Source:** OpenStreetMap via Overpass API + manual curation

**Integrated Metrics:**
- Nightlife: Bars/clubs per 10K, total venues, late-night venues
- Arts: Museums, theaters, galleries, music venues
- Dining: Restaurants per 10K, cuisine diversity, breweries, fine dining count
- Sports: NFL, NBA, MLB, NHL, MLS team presence

**Scoring Calibration (Jan 2026):**

The scoring constants are calibrated to actual OSM data distribution:

| Metric | Min | Plateau | Max | Notes |
|--------|-----|---------|-----|-------|
| Bars/clubs per 10K | 0.5 | 5 | 10 | Portland (7.7), LA (0.4) |
| Restaurants per 10K | 3 | 20 | 45 | SF (42), Houston (4.2) |
| Museums | 5 | 30 | 150 | NYC (162), small cities (8-15) |

**Known Data Quirks:**
- **Las Vegas:** The famous Strip is in Paradise, NV (unincorporated), not City of Las Vegas. 
  Data manually adjusted to include Strip venues (barsAndClubsPer10K: 5.8).
- **Per-capita metrics:** Mega-cities (NYC, LA) may score lower than expected because their 
  huge population denominators dilute the per-capita figures even with massive absolute venue counts.

**Update Frequency:** As needed (OSM data is relatively stable)

---

## Political / Religious Data

**Status:** ✅ Integrated via `/api/admin/cultural-pull`

**Sources:**
- **Political:** MIT Election Lab county-level presidential results
- **Religious:** ARDA religious congregation data

**Integrated Metrics:**
- Democrat/Republican vote percentages
- Religious congregation density
- Religious diversity index

**Update Frequency:** After elections (political), static (religious)

---

## Implementation Status

### City Definition Auto-Discovery

| Data | Status | Source | Key Required |
|------|--------|--------|--------------|
| Coordinates | ✅ Auto | OpenStreetMap Nominatim | No |
| Census Place FIPS | ✅ Auto | Census Bureau Geocoder | No |
| NOAA Station | ✅ Auto | NOAA Weather.gov API | No |
| BEA MSA Code | ✅ Auto | BEA Regional API | Yes (`BEA_API_KEY`) |
| Sports Teams | ✅ Auto | Wikidata SPARQL | No |
| Zillow Region ID | ❌ Manual | zillow.com/home-values | N/A |

### Metrics Data Sources

| Data Type | Status | Source | Update Frequency |
|-----------|--------|--------|------------------|
| Home Prices | ✅ Implemented | Zillow ZHVI (manual CSV) | Monthly (manual) |
| Demographics | ✅ Implemented | Census ACS API | Annually |
| Crime Rates | ✅ Implemented | FBI CDE API | Annually |
| Weather/Climate | ✅ Implemented | NOAA ACIS + Open-Meteo | On change (rare) |
| Walk/Bike Scores | ✅ Implemented | EPA Walkability Index API | Quarterly |
| Transit Scores | ⚠️ Manual | walkscore.com (Jan 2025) | Annually (manual) |
| Air Quality | ✅ Implemented | EPA AQS API | Annually |
| Broadband | ✅ Implemented | FCC Broadband Map API | Annually |
| Education | ✅ Implemented | NCES EDGE API | Annually |
| Healthcare | ✅ Implemented | HRSA API | Annually |
| Cost of Living | ✅ Implemented | BEA API | Annually |
| Cultural | ✅ Implemented | MIT Election + ARDA (static) | After elections |

---

## API Key Management

API keys are stored in environment variables:

```env
# .env.local (not committed)
CENSUS_API_KEY=your_key_here
FBI_API_KEY=your_key_here
BEA_API_KEY=your_key_here
EPA_API_KEY=your_key_here
```

See `.env.example` for all required keys.
