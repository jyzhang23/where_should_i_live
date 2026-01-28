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
 * 
 * PERSONA-BASED ADJUSTMENTS:
 * 
 * 1. RENTER: Standard BEA RPP is most accurate (heavily weighted by rental data)
 *    - Optionally include utilities (important for older cities like Boston, Philly)
 * 
 * 2. HOMEOWNER (Fixed Mortgage): Exclude housing from RPP since mortgage is locked
 *    - Use only Goods + Services indices
 *    - Formula: (0.70 × Goods Index) + (0.30 × Services Index)
 * 
 * 3. PROSPECTIVE BUYER: BEA data is "lagged" - reflects locked-in 3% mortgages
 *    - Must use current home prices + mortgage rates instead
 *    - Uses Zillow median price with mortgage-to-income calculation
 */

export type HousingSituation = "renter" | "homeowner" | "prospective-buyer";
export type WorkSituation = "standard" | "local-earner" | "retiree";

export interface CostOfLivingOptions {
  housingSituation: HousingSituation;
  includeUtilities: boolean;
  // For prospective buyer calculation
  medianHomePrice?: number | null;
  currentMortgageRate?: number; // Default ~7% in 2026
  
  // Work situation affects the INCOME numerator
  workSituation?: WorkSituation;
  // Median household income from Census ACS (for "standard" persona)
  medianHouseholdIncome?: number | null;
  // Fixed income for retiree persona
  retireeFixedIncome?: number;
}

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
  grossIncome: number | null;                // Per capita personal income (BEA)
  afterTaxIncome: number | null;             // Per capita disposable income (BEA)
  effectiveTaxRate: number | null;           // % of income paid in taxes
  costOfLivingIndex: number | null;          // RPP used (varies by persona)
  housingCostIndex: number | null;           // RPP for rents specifically
  
  // Work situation persona
  workSituation: WorkSituation;
  selectedIncome: number | null;             // The income used based on work situation
  selectedAfterTaxIncome: number | null;     // After-tax income for the selected persona
  
  // Housing situation persona
  housingPersona: HousingSituation;
  adjustedRPP: number | null;                // RPP adjusted for housing persona
  monthlyMortgage: number | null;            // For prospective buyers only
  
  // Sub-indices (for display)
  goodsIndex: number | null;
  servicesIndex: number | null;
  utilitiesIndex: number | null;
  
  // Interpretation helpers
  taxBurdenRating: "low" | "moderate" | "high" | "very-high" | null;
  costOfLivingRating: "very-low" | "low" | "moderate" | "high" | "very-high" | null;
  overallValueRating: "excellent" | "good" | "moderate" | "poor" | "very-poor" | null;
}

// US National average per capita disposable income (2022)
// Source: BEA - used to calculate index for high-earner persona
const NATIONAL_PER_CAPITA_DISPOSABLE = 56014;

// US National median household income (2022)
// Source: Census ACS - used for standard professional persona
const NATIONAL_MEDIAN_HOUSEHOLD_INCOME = 74580;

// Average effective tax rate (federal + state + local) for median earners
// This is lower than the rate for high earners
const AVERAGE_TAX_RATE = 0.22; // ~22% for median household income

// Current mortgage rate (2026) - for prospective buyer calculation
const DEFAULT_MORTGAGE_RATE = 0.07; // 7%
const MORTGAGE_TERM_YEARS = 30;

// Default retiree fixed income
const DEFAULT_RETIREE_INCOME = 50000;

// Default options for backward compatibility
const DEFAULT_OPTIONS: CostOfLivingOptions = {
  housingSituation: "renter",
  includeUtilities: true,
  workSituation: "local-earner",
};

/**
 * Calculate monthly mortgage payment
 * Standard formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
function calculateMonthlyMortgage(
  homePrice: number,
  annualRate: number,
  years: number,
  downPaymentPercent: number = 0.20
): number {
  const principal = homePrice * (1 - downPaymentPercent);
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  
  if (monthlyRate === 0) return principal / numPayments;
  
  const payment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return Math.round(payment);
}

/**
 * Calculate persona-adjusted RPP
 * 
 * RENTER: Standard allItems RPP (+ utilities if enabled)
 * HOMEOWNER: Goods + Services only (70/30 split), exclude housing
 * PROSPECTIVE BUYER: Use home price-to-income ratio instead of RPP housing
 */
