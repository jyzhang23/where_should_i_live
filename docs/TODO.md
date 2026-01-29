## Features


## Robustness

### Architecture Review ✅ DONE
See `docs/ARCHITECTURE-REVIEW.md` for full analysis.

**Cleanup Tasks (from review):**
- [x] Delete orphaned files: `scripts/add-bea-geofips.ts`, `style-preview.html`, `types/index.ts`
- [x] Remove deprecated fields from Prisma schema (14 columns dropped)
- [x] Sync `seed.ts` with new schema (now matches `refresh/route.ts`)
- [x] Add city slug to PostgreSQL schema (run refresh to populate)

### Code Review & Refactor
- [x] Remove deprecated CityMetrics fields (done with Prisma schema cleanup)
- [x] `checkFilters` function - already removed from codebase
- [x] Legacy preference fields - kept for backward compatibility (fallback scoring)
- [x] Add admin logger utility (`src/lib/admin-logger.ts`)
- [ ] Migrate remaining admin routes to use logger (6 routes with 80 console.logs)

### Security (future)
- Consider hiding the data access interface from regular users
- Security review (attack surface, DOS, data leaks, etc)

### Documentation
- [x] Architecture documentation (see ARCHITECTURE-REVIEW.md)
- [x] Changelog (see CHANGELOG.md)

## Bugs

## Future City Backlog
City	Tier
Boise, ID   1
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