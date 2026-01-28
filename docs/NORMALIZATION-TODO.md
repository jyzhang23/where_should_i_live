# Score Normalization Plan

## Goal
Ensure that a score of "70" in Climate represents a similar level of "satisfaction" as a "70" in Quality of Life. When users adjust the top-level category sliders, the weighted combination should be intuitive and meaningful.

---

## Current Issues

| Category | Current Approach | Problem |
|----------|------------------|---------|
| **Climate** | Linear mapping with arbitrary divisors | Non-linear reality (10→20 snow days is huge; 100→110 barely noticed) |
| **Cost** | BEA index 70-130 → Score 0-100 | Good anchor at 50, but persona selection impact unclear to users |
| **Demographics** | Base 70 + threshold logic | Minority density shouldn't scale linearly (40% ≠ 2× benefit of 20%) |
| **QoL** | Mix of raw values and scores | High-variance metrics (crime) drown out low-variance ones (broadband) |
| **Cultural** | Distance-based alignment | Already well-implemented, minor refinements possible |

---

## Normalization Principles

### 1. Anchor the Middle
For every category, a "National Average" result should equal **Score 50**.

### 2. Harmonize Variance  
Use **Percentile Ranking** for QoL so one metric doesn't dominate the average.

### 3. Define Floor/Ceiling
Use **U.S. Geographic Extremes** as the 0 and 100 bounds (e.g., San Diego climate = 100, Minneapolis winter = 0).

---

## Category-Specific Fixes

### 1. Climate: Sigma-Based Normalization

**Problem:** Linear scaling doesn't reflect lived experience. Moving from 10 to 20 snow days is a huge lifestyle change; moving from 100 to 110 is barely noticed.

**Solution:** Use observed U.S. range for each metric.

```
Score = 100 - ((Value - Min_US) / (Max_US - Min_US)) × 100
```

**Reference Ranges (for implementation):**

| Metric | Min (Score 100) | Max (Score 0) | Notes |
|--------|-----------------|---------------|-------|
| Comfort Days (65-80°F) | 50 days | 300 days | San Diego ~267 |
| Extreme Heat Days (>95°F) | 0 days | 60 days | Phoenix ~90+ |
| Freeze Days (<32°F) | 0 days | 150 days | Minneapolis ~150 |
| Rain Days | 30 days | 180 days | Seattle ~150 |
| Snow Days | 0 days | 60 days | Buffalo ~60 |
| Cloudy Days | 50 days | 220 days | Seattle ~200 |
| July Dewpoint | 50°F (dry) | 75°F (oppressive) | Houston ~74 |
| Heating + Cooling Degree Days | 2,000 | 9,000 | San Diego vs Minneapolis |

**Implementation Note:** Invert scoring for "less is better" metrics. Apply floor/ceiling clamps.

---

### 2. Cost of Living: The "Purchasing Power" Anchor

**Current State:** Maps BEA True Purchasing Power Index 70-130 → Score 0-100. Index 100 (national avg) = Score 50. ✅ Good anchor.

**Enhancement:** 
- In UI, explicitly label the 50-mark as "National Average Purchasing Power"
- Add tooltip: "Above 50 = your money goes further than typical American"
- Ensure persona impact is clear:
  - "Standard" persona: High-cost cities (NYC, SF) score near 0
  - "Local Earner" persona: Same cities rise to 60-70 due to salary offset

**No formula change needed** - current implementation is sound.

---

### 3. Demographics: The "Critical Mass" Curve

**Problem:** Minority community presence shouldn't scale linearly. Once a community reaches 15-20%, the practical benefits (ethnic groceries, restaurants, cultural events) plateau. 40% density ≠ 2× the benefit of 20%.

**Solution:** Logarithmic scaling with a soft cap.

