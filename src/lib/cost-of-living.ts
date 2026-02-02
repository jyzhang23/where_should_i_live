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
  // State name for accurate tax calculation (required for retiree/standard personas)
  state?: string;
  // Property tax rate (decimal, e.g., 0.012 = 1.2%) for homeowner calculations
  propertyTaxRate?: number | null;
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
  
  // Tax calculation breakdown (for tooltips)
  taxBreakdown: {
    stateName: string | null;
    federalTax: number | null;
    stateTax: number | null;
    propertyTax: number | null;
    totalTax: number | null;
    calculatedEffectiveRate: number | null;
    method: "bea" | "calculated";  // BEA = pre-calculated, calculated = our formula
  } | null;
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

// Federal tax rates (2024 brackets, married filing jointly simplified)
// These are effective rates, not marginal rates
const FEDERAL_EFFECTIVE_TAX_RATES: { threshold: number; rate: number }[] = [
  { threshold: 23200, rate: 0.10 },   // 10% bracket
  { threshold: 94300, rate: 0.12 },   // 12% effective for ~$50K
  { threshold: 201050, rate: 0.18 },  // ~18% effective for ~$100K
  { threshold: 383900, rate: 0.22 },  // ~22% effective for ~$200K
  { threshold: Infinity, rate: 0.28 }, // Higher incomes
];

// State income tax rates (2024) - top marginal rate for reference
// For simplicity, we use a blended effective rate that's lower than top marginal
// States without income tax: AK, FL, NV, NH (dividends only), SD, TN (dividends only), TX, WA, WY
const STATE_INCOME_TAX_RATES: Record<string, number> = {
  // No income tax states
  "Alaska": 0,
  "Florida": 0,
  "Nevada": 0,
  "New Hampshire": 0,    // No tax on wages (only dividends/interest)
  "South Dakota": 0,
  "Tennessee": 0,        // No tax on wages (only dividends/interest until 2021)
  "Texas": 0,
  "Washington": 0,
  "Wyoming": 0,
  
  // Low tax states (effective rate ~2-3% for median income)
  "Arizona": 0.025,
  "Colorado": 0.044,
  "Illinois": 0.0495,    // Flat rate
  "Indiana": 0.0315,     // Flat rate
  "Kentucky": 0.04,      // Flat rate
  "Michigan": 0.0425,    // Flat rate
  "North Carolina": 0.0475, // Flat rate
  "North Dakota": 0.0195,
  "Pennsylvania": 0.0307, // Flat rate
  "Utah": 0.0465,        // Flat rate
  
  // Moderate tax states (effective rate ~4-5% for median income)
  "Alabama": 0.04,
  "Georgia": 0.055,
  "Idaho": 0.058,
  "Iowa": 0.044,
  "Kansas": 0.057,
  "Louisiana": 0.0425,
  "Maine": 0.0715,
  "Maryland": 0.0575,
  "Massachusetts": 0.05,  // Flat rate (plus 4% surtax on >$1M)
  "Mississippi": 0.05,
  "Missouri": 0.048,
  "Montana": 0.059,
  "Nebraska": 0.0584,
  "New Mexico": 0.049,
  "Ohio": 0.035,
  "Oklahoma": 0.0475,
  "Rhode Island": 0.0599,
  "South Carolina": 0.064,
  "Virginia": 0.0575,
  "West Virginia": 0.055,
  "Wisconsin": 0.0765,
  
  // High tax states (effective rate ~6-8% for median income)
  "Arkansas": 0.047,
  "Connecticut": 0.0699,
  "Delaware": 0.066,
  "District of Columbia": 0.085,
  "Hawaii": 0.0825,
  "Minnesota": 0.0785,
  "New Jersey": 0.0637,
  "New York": 0.0685,    // Plus NYC local tax ~3.9% for NYC residents
  "Oregon": 0.099,
  "Vermont": 0.0875,
  
  // Very high tax states (effective rate ~8-10% for median income)
  "California": 0.093,   // Up to 13.3% for high earners
};

/**
 * Calculate effective state income tax for a given income and state
 * Uses simplified progressive calculation
 */
