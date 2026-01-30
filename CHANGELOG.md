# Changelog

All notable changes to the Cities App project.

## [1.0.0] - 2026-01-30

### 🎉 Initial Release

The first stable release of "Where Should I Live" - a comprehensive city comparison tool that helps you find your perfect city based on personalized preferences.

### Core Features

- **Multi-Factor City Rankings**: Score cities across 5 major categories:
  - Climate (11 weather factors from NOAA/Open-Meteo)
  - Cost of Living (BEA purchasing power with housing adjustments)
  - Demographics (Census ACS data, diversity, education)
  - Quality of Life (walkability, safety, healthcare, schools, internet)
  - Cultural (political lean, religious communities, urban lifestyle)

- **Personalized Scoring**: 
  - Adjustable category weights
  - Housing situation modes (Renter, Homeowner, Prospective Buyer)
  - Work situation modes (Local Earner, Standard, Retiree)
  - Minority community preferences with subgroup targeting

- **Interactive UI**:
  - Real-time score updates as preferences change
  - Top 10 ranking bar chart
  - Radar chart for category breakdown
  - Price trend charts (Zillow ZHVI history)
  - Side-by-side city comparison
  - Score breakdown dialog ("Why does this city score low?")

- **Quick Start Wizard**: Guided preference setup with lifestyle personas

- **45 Major US Cities**: Comprehensive data coverage

### Data Pipeline

- **Walk Score® Integration**: City-wide walkability scores from walkscore.com
  - Robust URL validation to prevent address-page data
  - Automatic detection of redirects and suspicious scores
  
- **Admin CLI Tools**: 
  - `scripts/admin.ts` - Unified admin operations
  - `scripts/add-city.ts` - Automated city addition pipeline
  - `scripts/fetch-walkscore.ts` - Walk Score scraper with validation
  - `scripts/verify-city-data.ts` - Data completeness checker

- **Security Hardening**:
  - Admin API routes restricted to development mode
  - Environment variable authentication
  - No hardcoded credentials

### Technical Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL
- Recharts for visualizations

### Data Sources

| Source | API/Dataset | Data |
|--------|-------------|------|
| BEA | Regional Price Parities | Cost of living, purchasing power |
| Census | ACS 5-Year Estimates | Demographics, diversity, education |
| NOAA | ACIS + Open-Meteo | Climate normals (30-year) |
| EPA | Air Quality System | AQI statistics |
| FBI | Crime Data Explorer | Crime rates |
| FCC | Broadband Map | Internet availability |
| HRSA | Health Resources | Healthcare access |
| NCES | Education Statistics | School quality |
| Walk Score® | walkscore.com | Walkability, transit, bike scores |
| Zillow | ZHVI | Home price history |
| MIT Election Lab | County Returns | Political lean |
| ARDA | Religion Census | Religious composition |

### Documentation

- `docs/ADDING-CITIES.md` - Guide for adding new cities
- `docs/ADMIN.md` - Admin operations documentation
- `/help` page - In-app scoring methodology explanation

---

## [Unreleased]

_Future improvements and features will be listed here._
