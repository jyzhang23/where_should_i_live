# Admin Data Management

This document describes how to manage and update city data in the application.

## Overview

City data is updated through the **CLI scripts** (recommended). All data pulls work directly from the command line without starting a dev server.

Admin API routes are also available for the web-based Admin Panel, but are disabled in production for security.

## CLI Usage

The admin CLI is located at `scripts/admin.ts`. Run it with `npx tsx`:

```bash
# Show help
npx tsx scripts/admin.ts help

# Pull all available data sources (takes several minutes)
npx tsx scripts/admin.ts all

# Pull specific data sources
npx tsx scripts/admin.ts census      # Census ACS demographics
npx tsx scripts/admin.ts bea         # BEA cost of living data
npx tsx scripts/admin.ts climate     # NOAA ACIS + Open-Meteo climate
npx tsx scripts/admin.ts zillow      # Zillow ZHVI home prices
npx tsx scripts/admin.ts qol         # All QoL data (crime, air, broadband, education, health)
npx tsx scripts/admin.ts cultural    # Political/religious data
npx tsx scripts/admin.ts recreation  # Parks, trails, outdoor data
npx tsx scripts/admin.ts urbanlife   # Nightlife, dining, arts
npx tsx scripts/admin.ts refresh     # Refresh database from JSON

# Verbose output
npx tsx scripts/admin.ts all --verbose
```

### Available Commands

| Command | Description | External API | API Key Required |
|---------|-------------|--------------|------------------|
| `all` | Pull all data sources | Yes | Various (see below) |
| `census` | Pull Census ACS demographics | Yes | CENSUS_API_KEY (optional) |
| `bea` | Pull BEA cost of living data | Yes | BEA_API_KEY |
| `climate` | Pull NOAA + Open-Meteo climate data | Yes | None |
| `zillow` | Pull Zillow ZHVI home prices | Yes | None |
| `qol` | Pull all Quality of Life data | Yes | FBI_API_KEY, EPA_EMAIL/KEY (optional) |
| `cultural` | Load cultural data from sources | No | None |
| `recreation` | Load recreation data from sources | No | None |
| `urbanlife` | Load urban lifestyle data from sources | No | None |
| `refresh` | Refresh database from JSON files | No | None |

### QoL Sub-pulls

The `qol` command runs all Quality of Life data pulls:
- **FBI Crime** - Violent/property crime rates (falls back to static data if no API key)
- **EPA Air** - Air quality index (falls back to static data if no API key)
- **FCC Broadband** - Fiber coverage and provider counts (static data)
- **NCES Education** - Student-teacher ratios, graduation rates (static data)
- **HRSA Health** - Healthcare provider density (static data)

## Development Server Admin UI

When running in development mode (`npm run dev`), an Admin Panel is available in the UI:

1. Look for the shield icon (🛡️) in the top-right corner
2. Enter your admin password
3. Click buttons to pull data from various sources

**Note:** The Admin Panel is only visible when `NODE_ENV=development`. For production updates, use the CLI scripts instead.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Password for admin operations (no default!) |

### Optional (for specific data pulls)

| Variable | Description | Used By |
|----------|-------------|---------|
| `BEA_API_KEY` | Bureau of Economic Analysis API key | bea-pull |
| `CENSUS_API_KEY` | Census Bureau API key | census-pull |
| `FBI_API_KEY` | FBI Crime Data Explorer API key | fbi-crime-pull |
| `EPA_EMAIL` | EPA AQS API email | epa-air-pull |
| `EPA_API_KEY` | EPA AQS API key | epa-air-pull |

## Security

### Production Environment

- Admin API routes return 403 Forbidden in production
- Admin Panel UI is not rendered in production builds
- Use CLI scripts for data updates in production

### Password Requirements

- `ADMIN_PASSWORD` must be explicitly set (no default value)
- Password is validated before any admin operation
- Clear error message if password is not configured

### Best Practices

1. Set a strong `ADMIN_PASSWORD` in your environment
2. Never commit passwords to version control
3. Use CLI scripts for production data updates
4. Keep API keys secure and rotate regularly

## Data Flow

```
External APIs     →    JSON Files    →    PostgreSQL
(Zillow, BEA,         (data/*.json)      (via Prisma)
 Census, etc.)              ↓
                       metrics.json
                       cities.json
                       zhvi-history.json
```

### Source Files

- `data/cities.json` - City definitions (name, state, coordinates)
- `data/metrics.json` - All city metrics (cost, climate, demographics, etc.)
- `data/zhvi-history.json` - Zillow price history
- `data/sources/*.json` - Raw source data (cultural, recreation, urbanlife)

## Troubleshooting

### "ADMIN_PASSWORD environment variable not configured"

Set the `ADMIN_PASSWORD` environment variable:

```bash
# For CLI
ADMIN_PASSWORD=your-password npx tsx scripts/admin.ts zillow

# Or in .env.local
ADMIN_PASSWORD=your-password
```

### "Admin routes are disabled in production"

Admin routes are intentionally disabled in production. Use CLI scripts instead:

```bash
npx tsx scripts/admin.ts all
```

### "Data directory not found"

Run the CLI from the `cities-app` directory:

```bash
cd cities-app
npx tsx scripts/admin.ts zillow
```

### Database connection issues

Ensure `DATABASE_URL` is set correctly:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname npx tsx scripts/admin.ts refresh
```