function calculateStateTax(income: number, state: string): number {
  const rate = STATE_INCOME_TAX_RATES[state];
  if (rate === undefined || rate === 0) {
    return 0;
  }
  
  // For states with flat rates, apply directly
  // For progressive states, the rates above are approximate effective rates
  // at median income levels - actual calculation would need full bracket tables
  
  // Apply a scaling factor based on income level
  // - Lower income = lower effective rate (progressive)
  // - Higher income = higher effective rate (up to 1.5x for $225K+)
  // 
  // FIX: Previously capped at 1.0 which favored high earners in progressive states
  // A $200K earner in California was paying the effective rate of a $75K earner
  // Now allows scale factor up to 1.5 for high earners
  const medianIncome = 75000;
  const scaleFactor = Math.min(1.5, Math.sqrt(income / medianIncome));
  
  return income * rate * scaleFactor;
}

/**
 * Calculate effective federal income tax for a given income
 * Simplified calculation using effective rate brackets
 */
function calculateFederalTax(income: number): number {
  // Standard deduction for married filing jointly (2024)
  const standardDeduction = 29200;
  const taxableIncome = Math.max(0, income - standardDeduction);
  
  // Find effective rate based on income level
  for (const bracket of FEDERAL_EFFECTIVE_TAX_RATES) {
    if (taxableIncome <= bracket.threshold) {
      return taxableIncome * bracket.rate;
    }
  }
  
  return taxableIncome * 0.28; // Fallback for very high incomes
}

/**
 * Calculate total effective tax rate for a given income and state
 * Combines federal + state taxes (excludes property tax)
 */
function calculateEffectiveTaxRate(income: number, state: string): number {
  const federalTax = calculateFederalTax(income);
  const stateTax = calculateStateTax(income, state);
  const totalTax = federalTax + stateTax;
  
  return totalTax / income;
}

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
        
        // CRITICAL FIX: Include property tax in monthly housing cost (PITI, not just PI)
        // This is essential for comparing Austin TX (2.2%) vs Denver CO (0.5%)
        // On a $500K home: Austin = $917/mo tax, Denver = $208/mo tax = $709 difference!
        const propertyTaxRate = options.propertyTaxRate ?? NATIONAL_AVG_PROPERTY_TAX_RATE;
        const monthlyPropertyTax = (homePrice * propertyTaxRate) / 12;
        const totalMonthlyHousing = monthlyMortgage + monthlyPropertyTax;
        
        // National average monthly housing cost (2026 estimate)
        // Mortgage: ~$400K median home at 7% = ~$2,128/month
        // Property Tax: ~$400K × 1.1% / 12 = ~$367/month
        // Total: ~$2,495/month
        const nationalAvgMortgage = 2128;
        const nationalAvgPropertyTax = (NATIONAL_MEDIAN_HOME_PRICE * NATIONAL_AVG_PROPERTY_TAX_RATE) / 12;
        const nationalAvgHousing = nationalAvgMortgage + nationalAvgPropertyTax;
        
        // Create a housing index based on total monthly housing cost (mortgage + property tax)
        // Use logarithmic compression for extreme values to avoid
        // completely crushing expensive cities' scores
        // Linear up to 150 (1.5x national), then compressed above
        const rawHousingIndex = (totalMonthlyHousing / nationalAvgHousing) * 100;
        
        let housingIndex: number;
        if (rawHousingIndex <= 150) {
          // Linear for normal range (up to 1.5x national average)
          housingIndex = rawHousingIndex;
        } else {
          // Logarithmic compression for expensive markets
          // Maps: 200 -> 175, 300 -> 200, 400 -> 220
          // This acknowledges expensive cities without completely destroying scores
          const excess = rawHousingIndex - 150;
          const compressed = 50 * Math.log10(1 + excess / 50);
          housingIndex = 150 + compressed;
        }
        
        // Blend: 35% housing (mortgage + property tax), 35% goods, 30% services
        // Slightly reduced housing weight since we're already penalizing via compression
        const goods = rpp.goods ?? 100;
        const services = rpp.otherServices ?? 100;
        
        const adjusted = (housingIndex * 0.35) + (goods * 0.35) + (services * 0.30);
        
        return { adjustedRPP: adjusted, monthlyMortgage };
      }
      
      // Fallback to standard RPP if no home price data
      return { adjustedRPP: rpp.allItems, monthlyMortgage: null };
    }

    default:
      return { adjustedRPP: rpp.allItems, monthlyMortgage: null };
  }
}

// National average property tax rate (2024)
// Used as baseline for property tax calculations
const NATIONAL_AVG_PROPERTY_TAX_RATE = 0.011; // ~1.1%

// National median home price (2024) for baseline calculations
const NATIONAL_MEDIAN_HOME_PRICE = 420000;

