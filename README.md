# Where Should I Live

A personalized city comparison tool that ranks US cities based on **your** priorities—not generic "Best Places" lists.

**Live Demo:** [whereshouldilive.vercel.app](https://whereshouldilive.vercel.app)

## What Makes This Different

- **You define what matters**: Weight climate, cost, politics, nightlife, and safety however you want
- **Privacy-first**: All scoring happens in your browser. Your preferences never leave your device.
- **Transparent methodology**: Every score can be explained. Click any category to see exactly why.
- **No account required**: Preferences stored locally—clear your browser, it's gone

## Features

### City Rankings
- **6 Scoring Categories**: Climate, Cost of Living, Demographics, Quality of Life, Entertainment, Values
- **Real-time updates**: Rankings recalculate instantly as you adjust preferences
- **Score breakdowns**: Click any score to see which factors helped or hurt

### City Tinder
Swipe-based preference discovery. Like/dislike 12 "archetype" cities and the app infers your weights—no sliders needed.

### Comparison Mode
Side-by-side comparison of any two cities across all metrics.

### Quick Setup
Lifestyle personas (Urban Explorer, Budget Conscious, etc.) to initialize preferences fast.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand + localStorage |
| Data | Static JSON (client-side scoring) |
| Charts | Recharts |
| Hosting | Vercel |

**Key architectural decision**: All scoring happens client-side. When you move a slider, rankings update instantly—no server roundtrip.

## Data Sources

| Category | Source | Vintage |
|----------|--------|---------|
| Cost of Living | BEA Regional Price Parities | 2023 |
| Demographics | Census ACS 5-Year | 2022 |
| Crime | FBI Uniform Crime Report | 2022 |
| Climate | NOAA Climate Normals | 1991-2020 |
| Walkability | Walk Score API | 2024 |
| Nightlife/Dining | OpenStreetMap | 2024 |
| Political | MIT Election Lab | 2020-2024 |

See [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md) for detailed methodology.

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) free tier)

### Setup

```bash
# Clone
git clone https://github.com/jyzhang23/where_should_i_live.git
cd cities-app

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your DATABASE_URL

# Database
npm run db:push
npm run db:seed

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
cities-app/
├── data/                 # Static JSON data files
│   ├── cities.json       # City definitions
│   ├── metrics.json      # All city metrics
│   └── zhvi-history.json # Zillow price history
├── docs/                 # Documentation
├── public/cities/        # City images
├── scripts/              # Admin CLI tools
└── src/
    ├── app/              # Next.js pages
    │   ├── about/        # About page
    │   ├── city/[id]/    # City detail pages
    │   └── help/         # Methodology docs
    ├── components/       # React components
    ├── lib/
    │   ├── scoring/      # Scoring algorithms
    │   └── store.ts      # Zustand state
    └── types/            # TypeScript types
```

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design and scoring algorithms
- [DATA-SOURCES.md](docs/DATA-SOURCES.md) - Data sources and collection methods
- [ADDING-CITIES.md](docs/ADDING-CITIES.md) - How to add new cities
- [ADMIN.md](docs/ADMIN.md) - Admin CLI operations

## Contributing

Found a bug? Want a city added? [Open an issue](https://github.com/jyzhang23/where_should_i_live/issues/new).

## License

MIT - See [LICENSE](LICENSE)

City images are licensed separately under Unsplash/Pexels licenses. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
