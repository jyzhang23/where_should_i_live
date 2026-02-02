"use client";

import { useMemo } from "react";
import { CityMetrics, NOAAClimateData, CensusDemographics, CulturalMetrics } from "@/types/city";
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
  Snowflake,
  Zap,
  Leaf,
  Cloud,
  Shirt,
  Wifi,
  GraduationCap,
  Stethoscope,
  Church,
  HeartHandshake,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateTrueCostOfLiving,
  formatCurrency,
  getRatingColor,
  BEAMetrics,
  TrueCostOfLiving,
} from "@/lib/cost-of-living";
import { PriceTrendChart } from "@/components/charts/PriceTrendChart";

// ============================================
// Tax Tooltip Helper Functions
// ============================================

/**
 * Generate detailed tooltip for effective tax rate
 */
function getTaxRateTooltip(trueCostOfLiving: TrueCostOfLiving): string {
  const breakdown = trueCostOfLiving.taxBreakdown;
  const workSituation = trueCostOfLiving.workSituation;
  
  if (!breakdown) {
    return "Total taxes as % of income (federal + state + local)";
  }
  
  const lines: string[] = [];
  
  // Header based on method
  if (breakdown.method === "bea") {
    lines.push("Source: BEA pre-calculated effective rate");
    if (breakdown.stateName) {
      lines.push(`State: ${breakdown.stateName}`);
    }
  } else {
    lines.push(`Calculated for ${workSituation} persona:`);
    if (breakdown.stateName) {
      lines.push(`State: ${breakdown.stateName}`);
    }
    if (breakdown.federalTax !== null) {
      lines.push(`Federal tax: $${breakdown.federalTax.toLocaleString()}`);
    }
    if (breakdown.stateTax !== null) {
      lines.push(`State tax: $${breakdown.stateTax.toLocaleString()}${breakdown.stateTax === 0 ? " (no income tax)" : ""}`);
    }
  }
  
  if (breakdown.calculatedEffectiveRate !== null) {
    lines.push(`Effective rate: ${breakdown.calculatedEffectiveRate}%`);
  }
  
  return lines.join("\n");
}

/**
 * Generate detailed tooltip for after-tax income
 */
function getAfterTaxIncomeTooltip(trueCostOfLiving: TrueCostOfLiving): string {
  const breakdown = trueCostOfLiving.taxBreakdown;
  const workSituation = trueCostOfLiving.workSituation;
  const selectedIncome = trueCostOfLiving.selectedIncome;
  const housingPersona = trueCostOfLiving.housingPersona;
  
  const lines: string[] = [];
  
  // Income source explanation
  switch (workSituation) {
    case "local-earner":
      lines.push("Local Earner: Using local per capita income (BEA)");
      break;
    case "standard":
      lines.push("Standard: Using fixed national median income (~$75K)");
      break;
    case "retiree":
      lines.push(`Retiree: Using your fixed income ($${(selectedIncome ?? 50000).toLocaleString()})`);
      break;
  }
  
  if (breakdown) {
    lines.push("");
    
    // Tax breakdown
    if (breakdown.method === "calculated") {
      if (breakdown.stateName) {
        const stateNote = breakdown.stateTax === 0 ? " (no income tax)" : "";
        lines.push(`${breakdown.stateName}${stateNote}`);
      }
      if (breakdown.federalTax !== null && breakdown.stateTax !== null) {
        lines.push(`Income tax: -$${(breakdown.federalTax + breakdown.stateTax).toLocaleString()}`);
      }
    } else {
      lines.push("Tax from BEA data");
    }
    
    // Property tax for homeowners
    if (breakdown.propertyTax !== null && breakdown.propertyTax > 0) {
      lines.push(`Property tax: -$${breakdown.propertyTax.toLocaleString()}/yr`);
      lines.push(`(${housingPersona} @ 60% of median)`);
    }
  }
  
  return lines.join("\n");
}

// ============================================
// Climate Scorecard Helper Functions
// ============================================

// Generate a "Climate Persona" based on the data
function getClimatePersona(noaa: NOAAClimateData | undefined, metrics: CityMetrics): {
  title: string;
  subtitle: string;
  emoji: string;
} {
  if (!noaa) {
    return { title: "Climate Data", subtitle: "Pull climate data to see analysis", emoji: "🌡️" };
  }

  const { comfortDays, extremeHeatDays, freezeDays, cloudyDays, julyDewpoint, annualSnowfall, seasonalStability } = noaa;

  // Determine the dominant climate characteristic
  if (comfortDays && comfortDays > 200 && seasonalStability && seasonalStability < 10) {
    return { title: "Perpetual Spring", subtitle: "Mild & consistent year-round", emoji: "🌸" };
  }
  if (extremeHeatDays && extremeHeatDays > 60) {
    return { title: "Desert Heat", subtitle: "Intense sun & dry climate", emoji: "🏜️" };
  }
  if (freezeDays && freezeDays > 100 && annualSnowfall && annualSnowfall > 40) {
    return { title: "Winter Wonderland", subtitle: "Cold & snowy seasons", emoji: "❄️" };
  }
  if (cloudyDays && cloudyDays > 180) {
    return { title: "Grey & Cozy", subtitle: "Overcast skies & mild temps", emoji: "🌧️" };
  }
  if (julyDewpoint && julyDewpoint > 70) {
    return { title: "Tropical & Humid", subtitle: "Warm, sticky summers", emoji: "🌴" };
  }
  if (comfortDays && comfortDays > 150 && extremeHeatDays && extremeHeatDays < 30) {
    return { title: "Four Season Balance", subtitle: "Distinct but moderate seasons", emoji: "🍂" };
  }
  if (metrics.avgTemp && metrics.avgTemp > 70) {
    return { title: "Year-Round Warmth", subtitle: "Consistently warm climate", emoji: "☀️" };
  }
  
  return { title: "Temperate Climate", subtitle: "Variable conditions", emoji: "🌤️" };
}

