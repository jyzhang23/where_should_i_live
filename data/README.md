# Data Directory

This directory contains the city data files used by the application.

## Files

### `cities.json`
City definitions and static information that rarely changes:
- City ID (slug), name, state
- Zillow region ID for ZHVI matching
- Sports teams (NFL, NBA)

### `metrics.json`
Current city metrics that can be updated via APIs:
- **Climate**: temperature, sunshine, rain
- **Cost**: home prices, taxes, cost of living
- **Demographics**: population, diversity, crime
- **Quality**: walk score, transit, airport, health, pollution
- **Political**: voting percentages

### `zhvi-history.json`
Zillow Home Value Index historical data:
- Monthly home prices from 2000 to present
- Used for price trend charts

## Updating Data

### Manual Edits
The JSON files are designed to be human-editable. To update:

1. Edit the relevant JSON file
2. Use the admin refresh button in the app, OR run:
   ```bash
   npm run db:seed
   ```

### From Excel (Initial Conversion)
If you have updated Excel data, run the conversion script:

```bash
# Place Cities.xlsx in the data/ directory
npx tsx scripts/convert-excel-to-json.ts
npm run db:seed
```

## Data Sources

| Category | Source | Update Frequency |
|----------|--------|------------------|
| Climate | NOAA | Annual |
| Home Prices | Zillow ZHVI | Monthly |
| Cost of Living | BLS | Quarterly |
| Demographics | US Census | Annual |
| Walk/Transit Score | WalkScore.com | As needed |
| Crime | FBI UCR | Annual |
| Political | Election results | After elections |

## Future API Integration

See `data.md` for planned API integrations:
- Zillow API for live ZHVI updates
- Census API for demographics
- BLS API for cost of living
