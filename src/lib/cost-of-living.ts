/**
 * Cost of Living Calculations
 * 
 * These are derived metrics calculated from BEA data, not raw API data.
 * 
 * The "True" Cost of Living combines:
 * - Gross Income
 * - Total Taxes (Federal + State + Local)
 * - Regional Price Parity (cost of goods/services/housing)
 * 
 * Formula:
 *   True Purchasing Power = (Gross Income - Total Taxes) / (RPP / 100)
 * 
 * Since BEA provides "Disposable Personal Income" (income after taxes),
 * we can simplify to:
 *   True Purchasing Power = Disposable Income / (RPP / 100)
 * 
 * What's included where:
 * ┌─────────────────────┬──────────────────┬─────────────────────┐
 * │ Feature             │ In RPP Index?    │ In BEA Taxes?       │
 * ├─────────────────────┼──────────────────┼─────────────────────┤
 * │ Rent / Housing      │ Yes (primary)    │ No                  │
 * │ Groceries / Goods   │ Yes              │ No                  │
 * │ State Income Tax    │ No               │ Yes                 │
 * │ Sales Tax           │ Yes (in prices)  │ No                  │
 * │ Property Tax        │ No (usually)     │ Yes (separate)      │
 * │ Federal Income Tax  │ No               │ Yes                 │
 * └─────────────────────┴──────────────────┴─────────────────────┘
 */

export interface BEAMetrics {
  purchasingPower?: {
    realPersonalIncome: number | null;
    realPerCapitaIncome: number | null;
  };
  regionalPriceParity?: {
    allItems: number | null;
    goods: number | null;
    housing: number | null;
    utilities: number | null;
    otherServices: number | null;
  };
  taxes?: {
    state: string;
    effectiveTaxRate: number | null;
    perCapitaIncome: number | null;
    perCapitaDisposable: number | null;
    federalTaxes: number | null;
    stateTaxes: number | null;
    localTaxes: number | null;
    totalTaxes: number | null;
  };
  year?: string;
}

export interface TrueCostOfLiving {
  // Core calculated metric
  truePurchasingPower: number | null;        // Disposable income adjusted for local prices
  
  // Index relative to national average (100 = average)
  truePurchasingPowerIndex: number | null;   // Higher = better purchasing power
  
  // Component breakdown
  grossIncome: number | null;                // Per capita personal income
  afterTaxIncome: number | null;             // Per capita disposable income
  effectiveTaxRate: number | null;           // % of income paid in taxes
  costOfLivingIndex: number | null;          // RPP (100 = national average)
  housingCostIndex: number | null;           // RPP for rents specifically
  
  // Interpretation helpers
  taxBurdenRating: "low" | "moderate" | "high" | "very-high" | null;
  costOfLivingRating: "very-low" | "low" | "moderate" | "high" | "very-high" | null;
  overallValueRating: "excellent" | "good" | "moderate" | "poor" | "very-poor" | null;
}

// US National average per capita disposable income (2022)
// Source: BEA - used to calculate index
const NATIONAL_PER_CAPITA_DISPOSABLE = 56014;

/**
 * Calculate the "true" cost of living metrics from BEA data
 */
