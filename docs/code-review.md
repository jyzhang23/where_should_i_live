Based on the review of src/lib/scoring/climate.ts and the preference definitions in src/types/preferences.ts, the climate scoring logic has a significant architectural bias.

1. The "San Diego Bias" (Major Flaw)
The current logic hardcodes a specific definition of "Good Weather": 72°F, Sunny, Dry, and Stable.

The Code: In calculateClimateScore, metrics like snowDays, rainDays, and seasonalStability (variance) are hardcoded with invert: true inside normalizeToRange.

The Implication: A user who loves skiing, cozy rainy days, or distinct four seasons cannot currently use this app to find their ideal city. Setting weightSnowDays to 100 currently means "I hate snow 100%," not "Snow is 100% important to me."

The Fix: You need to introduce Preference Modes (Avoid vs. Seek) for these variables, similar to how you handle "Political Alignment" (seeking match) vs "Crime" (always avoid).

2. Recommended Logic Changes
A. Fix Snow/Winter Scoring
Allow users to specify if they want a winter climate.

Current Logic:

TypeScript

// src/lib/scoring/climate.ts
const snowScore = normalizeToRange(noaa.snowDays, 0, 65, true); // true = 0 days is best
Proposed Logic: Add preferSnow: boolean to preferences.

TypeScript

// If user WANTS snow, 0 days is score 0, 40+ days is score 100
// If user AVOIDS snow (default), 0 days is score 100
const invertSnow = !prefs.preferSnow; 
const snowScore = normalizeToRange(
  noaa.snowDays, 
  CLIMATE_RANGES.snowDays.min, 
  CLIMATE_RANGES.snowDays.max, 
  invertSnow
);
B. Fix "Seasonal Stability" (The 4-Seasons Problem)
Currently, seasonalStability calculates the standard deviation of monthly temperatures.

Current: Lower deviation (San Diego) = Score 100. High deviation (Minneapolis) = Score 0.

Critique: Many people find constant weather "boring." A "Four Seasons" lover wants high deviation.

Proposed: Add a preferDistinctSeasons toggle.

If true: High deviation = Score 100.

If false: Low deviation = Score 100.

3. Data Correlation Issues (Double Counting)
There is significant overlap between your metrics which can skew scores heavily:

Comfort Days vs. Extreme Heat/Freeze:

If a city has 100 "Extreme Heat Days," it effectively gets penalized twice:

Once in the extremeHeat score (direct penalty).

Once in the comfortDays score (because those 100 days are not "comfortable").

Impact: This makes temperature the overwhelming factor in the total Climate Score, drowning out subtle factors like cloudyDays or wind.

Recommendation: Reduce the default weights of comfortDays if extremeHeat or freezeDays are also weighted heavily, or treat comfortDays as a "bonus" metric rather than a core baseline.

4. Missing "Disaster Risk" Dimension
The current model only scores comfort, not safety.

Gap: A city might score 95/100 for Comfort (e.g., coastal Florida) but effectively 0/100 for "Existential Risk" (Hurricanes).

Recommendation: Add a disasterRisk metric (using FEMA National Risk Index data if available, or basic proxy data). Without this, the "Climate" score is misleadingly optimistic for high-risk areas.

5. Refactored Code Snippet (Example)
Here is how you might refactor the Snow logic in src/lib/scoring/climate.ts to support winter lovers:

TypeScript

// Snow Days - Context-aware scoring
if (prefs.weightSnowDays > 0 && noaa.snowDays !== null) {
  // Check if user actively wants snow (requires adding this boolean to preferences)
  const lovesSnow = prefs.preferSnow ?? false; 
  
  const snowScore = normalizeToRange(
    noaa.snowDays,
    CLIMATE_RANGES.snowDays.min,
    CLIMATE_RANGES.snowDays.max,
    !lovesSnow // Invert (lower is better) only if they DON'T love snow
  );
  
  totalScore += snowScore * prefs.weightSnowDays;
  totalWeight += prefs.weightSnowDays;
}