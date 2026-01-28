/**
 * Seed the database from JSON data files
 * 
 * Reads from:
 * - data/cities.json - City definitions
 * - data/metrics.json - Current metrics
 * - data/zhvi-history.json - Price history
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface CityData {
  id: string;
  name: string;
  state: string;
  zillowRegionId: number | null;
  zillowRegionName: string | null;
  sports: {
    nfl: string[];
    nba: string[];
    mlb: string[];
    nhl: string[];
    mls: string[];
  };
}

// Flexible interface to handle both old and new metrics formats
interface MetricsData {
  climate?: {
    avgTemp?: number | null;
    avgWinterTemp?: number | null;
    avgSummerTemp?: number | null;
    daysOfSunshine?: number | null;
    daysOfRain?: number | null;
  };
  cost?: {
    medianHomePrice?: number | null;
    costOfLivingIndex?: number | null;
    stateTaxRate?: number | null;
    propertyTaxRate?: number | null;
  };
  demographics?: {
    population?: number | null;
    diversityIndex?: number | null;
    eastAsianPercent?: number | null;
    crimeRate?: number | null;
  };
  quality?: {
    qualityOfLifeScore?: number | null;
    walkScore?: number | null;
    transitScore?: number | null;
    hasInternationalAirport?: boolean;
    airportCode?: string | null;
    healthScore?: number | null;
    pollutionIndex?: number | null;
    waterQualityIndex?: number | null;
    trafficIndex?: number | null;
    broadbandSpeed?: number | null;
  };
  political?: {
    cityDemocratPercent?: number | null;
    stateDemocratPercent?: number | null;
  };
  // New format fields
  census?: {
    totalPopulation?: number | null;
    diversityIndex?: number | null;
  };
  qol?: {
    crime?: {
      violentCrimeRate?: number | null;
    };
    walkability?: {
      walkScore?: number | null;
    };
  };
}

interface ZHVIData {
  zillowRegionId: number;
  geography?: "msa" | "city";  // New field in v2.0 schema
  history: { date: string; value: number }[];
}

async function main() {
  console.log("Starting database seed from JSON files...");

  const dataDir = join(__dirname, "../data");

  // Read JSON files
  const citiesFile = JSON.parse(readFileSync(join(dataDir, "cities.json"), "utf-8"));
  const metricsFile = JSON.parse(readFileSync(join(dataDir, "metrics.json"), "utf-8"));
  const zhviFile = JSON.parse(readFileSync(join(dataDir, "zhvi-history.json"), "utf-8"));

  const cities: CityData[] = citiesFile.cities;
  const metrics: Record<string, MetricsData> = metricsFile.cities;
  const zhviHistory: Record<string, ZHVIData> = zhviFile.cities;

  console.log(`Found ${cities.length} cities to import`);

  let citiesCreated = 0;
  let citiesUpdated = 0;

  for (const city of cities) {
    const cityMetrics = metrics[city.id] || {};
    // Continue even if metrics are sparse - we'll use defaults

    const zhvi = zhviHistory[city.id];

    // Check if city exists
    const existingCity = await prisma.city.findUnique({
      where: { name: city.name },
    });

    // Prepare city data
    const cityData = {
      name: city.name,
      state: city.state,
      regionId: city.zillowRegionId, // Prisma schema uses 'regionId'
      latitude: null as number | null,
      longitude: null as number | null,
    };

    // Prepare metrics data with optional chaining for flexible format
    const metricsData = {
      // Climate
      avgTemp: cityMetrics.climate?.avgTemp ?? null,
      avgWinterTemp: cityMetrics.climate?.avgWinterTemp ?? null,
      avgSummerTemp: cityMetrics.climate?.avgSummerTemp ?? null,
      daysOfSunshine: cityMetrics.climate?.daysOfSunshine ?? null,
      daysOfRain: cityMetrics.climate?.daysOfRain ?? null,
      // Demographics (try both old and new format)
      diversityIndex: cityMetrics.demographics?.diversityIndex ?? cityMetrics.census?.diversityIndex ?? null,
      population: cityMetrics.demographics?.population ?? cityMetrics.census?.totalPopulation ?? null,
      eastAsianPercent: cityMetrics.demographics?.eastAsianPercent ?? null,
      // Cost
      medianHomePrice: cityMetrics.cost?.medianHomePrice ?? null,
      stateTaxRate: cityMetrics.cost?.stateTaxRate ?? null,
      propertyTaxRate: cityMetrics.cost?.propertyTaxRate ?? null,
      costOfLivingIndex: cityMetrics.cost?.costOfLivingIndex ?? null,
      // Crime (try both formats)
      crimeRate: cityMetrics.demographics?.crimeRate ?? cityMetrics.qol?.crime?.violentCrimeRate ?? null,
      // Quality (try both formats)
      walkScore: cityMetrics.quality?.walkScore ?? cityMetrics.qol?.walkability?.walkScore ?? null,
      transitScore: cityMetrics.quality?.transitScore ?? null,
      avgBroadbandSpeed: cityMetrics.quality?.broadbandSpeed ?? null,
      hasInternationalAirport: cityMetrics.quality?.hasInternationalAirport ?? false,
      healthScore: cityMetrics.quality?.healthScore ?? null,
      pollutionIndex: cityMetrics.quality?.pollutionIndex ?? null,
      waterQualityIndex: cityMetrics.quality?.waterQualityIndex ?? null,
      trafficIndex: cityMetrics.quality?.trafficIndex ?? null,
      qualityOfLifeScore: cityMetrics.quality?.qualityOfLifeScore ?? null,
      // Political
      cityDemocratPercent: cityMetrics.political?.cityDemocratPercent ?? null,
      stateDemocratPercent: cityMetrics.political?.stateDemocratPercent ?? null,
      // Sports (5 Major Leagues)
      nflTeams: city.sports?.nfl?.join(", ") || null,
      nbaTeams: city.sports?.nba?.join(", ") || null,
      mlbTeams: city.sports?.mlb?.join(", ") || null,
      nhlTeams: city.sports?.nhl?.join(", ") || null,
      mlsTeams: city.sports?.mls?.join(", ") || null,
      dataAsOf: new Date(),
    };

    if (existingCity) {
      // Update existing city
      await prisma.city.update({
        where: { id: existingCity.id },
        data: {
          ...cityData,
          metrics: {
            upsert: {
              create: metricsData,
              update: metricsData,
            },
          },
        },
      });
      citiesUpdated++;
    } else {
      // Create new city
      await prisma.city.create({
        data: {
          ...cityData,
          metrics: {
            create: metricsData,
          },
        },
      });
      citiesCreated++;
    }

    // Handle ZHVI history
    if (zhvi && zhvi.history.length > 0) {
      const dbCity = await prisma.city.findUnique({
        where: { name: city.name },
      });

      if (dbCity) {
        // Delete existing history
        await prisma.zHVIDataPoint.deleteMany({
          where: { cityId: dbCity.id },
        });

        // Insert new history (batch for performance)
        const historyData = zhvi.history.map((point) => ({
          cityId: dbCity.id,
          date: new Date(point.date),
          value: point.value,
        }));

        // Insert in batches of 100
        for (let i = 0; i < historyData.length; i += 100) {
          const batch = historyData.slice(i, i + 100);
          await prisma.zHVIDataPoint.createMany({
            data: batch,
          });
        }
      }
    }

    console.log(`  ✓ ${city.name}`);
  }

  // Log the refresh
  await prisma.dataRefreshLog.create({
    data: {
      source: "seed",
      status: "success",
      recordsUpdated: citiesCreated + citiesUpdated,
    },
  });

  console.log(`\nSeed complete!`);
  console.log(`  Created: ${citiesCreated} cities`);
  console.log(`  Updated: ${citiesUpdated} cities`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
