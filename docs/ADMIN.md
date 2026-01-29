# Admin Data Management

This document describes how to manage and update city data in the application.

## Overview

City data can be updated through two methods:
1. **CLI Scripts** (recommended) - Run locally to pull and update data
2. **Admin API Routes** (development only) - Web interface for data updates

In production, the Admin API routes are disabled for security. Use the CLI scripts instead.

## CLI Usage

The admin CLI is located at `scripts/admin.ts`. Run it with `npx tsx`:

```bash
# Show help
npx tsx scripts/admin.ts help

# Pull all available data sources
npx tsx scripts/admin.ts all

# Pull specific data source
npx tsx scripts/admin.ts zillow      # Zillow ZHVI home prices
npx tsx scripts/admin.ts cultural    # Political/religious data
npx tsx scripts/admin.ts recreation  # Parks, trails, outdoor data
npx tsx scripts/admin.ts urbanlife   # Nightlife, dining, arts
npx tsx scripts/admin.ts refresh     # Refresh database from JSON

# Verbose output
npx tsx scripts/admin.ts zillow --verbose
```

### Available Commands

| Command | Description | External API |
|---------|-------------|--------------|
| `zillow` | Pull Zillow ZHVI home price data | Yes |
| `cultural` | Load cultural data from sources | No |
| `recreation` | Load recreation data from sources | No |
| `urbanlife` | Load urban lifestyle data from sources | No |
| `refresh` | Refresh database from JSON files | No |
| `all` | Run all above commands | Mixed |

### Commands Requiring External APIs

Some data pulls require external APIs and are better run through the development server:

| Command | API Required | How to Run |
|---------|--------------|------------|
| `bea` | BEA_API_KEY | Use dev server |
| `climate` | NOAA + Open-Meteo | Use dev server |
| `census` | CENSUS_API_KEY | Use dev server |
| `qol` | Various (FBI, EPA, FCC, etc.) | Use dev server |

To run these through the development server:

```bash
# Start development server
npm run dev

# In another terminal, use curl
curl -X POST http://localhost:3000/api/admin/bea-pull \
  -H 'Content-Type: application/json' \
  -d '{"password":"your-admin-password"}'
```

## Development Server Admin UI

When running in development mode (`npm run dev`), an Admin Panel is available in the UI:

1. Look for the shield icon (🛡️) in the top-right corner
2. Enter your admin password
3. Click buttons to pull data from various sources

**Note:** The Admin Panel is only visible when `NODE_ENV=development`.

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
