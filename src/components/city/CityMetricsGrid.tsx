"use client";

import { CityMetrics } from "@/types/city";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sun,
  Thermometer,
  CloudRain,
  Users,
  Home,
  Percent,
  Shield,
  Train,
  Footprints,
  Plane,
  Activity,
  Droplets,
  Wind,
  Car,
  Vote,
  Info,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateTrueCostOfLiving,
  formatCurrency,
  getRatingColor,
  BEAMetrics,
} from "@/lib/cost-of-living";

interface CityMetricsGridProps {
  metrics: CityMetrics;
  bea?: BEAMetrics;
}

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | null;
  unit?: string;
  tooltip?: string;
  colorClass?: string;
}

function MetricItem({ icon, label, value, unit, tooltip, colorClass }: MetricItemProps) {
  const displayValue = value === null ? "—" : `${value}${unit || ""}`;
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground truncate">{label}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/50 cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={cn("font-semibold", colorClass)}>{displayValue}</div>
      </div>
    </div>
  );
}

export function CityMetricsGrid({ metrics, bea }: CityMetricsGridProps) {
  const formatTemp = (temp: number | null) => temp !== null ? `${temp.toFixed(0)}°F` : null;
  const formatPercent = (val: number | null) => val !== null ? `${(val * 100).toFixed(1)}%` : null;
  const formatPrice = (price: number | null) => {
    if (price === null) return null;
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    return `$${(price / 1000).toFixed(0)}K`;
  };
  const formatPopulation = (pop: number | null) => {
    if (pop === null) return null;
    if (pop >= 1000) return `${(pop / 1000).toFixed(1)}M`;
    return `${pop}K`;
  };

  const getScoreColor = (score: number | null, inverse = false) => {
    if (score === null) return "";
    if (inverse) {
      // Lower is better (crime, pollution)
      if (score <= 30) return "text-score-high";
      if (score <= 60) return "text-score-medium";
      return "text-score-low";
    }
    // Higher is better
    if (score >= 70) return "text-score-high";
    if (score >= 40) return "text-score-medium";
    return "text-score-low";
  };

  // Calculate True Cost of Living from BEA data
  const trueCostOfLiving = calculateTrueCostOfLiving(bea);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Climate Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            Climate
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <MetricItem
            icon={<Thermometer className="h-4 w-4" />}
            label="Avg Temperature"
            value={formatTemp(metrics.avgTemp)}
            tooltip="Annual average temperature"
          />
          <MetricItem
            icon={<Thermometer className="h-4 w-4 text-orange-500" />}
            label="Summer Avg"
            value={formatTemp(metrics.avgSummerTemp)}
            tooltip="Average summer temperature (Jun-Aug)"
          />
          <MetricItem
            icon={<Thermometer className="h-4 w-4 text-blue-500" />}
            label="Winter Avg"
            value={formatTemp(metrics.avgWinterTemp)}
            tooltip="Average winter temperature (Dec-Feb)"
          />
          <MetricItem
            icon={<Sun className="h-4 w-4 text-yellow-500" />}
            label="Sunny Days"
            value={metrics.daysOfSunshine}
            unit="/yr"
            tooltip="Days with significant sunshine per year"
            colorClass={getScoreColor(metrics.daysOfSunshine ? metrics.daysOfSunshine / 3 : null)}
          />
          <MetricItem
            icon={<CloudRain className="h-4 w-4 text-blue-400" />}
            label="Rainy Days"
            value={metrics.daysOfRain}
            unit="/yr"
            tooltip="Days with precipitation per year"
            colorClass={getScoreColor(metrics.daysOfRain ? 100 - metrics.daysOfRain / 1.5 : null)}
          />
        </CardContent>
      </Card>

      {/* Cost of Living Section - Now powered by BEA data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Cost of Living
            {bea && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                BEA {bea.year}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* True Purchasing Power - Key metric */}
          {trueCostOfLiving.truePurchasingPower !== null && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    True Purchasing Power
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          What your after-tax income can actually buy, adjusted for local prices.
                          Formula: Disposable Income ÷ (Regional Price Parity ÷ 100)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(trueCostOfLiving.truePurchasingPower)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">vs. Average</div>
                  <div className={cn(
                    "text-lg font-semibold",
                    getRatingColor(trueCostOfLiving.overallValueRating, "value")
                  )}>
                    {trueCostOfLiving.truePurchasingPowerIndex?.toFixed(1)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({trueCostOfLiving.overallValueRating})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <MetricItem
              icon={<TrendingUp className="h-4 w-4" />}
              label="RPP (Cost Index)"
              value={trueCostOfLiving.costOfLivingIndex?.toFixed(1) ?? metrics.costOfLivingIndex}
              tooltip="Regional Price Parity: 100 = national average. Higher = more expensive."
              colorClass={getRatingColor(trueCostOfLiving.costOfLivingRating, "col")}
            />
            <MetricItem
              icon={<Home className="h-4 w-4" />}
              label="Housing Index"
              value={trueCostOfLiving.housingCostIndex?.toFixed(1)}
              tooltip="Regional housing/rent prices: 100 = national average"
              colorClass={trueCostOfLiving.housingCostIndex 
                ? trueCostOfLiving.housingCostIndex > 150 
                  ? "text-red-600 dark:text-red-400" 
                  : trueCostOfLiving.housingCostIndex < 90 
                    ? "text-green-600 dark:text-green-400" 
                    : ""
                : ""}
            />
            <MetricItem
              icon={<Percent className="h-4 w-4" />}
              label="Effective Tax Rate"
              value={trueCostOfLiving.effectiveTaxRate !== null 
                ? `${trueCostOfLiving.effectiveTaxRate.toFixed(1)}%` 
                : formatPercent(metrics.stateTaxRate)}
              tooltip="Total taxes as % of income (federal + state + local)"
              colorClass={getRatingColor(trueCostOfLiving.taxBurdenRating, "tax")}
            />
            <MetricItem
              icon={<DollarSign className="h-4 w-4" />}
              label="Disposable Income"
              value={trueCostOfLiving.afterTaxIncome !== null 
                ? formatCurrency(trueCostOfLiving.afterTaxIncome) 
                : null}
              tooltip="Per capita income after all taxes"
            />
            <MetricItem
              icon={<Home className="h-4 w-4" />}
              label="Median Home Price"
              value={formatPrice(metrics.medianHomePrice)}
              tooltip="Median single-family home price (Zillow ZHVI)"
            />
            <MetricItem
              icon={<Percent className="h-4 w-4" />}
              label="State Tax Rate"
              value={formatPercent(metrics.stateTaxRate)}
              tooltip="Top marginal state income tax rate"
            />
          </div>
        </CardContent>
      </Card>

      {/* Demographics Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-500" />
            Demographics
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <MetricItem
            icon={<Users className="h-4 w-4" />}
            label="Metro Population"
            value={formatPopulation(metrics.population)}
            tooltip="Metropolitan statistical area population"
          />
          <MetricItem
            icon={<Users className="h-4 w-4" />}
            label="Diversity Index"
            value={metrics.diversityIndex?.toFixed(1)}
            tooltip="Diversity index (0-100, higher = more diverse)"
            colorClass={getScoreColor(metrics.diversityIndex)}
          />
          <MetricItem
            icon={<Users className="h-4 w-4" />}
            label="East Asian %"
            value={formatPercent(metrics.eastAsianPercent)}
            tooltip="Percentage of population identifying as East Asian"
          />
        </CardContent>
      </Card>

      {/* Quality of Life Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-rose-500" />
            Quality of Life
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <MetricItem
            icon={<Footprints className="h-4 w-4" />}
            label="Walk Score"
            value={metrics.walkScore}
            tooltip="Walkability score (0-100)"
            colorClass={getScoreColor(metrics.walkScore)}
          />
          <MetricItem
            icon={<Train className="h-4 w-4" />}
            label="Transit Score"
            value={metrics.transitScore}
            tooltip="Public transit accessibility (0-100)"
            colorClass={getScoreColor(metrics.transitScore)}
          />
          <MetricItem
            icon={<Shield className="h-4 w-4" />}
            label="Crime Rate"
            value={metrics.crimeRate?.toFixed(0)}
            tooltip="Violent crimes per 100,000 residents"
            colorClass={getScoreColor(metrics.crimeRate, true)}
          />
          <MetricItem
            icon={<Plane className="h-4 w-4" />}
            label="Int'l Airport"
            value={metrics.hasInternationalAirport ? "Yes" : "No"}
            tooltip="Has major international airport"
            colorClass={metrics.hasInternationalAirport ? "text-score-high" : "text-muted-foreground"}
          />
          <MetricItem
            icon={<Wind className="h-4 w-4" />}
            label="Pollution Index"
            value={metrics.pollutionIndex?.toFixed(0)}
            tooltip="Air pollution index (lower is better)"
            colorClass={getScoreColor(metrics.pollutionIndex, true)}
          />
          <MetricItem
            icon={<Droplets className="h-4 w-4" />}
            label="Water Quality"
            value={metrics.waterQualityIndex?.toFixed(0)}
            tooltip="Water quality index (higher is better)"
            colorClass={getScoreColor(metrics.waterQualityIndex)}
          />
          <MetricItem
            icon={<Car className="h-4 w-4" />}
            label="Traffic Index"
            value={metrics.trafficIndex?.toFixed(0)}
            tooltip="Traffic congestion index (lower is better)"
            colorClass={getScoreColor(metrics.trafficIndex, true)}
          />
          <MetricItem
            icon={<Activity className="h-4 w-4" />}
            label="Health Score"
            value={metrics.healthScore?.toFixed(0)}
            tooltip="Healthcare access and quality score"
            colorClass={getScoreColor(metrics.healthScore)}
          />
        </CardContent>
      </Card>

      {/* Political Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Vote className="h-4 w-4 text-blue-500" />
            Political Lean
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <MetricItem
            icon={<Vote className="h-4 w-4 text-blue-600" />}
            label="City Dem %"
            value={formatPercent(metrics.cityDemocratPercent)}
            tooltip="City-level Democratic vote share"
          />
          <MetricItem
            icon={<Vote className="h-4 w-4 text-blue-600" />}
            label="State Dem %"
            value={formatPercent(metrics.stateDemocratPercent)}
            tooltip="State-level Democratic vote share"
          />
        </CardContent>
      </Card>

      {/* Sports Teams Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            🏈 Sports Teams
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="text-xs text-muted-foreground">NFL</span>
            <p className="font-medium">{metrics.nflTeams || "None"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">NBA</span>
            <p className="font-medium">{metrics.nbaTeams || "None"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