// Calculate percentage scores for the radial gauges
function calculateUsabilityScores(noaa: NOAAClimateData | undefined) {
  if (!noaa) {
    return { tshirtDays: 0, outdoorUsability: 0, sunSeekerScore: 0 };
  }

  // T-Shirt Days: percentage of year with 65-80°F
  const tshirtDays = noaa.comfortDays ? Math.round((noaa.comfortDays / 365) * 100) : 0;

  // Outdoor Usability: days without rain, comfortable (no extreme heat/cold)
  const rainFreeDays = 365 - (noaa.rainDays || 0);
  const comfortableDays = 365 - (noaa.extremeHeatDays || 0) - (noaa.freezeDays || 0);
  const usableDays = Math.min(rainFreeDays, comfortableDays);
  const outdoorUsability = Math.round((usableDays / 365) * 100);

  // Sun-Seeker Score: inverse of cloudy days
  const sunnyDays = 365 - (noaa.cloudyDays || 150); // Default to 150 if no data
  const sunSeekerScore = Math.round((sunnyDays / 365) * 100);

  return { tshirtDays, outdoorUsability, sunSeekerScore };
}

// Get monthly temperature data for heatmap
function getMonthlyComfortData(noaa: NOAAClimateData | undefined, metrics: CityMetrics) {
  const avgTemp = metrics.avgTemp || 60;
  const summerTemp = metrics.avgSummerTemp || avgTemp + 15;
  const winterTemp = metrics.avgWinterTemp || avgTemp - 15;
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  return months.map((month, i) => {
    const angle = ((i - 0) / 12) * 2 * Math.PI;
    const tempFactor = Math.cos(angle);
    const temp = avgTemp - tempFactor * ((summerTemp - winterTemp) / 2);
    
    let comfort: "cold" | "cool" | "comfortable" | "warm" | "hot";
    if (temp < 40) comfort = "cold";
    else if (temp < 55) comfort = "cool";
    else if (temp < 75) comfort = "comfortable";
    else if (temp < 90) comfort = "warm";
    else comfort = "hot";

    return { month, temp: Math.round(temp), comfort };
  });
}

// Generate lifestyle impacts based on climate data
function getLifestyleImpacts(noaa: NOAAClimateData | undefined, metrics: CityMetrics) {
  const impacts: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
    highlight: "good" | "neutral" | "bad";
  }> = [];

  if (!noaa) return impacts;

  // Wardrobe Stability (diurnal swing)
  if (noaa.diurnalSwing !== null) {
    if (noaa.diurnalSwing < 15) {
      impacts.push({
        icon: <Shirt className="h-4 w-4" />,
        title: "Stable Wardrobe",
        description: `Low daily temp swing (${noaa.diurnalSwing}°F) - rarely need layers.`,
        highlight: "good",
      });
    } else if (noaa.diurnalSwing > 25) {
      impacts.push({
        icon: <Shirt className="h-4 w-4" />,
        title: "Layer Up Daily",
        description: `High temp swing (${noaa.diurnalSwing}°F) - always carry a jacket.`,
        highlight: "neutral",
      });
    }
  }

  // Utility Tax (CDD + HDD)
  if (noaa.coolingDegreeDays !== null && noaa.heatingDegreeDays !== null) {
    const totalDD = noaa.coolingDegreeDays + noaa.heatingDegreeDays;
    const avgDD = 5500;
    const pctDiff = Math.round(((totalDD - avgDD) / avgDD) * 100);
    
    if (pctDiff > 20) {
      impacts.push({
        icon: <Zap className="h-4 w-4" />,
        title: "High Utility Bills",
        description: `Expect ~${pctDiff}% higher energy bills than average.`,
        highlight: "bad",
      });
    } else if (pctDiff < -20) {
      impacts.push({
        icon: <Zap className="h-4 w-4" />,
        title: "Low Utility Costs",
        description: `Energy bills ~${Math.abs(pctDiff)}% lower than average.`,
        highlight: "good",
      });
    }
  }

  // Gardener's Window (growing season)
  if (noaa.growingSeasonDays !== null) {
    if (noaa.growingSeasonDays > 250) {
      impacts.push({
        icon: <Leaf className="h-4 w-4" />,
        title: "Year-Round Gardening",
        description: `${noaa.growingSeasonDays} frost-free days.`,
        highlight: "good",
      });
    } else if (noaa.growingSeasonDays < 150) {
      impacts.push({
        icon: <Leaf className="h-4 w-4" />,
        title: "Short Growing Season",
        description: `Only ${noaa.growingSeasonDays} frost-free days.`,
        highlight: "bad",
      });
    }
  }

  // Summer Comfort (humidity)
  if (noaa.julyDewpoint !== null) {
    if (noaa.julyDewpoint > 70) {
      impacts.push({
        icon: <Droplets className="h-4 w-4" />,
        title: "Humid Summers",
        description: `Dewpoint ${noaa.julyDewpoint}°F - sticky conditions.`,
        highlight: "bad",
      });
    } else if (noaa.julyDewpoint < 55) {
      impacts.push({
        icon: <Droplets className="h-4 w-4" />,
        title: "Dry Summers",
        description: `Dewpoint ${noaa.julyDewpoint}°F - comfortable, low humidity.`,
        highlight: "good",
      });
    }
  }

  // Snow Impact
  if (noaa.snowDays !== null && noaa.snowDays > 25) {
    impacts.push({
      icon: <Snowflake className="h-4 w-4" />,
      title: "Snowy Winters",
      description: `~${noaa.snowDays} snow days, ${noaa.annualSnowfall}" annually.`,
      highlight: "neutral",
    });
  }

  return impacts;
}

