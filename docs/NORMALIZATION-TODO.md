# Score Normalization Analysis

## Current Score Distributions

| Category | Calculation Method | Fallback | Issues |
|----------|-------------------|----------|--------|
| **Climate** | Weighted avg of 11 sub-factors | 50 | Distribution depends heavily on user's advanced thresholds |
| **Cost** | BEA index mapped linearly | 50 | Index 70-130 → Score 0-100. Index 100 (avg) = Score 50 |
| **Demographics** | Weighted avg + hard penalties | varies | Population < min → hard penalty of 30 (not smooth) |
| **QoL** | Weighted avg of 6 sub-factors | legacy | Uses raw Walk Score (0-100) directly, other factors have different scaling |
| **Cultural** | Political + Religious alignment | **70** | Higher default than others, range 20-100 |

## Key Problems

1. **Inconsistent neutral/fallback scores**: Cultural returns 70, others return 50
2. **Different effective ranges**: Some scores cluster 50-80, others use full 0-100
3. **Non-comparable spreads**: If Climate varies by 15 points across cities but Cost varies by 40, then Cost dominates even at equal weights

## Proposed Solutions

### Option A: Post-hoc Normalization (Percentile-based)
After calculating raw scores, convert each to a percentile rank across all cities. This ensures:
- All categories use the full 0-100 range
- Equal spreads across categories
- City #1 in any category always scores ~95, worst scores ~5

### Option B: Z-Score Centering
Normalize each category: `score = 50 + (raw - mean) / stddev * 15`
- Centers all categories around 50
- Consistent spread (~35-65 for most cities)
- Maintains relative differences

### Option C: Manual Calibration
Adjust each category's formula to produce similar distributions through testing.

## Decision
TBD - revisit this document to decide on approach.

## Implementation Notes
- Option A is most robust but means scores are relative to other cities in the list
- Option B preserves absolute meaning but needs tuning
- Option C is labor-intensive but gives full control