function calculateAdjustedRPP(
  bea: BEAMetrics,
  options: CostOfLivingOptions
): { adjustedRPP: number | null; monthlyMortgage: number | null } {
  const rpp = bea.regionalPriceParity;
  
  if (!rpp) {
    return { adjustedRPP: null, monthlyMortgage: null };
  }

  switch (options.housingSituation) {
    case "renter": {
      // Standard BEA RPP is most accurate for renters
      // Optionally adjust for utilities (important for older cities)
      let base = rpp.allItems;
      if (base !== null && options.includeUtilities && rpp.utilities !== null) {
        // Utilities are typically ~5% of cost of living
        // If utilities are significantly above average, bump up the index
        const utilitiesDiff = (rpp.utilities - 100) * 0.05;
        base = base + utilitiesDiff;
      }
      return { adjustedRPP: base, monthlyMortgage: null };
    }

    case "homeowner": {
      // Existing homeowner with fixed mortgage - exclude housing costs
      // Formula: 70% Goods + 30% Other Services (excluding rent)
      const goods = rpp.goods;
      const services = rpp.otherServices; // "Other" services, not including rent
      
      if (goods !== null && services !== null) {
        const adjusted = (goods * 0.70) + (services * 0.30);
        return { adjustedRPP: adjusted, monthlyMortgage: null };
      }
      
      // Fallback: if we only have goods, use that
      if (goods !== null) {
        return { adjustedRPP: goods, monthlyMortgage: null };
      }
      
      return { adjustedRPP: rpp.allItems, monthlyMortgage: null };
    }

    case "prospective-buyer": {
      // Prospective buyer needs current market prices, not lagged BEA data
      // Calculate a "buyer-adjusted" index using home price and mortgage rates
      const homePrice = options.medianHomePrice;
      const mortgageRate = options.currentMortgageRate ?? DEFAULT_MORTGAGE_RATE;
      
      if (homePrice && homePrice > 0) {
        const monthlyMortgage = calculateMonthlyMortgage(
          homePrice,
          mortgageRate,
          MORTGAGE_TERM_YEARS
        );
        
        // National average monthly mortgage payment (2026 estimate)
        // Based on ~$400K median home at 7% = ~$2,128/month
        const nationalAvgMortgage = 2128;
        
        // Create a housing index based on mortgage payment
        const housingIndex = (monthlyMortgage / nationalAvgMortgage) * 100;
        
        // Blend: 40% housing (mortgage), 35% goods, 25% services
        // This weights housing heavily since it's the biggest concern for buyers
        const goods = rpp.goods ?? 100;
        const services = rpp.otherServices ?? 100;
        
        const adjusted = (housingIndex * 0.40) + (goods * 0.35) + (services * 0.25);
        
        return { adjustedRPP: adjusted, monthlyMortgage };
      }
      
      // Fallback to standard RPP if no home price data
      return { adjustedRPP: rpp.allItems, monthlyMortgage: null };
    }

    default:
      return { adjustedRPP: rpp.allItems, monthlyMortgage: null };
  }
}

/**
 * Calculate selected income based on work situation persona
 * 
 * LOCAL-EARNER: Uses LOCAL Per Capita Income (BEA) - reflects local earning potential
 *           This shows "how well off are local earners in this city?"
 * STANDARD: Uses FIXED national median income - answers "where can I afford to live?"
 *           This is pure affordability - same income in all cities, just compare costs.
 * RETIREE: Uses user-defined fixed income
 */
function calculateSelectedIncome(
  bea: BEAMetrics,
  options: CostOfLivingOptions
): { selectedIncome: number | null; selectedAfterTaxIncome: number | null; nationalBaseline: number } {
  const workSituation = options.workSituation ?? "local-earner";
  const beaTaxRate = bea.taxes?.effectiveTaxRate ?? null;
  
  switch (workSituation) {
    case "local-earner": {
      // Use BEA per capita income - reflects local earning potential
      // This includes the income boost from local job markets
      const income = bea.taxes?.perCapitaIncome ?? null;
      const afterTax = bea.taxes?.perCapitaDisposable ?? null;
      return { 
        selectedIncome: income, 
        selectedAfterTaxIncome: afterTax,
        nationalBaseline: NATIONAL_PER_CAPITA_DISPOSABLE
      };
    }
    
    case "retiree": {
      // Use user-defined fixed income
      const income = options.retireeFixedIncome ?? DEFAULT_RETIREE_INCOME;
      // Retirees typically have lower effective tax rates (~15%)
      const retireeEffectiveTaxRate = 0.15;
      const afterTax = Math.round(income * (1 - retireeEffectiveTaxRate));
      // Baseline is same fixed income - comparing how far it goes in each city
      return {
        selectedIncome: income,
        selectedAfterTaxIncome: afterTax,
        nationalBaseline: afterTax  // Same amount - index shows pure cost impact
      };
    }
    
    case "standard":
    default: {
      // PURE AFFORDABILITY: Use fixed national median income for ALL cities
      // This answers: "If I have average income, where can I afford to live?"
      // 
      // We use a fixed income amount and only vary the local tax rate and RPP
      // This makes expensive cities (SF, NYC) score POORLY as they should
      const income = NATIONAL_MEDIAN_HOUSEHOLD_INCOME;
      
      // Apply local tax rate to see what you'd actually keep
      // (higher tax states reduce your after-tax income)
      const effectiveRate = beaTaxRate !== null 
        ? Math.min(beaTaxRate / 100, 0.25)  // Cap at 25% to be realistic for median earners
        : AVERAGE_TAX_RATE;
      
      const afterTax = Math.round(income * (1 - effectiveRate));
      
      // Baseline is national median after average taxes
      const nationalMedianAfterTax = Math.round(NATIONAL_MEDIAN_HOUSEHOLD_INCOME * (1 - AVERAGE_TAX_RATE));
      
      return {
        selectedIncome: income,
        selectedAfterTaxIncome: afterTax,
        nationalBaseline: nationalMedianAfterTax
      };
    }
  }
}

