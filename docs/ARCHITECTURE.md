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
1. **Scoring cities** across 6 major categories (Climate, Cost, Demographics, QoL, Values, Entertainment)
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
├── scripts/                   # CLI utilities (run directly, no dev server needed)
│   ├── add-city.ts            # Add new city workflow (with auto-discovery)
│   ├── admin.ts               # Admin CLI for all data pulls
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
│   │   │   ├── AdvancedPreferences.tsx  # Shell that imports sections
│   │   │   ├── QuickStart.tsx
│   │   │   └── sections/      # ⭐ Decomposed preference sections
│   │   │       ├── ClimatePreferences.tsx
│   │   │       ├── CostPreferences.tsx
│   │   │       ├── DemographicsPreferences.tsx
│   │   │       ├── QualityOfLifePreferences.tsx
│   │   │       ├── ValuesPreferences.tsx      # Political + Religious alignment
│   │   │       └── EntertainmentPreferences.tsx  # Nightlife, arts, dining, sports, recreation
│   │   ├── rankings/          # City ranking display
│   │   ├── city/              # City detail components
│   │   ├── comparison/        # City comparison tools
│   │   ├── charts/            # Visualization components
│   │   └── ui/                # shadcn/ui primitives
│   │
│   ├── lib/
│   │   ├── scoring.ts         # Re-exports from scoring/ (backward compat)
│   │   ├── scoring/           # ⭐ Modular scoring system
│   │   │   ├── index.ts       # Main entry + calculateScores()
│   │   │   ├── constants.ts   # Range constants (climate, QoL, etc.)
│   │   │   ├── utils.ts       # normalizeToRange, toPercentileScore, etc.
│   │   │   ├── types.ts       # QoLPercentiles interface + cache
│   │   │   ├── climate.ts     # Climate scoring (NOAA-based)
│   │   │   ├── cost.ts        # Cost of living scoring (BEA)
│   │   │   ├── demographics.ts # Demographics + dating scoring
│   │   │   ├── quality-of-life.ts  # QoL scoring (walk, safety, etc.)
│   │   │   ├── values.ts      # Values scoring (political, religious)
│   │   │   ├── entertainment.ts # Entertainment scoring (nightlife, arts, dining, sports, recreation)
│   │   │   └── display.ts     # getGrade, getScoreColor, etc.
│   │   ├── cost-of-living.ts  # Cost calculations with personas
│   │   ├── store.ts           # Zustand preference store
│   │   ├── db.ts              # Prisma client
│   │   └── admin/
│   │       ├── helpers.ts     # Admin validation, data directory utils
│   │       └── pulls/         # ⭐ Shared data pull modules (CLI + API)
│   │           ├── census.ts  # Census ACS demographics
│   │           ├── bea.ts     # BEA economic data
│   │           ├── climate.ts # NOAA ACIS + Open-Meteo
│   │           └── qol.ts     # FBI, EPA, FCC, NCES, HRSA
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

### Module Structure

The scoring system is decomposed into category-specific modules in `src/lib/scoring/`:

```
src/lib/scoring/
├── index.ts           # Main entry: calculateScores() + re-exports
├── constants.ts       # CLIMATE_RANGES, QOL_RANGES, etc.
├── utils.ts           # normalizeToRange, toPercentileScore, urbanAmenityScore
├── types.ts           # QoLPercentiles interface + cache management
├── climate.ts         # calculateClimateScore() - NOAA-based
├── cost.ts            # calculateCostScore() - BEA + personas
├── demographics.ts    # calculateDemographicsScore() + dating
├── quality-of-life.ts # calculateQualityOfLifeScore() - walk, safety, etc.
├── values.ts          # calculateValuesScore() - political + religious alignment
├── entertainment.ts   # calculateEntertainmentScore() - nightlife, arts, dining, sports, recreation
└── display.ts         # getGrade(), getScoreColor(), getScoreLabel()
```

