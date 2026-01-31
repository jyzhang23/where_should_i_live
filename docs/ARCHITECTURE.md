# Architecture Documentation

> **Where Should I Live** - A city comparison and ranking tool that helps users find their ideal city based on personalized preferences across climate, cost of living, demographics, quality of life, and cultural factors.

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Data Architecture](#data-architecture)
5. [Scoring System](#scoring-system)
6. [State Management](#state-management)
7. [API Reference](#api-reference)
8. [Data Pipeline](#data-pipeline)
9. [Adding New Features](#adding-new-features)

---

## Overview

### Product Purpose

This application helps users find their ideal city to live in by:
1. **Scoring cities** across 5 major categories (Climate, Cost, Demographics, QoL, Cultural)
2. **Personalizing rankings** based on user-defined weights and preferences
3. **Providing detailed breakdowns** of what makes each city score high or low
4. **Comparing cities** side-by-side with radar charts and metrics tables

### Key Design Principles

- **Client-side scoring**: All scoring calculations happen in the browser for instant feedback
- **No user accounts**: Preferences stored in localStorage (exportable as JSON)
- **Data-driven**: Metrics sourced from authoritative government APIs (Census, BEA, NOAA, FBI, etc.)
- **Percentile-based normalization**: Scores represent position relative to U.S. geographic extremes

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix primitives) |
| State Management | Zustand (with localStorage persistence) |
| Database | PostgreSQL (via Prisma ORM) |
| Charts | Recharts |
| Hosting | Vercel |

---

## Project Structure

```
cities-app/
├── data/                      # Static data files
│   ├── cities.json            # City definitions (name, state, IDs)
│   ├── metrics.json           # All city metrics (climate, census, qol, etc.)
│   ├── zhvi-history.json      # Zillow home price history
│   └── sources/               # Manually curated data
│       ├── cultural-data.json
│       ├── recreation-data.json
│       └── urbanlife-data.json
│
├── prisma/
│   └── schema.prisma          # Database schema
│
├── scripts/                   # CLI utilities
│   ├── add-city.ts            # Add new city workflow
│   ├── admin.ts               # Admin CLI for data pulls
│   ├── seed.ts                # Database seeding
│   ├── fetch-walkscore.ts     # Walk Score scraper
│   ├── collect-lifestyle-data.ts  # Collect recreation/urban data from OSM & USGS
│   ├── process-city-images.ts # Process raw photos for City Tinder
│   ├── test-normalization.ts  # Test scoring normalization
│   ├── validate-data.ts       # Validate metrics.json data
│   └── verify-city-data.ts    # Verify city data completeness
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # Main dashboard
│   │   ├── city/[id]/         # Individual city pages
│   │   ├── help/              # Help/FAQ page
│   │   └── api/               # API routes
│   │       ├── cities/        # Public city data API
│   │       └── admin/         # Protected admin APIs
│   │
│   ├── components/
│   │   ├── preferences/       # User preference controls
│   │   │   ├── BasicPreferences.tsx
│   │   │   ├── AdvancedPreferences.tsx
│   │   │   └── QuickStart.tsx
│   │   ├── rankings/          # City ranking display
│   │   ├── city/              # City detail components
│   │   ├── comparison/        # City comparison tools
│   │   ├── charts/            # Visualization components
│   │   └── ui/                # shadcn/ui primitives
│   │
│   ├── lib/
│   │   ├── scoring.ts         # ⭐ Core scoring algorithms
│   │   ├── cost-of-living.ts  # Cost calculations with personas
│   │   ├── store.ts           # Zustand preference store
│   │   └── db.ts              # Prisma client
│   │
│   ├── types/
│   │   ├── city.ts            # City and metrics types
│   │   ├── preferences.ts     # User preference types + defaults
│   │   └── scores.ts          # Scoring result types
│   │
│   └── hooks/
│       ├── useCities.ts       # Fetch all cities
│       └── useCity.ts         # Fetch single city
│
└── docs/
    ├── ARCHITECTURE.md        # This file
    ├── ADDING-CITIES.md       # How to add new cities
    ├── ADMIN.md               # Admin operations guide
    └── TODO.md                # Feature backlog
```

---

## Data Architecture

### Data Sources

| Category | Source | API/Method | Update Frequency |
|----------|--------|------------|------------------|
| **Climate** | NOAA ACIS | `climate-pull` | Annual |
| **Cost of Living** | BEA Regional Data | `bea-pull` | Quarterly |
| **Home Prices** | Zillow ZHVI | `zillow-pull` | Monthly |
| **Demographics** | US Census ACS | `census-pull` | Annual |
| **Walkability** | WalkScore.com | `walkscore-pull` | As needed |
| **Crime** | FBI UCR | `fbi-crime-pull` | Annual |
| **Air Quality** | EPA AQS | `epa-air-pull` | Annual |
| **Broadband** | FCC Form 477 | `fcc-broadband-pull` | Annual |
| **Education** | NCES | `nces-education-pull` | Annual |
| **Healthcare** | HRSA | `hrsa-health-pull` | Annual |
| **Political** | Election Results | `cultural-pull` | After elections |
| **Urban Lifestyle** | Manual curation | `urbanlife-pull` | As needed |
| **Recreation** | Manual curation | `recreation-pull` | As needed |

### Data Storage

```
┌─────────────────────────────────────────────────────────────┐
│                     data/metrics.json                        │
│  (Primary data store - all metrics by city slug)             │
├─────────────────────────────────────────────────────────────┤
│  {                                                           │
│    "cities": {                                               │
│      "austin": {                                             │
│        "bea": { purchasingPower, regionalPriceParity, ... }, │
│        "census": { population, diversity, income, ... },     │
│        "climate": { noaa: { comfort, extremes, ... } },      │
│        "qol": { walkability, crime, air, health, ... },      │
│        "cultural": { political, religious, urbanLife }       │
│      },                                                      │
│      "boston": { ... },                                      │
│      ...                                                     │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
         │
         │ Merged at runtime via /api/cities
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Prisma)                        │
│  - City table (id, name, state, slug)                        │
│  - CityMetrics table (sports teams, airport code, etc.)      │
│  - DataRefreshLog (audit trail for admin pulls)              │
└─────────────────────────────────────────────────────────────┘
```

### Key Data Types

**CensusDemographics** (from Census ACS 5-Year):
- Population, median age, age brackets
- Race/ethnicity percentages + diversity index
- Education levels (HS, Bachelor's, Graduate)
- Income (median household, per capita, poverty rate)
- Gender ratios by age bracket (for dating feature)
- Never-married percentages

**NOAAClimateData** (from NOAA ACIS):
- Comfort days (65-80°F), extreme heat days, freeze days
- Rain days, snow days, cloudy days
- Humidity (July dewpoint)
- Heating/cooling degree days
- Growing season length

**QoLMetrics** (from multiple APIs):
- Walkability (Walk Score, Transit Score, Bike Score)
- Crime (violent crime rate per 100K)
- Air quality (healthy days percentage)
- Broadband (fiber coverage %)
- Education (student-teacher ratio)
- Healthcare (physicians per 100K)
- Recreation (trail miles, park acres, elevation)

**BEAMetrics** (from Bureau of Economic Analysis):
- Regional Price Parity (cost index by category)
- Per capita income and disposable income
- Tax burden breakdown

---

## Scoring System

### Philosophy

Scores are **relative to U.S. geographic extremes**, not absolute values:
- **50** = National average
- **0-100** = Percentile position between worst and best U.S. cities
- Higher is always better (inverted for negative metrics like crime)

### Category Scores

```
┌────────────────────────────────────────────────────────────────┐
│                     TOTAL SCORE                                 │
│  = (Climate × W₁ + Cost × W₂ + Demographics × W₃               │
│     + QoL × W₄ + Cultural × W₅) / (W₁ + W₂ + W₃ + W₄ + W₅)    │
└────────────────────────────────────────────────────────────────┘
         │
         ├── Climate Score (0-100)
         │   ├── Comfort days weight × score
         │   ├── Extreme heat weight × score (inverted)
         │   ├── Freeze days weight × score (inverted)
         │   ├── Rain/snow days weights × scores
         │   ├── Cloudy days weight × score (inverted)
         │   ├── Humidity weight × score (inverted)
         │   └── Growing season, stability weights × scores
         │
         ├── Cost Score (0-100)
         │   └── True Purchasing Power = Income / (RPP / 100)
         │       ├── Income varies by persona (standard, local-earner, retiree)
         │       └── RPP varies by housing (renter, homeowner, buyer)
         │
         ├── Demographics Score (0-100)
         │   ├── Population minimum threshold
         │   ├── Diversity index weight × score
         │   ├── Age preference weight × score
         │   ├── Education weight × score
         │   ├── Foreign-born weight × score
         │   ├── Minority community presence (log curve)
         │   ├── Economic health (income, poverty)
         │   └── Dating Favorability (if enabled)
         │       ├── Pool Score (40%): gender ratio + never-married %
         │       ├── Economic Score (30%): disposable income
         │       ├── Alignment Score (20%): political match
         │       └── Safety Score (10%): walkability + crime
         │
         ├── Quality of Life Score (0-100)
         │   ├── Walkability weight × (walk + transit + bike scores)
         │   ├── Safety weight × crime score (inverted)
         │   ├── Air quality weight × healthy days score
         │   ├── Broadband weight × fiber coverage score
         │   ├── Education weight × student-teacher ratio (inverted)
         │   ├── Healthcare weight × physicians score
         │   └── Recreation weight × (trails + parks + elevation)
         │
         └── Cultural Score (0-100)
             ├── Political alignment weight × match score
             ├── Religious diversity weight × score
             └── Urban lifestyle weight × (nightlife + arts + dining + sports)
```

### Normalization Methods

1. **Range-based** (`normalizeToRange`): Maps value to 0-100 based on U.S. min/max
   ```typescript
   // Example: Comfort days range from 50 (Buffalo) to 280 (San Diego)
   normalizeToRange(200, 50, 280, false) // → 65
   ```

2. **Percentile-based** (`toPercentileScore`): Rank among all cities in dataset
   ```typescript
   // Example: Walk Score 85 when dataset has scores [40, 55, 70, 85, 95]
   toPercentileScore(85, [40, 55, 70, 85, 95], true) // → 60 (60th percentile)
   ```

3. **Logarithmic "Critical Mass"** (`urbanAmenityScore`): Diminishing returns curve
   ```typescript
   // Example: 30 bars/10K is "enough" - more provides marginal benefit
   urbanAmenityScore(50, 2, 30, 80) // → ~82 (above plateau, into diminishing returns)
   ```

---

## State Management

### Zustand Store (`src/lib/store.ts`)

```typescript
interface PreferencesState {
  preferences: UserPreferences;
  setPreferences: (preferences: UserPreferences) => void;
  updateWeight: (key: keyof Weights, value: number) => void;
  updateAdvanced: (category, key, value) => void;
  resetToDefaults: () => void;
  exportPreferences: () => string;
  importPreferences: (json: string) => boolean;
}
```

### Persistence

- **Storage**: `localStorage` with key `"city-preferences"`
- **Migration**: New preference fields are auto-merged with defaults
- **Export/Import**: JSON format for sharing preferences

### Data Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Preference UI   │────▶│  Zustand Store   │────▶│  localStorage    │
│  (Sliders, etc.) │     │  (in memory)     │     │  (persistence)   │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  calculateScores()       │
                    │  (client-side, instant)  │
                    └──────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  RankingTable / Charts   │
                    │  (React re-render)       │
                    └──────────────────────────┘
```

---

## API Reference

### Public APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cities` | GET | Returns all cities with merged metrics |
| `/api/cities/[id]` | GET | Returns single city with full metrics |

### Admin APIs (Password Protected)

| Endpoint | Description |
|----------|-------------|
| `/api/admin/census-pull` | Pull Census ACS demographics |
| `/api/admin/bea-pull` | Pull BEA economic data |
| `/api/admin/climate-pull` | Pull NOAA climate data |
| `/api/admin/zillow-pull` | Pull Zillow home prices |
| `/api/admin/walkscore-pull` | Scrape Walk Score data |
| `/api/admin/fbi-crime-pull` | Pull FBI crime statistics |
| `/api/admin/epa-air-pull` | Pull EPA air quality data |
| `/api/admin/fcc-broadband-pull` | Pull FCC broadband data |
| `/api/admin/nces-education-pull` | Pull NCES education data |
| `/api/admin/hrsa-health-pull` | Pull HRSA healthcare data |
| `/api/admin/cultural-pull` | Pull political/religious data |
| `/api/admin/recreation-pull` | Sync recreation data from sources |
| `/api/admin/urbanlife-pull` | Sync urban lifestyle data |
| `/api/admin/refresh` | Re-seed database from JSON files |

**Authentication**: POST with `{ "password": "<ADMIN_PASSWORD>" }`

---

## Data Pipeline

### Initial Setup

```bash
# 1. Set up database
npx prisma migrate dev

# 2. Seed database with city definitions
npm run db:seed

# 3. Pull all data (requires API keys in .env)
npx tsx scripts/admin.ts all
```

### Adding a New City

```bash
# Interactive workflow
npx tsx scripts/add-city.ts --city="City Name, ST"

# This will:
# 1. Add city to cities.json with FIPS codes
# 2. Pull all metrics from APIs
# 3. Re-seed database
```

See `docs/ADDING-CITIES.md` for detailed instructions.

### Data Refresh Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                     Data Refresh Flow                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Admin triggers pull (CLI or Admin Panel)                  │
│     └── POST /api/admin/{source}-pull                         │
│                                                               │
│  2. API fetches from external source                          │
│     └── Census API, BEA API, NOAA ACIS, etc.                  │
│                                                               │
│  3. Data written to data/metrics.json                         │
│     └── Keyed by city slug (e.g., "san-francisco")            │
│                                                               │
│  4. Refresh logged to database                                │
│     └── DataRefreshLog table for audit trail                  │
│                                                               │
│  5. Optional: Re-seed database                                │
│     └── npm run db:seed (syncs metrics.json → Prisma)         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Adding New Features

### Adding a New Metric

1. **Define the type** in `src/types/city.ts`:
   ```typescript
   export interface QoLMetrics {
     // ... existing
     newMetric?: {
       value: number | null;
       source: string;
     };
   }
   ```

2. **Create admin pull API** in `src/app/api/admin/new-pull/route.ts`

3. **Add scoring logic** in `src/lib/scoring.ts`:
   ```typescript
   function calculateQualityOfLifeScore(city, preferences) {
     // Add weight check and calculation
     if (prefs.newMetricWeight > 0 && qol.newMetric?.value !== null) {
       const score = normalizeToRange(qol.newMetric.value, MIN, MAX, inverted);
       totalScore += score * prefs.newMetricWeight;
       totalWeight += prefs.newMetricWeight;
     }
   }
   ```

4. **Add preference controls** in `src/types/preferences.ts` and `src/components/preferences/AdvancedPreferences.tsx`

5. **Add to score breakdown** in `src/components/city/ScoreBreakdown.tsx`

### Adding a New Scoring Category

1. Add to `UserPreferences.weights` in `src/types/preferences.ts`
2. Create `calculateNewCategoryScore()` in `src/lib/scoring.ts`
3. Integrate into `calculateScores()` weighted average
4. Add UI controls in `BasicPreferences.tsx` and `AdvancedPreferences.tsx`
5. Add breakdown analysis in `ScoreBreakdown.tsx`

### Adding a New Data Source

1. Research the API and document in `docs/DATA-SOURCES.md`
2. Create pull route in `src/app/api/admin/{source}-pull/route.ts`
3. Add FIPS or identifier mapping to `data/cities.json` if needed
4. Add to `scripts/admin.ts` for CLI access
5. Update `docs/ADDING-CITIES.md` with new identifier requirements

---

## Development Guidelines

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Prefer explicit types over `any`
- Use `null` for missing data, not `undefined`

### Scoring Principles

1. **50 is average**: All scores center on 50 as national average
2. **Higher is better**: Invert negative metrics (crime, costs, etc.)
3. **Null-safe**: Missing data should not crash scoring
4. **Weight-gated**: Only include factors when weight > 0

### Testing Scores

```bash
# Run normalization test suite
npx tsx scripts/test-normalization.ts
```

### Common Tasks

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Seed database | `npm run db:seed` |
| Pull all data | `npx tsx scripts/admin.ts all` |
| Add city | `npx tsx scripts/add-city.ts --city="Name, ST"` |
| Validate data | `npx tsx scripts/validate-data.ts` |
| Verify city | `npx tsx scripts/verify-city-data.ts [cityId]` |
| Test scoring | `npx tsx scripts/test-normalization.ts` |
| Process images | `npx tsx scripts/process-city-images.ts` |
| Collect lifestyle data | `npx tsx scripts/collect-lifestyle-data.ts` |

---

## Glossary

| Term | Definition |
|------|------------|
| **FIPS** | Federal Information Processing Standards - numeric codes for states/counties/places |
| **ACS** | American Community Survey (Census Bureau annual demographic survey) |
| **BEA** | Bureau of Economic Analysis (economic data) |
| **RPP** | Regional Price Parity (cost of living index, 100 = national average) |
| **ZHVI** | Zillow Home Value Index (median home price estimate) |
| **Walk Score** | 0-100 score measuring walkability based on amenity proximity |
| **Percentile** | Position in distribution (0 = lowest, 100 = highest) |
| **Slug** | URL-safe city identifier (e.g., "san-francisco") |