// Radial progress gauge component
function RadialGauge({ 
  value, 
  label, 
  icon, 
  color,
  tooltip 
}: { 
  value: number; 
  label: string; 
  icon: React.ReactNode;
  color: string;
  tooltip: string;
}) {
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/20"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                className={color}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                  transition: "stroke-dashoffset 0.5s ease",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold">{value}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs font-medium">
            {icon}
            <span>{label}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Monthly comfort heatmap component
function SeasonalComfortBand({ data }: { data: ReturnType<typeof getMonthlyComfortData> }) {
  const comfortColors = {
    cold: "bg-blue-500",
    cool: "bg-sky-400",
    comfortable: "bg-green-500",
    warm: "bg-orange-400",
    hot: "bg-red-500",
  };

  const comfortLabels = {
    cold: "Cold (Winter coat)",
    cool: "Cool (Light jacket)",
    comfortable: "Comfortable (T-shirt)",
    warm: "Warm (Light clothing)",
    hot: "Hot (Seek shade)",
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-0.5">
        {data.map(({ month, temp, comfort }) => (
          <Tooltip key={month}>
            <TooltipTrigger asChild>
              <div className="flex-1 flex flex-col items-center">
                <div
                  className={cn(
                    "w-full h-6 rounded-sm cursor-help transition-transform hover:scale-110",
                    comfortColors[comfort]
                  )}
                />
                <span className="text-[9px] text-muted-foreground mt-0.5">{month}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{month}: ~{temp}°F</p>
              <p className="text-xs text-muted-foreground">{comfortLabels[comfort]}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex justify-center gap-2 text-[10px]">
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded-sm bg-blue-500" />
          <span>Cold</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded-sm bg-sky-400" />
          <span>Cool</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded-sm bg-green-500" />
          <span>Comfort</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded-sm bg-orange-400" />
          <span>Warm</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded-sm bg-red-500" />
          <span>Hot</span>
        </div>
      </div>
    </div>
  );
}

// Lifestyle impact item
function LifestyleImpact({ 
  icon, 
  title, 
  description, 
  highlight 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  highlight?: "good" | "neutral" | "bad";
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
      <div className={cn(
        "mt-0.5 flex-shrink-0",
        highlight === "good" && "text-green-600 dark:text-green-400",
        highlight === "bad" && "text-red-600 dark:text-red-400",
        highlight === "neutral" && "text-muted-foreground"
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-xs">{title}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
      </div>
    </div>
  );
}

// ============================================
// Main Components
// ============================================

interface CityMetricsGridProps {
  metrics: CityMetrics;
  cityName?: string;
  stateName?: string;  // For state-specific tax calculations
  zhviHistory?: { id: string; cityId: string; date: Date; value: number }[] | null;
  // Cost of living preferences for persona-based calculations
  costPreferences?: {
    housingSituation?: "renter" | "homeowner" | "prospective-buyer";
    includeUtilities?: boolean;
    workSituation?: "standard" | "local-earner" | "retiree";
    retireeFixedIncome?: number;
  };
}

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  tooltip?: string;
  colorClass?: string;
}

function MetricItem({ icon, label, value, unit, tooltip, colorClass }: MetricItemProps) {
  const displayValue = value === null || value === undefined ? "—" : `${value}${unit || ""}`;
  
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
                <p className="text-sm whitespace-pre-line">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={cn("font-semibold", colorClass)}>{displayValue}</div>
      </div>
    </div>
  );
}

export function CityMetricsGrid({ metrics, cityName, stateName, zhviHistory, costPreferences }: CityMetricsGridProps) {
  // BEA data is now included in metrics (merged from metrics.json)
  const bea = metrics.bea;
  // NOAA climate data (30-year normals)
  const noaa = metrics.noaa;
  // Census demographics data
  const census = metrics.census;
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

  // Calculate True Cost of Living from BEA data with persona preferences
  const trueCostOfLiving = calculateTrueCostOfLiving(bea, {
    housingSituation: costPreferences?.housingSituation ?? "renter",
    includeUtilities: costPreferences?.includeUtilities ?? true,
    workSituation: costPreferences?.workSituation ?? "local-earner",
    medianHomePrice: metrics.medianHomePrice,
    medianHouseholdIncome: metrics.census?.medianHouseholdIncome ?? null,
    retireeFixedIncome: costPreferences?.retireeFixedIncome ?? 50000,
    state: stateName,  // For state-specific tax calculations
    propertyTaxRate: metrics.propertyTaxRate,  // For homeowner property tax calculations
  });

  // Climate scorecard data
  const persona = useMemo(() => getClimatePersona(noaa, metrics), [noaa, metrics]);
  const usabilityScores = useMemo(() => calculateUsabilityScores(noaa), [noaa]);
  const monthlyData = useMemo(() => getMonthlyComfortData(noaa, metrics), [noaa, metrics]);
  const lifestyleImpacts = useMemo(() => getLifestyleImpacts(noaa, metrics), [noaa, metrics]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Climate Section - Full Width Scorecard */}
      <Card className="md:col-span-2">
        {/* Persona Header */}
        <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-red-500/20">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{persona.emoji}</span>
              <div>
                <h3 className="text-lg font-bold">{persona.title}</h3>
                <p className="text-xs font-normal text-muted-foreground">{persona.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {noaa && (
                <span className="text-xs font-normal text-muted-foreground">
                  NOAA {noaa.normalPeriod}
                </span>
              )}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Climate persona based on 30-year NOAA normals and Open-Meteo data.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 space-y-5">
          {/* Top Row: Usability Rings + Monthly Comfort Band */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usability Rings */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                Climate Usability Scores
              </h4>
              <div className="flex justify-around">
                <RadialGauge
                  value={usabilityScores.tshirtDays}
                  label="T-Shirt Days"
                  icon={<Shirt className="h-3 w-3" />}
                  color="text-green-500"
                  tooltip={`${Math.round(usabilityScores.tshirtDays * 3.65)} days/year with temps between 65-80°F`}
                />
                <RadialGauge
                  value={usabilityScores.outdoorUsability}
                  label="Outdoor Days"
                  icon={<Sun className="h-3 w-3" />}
                  color="text-amber-500"
                  tooltip="Days with no rain and comfortable temperatures"
                />
                <RadialGauge
                  value={usabilityScores.sunSeekerScore}
                  label="Sunny Days"
                  icon={<Cloud className="h-3 w-3" />}
                  color="text-sky-500"
                  tooltip={`${Math.round(usabilityScores.sunSeekerScore * 3.65)} clear or partly cloudy days/year`}
                />
              </div>
            </div>

            {/* Monthly Comfort Band */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                <Wind className="h-3 w-3" />
                Monthly Comfort Profile
              </h4>
              <SeasonalComfortBand data={monthlyData} />
            </div>
          </div>

          {/* Lifestyle Impacts (if any) */}
          {lifestyleImpacts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Lifestyle Impact
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {lifestyleImpacts.map((impact, i) => (
                  <LifestyleImpact key={i} {...impact} />
                ))}
              </div>
            </div>
          )}

          {/* Detailed Metrics Grid */}
          <div className="pt-3 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3">Detailed Climate Data</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
            </div>

            {/* NOAA Data Section */}
            {noaa && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  <MetricItem
                    icon={<Sun className="h-4 w-4 text-yellow-500" />}
                    label="Comfort Days"
                    value={noaa.comfortDays}
                    unit="/yr"
                    tooltip="Days with max temp between 65-80°F (T-shirt weather)"
                    colorClass={noaa.comfortDays && noaa.comfortDays > 150 ? "text-score-high" : ""}
                  />
                  <MetricItem
                    icon={<Thermometer className="h-4 w-4 text-red-500" />}
                    label="Extreme Heat"
                    value={noaa.extremeHeatDays}
                    unit=" days >95°F"
                    tooltip="Days per year with max temp above 95°F"
                    colorClass={noaa.extremeHeatDays && noaa.extremeHeatDays > 30 ? "text-red-500" : "text-score-high"}
                  />
                  <MetricItem
                    icon={<Snowflake className="h-4 w-4 text-blue-400" />}
                    label="Freeze Days"
                    value={noaa.freezeDays}
                    unit=" days <32°F"
                    tooltip="Days per year with min temp below 32°F"
                    colorClass={noaa.freezeDays && noaa.freezeDays > 60 ? "text-blue-500" : "text-score-high"}
                  />
                  <MetricItem
                    icon={<CloudRain className="h-4 w-4 text-blue-400" />}
                    label="Rain Days"
                    value={noaa.rainDays}
                    unit="/yr"
                    tooltip="Days with precipitation > 0.01 inches"
                    colorClass={getScoreColor(noaa.rainDays ? 100 - noaa.rainDays / 1.5 : null)}
                  />
                  <MetricItem
                    icon={<Snowflake className="h-4 w-4 text-cyan-400" />}
                    label="Snow Days"
                    value={noaa.snowDays}
                    unit=" days"
                    tooltip={`Days with >1 inch snowfall. Annual total: ${noaa.annualSnowfall ?? "N/A"} inches`}
                    colorClass={noaa.snowDays && noaa.snowDays > 20 ? "text-cyan-500" : ""}
                  />
                  <MetricItem
                    icon={<Cloud className="h-4 w-4 text-gray-400" />}
                    label="Cloudy Days"
                    value={noaa.cloudyDays}
                    unit="/yr"
                    tooltip={`Days with >75% cloud cover. Avg cloud cover: ${noaa.avgCloudCover ?? "N/A"}%`}
                    colorClass={noaa.cloudyDays && noaa.cloudyDays > 150 ? "text-gray-500" : "text-score-high"}
                  />
                  <MetricItem
                    icon={<Droplets className="h-4 w-4 text-teal-500" />}
                    label="July Dewpoint"
                    value={noaa.julyDewpoint?.toFixed(0)}
                    unit="°F"
                    tooltip={`Summer humidity indicator. >65°F = Muggy, >72°F = Oppressive. Summer RH: ${noaa.summerHumidityIndex ?? "N/A"}%`}
                    colorClass={noaa.julyDewpoint && noaa.julyDewpoint > 70 ? "text-teal-600" : "text-score-high"}
                  />
                  <MetricItem
                    icon={<Activity className="h-4 w-4 text-purple-500" />}
                    label="Diurnal Swing"
                    value={noaa.diurnalSwing?.toFixed(0)}
                    unit="°F"
                    tooltip="Average daily high-low temperature difference"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  <MetricItem
                    icon={<Zap className="h-4 w-4 text-amber-500" />}
                    label="Heating Days"
                    value={noaa.heatingDegreeDays?.toLocaleString()}
                    unit=" HDD"
                    tooltip="Heating Degree Days (base 65°F) - proxy for heating costs"
                  />
                  <MetricItem
                    icon={<Zap className="h-4 w-4 text-orange-500" />}
                    label="Cooling Days"
                    value={noaa.coolingDegreeDays?.toLocaleString()}
                    unit=" CDD"
                    tooltip="Cooling Degree Days (base 65°F) - proxy for AC costs"
                  />
                  <MetricItem
                    icon={<Leaf className="h-4 w-4 text-green-500" />}
                    label="Growing Season"
                    value={noaa.growingSeasonDays}
                    unit=" days"
                    tooltip={`Last spring freeze: ${noaa.lastSpringFreeze || "N/A"}, First fall freeze: ${noaa.firstFallFreeze || "N/A"}`}
                    colorClass={noaa.growingSeasonDays && noaa.growingSeasonDays > 200 ? "text-score-high" : ""}
                  />
                  <MetricItem
                    icon={<Activity className="h-4 w-4 text-purple-500" />}
                    label="Seasonal Stability"
                    value={noaa.seasonalStability?.toFixed(1)}
                    unit="°F σ"
                    tooltip="Standard deviation of monthly avg temps. Lower = more consistent ('perpetual spring')"
                    colorClass={noaa.seasonalStability && noaa.seasonalStability < 10 ? "text-score-high" : ""}
                  />
                </div>
              </>
            )}

            {/* No NOAA Data Message */}
            {!noaa && (
              <div className="text-center py-4 text-muted-foreground">
                <CloudRain className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">Pull climate data from the Admin panel for detailed analysis.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cost of Living Section - Full Width with Price Chart */}
      <Card className="md:col-span-2">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Metrics */}
            <div className="space-y-4">
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
                  tooltip={`Regional housing/rent prices relative to national average.
100 = national average
Lower is more affordable`}
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
                  value={trueCostOfLiving.taxBreakdown?.calculatedEffectiveRate !== null 
                    ? `${trueCostOfLiving.taxBreakdown?.calculatedEffectiveRate}%`
                    : (trueCostOfLiving.effectiveTaxRate !== null 
                      ? `${trueCostOfLiving.effectiveTaxRate.toFixed(1)}%` 
                      : formatPercent(metrics.stateTaxRate))}
                  tooltip={getTaxRateTooltip(trueCostOfLiving)}
                  colorClass={getRatingColor(trueCostOfLiving.taxBurdenRating, "tax")}
                />
                <MetricItem
                  icon={<DollarSign className="h-4 w-4" />}
                  label="After-Tax Income"
                  value={trueCostOfLiving.selectedAfterTaxIncome !== null 
                    ? formatCurrency(trueCostOfLiving.selectedAfterTaxIncome) 
                    : (trueCostOfLiving.afterTaxIncome !== null 
                      ? formatCurrency(trueCostOfLiving.afterTaxIncome) 
                      : null)}
                  tooltip={getAfterTaxIncomeTooltip(trueCostOfLiving)}
                />
                <MetricItem
                  icon={<Home className="h-4 w-4" />}
                  label="Median Home Price"
                  value={formatPrice(metrics.medianHomePrice)}
                  tooltip="Median single-family home price (Zillow ZHVI)"
                />
              </div>
            </div>

            {/* Right Column - Price History Chart */}
            <div className="min-h-[300px]">
              <PriceTrendChart
                cityName={cityName || null}
                zhviHistory={zhviHistory || null}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics Section - Full Width with Census Data */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" />
              Demographics
            </div>
            {census && (
              <span className="text-xs font-normal text-muted-foreground">
                Census ACS {census.year}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {census ? (
            <>
              {/* Population & Age */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Population & Age</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Population"
                    value={census.totalPopulation?.toLocaleString()}
                    tooltip="City population (Census ACS)"
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Median Age"
                    value={census.medianAge?.toFixed(1)}
                    tooltip="Median age of residents"
                    colorClass={census.medianAge && census.medianAge < 35 ? "text-green-600" : census.medianAge && census.medianAge > 45 ? "text-amber-600" : ""}
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Young Adults (18-34)"
                    value={census.age18to34Percent?.toFixed(1)}
                    unit="%"
                    tooltip="Percentage aged 18-34 (young professionals, students)"
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Seniors (55+)"
                    value={census.age55PlusPercent?.toFixed(1)}
                    unit="%"
                    tooltip="Percentage aged 55+ (retirement age)"
                  />
                </div>
              </div>

              {/* Race & Ethnicity */}
              <div className="pt-2 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Race & Ethnicity</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Diversity Index"
                    value={census.diversityIndex}
                    tooltip="0-100, probability two random people differ by race (higher = more diverse)"
                    colorClass={getScoreColor(census.diversityIndex)}
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="White"
                    value={census.whitePercent?.toFixed(1)}
                    unit="%"
                    tooltip="White alone, not Hispanic or Latino"
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Hispanic/Latino"
                    value={census.hispanicPercent?.toFixed(1)}
                    unit="%"
                    tooltip="Hispanic or Latino (any race)"
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Black"
                    value={census.blackPercent?.toFixed(1)}
                    unit="%"
                    tooltip="Black or African American alone"
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Asian"
                    value={census.asianPercent?.toFixed(1)}
                    unit="%"
                    tooltip="Asian alone"
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Two+ Races"
                    value={census.twoOrMoreRacesPercent?.toFixed(1)}
                    unit="%"
                    tooltip="Two or more races"
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Foreign-Born"
                    value={census.foreignBornPercent?.toFixed(1)}
                    unit="%"
                    tooltip="Born outside the United States (proxy for international culture)"
                  />
                </div>
              </div>

              {/* Hispanic Subgroups (if significant) */}
              {census.hispanicPercent && census.hispanicPercent > 5 && (
                <div className="pt-2 border-t">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Hispanic Subgroups (% of city)</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Mexican"
                      value={census.mexicanPercent?.toFixed(2)}
                      unit="%"
                      tooltip="Mexican population"
                    />
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Puerto Rican"
                      value={census.puertoRicanPercent?.toFixed(2)}
                      unit="%"
                      tooltip="Puerto Rican population"
                    />
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Cuban"
                      value={census.cubanPercent?.toFixed(2)}
                      unit="%"
                      tooltip="Cuban population"
                    />
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Salvadoran"
                      value={census.salvadoranPercent?.toFixed(2)}
                      unit="%"
                      tooltip="Salvadoran population"
                    />
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Guatemalan"
                      value={census.guatemalanPercent?.toFixed(2)}
                      unit="%"
                      tooltip="Guatemalan population"
                    />
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Colombian"
                      value={census.colombianPercent?.toFixed(2)}
                      unit="%"
                      tooltip="Colombian population"
                    />
                  </div>
                </div>
              )}

              {/* Asian Subgroups (if significant) */}
              {census.asianPercent && census.asianPercent > 3 && (
                <div className="pt-2 border-t">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Asian Subgroups (% of city)</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Chinese"
                      value={census.chinesePercent?.toFixed(2)}
                      unit="%"
                      tooltip="Chinese population"
                    />
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Indian"
                      value={census.indianPercent?.toFixed(2)}
                      unit="%"
                      tooltip="Asian Indian population"
                    />
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Filipino"
                      value={census.filipinoPercent?.toFixed(2)}
                      unit="%"
                      tooltip="Filipino population"
                    />
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Vietnamese"
                      value={census.vietnamesePercent?.toFixed(2)}
                      unit="%"
                      tooltip="Vietnamese population"
                    />
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Korean"
                      value={census.koreanPercent?.toFixed(2)}
                      unit="%"
                      tooltip="Korean population"
                    />
                    <MetricItem
                      icon={<Users className="h-4 w-4" />}
                      label="Japanese"
                      value={census.japanesePercent?.toFixed(2)}
                      unit="%"
                      tooltip="Japanese population"
                    />
                  </div>
                </div>
              )}

              {/* Education & Income */}
              <div className="pt-2 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Education & Income</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Bachelor's+"
                    value={census.bachelorsOrHigherPercent?.toFixed(1)}
                    unit="%"
                    tooltip="Population 25+ with Bachelor's degree or higher"
                    colorClass={census.bachelorsOrHigherPercent && census.bachelorsOrHigherPercent > 40 ? "text-score-high" : ""}
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Graduate Degree"
                    value={census.graduateDegreePercent?.toFixed(1)}
                    unit="%"
                    tooltip="Population with graduate or professional degree"
                  />
                  <MetricItem
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Median HH Income"
                    value={census.medianHouseholdIncome ? `$${(census.medianHouseholdIncome / 1000).toFixed(0)}K` : null}
                    tooltip="Median household income"
                    colorClass={census.medianHouseholdIncome && census.medianHouseholdIncome > 80000 ? "text-score-high" : ""}
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Poverty Rate"
                    value={census.povertyRate?.toFixed(1)}
                    unit="%"
                    tooltip="Population below poverty line"
                    colorClass={census.povertyRate && census.povertyRate > 15 ? "text-red-600" : "text-score-high"}
                  />
                </div>
              </div>

              {/* Household & Language */}
              <div className="pt-2 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Household & Language</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Family Households"
                    value={census.familyHouseholdsPercent?.toFixed(1)}
                    unit="%"
                    tooltip="Households with families"
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Married Couples"
                    value={census.marriedCouplePercent?.toFixed(1)}
                    unit="%"
                    tooltip="Married-couple households"
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Living Alone"
                    value={census.singlePersonPercent?.toFixed(1)}
                    unit="%"
                    tooltip="Single-person households"
                  />
                  <MetricItem
                    icon={<Users className="h-4 w-4" />}
                    label="Spanish at Home"
                    value={census.spanishAtHomePercent?.toFixed(1)}
                    unit="%"
                    tooltip="Households speaking Spanish at home"
                  />
                </div>
              </div>
            </>
          ) : (
            // Fallback to old metrics if Census data not available
            <div className="grid grid-cols-2 gap-2">
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
              <div className="col-span-2 text-center py-4 text-muted-foreground text-sm">
                <p>Pull Census data from the Admin panel for detailed demographics.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality of Life Section - Full Width */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-rose-500" />
            Quality of Life
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.qol ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Walkability Card */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Footprints className="h-4 w-4 text-blue-500" />
                  <a 
                    href="https://www.walkscore.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:underline"
                    title="Walk Score® - walkscore.com"
                  >
                    Walk Score®
                  </a>
                </div>
                {metrics.qol.walkability ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Walk</span>
                      <span className={getScoreColor(metrics.qol.walkability.walkScore)}>
                        {metrics.qol.walkability.walkScore ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Transit</span>
                      <span className={getScoreColor(metrics.qol.walkability.transitScore)}>
                        {metrics.qol.walkability.transitScore ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bike</span>
                      <span className={getScoreColor(metrics.qol.walkability.bikeScore)}>
                        {metrics.qol.walkability.bikeScore ?? "N/A"}
                      </span>
                    </div>
                    {metrics.qol.walkability.description && (
                      <p className="text-xs text-muted-foreground mt-1">{metrics.qol.walkability.description}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No data available</p>
                )}
              </div>

              {/* Safety Card */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm">Safety</span>
                </div>
                {metrics.qol.crime ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Violent Crime</span>
                      <span className={getScoreColor(metrics.qol.crime.violentCrimeRate, true)}>
                        {metrics.qol.crime.violentCrimeRate?.toFixed(0) ?? "N/A"}/100K
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Property Crime</span>
                      <span>{metrics.qol.crime.propertyCrimeRate?.toFixed(0) ?? "N/A"}/100K</span>
                    </div>
                    {metrics.qol.crime.trend3Year && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">3-Year Trend</span>
                        <span className={
                          metrics.qol.crime.trend3Year === "falling" ? "text-score-high" :
                          metrics.qol.crime.trend3Year === "rising" ? "text-score-low" : ""
                        }>
                          {metrics.qol.crime.trend3Year === "falling" ? "↓ Falling" :
                           metrics.qol.crime.trend3Year === "rising" ? "↑ Rising" : "→ Stable"}
                        </span>
                      </div>
                    )}
                    {metrics.qol.crime.dataYear && (
                      <p className="text-[10px] text-muted-foreground mt-1">Data: {metrics.qol.crime.dataYear}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Pull FBI Crime data</p>
                )}
              </div>

              {/* Air Quality Card */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Wind className="h-4 w-4 text-cyan-500" />
                  <span className="font-medium text-sm">Air Quality</span>
                </div>
                {metrics.qol.airQuality ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Annual AQI</span>
                      <span className={getScoreColor(metrics.qol.airQuality.annualAQI, true)}>
                        {metrics.qol.airQuality.annualAQI ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Healthy Days</span>
                      <span className={getScoreColor(metrics.qol.airQuality.healthyDaysPercent)}>
                        {metrics.qol.airQuality.healthyDaysPercent ?? "N/A"}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hazardous Days</span>
                      <span className={getScoreColor(metrics.qol.airQuality.hazardousDays, true)}>
                        {metrics.qol.airQuality.hazardousDays ?? "N/A"}/yr
                      </span>
                    </div>
                    {metrics.qol.airQuality.primaryPollutant && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Primary: {metrics.qol.airQuality.primaryPollutant}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Pull EPA Air Quality data</p>
                )}
              </div>

              {/* Broadband Card */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-sm">Internet</span>
                </div>
                {metrics.qol.broadband ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fiber Coverage</span>
                      <span className={getScoreColor(metrics.qol.broadband.fiberCoveragePercent)}>
                        {metrics.qol.broadband.fiberCoveragePercent ?? "N/A"}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Providers</span>
                      <span>{metrics.qol.broadband.providerCount ?? "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Speed</span>
                      <span>{metrics.qol.broadband.maxDownloadSpeed ? `${metrics.qol.broadband.maxDownloadSpeed} Mbps` : "N/A"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Pull FCC Broadband data</p>
                )}
              </div>

              {/* Education Card */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-sm">Schools</span>
                </div>
                {metrics.qol.education ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Student/Teacher</span>
                      <span className={getScoreColor(metrics.qol.education.studentTeacherRatio, true)}>
                        {metrics.qol.education.studentTeacherRatio ?? "N/A"}:1
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Graduation Rate</span>
                      <span className={getScoreColor(metrics.qol.education.graduationRate)}>
                        {metrics.qol.education.graduationRate ?? "N/A"}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Schools</span>
                      <span>{metrics.qol.education.schoolCount ?? "N/A"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Pull NCES Education data</p>
                )}
              </div>

              {/* Healthcare Card */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-sm">Healthcare</span>
                </div>
                {metrics.qol.health ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Physicians</span>
                      <span className={getScoreColor(metrics.qol.health.primaryCarePhysiciansPer100k)}>
                        {metrics.qol.health.primaryCarePhysiciansPer100k ?? "N/A"}/100K
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hospital Beds</span>
                      <span>{metrics.qol.health.hospitalBeds100k ?? "N/A"}/100K</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">HPSA Score</span>
                      <span className={getScoreColor(metrics.qol.health.hpsaScore, true)}>
                        {metrics.qol.health.hpsaScore ?? "N/A"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Pull HRSA Health data</p>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>Pull QoL data from the Admin panel for detailed metrics.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entertainment & Recreation Section */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PartyPopper className="h-4 w-4 text-amber-500" />
            Entertainment & Recreation
            {metrics.cultural?.urbanLifestyle?.dataYear && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                Source: OpenStreetMap {metrics.cultural.urbanLifestyle.dataYear}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(metrics.cultural?.urbanLifestyle || metrics.nflTeams || metrics.nbaTeams || 
            metrics.mlbTeams || metrics.nhlTeams || metrics.mlsTeams || metrics.qol?.recreation) ? (
            <>
              {/* Urban Lifestyle Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Nightlife */}
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🍺</span>
                    <span className="font-medium text-sm">Nightlife</span>
                  </div>
                  {metrics.cultural?.urbanLifestyle?.nightlife ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bars/10K</span>
                        <span className="font-medium">
                          {metrics.cultural.urbanLifestyle.nightlife.barsAndClubsPer10K?.toFixed(1) ?? "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Venues</span>
                        <span>{metrics.cultural.urbanLifestyle.nightlife.totalVenues ?? "N/A"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No data</p>
                  )}
                </div>

                {/* Arts */}
                <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🎭</span>
                    <span className="font-medium text-sm">Arts & Culture</span>
                  </div>
                  {metrics.cultural?.urbanLifestyle?.arts ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Museums</span>
                        <span className="font-medium">
                          {metrics.cultural.urbanLifestyle.arts.museums ?? "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Theaters</span>
                        <span>{metrics.cultural.urbanLifestyle.arts.theaters ?? "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Galleries</span>
                        <span>{metrics.cultural.urbanLifestyle.arts.artGalleries ?? "N/A"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No data</p>
                  )}
                </div>

                {/* Dining */}
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🍽️</span>
                    <span className="font-medium text-sm">Dining Scene</span>
                  </div>
                  {metrics.cultural?.urbanLifestyle?.dining ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rest./10K</span>
                        <span className="font-medium">
                          {metrics.cultural.urbanLifestyle.dining.restaurantsPer10K?.toFixed(1) ?? "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cuisines</span>
                        <span>{metrics.cultural.urbanLifestyle.dining.cuisineDiversity ?? "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Breweries</span>
                        <span>{metrics.cultural.urbanLifestyle.dining.breweries ?? "N/A"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No data</p>
                  )}
                </div>

                {/* Sports Teams */}
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🏈</span>
                    <span className="font-medium text-sm">Pro Sports</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    {metrics.nflTeams && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NFL</span>
                        <span className="font-medium">{metrics.nflTeams}</span>
                      </div>
                    )}
                    {metrics.nbaTeams && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NBA</span>
                        <span className="font-medium">{metrics.nbaTeams}</span>
                      </div>
                    )}
                    {metrics.mlbTeams && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MLB</span>
                        <span className="font-medium">{metrics.mlbTeams}</span>
                      </div>
                    )}
                    {metrics.nhlTeams && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NHL</span>
                        <span className="font-medium">{metrics.nhlTeams}</span>
                      </div>
                    )}
                    {metrics.mlsTeams && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MLS</span>
                        <span className="font-medium">{metrics.mlsTeams}</span>
                      </div>
                    )}
                    {(() => {
                      const countTeams = (t: string | null) => t?.split(",").filter(s => s.trim()).length || 0;
                      const total = countTeams(metrics.nflTeams) + countTeams(metrics.nbaTeams) + 
                                    countTeams(metrics.mlbTeams) + countTeams(metrics.nhlTeams) + 
                                    countTeams(metrics.mlsTeams);
                      if (total === 0) return <p className="text-muted-foreground">No teams</p>;
                      return (
                        <div className="flex justify-between pt-1 border-t border-green-200 dark:border-green-800 mt-1">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-semibold">{total} teams</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Recreation & Outdoors */}
              {metrics.qol?.recreation && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground mb-4">
                    <Leaf className="h-4 w-4 text-green-600" />
                    RECREATION & OUTDOORS
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metrics.qol.recreation.nature && (
                      <>
                        <div className="p-3 rounded-lg bg-muted/30 border">
                          <div className="text-sm text-muted-foreground mb-1">Trail Miles (10mi)</div>
                          <div className="text-xl font-semibold">
                            {metrics.qol.recreation.nature.trailMilesWithin10Mi ?? "N/A"}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border">
                          <div className="text-sm text-muted-foreground mb-1">Park Acres/1K</div>
                          <div className="text-xl font-semibold">
                            {metrics.qol.recreation.nature.parkAcresPer1K ?? "N/A"}
                          </div>
                        </div>
                      </>
                    )}
                    {metrics.qol.recreation.geography && (
                      <>
                        <div className="p-3 rounded-lg bg-muted/30 border">
                          <div className="text-sm text-muted-foreground mb-1">Coastal Access</div>
                          <div className={cn(
                            "text-xl font-semibold",
                            metrics.qol.recreation.geography.coastlineWithin15Mi && "text-blue-500"
                          )}>
                            {metrics.qol.recreation.geography.coastlineWithin15Mi ? "Yes" : 
                              metrics.qol.recreation.geography.coastlineDistanceMi ? 
                              `${metrics.qol.recreation.geography.coastlineDistanceMi}mi` : "No"}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border">
                          <div className="text-sm text-muted-foreground mb-1">Elevation Range</div>
                          <div className="text-xl font-semibold">
                            {metrics.qol.recreation.geography.maxElevationDelta ?? "N/A"} ft
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">Entertainment data not yet loaded.</p>
              <p className="text-xs">Pull Urban Lifestyle and Recreation data from the Admin panel.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Values & Alignment Section */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Church className="h-4 w-4 text-purple-500" />
            Values & Alignment
            {metrics.cultural?.political?.dataYear && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                Political: {metrics.cultural.political.dataYear} • Religious: {metrics.cultural?.religious?.dataYear || "N/A"}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.cultural?.political || metrics.cultural?.religious ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Political */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <Vote className="h-4 w-4" />
                  POLITICAL LANDSCAPE
                </h4>
                
                {metrics.cultural?.political ? (
                  <>
                    {/* Political Lean Badge */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "px-4 py-2 rounded-lg font-semibold text-white",
                        (metrics.cultural.political.partisanIndex ?? 0) > 0.2 ? "bg-blue-600" :
                        (metrics.cultural.political.partisanIndex ?? 0) < -0.2 ? "bg-red-600" :
                        "bg-purple-600"
                      )}>
                        {(metrics.cultural.political.partisanIndex ?? 0) > 0.2 ? "Leans Democrat" :
                         (metrics.cultural.political.partisanIndex ?? 0) < -0.2 ? "Leans Republican" :
                         "Swing / Competitive"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Partisan Index: <span className="font-medium">{((metrics.cultural.political.partisanIndex ?? 0) * 100).toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Partisan Index Visual */}
                    <div className="space-y-1">
                      <div className="relative h-8 bg-gradient-to-r from-red-600 via-purple-500 to-blue-600 rounded-lg overflow-hidden">
                        <div 
                          className="absolute top-1 bottom-1 w-1.5 bg-white border-2 border-gray-800 rounded shadow-lg"
                          style={{ 
                            left: `${((metrics.cultural.political.partisanIndex ?? 0) + 1) / 2 * 100}%`,
                            transform: 'translateX(-50%)'
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground px-1">
                        <span>Strong R (-100)</span>
                        <span>Swing (0)</span>
                        <span>Strong D (+100)</span>
                      </div>
                    </div>
                    
                    {/* Vote Share Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-2xl font-bold text-blue-600">
                          {metrics.cultural.political.democratPercent?.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Democrat</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="text-2xl font-bold text-red-600">
                          {metrics.cultural.political.republicanPercent?.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Republican</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="text-2xl font-bold text-purple-600">
                          {metrics.cultural.political.marginOfVictory?.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Margin</div>
                      </div>
                      <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <div className="text-2xl font-bold text-emerald-600">
                          {metrics.cultural.political.voterTurnout?.toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Turnout</div>
                      </div>
                    </div>

                    {/* Competitiveness & Engagement */}
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Election Competitiveness</span>
                        <span className={cn(
                          "text-sm font-medium px-2 py-0.5 rounded",
                          (metrics.cultural.political.marginOfVictory ?? 0) < 5 
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" 
                            : (metrics.cultural.political.marginOfVictory ?? 0) < 15
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        )}>
                          {(metrics.cultural.political.marginOfVictory ?? 0) < 5 ? "Highly Competitive" :
                           (metrics.cultural.political.marginOfVictory ?? 0) < 15 ? "Moderately Competitive" :
                           "Safe District"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Civic Engagement</span>
                        <span className={cn(
                          "text-sm font-medium px-2 py-0.5 rounded",
                          (metrics.cultural.political.voterTurnout ?? 0) >= 70
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                            : (metrics.cultural.political.voterTurnout ?? 0) >= 60
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        )}>
                          {(metrics.cultural.political.voterTurnout ?? 0) >= 70 ? "High" :
                           (metrics.cultural.political.voterTurnout ?? 0) >= 60 ? "Moderate" :
                           "Low"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Source: MIT Election Lab, {metrics.cultural.political.dataYear} Presidential Election
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Pull Cultural data from the Admin panel.
                  </div>
                )}
              </div>

              {/* Right Column - Religious */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <Church className="h-4 w-4" />
                  RELIGIOUS LANDSCAPE
                </h4>
                
                {metrics.cultural?.religious ? (
                  <>
                    {/* Dominant Tradition Badge */}
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 rounded-lg font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        {metrics.cultural.religious.dominantTradition}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Diversity: <span className="font-medium">{metrics.cultural.religious.diversityIndex}/100</span>
                      </div>
                    </div>

                    {/* Religious Composition Bars */}
                    <div className="space-y-2">
                      {[
                        { label: "Catholic", value: metrics.cultural.religious.catholic, color: "bg-amber-500", natAvg: 205 },
                        { label: "Evangelical Protestant", value: metrics.cultural.religious.evangelicalProtestant, color: "bg-red-500", natAvg: 256 },
                        { label: "Mainline Protestant", value: metrics.cultural.religious.mainlineProtestant, color: "bg-blue-500", natAvg: 103 },
                        { label: "Jewish", value: metrics.cultural.religious.jewish, color: "bg-sky-500", natAvg: 22 },
                        { label: "Muslim", value: metrics.cultural.religious.muslim, color: "bg-emerald-500", natAvg: 11 },
                        { label: "Secular/None", value: metrics.cultural.religious.unaffiliated, color: "bg-gray-400", natAvg: 290 },
                        ...(metrics.cultural.religious.lds && metrics.cultural.religious.lds > 50 
                          ? [{ label: "LDS/Mormon", value: metrics.cultural.religious.lds, color: "bg-purple-500", natAvg: 65 }] 
                          : []),
                      ].filter(t => t.value && t.value > 5).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).map((tradition) => {
                        const concentration = tradition.value && tradition.natAvg ? tradition.value / tradition.natAvg : 0;
                        return (
                          <div key={tradition.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{tradition.label}</span>
                              <span className="font-medium">
                                {tradition.value}
                                <span className="text-muted-foreground ml-1">
                                  ({concentration > 1.5 ? "↑" : concentration < 0.7 ? "↓" : "~"} {(concentration * 100).toFixed(0)}% of avg)
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
                                {/* National average marker */}
                                <div 
                                  className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                                  style={{ left: `${Math.min(100, (tradition.natAvg / 5))}%` }}
                                />
                                <div 
                                  className={cn("h-full rounded-full transition-all", tradition.color)}
                                  style={{ width: `${Math.min(100, (tradition.value ?? 0) / 5)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Gray line = National average. Values are adherents per 1,000 residents.
                    </div>

                    {/* Diversity Assessment */}
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Religious Diversity</span>
                        <span className={cn(
                          "text-sm font-medium px-2 py-0.5 rounded",
                          (metrics.cultural.religious.diversityIndex ?? 0) >= 70
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                            : (metrics.cultural.religious.diversityIndex ?? 0) >= 50
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        )}>
                          {(metrics.cultural.religious.diversityIndex ?? 0) >= 70 ? "Highly Diverse" :
                           (metrics.cultural.religious.diversityIndex ?? 0) >= 50 ? "Moderately Diverse" :
                           "Homogeneous"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Secular Population</span>
                        <span className={cn(
                          "text-sm font-medium px-2 py-0.5 rounded",
                          (metrics.cultural.religious.unaffiliated ?? 0) >= 400
                            ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            : (metrics.cultural.religious.unaffiliated ?? 0) >= 250
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                        )}>
                          {(metrics.cultural.religious.unaffiliated ?? 0) >= 400 ? "Very High" :
                           (metrics.cultural.religious.unaffiliated ?? 0) >= 250 ? "Average" :
                           "Below Average"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Source: ARDA U.S. Religion Census {metrics.cultural.religious.dataYear}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Religious data not available
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">Values data not yet loaded.</p>
              <p className="text-xs">Pull Cultural data from the Admin panel to see political and religious demographics.</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