export function calculateTrueCostOfLiving(bea: BEAMetrics | undefined): TrueCostOfLiving {
  if (!bea) {
    return createEmptyResult();
  }

  const grossIncome = bea.taxes?.perCapitaIncome ?? null;
  const afterTaxIncome = bea.taxes?.perCapitaDisposable ?? null;
  const effectiveTaxRate = bea.taxes?.effectiveTaxRate ?? null;
  const costOfLivingIndex = bea.regionalPriceParity?.allItems ?? null;
  const housingCostIndex = bea.regionalPriceParity?.housing ?? null;

  // Calculate true purchasing power
  // Formula: Disposable Income / (RPP / 100)
  let truePurchasingPower: number | null = null;
  if (afterTaxIncome !== null && costOfLivingIndex !== null && costOfLivingIndex > 0) {
    truePurchasingPower = Math.round(afterTaxIncome / (costOfLivingIndex / 100));
  }

  // Calculate index relative to national average
  let truePurchasingPowerIndex: number | null = null;
  if (truePurchasingPower !== null) {
    truePurchasingPowerIndex = Math.round((truePurchasingPower / NATIONAL_PER_CAPITA_DISPOSABLE) * 100 * 10) / 10;
  }

  return {
    truePurchasingPower,
    truePurchasingPowerIndex,
    grossIncome,
    afterTaxIncome,
    effectiveTaxRate,
    costOfLivingIndex,
    housingCostIndex,
    taxBurdenRating: getTaxBurdenRating(effectiveTaxRate),
    costOfLivingRating: getCostOfLivingRating(costOfLivingIndex),
    overallValueRating: getOverallValueRating(truePurchasingPowerIndex),
  };
}

/**
 * Get a human-readable rating for tax burden
 */
function getTaxBurdenRating(rate: number | null): TrueCostOfLiving["taxBurdenRating"] {
  if (rate === null) return null;
  if (rate < 12) return "low";
  if (rate < 15) return "moderate";
  if (rate < 18) return "high";
  return "very-high";
}

/**
 * Get a human-readable rating for cost of living
 */
function getCostOfLivingRating(rpp: number | null): TrueCostOfLiving["costOfLivingRating"] {
  if (rpp === null) return null;
  if (rpp < 90) return "very-low";
  if (rpp < 97) return "low";
  if (rpp < 103) return "moderate";
  if (rpp < 115) return "high";
  return "very-high";
}

/**
 * Get a human-readable rating for overall value (purchasing power)
 */
function getOverallValueRating(index: number | null): TrueCostOfLiving["overallValueRating"] {
  if (index === null) return null;
  if (index >= 110) return "excellent";
  if (index >= 102) return "good";
  if (index >= 95) return "moderate";
  if (index >= 85) return "poor";
  return "very-poor";
}

function createEmptyResult(): TrueCostOfLiving {
  return {
    truePurchasingPower: null,
    truePurchasingPowerIndex: null,
    grossIncome: null,
    afterTaxIncome: null,
    effectiveTaxRate: null,
    costOfLivingIndex: null,
    housingCostIndex: null,
    taxBurdenRating: null,
    costOfLivingRating: null,
    overallValueRating: null,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number | null): string {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number | null, decimals: number = 1): string {
  if (value === null) return "N/A";
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format index value for display
 */
export function formatIndex(value: number | null): string {
  if (value === null) return "N/A";
  return value.toFixed(1);
}

/**
 * Get color class for ratings
 */
export function getRatingColor(
  rating: string | null,
  type: "tax" | "col" | "value"
): string {
  if (!rating) return "text-muted-foreground";

  const colors: Record<string, Record<string, string>> = {
    tax: {
      low: "text-green-600 dark:text-green-400",
      moderate: "text-yellow-600 dark:text-yellow-400",
      high: "text-orange-600 dark:text-orange-400",
      "very-high": "text-red-600 dark:text-red-400",
    },
    col: {
      "very-low": "text-green-600 dark:text-green-400",
      low: "text-green-500 dark:text-green-500",
      moderate: "text-yellow-600 dark:text-yellow-400",
      high: "text-orange-600 dark:text-orange-400",
      "very-high": "text-red-600 dark:text-red-400",
    },
    value: {
      excellent: "text-green-600 dark:text-green-400",
      good: "text-green-500 dark:text-green-500",
      moderate: "text-yellow-600 dark:text-yellow-400",
      poor: "text-orange-600 dark:text-orange-400",
      "very-poor": "text-red-600 dark:text-red-400",
    },
  };

  return colors[type]?.[rating] ?? "text-muted-foreground";
}