/**
 * Calculate the "true" cost of living metrics from BEA data
 * 
 * @param bea - BEA metrics for the city
 * @param options - Calculation options (housing persona, work persona, utilities, etc.)
 */
export function calculateTrueCostOfLiving(
  bea: BEAMetrics | undefined,
  options: CostOfLivingOptions = DEFAULT_OPTIONS
): TrueCostOfLiving {
  const workSituation = options.workSituation ?? "standard";
  
  if (!bea) {
    return createEmptyResult(options.housingSituation, workSituation);
  }

  // Legacy fields (for display purposes)
  const grossIncome = bea.taxes?.perCapitaIncome ?? null;
  const afterTaxIncome = bea.taxes?.perCapitaDisposable ?? null;
  const effectiveTaxRate = bea.taxes?.effectiveTaxRate ?? null;
  const housingCostIndex = bea.regionalPriceParity?.housing ?? null;
  
  // Get housing persona-adjusted RPP (cost denominator)
  const { adjustedRPP, monthlyMortgage } = calculateAdjustedRPP(bea, options);
  
  // Get work persona-adjusted income (income numerator)
  const { selectedIncome, selectedAfterTaxIncome, nationalBaseline } = calculateSelectedIncome(bea, options);

  // Calculate true purchasing power using work-adjusted income and housing-adjusted RPP
  // Formula: Selected After-Tax Income / (Adjusted RPP / 100)
  let truePurchasingPower: number | null = null;
  if (selectedAfterTaxIncome !== null && adjustedRPP !== null && adjustedRPP > 0) {
    truePurchasingPower = Math.round(selectedAfterTaxIncome / (adjustedRPP / 100));
  }

  // Calculate index relative to appropriate national baseline
  let truePurchasingPowerIndex: number | null = null;
  if (truePurchasingPower !== null && nationalBaseline > 0) {
    truePurchasingPowerIndex = Math.round((truePurchasingPower / nationalBaseline) * 100 * 10) / 10;
  }

  return {
    truePurchasingPower,
    truePurchasingPowerIndex,
    grossIncome,
    afterTaxIncome,
    effectiveTaxRate,
    costOfLivingIndex: adjustedRPP,
    housingCostIndex,
    workSituation,
    selectedIncome,
    selectedAfterTaxIncome,
    housingPersona: options.housingSituation,
    adjustedRPP,
    monthlyMortgage,
    goodsIndex: bea.regionalPriceParity?.goods ?? null,
    servicesIndex: bea.regionalPriceParity?.otherServices ?? null,
    utilitiesIndex: bea.regionalPriceParity?.utilities ?? null,
    taxBurdenRating: getTaxBurdenRating(effectiveTaxRate),
    costOfLivingRating: getCostOfLivingRating(adjustedRPP),
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

function createEmptyResult(
  housingPersona: HousingSituation = "renter",
  workSituation: WorkSituation = "standard"
): TrueCostOfLiving {
  return {
    truePurchasingPower: null,
    truePurchasingPowerIndex: null,
    grossIncome: null,
    afterTaxIncome: null,
    effectiveTaxRate: null,
    costOfLivingIndex: null,
    housingCostIndex: null,
    workSituation,
    selectedIncome: null,
    selectedAfterTaxIncome: null,
    housingPersona,
    adjustedRPP: null,
    monthlyMortgage: null,
    goodsIndex: null,
    servicesIndex: null,
    utilitiesIndex: null,
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
