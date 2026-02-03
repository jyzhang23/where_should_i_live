## Features

- [x] ~~Walkability: Replace EPA walkability API with simple walkscore.com lookup~~ ✅ DONE
  - Created `scripts/fetch-walkscore.ts` to fetch Walk/Transit/Bike scores
  - All 45 cities now have walkability data from walkscore.com
  - Much simpler than previous EPA National Walkability Index approach

- [x] ~~Dating Favorability~~ ✅ DONE (v1.1.0)
  - Scores cities based on dating market factors using weighted formula from Pew Research
  - Pool Score (40%): Gender ratios by age bracket + never-married percentages
  - Economic Score (30%): Disposable income / affordability
  - Alignment Score (20%): Political preference matching
  - Safety/Walk Score (10%): Walkability and crime rates
  - Added UI toggle in Demographics preferences with gender/age range selectors
  - Score breakdown dialog shows individual dating factor contributions

- [x] ~~Category overhaul~~ ✅ DONE (2026-02-02)
  - Split "Cultural" category into "Values" and "Entertainment" 
  - Now 6 top-level categories: Climate, Cost, Demographics, QoL, Values, Entertainment
  - Values: Political alignment (Gaussian decay), Religious presence/diversity
  - Entertainment: Nightlife, Arts, Dining, Sports, Recreation (moved from QoL)
  - Recreation (parks, trails, beach, mountains) now in Entertainment
  - Added migration logic for existing users' saved preferences
  - Updated all UI components (preferences, radar chart, score cards, comparison, etc.)

- [x] ~~Entertainment scoring calibration~~ ✅ DONE (2026-02-03)
  - Recalibrated URBAN_LIFESTYLE_RANGES to match actual OpenStreetMap data distribution
  - barsAndClubsPer10K: { min: 0.5, plateau: 5, max: 10 } (was plateau: 30!)
  - restaurantsPer10K: { min: 3, plateau: 20, max: 45 } (was plateau: 50!)
  - museums: { min: 5, plateau: 30, max: 150 }
  - Fixed Las Vegas data to include Strip (Paradise, NV) venues
  - Portland (7.7) now scores ~92 for nightlife instead of ~39

- [ ] About page
Based on a review of your current src/app/help/page.tsx, your Help page serves as an excellent technical manual—it details the formulas, data sources, and mechanics of the scoring.

An "About" page should complement this by focusing on the narrative, intent, and limitations of the project. Since this is a small-scale/local app, the About page is your opportunity to humanize the data.

Here is a list of beneficial items to include, specifically chosen to fill the gaps left by the Help page:

1. The "Why" (Origin Story)
Your Help page explains how the app calculates a "Cost of Living" score, but it doesn't explain why you built it.

Content: Briefly explain your motivation. Did you build this because generic "Best Places" lists felt impersonal? Did you want a tool that treats "Political Alignment" or "Climate" with the same weight as "Rent"?

Benefit: This establishes empathy. Users often feel frustration with generic tools; knowing you built this to solve that specific problem builds immediate rapport.

2. Curation Strategy ("The Dirty Dozen")
Your code in cityTinderProfiles.ts refers to your city selection as "The Dirty Dozen" designed to "maximize algorithmic variance". The Help page doesn't mention this.

Content: Explicitly explain why the app only supports ~50 cities (or your specific subset). Explain that you curated "archetype" cities (e.g., "The Tech Hub," "The Affordable South," "The Winter Wonderland") to help users test their preferences, rather than trying to index every zip code in America.

Benefit: This manages expectations. Users won't be disappointed when they can't find their obscure hometown; they'll understand the app is a decision engine, not an encyclopedia.

3. "Privacy-First" Philosophy (Expanded)
The Help page has a small "Privacy Note" box. The About page should expand on this as a core feature.

Content: "We don't want your data." Explain that because the app is a "static" client-side engine (using Zustand/LocalStorage), you physically cannot sell their political or religious preference data because it never leaves their device.

Benefit: For a small-scale app, this is a massive competitive advantage over commercial competitors like Niche or Zillow.

4. Data "Freshness" & Limitations
The Help page lists high-quality sources like FBI Crime Data and BEA, but doesn't discuss their latency.

Content: Be transparent about the "small scale" limitations.

"Crime data is from the 2022 FBI UCR because that is the most recent uniform dataset."

"Home prices are pulled from Zillow annually, not daily."

Benefit: This preempts feedback like "Rent is higher than this now!" by clarifying that the app compares relative affordability using the best available standardized baselines.

5. The "True Cost" Methodology (Philosophy)
The Help page details the math of the "True Purchasing Power" formula. The About page should explain the philosophy.

Content: Explain that looking at "Median Rent" is useless if you don't account for "State Income Tax." Highlight that you built the Renter vs. Homeowner vs. Buyer personas because a city that is cheap for a renter (good rent control) might be expensive for a buyer (high mortgage rates).

Benefit: This positions your app as "smarter" than the competition.

6. Technical "Under the Hood" (Portfolio Feature)
If this is a portfolio piece, this is critical.

Content: Briefly list the stack: Next.js, TypeScript, Prisma, and Tailwind. Mention that scoring happens 100% on the client to ensure instant feedback without server roundtrips.

Benefit: It proves technical competence to potential employers or collaborators.

7. Feedback & "Missing Cities" Request
Content: A simple link or form: "Don't see a city you love? Request it here."

Benefit: This is the most valuable form of feedback for a small app. It tells you exactly where to expand your dataset next without wasting time on cities nobody cares about.

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