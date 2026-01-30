## Features

- [x] ~~Walkability: Replace EPA walkability API with simple walkscore.com lookup~~ ✅ DONE
  - Created `scripts/fetch-walkscore.ts` to fetch Walk/Transit/Bike scores
  - All 45 cities now have walkability data from walkscore.com
  - Much simpler than previous EPA National Walkability Index approach

### Dating favorability
#### Goal
Create a "vibe-based" estimate on how favorable a city is for a user from a dating perspective.

Consider 2 personas, heterosexual male and heterosexual female.

Consider different age brackets.

Look at the research and see what kind of estimate we could make. 

How does it compare to research results, like 
https://www.pewresearch.org/short-reads/2014/10/02/the-best-and-worst-cities-for-women-looking-to-marry/

#### Research
Research from the Pew Research Center and other sociological institutes confirms that while the male-to-female ratio (the "quantitative" factor) matters, the "qualitative" factors—like safety, politics, and economics—are often far more predictive of dating success.Here are the key factors that determine Dating Favorability, backed by research, and a practical way to estimate them for any city.1. The "Availability Gap" (It's not just population)Pew Research (2023-2024) found a massive discrepancy in who is actually single.The Stat: Among adults under 30, 63% of men are single, compared to only 34% of women.The Insight: Even in a city with a 50/50 population split, the "active dating pool" is often skewed male.The Factor: Look for "Single Density" rather than just population. A city might have many women, but if they are already married or in committed relationships (common in the South and Midwest), the "favorable" ratio is an illusion.2. Economic Stability (The "Date Tax")Financial stability is a top-tier partner requirement, especially for women. Pew data consistently shows that "having a steady job" is more important to women than men when selecting a partner.The Factor: Rent-to-Income Ratio.Why it matters: In cities like New York or Miami, where rent consumes >40% of income, dating becomes "high stakes." People are less likely to go on casual "get to know you" dates because they are expensive.Favorable City: A place where the median rent is under 30% of the median income. This leaves "disposable income" for socializing.3. Political & Cultural Alignment (The "Dealbreaker" Index)This has become the single biggest new factor in dating favorability.The Research: Pew studies show that for ~70% of singles, voting for the "opposing" political party is a dealbreaker.The Insight: A liberal male in a conservative city (or vice versa) faces a "dating desert," regardless of how good the gender ratio looks on paper.The Factor: Political Homogeneity. If you are a distinct minority politically (e.g., a Republican in San Francisco or a Democrat in rural Wyoming), your "effective" dating pool shrinks by roughly 50-70%.4. Safety and "Third Places" (The Infrastructure)Research on "mate availability" shows that people rarely meet on the street; they meet in places.Safety: Women are significantly more risk-averse in dating (Pew notes high rates of harassment concerns). High crime rates or poor lighting reduce the likelihood of women agreeing to meet strangers.Walkability: Cities with high Walk Scores foster "serendipitous interaction." If you have to drive everywhere (like in Houston or Phoenix), you only meet people you intended to meet. In walkable cities (like Chicago or Boston), you meet people by accident.How to Estimate Dating Favorability (The "Real" Formula)Instead of just counting men and women, use this weighted approach to grade a city. You can find this data quickly using Zillow (economics), Dave Leip's Atlas (politics), and WalkScore (infrastructure).$$Favorability = (Pool \times 0.4) + (Econ \times 0.3) + (Align \times 0.2) + (Safe \times 0.1)$$1. The Pool Score (0-10)Don't just use the Census.Look for: % of population "Never Married" (Age 20-34).Good: >50% (e.g., Atlanta, DC).Bad: <30% (e.g., suburban Utah).2. The Economic Score (0-10)Look for: "Disposable Income" (Median Income minus Median Annual Rent).Good: High disposable income (e.g., Minneapolis, Austin).Bad: Low/Negative disposable income (e.g., Los Angeles, NYC).3. The Alignment Score (0-10)Look for: 2024 Election results for the county.Test: Does the majority vote match your vote?Good: Your party won by >10%.Bad: Your party lost by >10%.4. The Safety/Walk Score (0-10)Look for: WalkScore.com rating.Good: Score > 70 (Very Walkable).Bad: Score < 40 (Car Dependent).Summary Example: "Good on Paper" vs. "Good in Reality"San Jose, CA: "Man Jose" has a terrible gender ratio (bad), very high cost of living (bad), but high income (good). Verdict: Difficult.Columbus, OH: Balanced gender ratio (neutral), very affordable (good), high single population due to university (good). Verdict: Highly Favorable.

## Bugs

## Maintenance

## Future City Backlog
City	Tier
~~Boise, ID~~   1 (added 2026-01-29)
Ann Arbor, MI	1
Pensacola, FL	1
Tucson, AZ	1
Madison, WI	1
West Palm Beach, FL	1
Tallahassee, FL	1
Saint Louis, MO	1
Louisville, KY	1
Albuquerque, NM	1
Boulder, CO    2
Wichita, KS	2
Des Moines, IA	2
Little Rock, AR	2
Eugene, OR	2
Columbus, OH	2
Omaha, NE	2
Durham, NC	2
Santa Fe, NM	2
Chattanooga, TN	2
Anchorage, AK	2
Savannah, GA	2
Fresno, CA	2
Syracuse, NY	2
Akron, OH	3
Shreveport, LA	3
Lexington, KY	3
Jackson, MS	3
Springfield, MO	3
Mobile, AL	3
Huntsville, AL	3
Greenville, SC	3
Saint Paul, MN	3
Fort Collins, CO	3
Vancouver, WA	3
Sioux Falls, SD	3
Fairfax, VA	3
Fort Myers, FL	3
Athens, GA	3
Tulsa, OK	3
Rochester, NY	3
San Luis Obispo     3