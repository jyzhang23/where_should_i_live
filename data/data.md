# Data Pipeline Documentation

## Current State

### Overview

The application currently uses a **static data pipeline** where all city metrics and housing price history are imported from an Excel spreadsheet (`Cities.xlsx`). This serves as the initial data source and can be refreshed via the admin panel.

### Data Flow

```
┌─────────────────────┐
│   Cities.xlsx       │
│   (Excel file)      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Admin Refresh API  │
│  POST /api/admin/   │
│       refresh       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  PostgreSQL (Neon)  │
│  - City             │
│  - CityMetrics      │
│  - ZHVIDataPoint    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Next.js API       │
│   GET /api/cities   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   React Frontend    │
│   (Client-side      │
│    scoring)         │
└─────────────────────┘
```

### Excel File Structure

The `Cities.xlsx` file contains:

| Sheet | Description | Records |
|-------|-------------|---------|
| `Gemini_raw` | City metrics (43 cities × 29 metrics) | Temperature, sunshine, diversity, taxes, crime, walkability, etc. |
| `sfr_0.33_0.67_sm_sa` | Zillow ZHVI data (896 regions × 25 years) | Monthly median home prices |

### Current Metrics Imported

**Climate:**
- Average temperature (annual, winter, summer)
- Days of sunshine per year
- Days of rain per year

**Demographics (Legacy - replaced by Census ACS):**
- Metro population (fallback only)
- Diversity index (now from Census)
- East Asian population percentage (now from Census with full Asian subgroup breakdown)

**Cost of Living:**
- Median single-family home price
- State income tax rate (top marginal)
- Property tax rate
- Cost of living index

**Quality of Life:**
- Walk Score
- Transit Score
- Violent crime rate per 100,000
- Average broadband speed
- International airport (yes/no)
- Health score
- Pollution index
- Water quality index
- Traffic index

**Political:**
- City Democrat vote percentage
- State Democrat vote percentage

**Amenities:**
- NFL teams
- NBA teams

### Refresh Process

1. Admin clicks shield icon in header
2. Enters password (`cursorftw`)
3. API reads `data/Cities.xlsx`
4. Parses both sheets using `xlsx` library
5. Upserts cities and metrics to PostgreSQL
6. Replaces ZHVI history data
7. Logs refresh to `DataRefreshLog` table

---

## Future Data APIs

### Priority 1: Housing Data

#### Zillow Research Data

**URL:** https://www.zillow.com/research/data/

**Available Datasets:**
- ZHVI (Zillow Home Value Index) - Already using CSV export
- ZORI (Zillow Observed Rent Index)
- Inventory data (for sale, new listings)
- Days on market
- Price cuts percentage

**Integration Approach:**
- Download CSV files programmatically
- Parse and import during refresh
- Update monthly (data updates monthly)

**Cost:** Free (public CSV downloads)

---

### Priority 2: Demographics ✅ IMPLEMENTED

#### US Census Bureau API

**URL:** https://api.census.gov/data.html

**Status:** Fully integrated via `/api/admin/census-pull`

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

**Data Storage:**
- Stored in `metrics.json` under each city's `census` field
- Includes metadata: `source: "Census ACS 5-Year"`, `year: 2022`, `lastUpdated: ISO date`

**Cost:** Free (API key optional but recommended for higher rate limits)

---

### Priority 3: Crime Statistics

#### FBI Crime Data Explorer API

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

**Integration Approach:**
- Request API key (free)
- Query by state, aggregate by metro area
- Update annually

**Cost:** Free (requires API key)

---

### Priority 4: Weather Data

#### National Weather Service API

**URL:** https://www.weather.gov/documentation/services-web-api

**Available Data:**
- Historical climate normals
- Temperature averages
- Precipitation data
- Severe weather statistics

**Key Endpoints:**
```
# Get forecast by coordinates
GET /points/{latitude},{longitude}

# Climate normals (30-year averages)
GET /stations/{stationId}/observations
```

**Alternative: Open-Meteo (No API key required)**

**URL:** https://open-meteo.com/en/docs/climate-api

```
# Historical climate data
GET https://climate-api.open-meteo.com/v1/climate?
    latitude=37.77&longitude=-122.42&
    start_date=1990-01-01&end_date=2020-12-31&
    models=ERA5&daily=temperature_2m_mean
```

