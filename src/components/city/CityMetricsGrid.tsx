"use client";

import { useMemo } from "react";
import { CityMetrics, NOAAClimateData } from "@/types/city";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateTrueCostOfLiving,
  formatCurrency,
  getRatingColor,
  BEAMetrics,
} from "@/lib/cost-of-living";

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

export function CityMetricsGrid({ metrics }: CityMetricsGridProps) {
  // BEA data is now included in metrics (merged from metrics.json)
  const bea = metrics.bea;
  // NOAA climate data (30-year normals)
  const noaa = metrics.noaa;
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