/**
 * Calculate annual property tax burden
 * 
 * IMPORTANT: Only applies to existing HOMEOWNERS, not prospective buyers.
 * For prospective buyers, housing costs (including property tax burden) are already
 * captured in the mortgage-adjusted RPP calculation, so we don't double-count.
 * 
 * For homeowners, we assume they bought at ~60% of current median (historical purchase)
 * since long-time owners have lower assessed values due to Prop 13-style protections
 * in many states and general home price appreciation since purchase.
 */
function calculateAnnualPropertyTax(
  options: CostOfLivingOptions
): { localPropertyTax: number; nationalPropertyTax: number } {
  const { housingSituation, propertyTaxRate, medianHomePrice } = options;
  
  // Renters: No property tax
  // Prospective buyers: Housing costs already in RPP (via mortgage-adjusted index)
  if (housingSituation === "renter" || housingSituation === "prospective-buyer") {
    return { localPropertyTax: 0, nationalPropertyTax: 0 };
  }
  
  // Existing homeowners: Apply property tax on estimated purchase price
  // Assume purchase at ~60% of current median to account for:
  // - Historical lower prices when they bought
  // - Assessment caps (Prop 13 in CA, similar in other states)
  const HISTORICAL_PURCHASE_FACTOR = 0.60;
  
  const currentMedian = medianHomePrice ?? NATIONAL_MEDIAN_HOME_PRICE;
  const estimatedPurchasePrice = currentMedian * HISTORICAL_PURCHASE_FACTOR;
  const taxRate = propertyTaxRate ?? NATIONAL_AVG_PROPERTY_TAX_RATE;
  
  // Local property tax = local rate × estimated purchase price
  const localPropertyTax = Math.round(estimatedPurchasePrice * taxRate);
  
  // National baseline = same factor applied nationally
  const nationalEstimatedPrice = NATIONAL_MEDIAN_HOME_PRICE * HISTORICAL_PURCHASE_FACTOR;
  const nationalPropertyTax = Math.round(nationalEstimatedPrice * NATIONAL_AVG_PROPERTY_TAX_RATE);
  
  return { localPropertyTax, nationalPropertyTax };
}

// Type for tax breakdown returned by calculateSelectedIncome
interface TaxBreakdown {
  stateName: string | null;
  federalTax: number | null;
  stateTax: number | null;
  propertyTax: number | null;
  totalTax: number | null;
  calculatedEffectiveRate: number | null;
  method: "bea" | "calculated";
}

interface SelectedIncomeResult {
  selectedIncome: number | null;
  selectedAfterTaxIncome: number | null;
  nationalBaseline: number;
  taxBreakdown: TaxBreakdown | null;
}

/**
 * Calculate selected income based on work situation persona
 * 
 * LOCAL-EARNER: Uses LOCAL Per Capita Income (BEA) - reflects local earning potential
 *           This shows "how well off are local earners in this city?"
 * STANDARD: Uses FIXED national median income - answers "where can I afford to live?"
 *           This is pure affordability - same income in all cities, just compare costs.
 * RETIREE: Uses user-defined fixed income
 * 
 * For homeowners/prospective-buyers, also subtracts property tax from disposable income.
 */
