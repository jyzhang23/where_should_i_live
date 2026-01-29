# Changelog

All notable changes to the Cities App project.

## [Unreleased]

### Architecture Improvements
- **Database Schema Cleanup**: Removed 14 deprecated columns from `CityMetrics` table
  - Demographics, QoL, Cost, and Political data now sourced from `metrics.json`
  - Only climate data and sports teams remain in database
  - See `docs/ARCHITECTURE-REVIEW.md` for rationale

- **City ID Consistency**: Added `slug` field to City table
  - Matches JSON file IDs (e.g., `san-francisco`)
  - Simplifies API layer by eliminating name-to-slug conversions

- **Data Flow Documentation**: Created `docs/ARCHITECTURE-REVIEW.md`
  - Documents JSON vs PostgreSQL decision
  - Maps data sources and flow
  - Identifies remaining technical debt

### Code Quality
- **Admin Logger**: Added `src/lib/admin-logger.ts` utility
  - Structured logging with timestamps and source context
  - Supports info, warn, error, debug levels
  - Migrated `bea-pull` and `cultural-pull` routes

- **Orphaned Files Cleanup**: Removed unused files
  - `scripts/add-bea-geofips.ts`
  - `style-preview.html`
  - `src/types/index.ts`

- **Script Sync**: Updated `scripts/seed.ts` to match `refresh/route.ts`
  - Both now use simplified schema (climate + sports only)

### Features
- **Score Breakdown Dialog**: "Why does my city suck" feature
  - Click any score card to see detailed factor analysis
  - Shows strengths, concerns, and issues with explanations
  - Color-coded indicators for each factor

- **Pre-push Hook**: TypeScript type checking before push
  - Prevents production build failures from type errors
  - Located at `.git/hooks/pre-push`

### Bug Fixes
- Fixed score label inconsistency (e.g., "Average" with "F" grade)
  - Aligned `getScoreLabel` thresholds with `getGrade` function

---

## Data Sources

| Source | API/Dataset | Data |
|--------|-------------|------|
| BEA | Regional Price Parities | Cost of living, purchasing power |
| Census | ACS 5-Year Estimates | Demographics, diversity |
| NOAA | ACIS + Open-Meteo | Climate normals |
| EPA | Air Quality System | AQI statistics |
| FBI | Crime Data Explorer | Crime rates |
| FCC | Broadband Map | Internet availability |
| HRSA | Health Resources | Healthcare access |
| NCES | Education Statistics | School quality |
| Walk Score | API | Walkability scores |
| Zillow | ZHVI | Home price history |
| MIT Election Lab | County Returns | Political data |
| ARDA | Religion Census | Religious composition |