```typescript
// Current (linear):
minorityScore = (actualPct / targetPct) * 100;

// Proposed (logarithmic with plateau):
function minorityPresenceScore(actualPct: number, targetPct: number): number {
  if (actualPct >= targetPct) {
    // Above threshold: diminishing returns, cap at 100
    const excess = actualPct - targetPct;
    return Math.min(100, 80 + Math.log10(1 + excess) * 10);
  } else {
    // Below threshold: steeper penalty
    return Math.max(0, (actualPct / targetPct) * 80);
  }
}
```

**Thresholds for "Critical Mass":**
- 5% = Visible presence (some restaurants, shops)
- 15% = Established community (cultural events, groceries)
- 25%+ = Major hub (full ecosystem, minimal additional benefit)

---

### 4. Quality of Life: Percentile Ranking

**Problem:** Combining 6 APIs with different units and variances. Walk Score is 0-100. FBI Crime Rates are per 100,000 (100-1,000 range). Raw addition causes high-variance metrics to dominate.

**Solution:** Normalize each QoL sub-metric to its **percentile rank** within our city database.

```typescript
function toPercentileScore(value: number, allCityValues: number[], higherIsBetter: boolean): number {
  const sorted = [...allCityValues].sort((a, b) => a - b);
  const rank = sorted.findIndex(v => v >= value);
  const percentile = (rank / sorted.length) * 100;
  return higherIsBetter ? percentile : (100 - percentile);
}
```

**Apply to each QoL sub-component:**

| Sub-metric | Source | Higher is Better? |
|------------|--------|-------------------|
| Walk Score | Walk Score API | Yes |
| Transit Score | Walk Score API | Yes |
| Bike Score | Walk Score API | Yes |
| Violent Crime Rate | FBI UCR | No (invert) |
| Healthy Air Days % | EPA AQS | Yes |
| Fiber Coverage % | FCC Broadband | Yes |
| Student-Teacher Ratio | NCES | No (invert) |
| Physicians per 100K | HRSA | Yes |

**Result:** A city in the top 10% for Safety gets 90. A city in the top 10% for Walkability gets 90. Both metrics now have equal "pull."

---

### 5. Cultural: Preference-Relative Scaling

**Current State:** Already well-implemented with distance-based alignment and swing logic.

**Minor Enhancement:** Ensure scoring bounds are symmetric.

```typescript
// For partisan preference:
// User selects "Strong Democrat" → target PI = +0.6
// City with PI = +0.6 → Score 100
// City with PI = -0.6 → Score 0
// City with PI = 0.0 → Score 50

function partisanAlignmentScore(cityPI: number, targetPI: number): number {
  const maxDistance = 1.2; // From +0.6 to -0.6
  const distance = Math.abs(cityPI - targetPI);
  return Math.max(0, 100 - (distance / maxDistance) * 100);
}
```

---

## Implementation Roadmap

### Phase 1: Data Collection (Pre-requisite) ✅ COMPLETED
- [x] Compute and cache percentile ranks for all QoL metrics across all cities
- [x] Document U.S. extreme values for climate metrics (research actual ranges)

### Phase 2: Climate Normalization ✅ COMPLETED
- [x] Replace linear scaling with range-based normalization
- [x] Define MIN_US and MAX_US constants for each climate metric (CLIMATE_RANGES)
- [x] Add floor/ceiling clamps via `normalizeToRange()` function

### Phase 3: QoL Percentile Ranking ✅ COMPLETED
- [x] Create `computeQoLPercentiles()` function that runs on city list load
- [x] Modify `calculateQualityOfLifeScore()` to use percentile scores via `toPercentileScore()`
- [x] Ensure rankings update if city list changes (computed at start of each scoring run)

### Phase 4: Demographics Curve ✅ COMPLETED
- [x] Implement logarithmic scaling for minority community presence via `minorityPresenceScore()`
- [x] Test with various percentage thresholds
- [x] Document "critical mass" concept in help text

### Phase 5: UI Enhancements ✅ COMPLETED
- [x] Add "National Average" label at score 50 on relevant displays (radar chart dashed line)
- [x] Add tooltips explaining score interpretation (RankingTable, city detail ScoreCard)
- [x] Add visual above/below average indicator (+X/-X relative indicators)
- [x] Added comprehensive "Understanding Your Scores" section to help page

