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

**Demographics:**
- Metro population
- Diversity index
- East Asian population percentage

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

### Priority 2: Demographics

#### US Census Bureau API

**URL:** https://api.census.gov/data.html

**Available Data:**
- American Community Survey (ACS) - 5-year estimates
- Population demographics
- Income statistics
- Education levels
- Commute times
- Housing characteristics

**Key Endpoints:**
```
# Population by race/ethnicity
https://api.census.gov/data/2022/acs/acs5?get=B02001_001E,B02001_002E&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:*

# Median household income
https://api.census.gov/data/2022/acs/acs5?get=B19013_001E&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:*
```

**Integration Approach:**
- Request API key (free)
- Query by MSA (Metropolitan Statistical Area)
- Map MSA codes to city names
- Update annually

**Cost:** Free (requires API key)

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

### Priority 5: Quality of Life Scores

#### Walk Score API

**URL:** https://www.walkscore.com/professional/api.php

**Available Data:**
- Walk Score (0-100)
- Transit Score (0-100)
- Bike Score (0-100)

**Endpoint:**
```
GET http://api.walkscore.com/score?
    format=json&
    address={address}&
    lat={lat}&lon={lon}&
    wsapikey={key}
```

**Cost:** Free tier (5,000 requests/day), paid plans available

**Integration Approach:**
- Request API key
- Query by city center coordinates
- Update quarterly

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

### Phase 2: Census Integration
- [ ] Obtain Census API key
- [ ] Map MSA codes to cities
- [ ] Import demographic data
- [ ] Add new demographic metrics to schema

### Phase 3: Crime Data
- [ ] Obtain FBI API key
- [ ] Import crime statistics
- [ ] Add crime trend visualization

### Phase 4: Weather Integration
- [ ] Integrate Open-Meteo or NWS
- [ ] Import climate normals
- [ ] Add seasonal weather breakdown

### Phase 5: Real-time Scores
- [ ] Obtain Walk Score API key
- [ ] Update walkability metrics
- [ ] Add bike score to metrics

### Phase 6: Air Quality
- [ ] Obtain EPA API key
- [ ] Import AQI data
- [ ] Add air quality to quality of life section

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

| Data Type | Current | Target | Update Frequency |
|-----------|---------|--------|------------------|
| Home Prices | Static | Automated | Monthly |
| Demographics | Static | Automated | Annually |
| Crime Rates | Static | Automated | Annually |
| Weather/Climate | Static | Automated | On change (rare) |
| Walk/Transit Scores | Static | Automated | Quarterly |
| Air Quality | N/A | New | Daily/Weekly |
