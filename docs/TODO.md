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