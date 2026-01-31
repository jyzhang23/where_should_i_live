/**
 * BEA Data Pull Module
 * 
 * Fetches Regional Price Parity data from Bureau of Economic Analysis
 * Used by both CLI and API routes.
 */

import { createAdminLogger } from "@/lib/admin-logger";
import { DataDirectory, loadCities, loadMetrics, saveMetrics } from "../helpers";
import { PullResult, CityWithBeaFips } from "./types";

const logger = createAdminLogger("bea-pull");

const BEA_API_KEY = process.env.BEA_API_KEY;
const BEA_API_URL = "https://apps.bea.gov/api/data/";

// State abbreviation to BEA FIPS code mapping
const STATE_FIPS: Record<string, string> = {
  AL: "01000", AK: "02000", AZ: "04000", AR: "05000", CA: "06000",
  CO: "08000", CT: "09000", DE: "10000", DC: "11000", FL: "12000",
  GA: "13000", HI: "15000", ID: "16000", IL: "17000", IN: "18000",
  IA: "19000", KS: "20000", KY: "21000", LA: "22000", ME: "23000",
  MD: "24000", MA: "25000", MI: "26000", MN: "27000", MS: "28000",
  MO: "29000", MT: "30000", NE: "31000", NV: "32000", NH: "33000",
  NJ: "34000", NM: "35000", NY: "36000", NC: "37000", ND: "38000",
  OH: "39000", OK: "40000", OR: "41000", PA: "42000", RI: "44000",
  SC: "45000", SD: "46000", TN: "47000", TX: "48000", UT: "49000",
  VT: "50000", VA: "51000", WA: "53000", WV: "54000", WI: "55000",
  WY: "56000",
};

interface BEADataPoint {
  GeoFips: string;
  GeoName: string;
  TimePeriod: string;
  DataValue: string;
}

interface BEAResponse {
  BEAAPI: {
    Results?: {
      Data?: BEADataPoint[];
    };
    Error?: {
      ErrorDetail?: {
        Description?: string;
      };
    };
  };
}

interface RPPData {
  realPersonalIncome: number | null;
  realPerCapitaIncome: number | null;
  allItems: number | null;
  goods: number | null;
  rents: number | null;
  utilities: number | null;
  otherServices: number | null;
  year: string;
}

