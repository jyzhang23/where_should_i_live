# Updating City Data

This document covers data freshness and refresh procedures for all data sources in the Cities App.

> **Related Docs:**
> - [DATA-SOURCES.md](./DATA-SOURCES.md) - API documentation and data source details
> - [ADDING-CITIES.md](./ADDING-CITIES.md) - Adding new cities to the system
> - [ADMIN.md](./ADMIN.md) - CLI commands and admin operations

## Table of Contents

1. [Refresh Schedule Overview](#refresh-schedule-overview)
2. [Automated Data Pulls](#automated-data-pulls)
3. [Manual Data Sources](#manual-data-sources)
4. [Fallback Data & Overrides](#fallback-data--overrides)
5. [Known API Gaps](#known-api-gaps)
6. [Refresh Procedures](#refresh-procedures)
7. [Data Validation](#data-validation)

---

## Refresh Schedule Overview

| Data Source | Update Frequency | Method | Priority |
|-------------|-----------------|--------|----------|
| **Census ACS** | Annual (Dec) | CLI: `census` | High |
| **BEA Cost of Living** | Annual (Q4) | CLI: `bea` | High |
| **Zillow ZHVI** | Monthly | Manual CSV | Medium |
| **Climate (NOAA)** | Rarely | CLI: `climate` | Low |
| **FBI Crime** | Annual | CLI: `qol` | Medium |
| **EPA Air Quality** | Annual | CLI: `qol` | Medium |
| **Walk/Bike/Transit** | Annual | Script: `fetch-walkscore.ts` | Medium |
| **FCC Broadband** | Annual | CLI: `qol` | Low |
| **NCES Education** | Annual | CLI: `qol` | Low |
| **HRSA Healthcare** | Annual | CLI: `qol` | Low |
| **Urban Lifestyle (OSM)** | As needed | CLI: `urbanlife` | Low |
| **Political Data** | After elections | CLI: `cultural` | Medium |
| **Religious Data** | Static (5-year) | CLI: `cultural` | Low |
| **Recreation** | As needed | CLI: `recreation` | Low |

### Recommended Annual Refresh Schedule

| Month | Data Sources to Refresh |
|-------|------------------------|
| **January** | Walk Score (manual), Transit Score (manual) |
| **February** | Political data (if election year) |
| **March** | FBI Crime (prior year released) |
| **April** | EPA Air Quality |
| **May** | FCC Broadband |
| **June** | NCES Education, HRSA Healthcare |
| **Monthly** | Zillow ZHVI (if tracking trends) |
| **December** | Census ACS (new 5-year estimates), BEA RPP |

---

## Automated Data Pulls

### Running All Pulls

```bash
cd cities-app
npx tsx scripts/admin.ts all --verbose
```

This runs all automated data pulls in sequence. Takes 5-10 minutes.

### Individual Data Pulls

```bash
# Demographics (Census ACS)
npx tsx scripts/admin.ts census

# Cost of Living (BEA)
npx tsx scripts/admin.ts bea

# Climate (NOAA + Open-Meteo)
npx tsx scripts/admin.ts climate

# Quality of Life (FBI, EPA, FCC, NCES, HRSA)
npx tsx scripts/admin.ts qol

# Urban Lifestyle (loads from source JSON)
npx tsx scripts/admin.ts urbanlife

# Cultural (loads from source JSON)
npx tsx scripts/admin.ts cultural

# Recreation (loads from source JSON)
npx tsx scripts/admin.ts recreation

# Zillow (loads from source JSON after manual download)
npx tsx scripts/admin.ts zillow

# Refresh database from JSON
npx tsx scripts/admin.ts refresh
```

### Required Environment Variables

```bash
# Required
ADMIN_PASSWORD=your-password
DATABASE_URL=postgresql://...

# Optional (for full API access)
BEA_API_KEY=your-key
CENSUS_API_KEY=your-key
FBI_API_KEY=your-key
EPA_EMAIL=your-email
EPA_API_KEY=your-key
```

---

## Manual Data Sources

### 1. Zillow ZHVI (Home Prices)

**Frequency:** Monthly (or quarterly for less volatility)

**Process:**
1. Visit https://www.zillow.com/research/data/
2. Download "ZHVI All Homes (SFR, Condo/Co-op)" → "Metro & U.S."
3. Save to `data/sources/zillow/` (create if needed)
4. Run: `npx tsx scripts/admin.ts zillow`

**Why Manual:** Zillow doesn't provide a public API for bulk data downloads. The CSV is freely available but must be downloaded manually.

**TODO:** Consider automating with a scraper or checking for API access.

### 2. Walk Score / Transit Score / Bike Score

**Frequency:** Annual (January recommended)

**Process:**
```bash
# Fetch all cities (rate-limited, takes ~1 minute per city)
npx tsx scripts/fetch-walkscore.ts

# Fetch single city
npx tsx scripts/fetch-walkscore.ts --city=seattle

# Preview without saving
npx tsx scripts/fetch-walkscore.ts --dry-run
```

**Current State:**
- **All scores** (Walk, Transit, Bike) fetched from walkscore.com via web scraping
- Script validates city pages vs address pages to avoid inflated scores
- URL overrides available for cities with non-standard Walk Score URLs

**Why Script:** Official Walk Score API requires paid tier for commercial use. Web scraping provides the same city-wide averages without cost.

### 3. Urban Lifestyle Data (Nightlife, Dining, Arts)

**Frequency:** As needed (OSM data is relatively stable)

**Process:**
1. Use Overpass Turbo (https://overpass-turbo.eu/) to query OSM
2. Update `data/sources/urbanlife-data.json`
3. Run: `npx tsx scripts/admin.ts urbanlife`

**Example Overpass Query (bars/clubs):**
```
[out:json][timeout:90];
area["name"="San Francisco"]["admin_level"="8"]->.city;
(
  nwr["amenity"="bar"](area.city);
  nwr["amenity"="nightclub"](area.city);
  nwr["amenity"="pub"](area.city);
);
out count;
```

### 4. Political Data

**Frequency:** After elections (presidential every 4 years, midterms every 2)

**Source:** MIT Election Lab (https://electionlab.mit.edu/data)

**Process:**
1. Download county-level results from MIT Election Lab
2. Update `data/sources/cultural-data.json` with new percentages
3. Run: `npx tsx scripts/admin.ts cultural`

---

## Fallback Data & Overrides

### Known Manual Overrides

#### 1. Las Vegas Entertainment Data

**Issue:** The famous Las Vegas Strip is located in Paradise, NV (unincorporated Clark County), not the City of Las Vegas proper. OSM queries for "City of Las Vegas" miss most major venues.

**Override Location:** `data/sources/urbanlife-data.json`

**Current Override:**
```json
"las-vegas": {
  "nightlife": {
    "barsAndClubsPer10K": 2.7,  // Manually adjusted to include Strip
    "totalVenues": 174,
    "lateNightVenues": 28
  }
}
```

**Refresh Note:** When refreshing OSM data, DO NOT overwrite Las Vegas. Query both City of Las Vegas AND Paradise, NV, then combine the results.

#### 2. State-Level Crime Rates (Fallback)

**Issue:** FBI Crime Data Explorer API sometimes returns incomplete city-level data. Falls back to state averages.

**Override Location:** `src/lib/admin/pulls/qol.ts` → `STATE_CRIME_DATA`

**Current State:** Pre-populated with FBI UCR 2022 state-level data.

**Refresh Note:** Update state crime data when new FBI UCR is released (typically March for prior year).

### Fallback Data Flow

```
API Call Attempted
       ↓
  API Success? ──Yes──→ Use API Data
       │
       No
       ↓
  Fallback Data Available? ──Yes──→ Use Fallback
       │
       No
       ↓
  Skip City (logged as warning)
```

---

## Known API Gaps

### Critical Gaps (Need Addressing)

| Gap | Impact | Potential Solutions |
|-----|--------|---------------------|
| **Zillow automated download** | Monthly manual work | 1. Scraper script, 2. Check for API access, 3. Alternative: Redfin data |
| **City-level crime data** | Less accurate (uses state fallback) | 1. FBI API improvements, 2. Local police dept APIs, 3. Third-party aggregators |

### Minor Gaps (Low Priority)

| Gap | Impact | Current Workaround |
|-----|--------|-------------------|
| **Recreation data automation** | Manual OSM queries | Works well, stable data |
| **Religious data freshness** | 5-year-old ARDA data | Religious composition changes slowly |
| **School ratings** | Only basic metrics | Consider GreatSchools API |

### Future API Integrations to Consider

1. **Redfin Data Center** - Alternative to Zillow
   - Cost: Free CSV downloads
   - Benefit: May have easier automation path for home prices

2. **GreatSchools API** - School ratings and reviews
   - Cost: Free for non-commercial
   - Benefit: Better school quality metrics than just ratios

3. **Walk Score Official API** - Currently using web scraping which works well
   - Cost: Paid tier required for commercial use
   - Benefit: More stable than scraping (if scraping breaks)

---

## Refresh Procedures

### Full Data Refresh (All Sources)

**When:** Major version releases, or annually in December/January

```bash
cd cities-app

# 1. Pull all automated data
npx tsx scripts/admin.ts all --verbose

# 2. Manual updates (if due)
# - Download Zillow CSV, run zillow command
# - Update walk score fallback data
# - Check for election data updates

# 3. Validate data
npx tsx scripts/validate-data.ts

# 4. Refresh database
npx tsx scripts/admin.ts refresh

# 5. Test locally
npm run dev
# Check a few cities for reasonable scores
```

### Single Source Refresh

**When:** Source releases new data

```bash
# Example: Census ACS update in December
npx tsx scripts/admin.ts census --verbose

# Verify the update
npx tsx scripts/validate-data.ts --source=census

# Refresh database
npx tsx scripts/admin.ts refresh
```

### Post-Refresh Validation

After any refresh, verify:

1. **No NaN/null scores** - Check city detail pages
2. **Reasonable score distribution** - Top/bottom cities make sense
3. **No regressions** - Compare with previous values if major changes

```bash
# Run validation script
npx tsx scripts/validate-data.ts

# Check for cities with missing data
npx tsx scripts/verify-city-data.ts
```

---

## Data Validation

### Validation Script

```bash
npx tsx scripts/validate-data.ts
```

Checks:
- All cities have required fields
- No NaN or undefined values
- Scores within expected ranges (0-100)
- Date fields are valid
- Cross-references between files are consistent

### Manual Spot Checks

After major refreshes, manually verify:

1. **San Francisco** - High cost, high walkability, high tech demographics
2. **Houston** - Low cost, low walkability, high diversity
3. **Minneapolis** - Cold climate, good QoL metrics
4. **Miami** - Warm climate, high foreign-born, hurricane risk
5. **Las Vegas** - Entertainment data includes Strip venues

### Red Flags to Watch For

| Issue | Possible Cause |
|-------|---------------|
| All scores at 50 | API returned no data, used defaults |
| Negative scores | Calculation bug in normalization |
| Scores > 100 | Missing bounds check |
| Empty crime data | FBI API key expired or rate limited |
| Wrong city population | Census FIPS code mismatch |
| Missing climate data | NOAA station code incorrect |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-03 | Initial document created |
| 2026-01 | Las Vegas entertainment override documented |
| 2025-01 | Transit score fallback data added |