---

## Expected Outcome

When a user sets **Climate: 100%** and **Cost: 50%**, they will see cities that are:
1. **Geographically exceptional** (top climate scores)
2. **Only penalized if economically disastrous** (cost is tie-breaker, not deal-breaker)

The slider weights become intuitive multipliers on comparable satisfaction scales.

---

## Implementation Summary (Completed 2026-01-28)

### Backend Changes (`src/lib/scoring.ts`)

#### 1. Added Normalization Constants
- `CLIMATE_RANGES`: U.S. geographic extremes for all 11 climate metrics
- `QOL_RANGES`: Reference ranges for QoL metric documentation

#### 2. Added Normalization Utilities
- `normalizeToRange()`: Maps raw values to 0-100 using U.S. extremes
- `toPercentileScore()`: Computes percentile rank within city dataset
- `minorityPresenceScore()`: Logarithmic "critical mass" curve for minority presence
- `computeQoLPercentiles()`: Pre-computes all QoL metric arrays for percentile ranking
- `getScoreLabel()`: Returns interpretation label (Exceptional, Above Average, etc.)
- `getScoreRelative()`: Returns "+X" / "-X" / "avg" relative to 50
- `getScoreTooltip()`: Returns full tooltip explanation for a score

#### 3. Updated Scoring Functions
- **Climate**: Now uses range-based normalization instead of linear scaling
- **QoL**: Now uses percentile ranking so all sub-metrics have equal "pull"
- **Demographics**: Minority community presence uses logarithmic curve
- **All categories**: Neutral/fallback scores changed from 70 to 50 (national average)

#### 4. Key Behavioral Changes
- Score 50 now consistently means "national average" across all categories
- High-variance metrics (crime rates) no longer dominate low-variance ones
- Climate scores now represent actual U.S. geographic reality
- Minority presence plateaus above ~25% (diminishing returns)

### UI Changes

#### 1. RankingTable (`src/components/rankings/RankingTable.tsx`)
- Added `ScoreCell` component with relative indicators (+X/-X/avg)
- Tooltips on hover explaining above/below national average

#### 2. ScoreRadarChart (`src/components/charts/ScoreRadarChart.tsx`)
- Added dashed reference line at 50 (national average)
- Legend explaining the dashed line

#### 3. City Detail Page (`src/app/city/[id]/page.tsx`)
- ScoreCard now shows relative indicator (+X/-X)
- Added tooltips with score interpretation
- Shows label (Exceptional, Above Average, etc.)

#### 4. Help Page (`src/app/help/page.tsx`)
- New "Understanding Your Scores" section explaining:
  - The 50-point baseline concept
  - Climate range-based normalization
  - QoL percentile ranking
  - Demographics critical mass curve
  - How to read visual indicators

---

## Testing Checklist ✅ COMPLETED

Tests verified via `npx tsx scripts/test-normalization.ts`:

- [x] San Diego scores ~90.6 on Climate (best weather) ✅
- [x] Minneapolis scores ~41.4 on Climate (harsh winters) ✅
- [x] Climate spread: San Diego vs Minneapolis differs by 49.2 points ✅
- [x] City with 25% Asian (97.4) scores similarly to 40% Asian (100.0) - only 2.6pt diff (plateau effect) ✅
- [x] City with 5% Asian (55.0) scores much lower than 25% Asian (97.4) - below threshold penalty ✅
- [x] Top-percentile safest city scores 100 on QoL Safety ✅
- [x] Dangerous city (high crime) scores 10.3 on QoL Safety ✅

### Score Interpretation Tests
- [x] `getScoreLabel(95)` = "Exceptional" ✅
- [x] `getScoreLabel(80)` = "Above Average" ✅
- [x] `getScoreLabel(50)` = "Average" ✅
- [x] `getScoreRelative(75)` = "+25" (green) ✅
- [x] `getScoreRelative(25)` = "-25" (red) ✅
- [x] `getScoreRelative(50)` = "avg" ✅