The original `src/lib/scoring.ts` re-exports everything for backward compatibility.

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
│     + QoL × W₄ + Entertainment × W₅ + Values × W₆)             │
│     / (W₁ + W₂ + W₃ + W₄ + W₅ + W₆)                            │
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
         ├── Quality of Life Score (0-100) - Infrastructure metrics
         │   ├── Walkability weight × (walk + transit + bike scores)
         │   ├── Safety weight × crime score (inverted)
         │   ├── Air quality weight × healthy days score
         │   ├── Broadband weight × fiber coverage score
         │   ├── Education weight × student-teacher ratio (inverted)
         │   └── Healthcare weight × physicians score
         │
         ├── Values Score (0-100) - "Do I belong here?" (SUBJECTIVE)
         │   ├── Political alignment (Gaussian decay model)
         │   │   ├── 80% Alignment score (distance-based)
         │   │   └── 20% Civic health score (voter turnout)
         │   ├── Religious tradition presence weight × score
         │   └── Religious diversity weight × score
         │
         └── Entertainment Score (0-100) - "Is it fun?" (OBJECTIVE)
             ├── Nightlife weight × bars/clubs score (log curve)
             ├── Arts weight × museums/theaters score (log curve)
             ├── Dining weight × restaurants/cuisine diversity score
             ├── Sports weight × pro teams count score
             └── Recreation weight × (trails + parks + beach + mountains)
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

4. **Gaussian Decay** (`calculateValuesScore` - political): Continuous distance-based decay
   ```typescript
   // Alignment score uses Gaussian decay: 100 × e^(-k × distance²)
   // k scales with user's importance setting (1.0 to 3.0)
   alignmentScore = 100 * Math.exp(-k * distance * distance)
   ```

### Political Scoring Model ("Elastic Band") - Values Category

The political scoring algorithm uses a psychologically-informed "Elastic Band" model that addresses two common problems in preference matching:

**Problem 1: Saturation** - Additive bonuses (e.g., +10 for high turnout) can push scores above 100, erasing distinctions between "perfect match" and "okay match".

**Problem 2: Discontinuity** - Hard splits between "same side" and "opposite side" create unrealistic cliffs at the political center. A moderate Democrat (0.1) would see a huge score drop between a slight Democrat (0.05) and a slight Republican (-0.05), even though they're nearly identical politically.

**Solution: Gaussian Decay with Weighted Components**

```
┌─────────────────────────────────────────────────────────────────┐
│  Political Score = (Alignment × 0.8) + (Turnout × 0.2)          │
│                                                                 │
│  Where:                                                         │
│    Alignment = 100 × e^(-k × distance²) × tribalPenalty         │
│    Turnout = normalizeToRange(voterTurnout, 40%, 80%)           │
│    k = 1.0 + (userImportance / 50)  // Range: 1.0 to 3.0        │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**

1. **Continuous decay** - No cliff at zero; score drops smoothly based on distance
2. **Importance affects curve shape** - Higher importance = steeper Gaussian (more sensitive to small differences)
3. **Tribal penalty only for partisans** - Users with |targetPI| ≥ 0.3 (strong-dem/strong-rep) get 15% penalty for crossing party lines; moderates only get 5% penalty
4. **Weighted turnout** - Prevents saturation; mathematically impossible to exceed 100

**Example Scores: Lean Dem (0.2), Important (weight 70)**

| City | PI | Distance | Alignment | Tribal | Turnout | Final |
|------|-----|----------|-----------|--------|---------|-------|
| San Francisco | 0.72 | 0.52 | 53 | — | 88 | 60 |
| Las Vegas | 0.01 | 0.19 | 92 | — | 53 | 84 |
| Oklahoma City | -0.17 | 0.37 | 72 | ×0.95 | 45 | 64 |

The intuition: A "Lean Dem" finds OKC (slight Republican) almost as acceptable as SF (strong Democrat) because **distance matters more than party label** for moderates.

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

**Note**: API routes use async file I/O (`fs/promises`) and load JSON files in parallel via `Promise.all()` for optimal performance.

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

### Architecture

Data pulls are implemented as shared modules in `src/lib/admin/pulls/` that can be used by both:
- **CLI** (`scripts/admin.ts`) - Direct execution, no server required
- **API routes** (`src/app/api/admin/`) - HTTP endpoints for admin panel

This design ensures consistent behavior and avoids code duplication.

### Initial Setup

```bash
# 1. Set up database
npx prisma migrate dev