function calculateSelectedIncome(
  bea: BEAMetrics,
  options: CostOfLivingOptions
): SelectedIncomeResult {
  const workSituation = options.workSituation ?? "local-earner";
  const beaTaxRate = bea.taxes?.effectiveTaxRate ?? null;
  
  // Calculate property tax impact (0 for renters)
  const { localPropertyTax, nationalPropertyTax } = calculateAnnualPropertyTax(options);
  
  switch (workSituation) {
    case "local-earner": {
      // Use BEA per capita income - reflects local earning potential
      // This includes the income boost from local job markets
      const income = bea.taxes?.perCapitaIncome ?? null;
      let afterTax = bea.taxes?.perCapitaDisposable ?? null;
      
      // Subtract property tax for homeowners
      if (afterTax !== null) {
        afterTax = afterTax - localPropertyTax;
      }
      
      // Adjust baseline for property tax too
      const nationalBaseline = NATIONAL_PER_CAPITA_DISPOSABLE - nationalPropertyTax;
      
      // For local-earner, we use BEA pre-calculated taxes
      const taxBreakdown: TaxBreakdown = {
        stateName: bea.taxes?.state ?? null,
        federalTax: null, // BEA combines them
        stateTax: null,
        propertyTax: localPropertyTax > 0 ? localPropertyTax : null,
        totalTax: income !== null && afterTax !== null 
          ? income - afterTax - localPropertyTax + localPropertyTax  // Gross - net before prop tax
          : null,
        calculatedEffectiveRate: beaTaxRate,
        method: "bea"
      };
      
      return { 
        selectedIncome: income, 
        selectedAfterTaxIncome: afterTax,
        nationalBaseline: nationalBaseline,
        taxBreakdown
      };
    }
    
    case "retiree": {
      // Use user-defined fixed income with state-specific tax calculation
      const income = options.retireeFixedIncome ?? DEFAULT_RETIREE_INCOME;
      const state = options.state ?? bea.taxes?.state ?? "";
      
      // Calculate individual tax components
      const federalTax = calculateFederalTax(income);
      const stateTax = calculateStateTax(income, state);
      const totalIncomeTax = federalTax + stateTax;
      const effectiveRate = totalIncomeTax / income;
      
      // After income tax, subtract property tax for homeowners
      const afterIncomeTax = Math.round(income - totalIncomeTax);
      const afterTax = afterIncomeTax - localPropertyTax;
      
      // Calculate national baseline with average tax burden for comparison
      const nationalAvgRate = calculateEffectiveTaxRate(income, "Colorado"); // Use CO as "average" state
      const nationalAfterIncomeTax = Math.round(income * (1 - nationalAvgRate));
      const nationalBaseline = nationalAfterIncomeTax - nationalPropertyTax;
      
      const taxBreakdown: TaxBreakdown = {
        stateName: state || null,
        federalTax: Math.round(federalTax),
        stateTax: Math.round(stateTax),
        propertyTax: localPropertyTax > 0 ? localPropertyTax : null,
        totalTax: Math.round(totalIncomeTax) + localPropertyTax,
        calculatedEffectiveRate: Math.round(effectiveRate * 1000) / 10, // One decimal
        method: "calculated"
      };
      
      return {
        selectedIncome: income,
        selectedAfterTaxIncome: afterTax,
        nationalBaseline: nationalBaseline,
        taxBreakdown
      };
    }
    
    case "standard":
    default: {
      // PURE AFFORDABILITY: Use fixed national median income for ALL cities
      // This answers: "If I have average income, where can I afford to live?"
      const income = NATIONAL_MEDIAN_HOUSEHOLD_INCOME;
      const state = options.state ?? bea.taxes?.state ?? "";
      
      // Calculate individual tax components
      const federalTax = calculateFederalTax(income);
      const stateTax = calculateStateTax(income, state);
      const totalIncomeTax = federalTax + stateTax;
      
      // Check if we're using calculated or fallback
      const useCalculated = state && state.length > 0;
      const effectiveRate = useCalculated 
        ? totalIncomeTax / income
        : (beaTaxRate !== null 
            ? Math.min(beaTaxRate / 100, 0.25)
            : AVERAGE_TAX_RATE);
      
      // After income tax, subtract property tax for homeowners
      const afterIncomeTax = Math.round(income * (1 - effectiveRate));
      const afterTax = afterIncomeTax - localPropertyTax;
      
      // Baseline is national median after average taxes, minus property tax
      const nationalMedianAfterIncomeTax = Math.round(NATIONAL_MEDIAN_HOUSEHOLD_INCOME * (1 - AVERAGE_TAX_RATE));
      const nationalBaseline = nationalMedianAfterIncomeTax - nationalPropertyTax;
      
      const taxBreakdown: TaxBreakdown = {
        stateName: state || null,
        federalTax: useCalculated ? Math.round(federalTax) : null,
        stateTax: useCalculated ? Math.round(stateTax) : null,
        propertyTax: localPropertyTax > 0 ? localPropertyTax : null,
        totalTax: Math.round(income * effectiveRate) + localPropertyTax,
        calculatedEffectiveRate: Math.round(effectiveRate * 1000) / 10,
        method: useCalculated ? "calculated" : "bea"
      };
      
      return {
        selectedIncome: income,
        selectedAfterTaxIncome: afterTax,
        nationalBaseline: nationalBaseline,
        taxBreakdown
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
  
  // Get work persona-adjusted income (income numerator) and tax breakdown
  const { selectedIncome, selectedAfterTaxIncome, nationalBaseline, taxBreakdown } = calculateSelectedIncome(bea, options);

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
    taxBreakdown,
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
    taxBreakdown: null,
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
