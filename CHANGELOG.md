# Changelog

All notable changes to the Cities App project.

## [2.1.0] - 2026-02-03

### Added
- **About Page** (`/about`) - Explains the app's philosophy, privacy-first architecture, and data sources
- **Vercel Analytics** - Page view tracking and Speed Insights for Core Web Vitals
- **Image Attribution** - `ATTRIBUTIONS.md` credits all city image photographers
- **MIT License** - Open source license for public repository

### Changed
- Reorganized `public/cities/` folder structure (deploy/, raw/, backup/)
- Score breakdowns now show dynamic weights matching actual scoring logic
- Cost breakdown explains persona-based calculation instead of fake percentages

### Fixed
- NYC image restored after accidental overwrite by image pipeline
- Entertainment scoring calibration (nightlife/dining ranges)
- Demographics and Climate breakdowns now sum to 100%

---

## [2.0.0] - 2026-02-02

### Major Changes
- **6 Scoring Categories** (was 5): Split "Cultural" into "Values" and "Entertainment"
- **City Tinder** - Swipe-based preference discovery game with 12 archetype cities

### Added
- **Values Category**: Political alignment (Gaussian decay scoring), religious community presence, religious diversity
- **Entertainment Category**: Nightlife, Arts, Dining, Sports, Recreation (moved from QoL)
- **City Tinder Game**: "The Dirty Dozen" - 12 cities selected to maximize algorithmic variance
- **Quick Setup Wizard**: Lifestyle personas for fast preference initialization
- Migration logic for existing users' saved preferences

### Changed
- Recreation (parks, trails, beach, mountains) moved from QoL to Entertainment
- Urban amenity scoring uses logarithmic "critical mass" curves
- Radar chart and all UI components updated for 6 categories

### Technical
- Calibrated `URBAN_LIFESTYLE_RANGES` to match actual OpenStreetMap data
- Las Vegas data patched to include Strip venues (Paradise, NV)

---

## [1.1.0] - 2026-01-31

### Added
- **Dating Favorability** - New scoring dimension in Demographics category
  - Pool Score (40%): Gender ratios by age bracket + never-married percentages
  - Economic Score (30%): Disposable income / affordability for singles
  - Alignment Score (20%): Political preference matching
  - Lifestyle Score (10%): Walkability and safety for dating
- Gender and age range selectors in Demographics preferences
- Score breakdown dialog shows individual dating factor contributions

### Data
- Added gender ratio data by age brackets (Census ACS)
- Added never-married percentage by gender (Census ACS)

---

## [1.0.0] - 2026-01-30

### Initial Release

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

- **Walk Score Integration**: City-wide walkability scores from walkscore.com
- **Admin CLI Tools**: Unified admin operations, automated city addition
- **Security**: Admin routes restricted to development mode

### Technical Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL
- Recharts for visualizations

### Data Sources

| Source | Data |
|--------|------|
| BEA | Cost of living, purchasing power |
| Census ACS | Demographics, diversity, education |
| NOAA | Climate normals (30-year) |
| EPA | Air quality statistics |
| FBI | Crime rates |
| FCC | Internet availability |
| HRSA | Healthcare access |
| NCES | School quality |
| Walk Score | Walkability, transit, bike scores |
| Zillow | Home price history |
| MIT Election Lab | Political lean |
| ARDA | Religious composition |
