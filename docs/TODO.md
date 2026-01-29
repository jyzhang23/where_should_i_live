## Features
- Add Austin, TX and test the adding cities pipeline

## Robustness

### Architecture Review ✅ DONE
See `docs/ARCHITECTURE-REVIEW.md` for full analysis.

**Cleanup Tasks (from review):**
- [ ] Delete orphaned files: `scripts/add-bea-geofips.ts`, `style-preview.html`, `types/index.ts`
- [ ] Remove deprecated fields from Prisma schema
- [ ] Consolidate `seed.ts` and `refresh/route.ts`
- [ ] Add city slug to PostgreSQL for consistent ID

### Code Review & Refactor
- [ ] Remove/migrate 11 deprecated CityMetrics fields
- [ ] Clean up legacy preference fields
- [ ] Replace console.log in admin routes with proper logging
- [ ] Implement or remove empty `checkFilters` function

### Security (future)
- Consider hiding the data access interface from regular users
- Security review (attack surface, DOS, data leaks, etc)

### Documentation
- [x] Architecture documentation (see ARCHITECTURE-REVIEW.md)
- [ ] Changelog

## Bugs