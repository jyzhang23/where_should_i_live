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
  };
}

interface MetricsData {
  climate: {
    avgTemp: number | null;
    avgWinterTemp: number | null;
    avgSummerTemp: number | null;
    daysOfSunshine: number | null;
    daysOfRain: number | null;
  };
  cost: {
    medianHomePrice: number | null;
    costOfLivingIndex: number | null;
    stateTaxRate: number | null;
    propertyTaxRate: number | null;
  };
  demographics: {
    population: number | null;
    diversityIndex: number | null;
    eastAsianPercent: number | null;
    crimeRate: number | null;
  };
  quality: {
    qualityOfLifeScore: number | null;
    walkScore: number | null;
    transitScore: number | null;
    hasInternationalAirport: boolean;
    airportCode: string | null;
    healthScore: number | null;
    pollutionIndex: number | null;
    waterQualityIndex: number | null;
    trafficIndex: number | null;
    broadbandSpeed: number | null;
  };
  political: {
    cityDemocratPercent: number | null;
    stateDemocratPercent: number | null;
  };
}

interface ZHVIData {
  zillowRegionId: number;
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
    const cityMetrics = metrics[city.id];
    if (!cityMetrics) {
      console.warn(`No metrics found for ${city.name}, skipping...`);
      continue;
    }

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

    // Prepare metrics data
    const metricsData = {
      avgTemp: cityMetrics.climate.avgTemp,
      avgWinterTemp: cityMetrics.climate.avgWinterTemp,
      avgSummerTemp: cityMetrics.climate.avgSummerTemp,
      daysOfSunshine: cityMetrics.climate.daysOfSunshine,
      daysOfRain: cityMetrics.climate.daysOfRain,
      diversityIndex: cityMetrics.demographics.diversityIndex,
      population: cityMetrics.demographics.population,
      eastAsianPercent: cityMetrics.demographics.eastAsianPercent,
      medianHomePrice: cityMetrics.cost.medianHomePrice,
      stateTaxRate: cityMetrics.cost.stateTaxRate,
      propertyTaxRate: cityMetrics.cost.propertyTaxRate,
      costOfLivingIndex: cityMetrics.cost.costOfLivingIndex,
      crimeRate: cityMetrics.demographics.crimeRate,
      walkScore: cityMetrics.quality.walkScore,
      transitScore: cityMetrics.quality.transitScore,
      avgBroadbandSpeed: cityMetrics.quality.broadbandSpeed,
      hasInternationalAirport: cityMetrics.quality.hasInternationalAirport,
      healthScore: cityMetrics.quality.healthScore,
      pollutionIndex: cityMetrics.quality.pollutionIndex,
      waterQualityIndex: cityMetrics.quality.waterQualityIndex,
      trafficIndex: cityMetrics.quality.trafficIndex,
      qualityOfLifeScore: cityMetrics.quality.qualityOfLifeScore,
      cityDemocratPercent: cityMetrics.political.cityDemocratPercent,
      stateDemocratPercent: cityMetrics.political.stateDemocratPercent,
      nflTeams: city.sports.nfl.join(", ") || null,
      nbaTeams: city.sports.nba.join(", ") || null,
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