**Integration Approach:**
- Use NWS for official data (free, no key)
- Or Open-Meteo for easier integration
- Cache climate normals (rarely change)

**Cost:** Free

---

### Priority 5: Quality of Life Scores ✅ PARTIALLY IMPLEMENTED

#### Walk Score API

**URL:** https://www.walkscore.com/professional/api.php

**Status:** NOT INTEGRATED (requires API key with paid tier for commercial use)

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
- Request Walk Score API key for automated transit data
- Or integrate AllTransit if budget allows
- Current manual data should be refreshed annually

---

### Priority 6: Cost of Living

#### Numbeo API (Unofficial)

**URL:** https://www.numbeo.com/common/api.jsp

**Available Data:**
- Cost of living index
- Rent index
- Groceries index
- Restaurant prices
- Local purchasing power

**Note:** Numbeo has limited API access. Consider:
- BLS (Bureau of Labor Statistics) for CPI data
- MERIC (Missouri Economic Research) for state cost comparisons

**Alternative: BLS Consumer Price Index**

**URL:** https://www.bls.gov/developers/

```
# CPI for urban areas
GET https://api.bls.gov/publicAPI/v2/timeseries/data/CUSR0000SA0
```

**Cost:** Free (BLS requires registration)

---

### Priority 7: Air Quality

#### EPA AirNow API

**URL:** https://docs.airnowapi.org/

**Available Data:**
- Current AQI (Air Quality Index)
- Historical AQI data
- Pollutant-specific measurements
- Forecasts

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

## Implementation Roadmap

### Phase 1: Automated Zillow Updates
- [ ] Download ZHVI CSV programmatically
- [ ] Parse and import new price data
- [ ] Schedule monthly refresh

### Phase 2: Census Integration ✅ COMPLETE
- [x] Obtain Census API key (optional - works without)
- [x] Map FIPS codes to cities (place-level, not MSA)
- [x] Import demographic data (age, race, income, education, etc.)
- [x] Add new demographic metrics to schema

### Phase 3: Crime Data ✅ COMPLETE
- [x] Integrate FBI Crime Data Explorer API
- [x] Import crime statistics (violent crime rate, 3-year trends)
- [ ] Add crime trend visualization (future enhancement)

### Phase 4: Weather/Climate Integration ✅ COMPLETE
- [x] Integrate NOAA ACIS for historical climate normals
- [x] Integrate Open-Meteo for comfort metrics
- [x] Import seasonal weather breakdown
- [x] Calculate climate usability scores (outdoor comfort days)

### Phase 5: Walkability Scores ⚠️ PARTIAL
- [ ] Obtain Walk Score API key (not integrated - requires paid tier)
- [x] Walk/Bike scores from EPA National Walkability Index
- [x] Transit scores from manual walkscore.com research (Jan 2025)
- [ ] Future: AllTransit API integration (paid)

### Phase 6: Air Quality ✅ COMPLETE
- [x] Integrate EPA AQS API
- [x] Import AQI data (healthy days %, good days %, hazardous days)
- [x] Add air quality to quality of life section

### Phase 7: Additional QoL APIs ✅ COMPLETE
- [x] FCC Broadband Map (fiber coverage, provider count)
- [x] NCES Education (student-teacher ratio, graduation rates)
- [x] HRSA Healthcare (physicians per capita, shortage areas)

### Phase 8: Cost of Living ✅ COMPLETE
- [x] BEA Regional Price Parities (housing, goods, services)
- [x] BEA Personal Income (state taxes)
- [x] Persona-based scoring (renter/owner/buyer × standard/local/retiree)

### Phase 9: Cultural Data ✅ COMPLETE
- [x] MIT Election Lab county-level presidential results
- [x] ARDA religious congregation data
- [x] Political and religious preference matching

---

## API Key Management

Future API keys should be stored in environment variables:

```env
# .env.local (not committed)
CENSUS_API_KEY=your_key_here
FBI_API_KEY=your_key_here
WALKSCORE_API_KEY=your_key_here
EPA_API_KEY=your_key_here
```

---

## Data Freshness Goals

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
