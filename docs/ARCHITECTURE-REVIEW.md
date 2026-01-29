# Architecture Review

Generated: January 2026

## Executive Summary

The codebase has evolved organically, creating some redundancy and technical debt. The core architecture is sound, but there are opportunities to simplify the data flow and clean up legacy code.

**Key Issues:**
1. Dual storage (JSON files + PostgreSQL) creates complexity
2. 11 deprecated fields in types still in use
3. Multiple data refresh mechanisms doing similar work
4. City ID inconsistency between systems

---

## 1. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA COLLECTION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  External APIs                    Manual Sources                             │
│  ─────────────                    ──────────────                             │
│  • BEA (cost of living)           • cultural-data.json (political/religious) │
│  • Census ACS (demographics)      • recreation-data.json                     │
│  • NOAA/Open-Meteo (climate)      • urbanlife-data.json                      │
│  • EPA (air quality)                                                         │
│  • FBI (crime)                                                               │
│  • FCC (broadband)                                                           │
│  • HRSA (healthcare)                                                         │
│  • NCES (education)                                                          │
│  • Walk Score API                                                            │
│  • Zillow (home prices)                                                      │
│                                                                              │
│                    ↓ Admin Pull Routes (/api/admin/*-pull)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA STORAGE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  JSON Files (Source of Truth)           PostgreSQL (Legacy + ZHVI)           │
│  ─────────────────────────────          ──────────────────────────           │
│  data/cities.json                       City table                           │
│    - City definitions                     - id, name, state                  │
│    - Sports teams                         - regionId, coordinates            │
│    - FIPS codes, NOAA stations                                               │
│                                         CityMetrics table                    │
│  data/metrics.json                        - Legacy fields (deprecated)       │
│    - climate.noaa (30-year normals)       - diversityIndex ⚠️                │
│    - bea (regional price parity)          - walkScore ⚠️                     │
│    - census (ACS demographics)            - crimeRate ⚠️                     │
│    - qol (walkability, crime, etc)        - etc...                           │
│    - cultural (political, religious)                                         │
│                                         ZHVIDataPoint table                  │
│  data/zhvi-history.json                   - Historical home prices           │
│    - Monthly Zillow prices                                                   │
│                                         DataRefreshLog table                 │
│  data/sources/*.json                      - Audit trail                      │
│    - Source data before processing                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GET /api/cities                                                             │
│    1. Fetch cities from PostgreSQL                                           │
│    2. Load metrics.json supplementary data                                   │
│    3. Load zhvi-history.json prices                                          │
│    4. Merge all sources using city slug as key                               │
│    5. Return combined data                                                   │
│                                                                              │
│  GET /api/cities/[id]                                                        │
│    - Same merge logic for single city                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Hooks                    Scoring (Client-Side)        UI Components         │
│  ─────                    ────────────────────         ─────────────         │
│  useCities()              calculateScores()            RankingTable          │
│  useCity()                  - Climate score            CityMetricsGrid       │
│                             - Cost score               ScoreBreakdown        │
│  Store (Zustand)            - Demographics score       ComparisonPanel       │
│  ─────────────              - QoL score                PreferencePanel       │
│  preferences                - Cultural score                                 │
│  (persisted)                - Total weighted score                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Identified Issues

### 2.1 Dual Storage Redundancy

**Problem:** Data is stored in both JSON files and PostgreSQL, requiring complex merge logic in API routes.

| Data | JSON Location | DB Location | Source of Truth |
|------|---------------|-------------|-----------------|
| BEA cost data | metrics.json → bea | - | JSON ✓ |
| NOAA climate | metrics.json → noaa | - | JSON ✓ |
| Census demographics | metrics.json → census | CityMetrics.diversityIndex ⚠️ | JSON ✓ |
| QoL metrics | metrics.json → qol | CityMetrics.walkScore ⚠️ | JSON ✓ |
| Cultural | metrics.json → cultural | CityMetrics.cityDemocratPercent ⚠️ | JSON ✓ |
| ZHVI prices | zhvi-history.json | ZHVIDataPoint | Both (synced) |

**Recommendation:** Remove deprecated fields from database, keep JSON as source of truth for metrics.

### 2.2 Multiple Data Refresh Mechanisms

| Mechanism | Location | Purpose |
|-----------|----------|---------|
| `scripts/seed.ts` | CLI | Legacy database seeding |
| `/api/admin/refresh` | API | Sync JSON → PostgreSQL |
| Individual pull routes | API | Update metrics.json from APIs |

**Recommendation:** Consolidate into single pipeline, document which to use when.

### 2.3 City ID Inconsistency

| System | ID Format | Example |
|--------|-----------|---------|
| PostgreSQL | CUID | `cmkx629oy0000tuw6qazg5tmy` |
| JSON files | Slug | `san-francisco` |
| API routes | Both | Converts using `cityNameToSlug()` |

**Recommendation:** Standardize on slug for all systems, or add slug field to database.

### 2.4 Deprecated Fields Still in Use

In `src/types/city.ts` (CityMetrics interface):
- `crimeRate` → Use `qol.crime.violentCrimeRate`
- `walkScore` → Use `qol.walkability.walkScore`
- `transitScore` → Use `qol.walkability.transitScore`
- `avgBroadbandSpeed` → Use `qol.broadband.maxDownloadSpeed`
- `hasInternationalAirport` → Removed from preferences
- `healthScore` → Use `qol.health`
- `pollutionIndex` → Use `qol.airQuality`
- `waterQualityIndex` → Use `qol.airQuality`
- `trafficIndex` → No longer tracked
- `cityDemocratPercent` → Use `cultural.political.democratPercent`
- `stateDemocratPercent` → Use `cultural.political`

In `prisma/schema.prisma`:
- `diversityIndex` → Use `census.diversityIndex`
- `eastAsianPercent` → Use `census.asianPercent`

---

## 3. Orphaned/Unused Files

| File | Status | Notes |
|------|--------|-------|
| `scripts/add-bea-geofips.ts` | Orphaned | One-time migration script, can delete |
| `style-preview.html` | Orphaned | Standalone preview file, can delete |
| `types/index.ts` | Unused | Barrel export not used, can delete |

---

## 4. Technical Debt

### 4.1 Console.log in Admin Routes

79 console.log statements across 13 admin API routes. Acceptable for admin-only code, but consider a proper logging library for production.

### 4.2 Empty Function Reserved for Future

```typescript
// src/lib/scoring.ts line 343-350
function checkFilters(...) {
  // Reserved for hard filters (exclusion logic)
  return null;
}
```

### 4.3 Legacy Preference Fields

In `src/types/preferences.ts`:
- `political` object (line 206-210) - Use `cultural` instead
- Legacy climate fields (lines 68-72) - Kept for migration/fallback
- Legacy cost fields (lines 91-95) - No longer used in UI
- `maxCrimeRate` (line 169) - Backward compatibility

---

## 5. Recommendations

### High Priority
1. [ ] Remove deprecated fields from Prisma schema after confirming no usage
2. [x] Clean up orphaned files (`add-bea-geofips.ts`, `style-preview.html`, `types/index.ts`)
3. [ ] Document the correct data refresh workflow

### Medium Priority
4. [ ] Consolidate `seed.ts` and `refresh/route.ts` into single mechanism
5. [ ] Add city slug to PostgreSQL schema for consistent identification
6. [ ] Replace console.log with proper logging library in admin routes

### Low Priority
7. [ ] Remove legacy preference fields after migration period
8. [ ] Implement `checkFilters` function or remove placeholder
9. [ ] Consider migrating entirely to JSON or entirely to database (not both)

---

## 6. Current Recommended Workflow

### Adding New Data Source
1. Create admin pull route: `src/app/api/admin/{source}-pull/route.ts`
2. Pull route writes to `data/metrics.json`
3. Run `/api/admin/refresh` to sync to database (if needed)
4. Update scoring in `src/lib/scoring.ts`
5. Add UI in relevant component

### Adding New City
See `docs/ADDING-CITIES.md` for detailed instructions.

### Refreshing All Data
```bash
# 1. Run all pull routes via admin panel or curl
# 2. Sync to database
curl -X POST http://localhost:3000/api/admin/refresh -d '{"password":"..."}'
```
