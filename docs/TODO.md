## Features


## Robustness

### Architecture Review ✅ DONE
See `docs/ARCHITECTURE-REVIEW.md` for full analysis.

**Cleanup Tasks (from review):**
- [x] Delete orphaned files: `scripts/add-bea-geofips.ts`, `style-preview.html`, `types/index.ts`
- [x] Remove deprecated fields from Prisma schema (14 columns dropped)
- [x] Sync `seed.ts` with new schema (now matches `refresh/route.ts`)
- [ ] Add city slug to PostgreSQL for consistent ID

### Code Review & Refactor
- [x] Remove deprecated CityMetrics fields (done with Prisma schema cleanup)
- [x] `checkFilters` function - already removed from codebase
- [ ] Clean up legacy preference fields
- [ ] Replace console.log in admin routes with proper logging

### Security (future)
- Consider hiding the data access interface from regular users
- Security review (attack surface, DOS, data leaks, etc)

### Documentation
- [x] Architecture documentation (see ARCHITECTURE-REVIEW.md)
- [ ] Changelog

## Bugs

## Future City Backlog
- Boise
- Boulder
- San Luis Obispo