async function fetchBEAData(
  geoFipsList: string[],
  lineCode: string,
  year: string,
  tableName: string = "MARPP"
): Promise<Map<string, number>> {
  const geoFips = geoFipsList.join(",");
  const url = `${BEA_API_URL}?UserID=${BEA_API_KEY}&method=GetData&datasetname=Regional&TableName=${tableName}&LineCode=${lineCode}&GeoFips=${geoFips}&Year=${year}&ResultFormat=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`BEA API returned ${response.status}`);
  }

  const data: BEAResponse = await response.json();

  if (data.BEAAPI.Error) {
    throw new Error(
      data.BEAAPI.Error.ErrorDetail?.Description || "BEA API error"
    );
  }

  const result = new Map<string, number>();
  const items = data.BEAAPI.Results?.Data || [];

  for (const item of items) {
    const value = parseFloat(item.DataValue);
    if (!isNaN(value)) {
      result.set(item.GeoFips, value);
    }
  }

  return result;
}

function getPrimaryState(stateField: string): string {
  return stateField.split("/")[0].trim();
}

/**
 * Pull BEA data for all cities
 */
export async function pullBEAData(
  dataDir: DataDirectory,
  onProgress?: (message: string) => void
): Promise<PullResult> {
  const log = (msg: string) => {
    logger.info(msg);
    onProgress?.(msg);
  };

  if (!BEA_API_KEY) {
    return {
      success: false,
      error: "BEA_API_KEY not configured in environment",
    };
  }

  try {
    const cities = loadCities<CityWithBeaFips>(dataDir);
    const metricsFile = loadMetrics(dataDir);

    const geoFipsList = cities
      .filter((c) => c.beaGeoFips)
      .map((c) => c.beaGeoFips!);

    if (geoFipsList.length === 0) {
      return {
        success: false,
        error: "No cities have BEA GeoFips codes configured",
      };
    }

    const stateFipsList = [...new Set(
      cities
        .map((c) => STATE_FIPS[getPrimaryState(c.state)])
        .filter((f): f is string => !!f)
    )];

    const year = "2022";

    log(`Fetching BEA data for ${geoFipsList.length} metros...`);

    // Fetch all data types in parallel
    const [
      realPersonalIncome,
      realPerCapitaIncome,
      allItems,
      goods,
      rents,
      utilities,
      otherServices,
      statePersonalIncome,
      statePersonalTaxes,
      statePerCapitaIncome,
      statePerCapitaDisposable,
      stateFederalTaxes,
      stateStateTaxes,
      stateLocalTaxes,
    ] = await Promise.all([
      fetchBEAData(geoFipsList, "1", year),
      fetchBEAData(geoFipsList, "2", year),
      fetchBEAData(geoFipsList, "3", year),
      fetchBEAData(geoFipsList, "4", year),
      fetchBEAData(geoFipsList, "5", year),
      fetchBEAData(geoFipsList, "6", year),
      fetchBEAData(geoFipsList, "7", year),
      fetchBEAData(stateFipsList, "10", year, "SAINC50"),
      fetchBEAData(stateFipsList, "15", year, "SAINC50"),
      fetchBEAData(stateFipsList, "30", year, "SAINC50"),
      fetchBEAData(stateFipsList, "50", year, "SAINC50"),
      fetchBEAData(stateFipsList, "70", year, "SAINC50"),
      fetchBEAData(stateFipsList, "120", year, "SAINC50"),
      fetchBEAData(stateFipsList, "180", year, "SAINC50"),
    ]);

    let successCount = 0;
    let skipCount = 0;

    for (const city of cities) {
      if (!city.beaGeoFips) {
        skipCount++;
        continue;
      }

      const rppData: RPPData = {
        realPersonalIncome: realPersonalIncome.get(city.beaGeoFips) ?? null,
        realPerCapitaIncome: realPerCapitaIncome.get(city.beaGeoFips) ?? null,
        allItems: allItems.get(city.beaGeoFips) ?? null,
        goods: goods.get(city.beaGeoFips) ?? null,
        rents: rents.get(city.beaGeoFips) ?? null,
        utilities: utilities.get(city.beaGeoFips) ?? null,
        otherServices: otherServices.get(city.beaGeoFips) ?? null,
        year,
      };

      if (rppData.allItems === null) {
        skipCount++;
        continue;
      }

      if (!metricsFile.cities[city.id]) {
        metricsFile.cities[city.id] = {};
      }

      const stateFips = STATE_FIPS[getPrimaryState(city.state)];
      const stateIncome = stateFips ? statePersonalIncome.get(stateFips) : null;
      const stateTaxes = stateFips ? statePersonalTaxes.get(stateFips) : null;
      const federalTaxes = stateFips ? stateFederalTaxes.get(stateFips) : null;
      const stateTaxesOnly = stateFips ? stateStateTaxes.get(stateFips) : null;
      const localTaxes = stateFips ? stateLocalTaxes.get(stateFips) : null;
      const perCapitaIncome = stateFips ? statePerCapitaIncome.get(stateFips) : null;
      const perCapitaDisposable = stateFips ? statePerCapitaDisposable.get(stateFips) : null;

      const effectiveTaxRate = stateIncome && stateTaxes 
        ? Math.round((stateTaxes / stateIncome) * 10000) / 100
        : null;

      metricsFile.cities[city.id].bea = {
        purchasingPower: {
          realPersonalIncome: rppData.realPersonalIncome,
          realPerCapitaIncome: rppData.realPerCapitaIncome,
        },
        regionalPriceParity: {
          allItems: rppData.allItems,
          goods: rppData.goods,
          housing: rppData.rents,
          utilities: rppData.utilities,
          otherServices: rppData.otherServices,
        },
        taxes: {
          state: getPrimaryState(city.state),
          effectiveTaxRate,
          perCapitaIncome,
          perCapitaDisposable,
          federalTaxes,
          stateTaxes: stateTaxesOnly,
          localTaxes,
          totalTaxes: stateTaxes,
        },
        year: rppData.year,
        lastUpdated: new Date().toISOString().split("T")[0],
      };

      successCount++;
    }

    if (!metricsFile.sources) {
      metricsFile.sources = {};
    }
    metricsFile.sources.bea = "Bureau of Economic Analysis (Regional Price Parities)";
    metricsFile.lastUpdated = new Date().toISOString().split("T")[0];

    saveMetrics(dataDir, metricsFile);

    return {
      success: successCount > 0,
      message: `BEA data pulled: ${successCount} cities updated, ${skipCount} skipped`,
      stats: {
        citiesUpdated: successCount,
        citiesSkipped: skipCount,
        dataYear: year,
      },
    };
  } catch (error) {
    logger.error("BEA pull failed", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
