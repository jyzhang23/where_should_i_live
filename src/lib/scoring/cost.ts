import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { calculateTrueCostOfLiving, CostOfLivingOptions } from "@/lib/cost-of-living";

/**
 * Calculate cost of living score (0-100)
 * Higher score = better purchasing power / more affordable
 * 
 * Uses BEA "True Cost of Living" formula with DUAL PERSONA adjustments:
 * 
 * HOUSING PERSONA (affects cost denominator - RPP):
 *   RENTER: Standard BEA RPP (weighted by rental data)
 *   HOMEOWNER: Goods + Services only (mortgage is fixed)
 *   PROSPECTIVE BUYER: Uses current home prices + mortgage rates
 * 
 * WORK PERSONA (affects income numerator):
 *   STANDARD: Median Household Income (Census ACS) - less skewed by high earners
 *   HIGH-EARNER: Per Capita Income (BEA) - reflects tech/gov/law markets
 *   RETIREE: User-defined fixed income
 * 
 * Falls back to home price-based scoring if BEA data unavailable.
 */
export function calculateCostScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const { 
    housingSituation, 
    includeUtilities,
    workSituation,
    retireeFixedIncome
  } = preferences.advanced.costOfLiving;

  // Try to use BEA True Purchasing Power data (merged from metrics.json)
  const beaData = metrics.bea;
  
  if (beaData) {
    // Build options based on user's housing AND work situation
    const options: CostOfLivingOptions = {
      // Housing persona (affects cost/RPP)
      housingSituation: housingSituation || "renter",
      includeUtilities: includeUtilities ?? true,
      medianHomePrice: metrics.medianHomePrice,
      // Work persona (affects income)
      workSituation: workSituation || "standard",
      medianHouseholdIncome: metrics.census?.medianHouseholdIncome ?? null,
      retireeFixedIncome: retireeFixedIncome ?? 50000,
      // State for accurate tax calculation (retiree/standard personas)
      state: city.state,
      // Property tax rate for homeowner calculations
      propertyTaxRate: metrics.propertyTaxRate,
    };
    
    const trueCostOfLiving = calculateTrueCostOfLiving(beaData, options);
    
    if (trueCostOfLiving.truePurchasingPowerIndex !== null) {
      // Convert True Purchasing Power Index to a 0-100 score
      // Index: 100 = national average, higher = better
      // 
      // The index represents purchasing power relative to baseline:
      //   Index 80 = 80% of baseline purchasing power (expensive city)
      //   Index 100 = same as baseline (average city)
      //   Index 120 = 120% of baseline (affordable city)
      //
      // Score mapping (linear, centered at 50):
      //   Index 60 -> Score 20  (very expensive)
      //   Index 80 -> Score 35  (expensive)
      //   Index 100 -> Score 50 (average)
      //   Index 120 -> Score 65 (affordable)
      //   Index 140 -> Score 80 (very affordable)
      //
      // Formula: score = 50 + (index - 100) * 0.75
      // This gives ±30 points for ±40 index deviation
      const index = trueCostOfLiving.truePurchasingPowerIndex;
      
      const score = 50 + (index - 100) * 0.75;
      return Math.max(0, Math.min(100, score));
    }
  }

  // Fallback: Use simple home price-based scoring if no BEA data
  // Home price score (inversely proportional)
  // $300K = 100, $1.5M = 0
  if (metrics.medianHomePrice !== null) {
    const price = metrics.medianHomePrice;
    return Math.max(0, 100 - ((price - 300000) / 1200000) * 100);
  }

  // No data available - return neutral score
  return 50;
}