# 2. Seed database with city definitions
npm run db:seed

# 3. Pull all data (requires API keys in .env)
npx tsx scripts/admin.ts all
```

### CLI Commands

All data pulls work directly from the CLI without starting a dev server:

```bash
# Pull all data sources
npx tsx scripts/admin.ts all --verbose

# Individual pulls
npx tsx scripts/admin.ts census    # Census ACS demographics
npx tsx scripts/admin.ts bea       # BEA cost of living data
npx tsx scripts/admin.ts climate   # NOAA ACIS + Open-Meteo climate
npx tsx scripts/admin.ts zillow    # Zillow home prices
npx tsx scripts/admin.ts qol       # All QoL data (crime, air, broadband, education, health)
npx tsx scripts/admin.ts cultural  # Political/religious data
npx tsx scripts/admin.ts recreation # Recreation data
npx tsx scripts/admin.ts urbanlife # Urban lifestyle data
npx tsx scripts/admin.ts refresh   # Re-seed database from JSON
```

### Adding a New City

```bash
# Auto-discovery mode (recommended) - fetches data from external APIs
npx tsx scripts/add-city.ts --auto-discover --city="Phoenix" --state="AZ"

# Interactive mode - prompts for fields, offers auto-discovery
npx tsx scripts/add-city.ts --interactive

# Config file mode
npx tsx scripts/add-city.ts --config=phoenix.json
```

#### Auto-Discovery APIs

The add-city script integrates with external APIs to automatically discover:

| Data | API Source | Key Required |
|------|------------|--------------|
| Coordinates | OpenStreetMap Nominatim | No |
| Census Place FIPS | Census Bureau Geocoder | No |
| NOAA Station | NOAA Weather.gov API | No |
| BEA MSA Code | BEA Regional API | Yes (`BEA_API_KEY`) |
| Sports Teams | Wikidata SPARQL | No |

Built-in validation includes coordinate boundary checks, reverse geocoding verification, and sports team validation against known franchises.

See `docs/ADDING-CITIES.md` for detailed instructions.

### Data Refresh Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                     Data Refresh Flow                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Admin triggers pull (CLI preferred, or Admin Panel)       │
│     ├── CLI: npx tsx scripts/admin.ts {source}               │
│     └── API: POST /api/admin/{source}-pull                    │
│                                                               │
│  2. Shared pull module fetches from external source           │
│     └── src/lib/admin/pulls/{source}.ts                       │
│         └── Census API, BEA API, NOAA ACIS, etc.             │
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

3. **Add scoring logic** in the appropriate category file under `src/lib/scoring/`:
   ```typescript
   // Example: src/lib/scoring/quality-of-life.ts
   if (prefs.newMetricWeight > 0 && qol.newMetric?.value !== null) {
     const score = normalizeToRange(qol.newMetric.value, MIN, MAX, inverted);
     totalScore += score * prefs.newMetricWeight;
     totalWeight += prefs.newMetricWeight;
   }
   ```

4. **Add preference controls** in `src/types/preferences.ts` and the appropriate section component in `src/components/preferences/sections/`

5. **Add to score breakdown** in `src/components/city/ScoreBreakdown.tsx`

### Adding a New Scoring Category

1. Add to `UserPreferences.weights` in `src/types/preferences.ts`
2. Create `src/lib/scoring/new-category.ts` with `calculateNewCategoryScore()`
3. Export from `src/lib/scoring/index.ts` and integrate into `calculateScores()`
4. Create `src/components/preferences/sections/NewCategoryPreferences.tsx`
5. Add to `AdvancedPreferences.tsx` as a new collapsible section
6. Add breakdown analysis in `ScoreBreakdown.tsx`

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
| Pull Census data | `npx tsx scripts/admin.ts census` |
| Pull climate data | `npx tsx scripts/admin.ts climate` |
| Pull QoL data | `npx tsx scripts/admin.ts qol` |
| Add city (auto) | `npx tsx scripts/add-city.ts -a --city="Name" --state="ST"` |
| Add city (interactive) | `npx tsx scripts/add-city.ts -i` |
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
