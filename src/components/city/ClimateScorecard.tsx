"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CityMetrics, NOAAClimateData } from "@/types/city";
import {
  Sun,
  Thermometer,
  CloudRain,
  Snowflake,
  Wind,
  Shirt,
  Zap,
  Leaf,
  Info,
  Cloud,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClimateScorecardProps {
  metrics: CityMetrics;
  cityName: string;
}

// Generate a "Climate Persona" based on the data
function getClimatePersona(noaa: NOAAClimateData | undefined, metrics: CityMetrics): {
  title: string;
  subtitle: string;
  emoji: string;
} {
  if (!noaa) {
    return { title: "Climate Data", subtitle: "Loading detailed analysis...", emoji: "🌡️" };
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
  // Use seasonalStability and base temps to estimate monthly comfort
  // This is a simplification - ideally we'd have monthly data
  const avgTemp = metrics.avgTemp || 60;
  const summerTemp = metrics.avgSummerTemp || avgTemp + 15;
  const winterTemp = metrics.avgWinterTemp || avgTemp - 15;
  
  // Estimate monthly temps based on seasonal pattern
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Sinusoidal temperature pattern
  return months.map((month, i) => {
    // Create a smooth curve: coldest in Jan (0), hottest in Jul (6)
    const angle = ((i - 0) / 12) * 2 * Math.PI; // Shifted so Jan is coldest
    const tempFactor = Math.cos(angle); // -1 in July, +1 in January
    const temp = avgTemp - tempFactor * ((summerTemp - winterTemp) / 2);
    
    // Determine comfort level
    let comfort: "cold" | "cool" | "comfortable" | "warm" | "hot";
    if (temp < 40) comfort = "cold";
    else if (temp < 55) comfort = "cool";
    else if (temp < 75) comfort = "comfortable";
    else if (temp < 90) comfort = "warm";
    else comfort = "hot";

    return { month, temp: Math.round(temp), comfort };
  });
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
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              {/* Progress circle */}
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={color}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                  transition: "stroke-dashoffset 0.5s ease",
                }}
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{value}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm font-medium">
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
    <div className="space-y-2">
      <div className="flex gap-0.5">
        {data.map(({ month, temp, comfort }) => (
          <Tooltip key={month}>
            <TooltipTrigger asChild>
              <div className="flex-1 flex flex-col items-center">
                <div
                  className={cn(
                    "w-full h-8 rounded-sm cursor-help transition-transform hover:scale-110",
                    comfortColors[comfort]
                  )}
                />
                <span className="text-[10px] text-muted-foreground mt-1">{month}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{month}: ~{temp}°F</p>
              <p className="text-xs text-muted-foreground">{comfortLabels[comfort]}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span>Cold</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-sky-400" />
          <span>Cool</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>Comfortable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-orange-400" />
          <span>Warm</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
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
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
      <div className={cn(
        "mt-0.5",
        highlight === "good" && "text-green-600 dark:text-green-400",
        highlight === "bad" && "text-red-600 dark:text-red-400",
        highlight === "neutral" && "text-muted-foreground"
      )}>
        {icon}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
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
        description: `Low daily temp swing (${noaa.diurnalSwing}°F) - rarely need layers after morning.`,
        highlight: "good",
      });
    } else if (noaa.diurnalSwing > 25) {
      impacts.push({
        icon: <Shirt className="h-4 w-4" />,
        title: "Layer Up Daily",
        description: `High temp swing (${noaa.diurnalSwing}°F) - always carry a jacket for evenings.`,
        highlight: "neutral",
      });
    }
  }

  // Utility Tax (CDD + HDD)
  if (noaa.coolingDegreeDays !== null && noaa.heatingDegreeDays !== null) {
    const totalDD = noaa.coolingDegreeDays + noaa.heatingDegreeDays;
    const avgDD = 5500; // National average
    const pctDiff = Math.round(((totalDD - avgDD) / avgDD) * 100);
    
    if (pctDiff > 20) {
      impacts.push({
        icon: <Zap className="h-4 w-4" />,
        title: "High Utility Bills",
        description: `Expect ~${pctDiff}% higher electricity/gas bills than US average.`,
        highlight: "bad",
      });
    } else if (pctDiff < -20) {
      impacts.push({
        icon: <Zap className="h-4 w-4" />,
        title: "Low Utility Costs",
        description: `Energy bills ~${Math.abs(pctDiff)}% lower than US average.`,
        highlight: "good",
      });
    } else {
      impacts.push({
        icon: <Zap className="h-4 w-4" />,
        title: "Average Utility Costs",
        description: `Energy bills near the US average.`,
        highlight: "neutral",
      });
    }
  }

  // Gardener's Window (growing season)
  if (noaa.growingSeasonDays !== null) {
    const springFreeze = noaa.lastSpringFreeze || "N/A";
    const fallFreeze = noaa.firstFallFreeze || "N/A";
    
    if (noaa.growingSeasonDays > 250) {
      impacts.push({
        icon: <Leaf className="h-4 w-4" />,
        title: "Year-Round Gardening",
        description: `${noaa.growingSeasonDays} frost-free days. Nearly unlimited growing season.`,
        highlight: "good",
      });
    } else if (noaa.growingSeasonDays > 180) {
      impacts.push({
        icon: <Leaf className="h-4 w-4" />,
        title: "Good Growing Season",
        description: `${noaa.growingSeasonDays} days between frosts (${springFreeze} to ${fallFreeze}).`,
        highlight: "good",
      });
    } else {
      impacts.push({
        icon: <Leaf className="h-4 w-4" />,
        title: "Short Growing Season",
        description: `Only ${noaa.growingSeasonDays} frost-free days. Plan accordingly.`,
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
        description: `July dewpoint ${noaa.julyDewpoint}°F - expect sticky, muggy conditions.`,
        highlight: "bad",
      });
    } else if (noaa.julyDewpoint < 55) {
      impacts.push({
        icon: <Droplets className="h-4 w-4" />,
        title: "Dry Summers",
        description: `July dewpoint ${noaa.julyDewpoint}°F - comfortable, low humidity.`,
        highlight: "good",
      });
    }
  }

  // Sunny Days
  if (noaa.cloudyDays !== null) {
    const sunnyDays = 365 - noaa.cloudyDays;
    if (sunnyDays > 250) {
      impacts.push({
        icon: <Sun className="h-4 w-4" />,
        title: "Solar Paradise",
        description: `~${sunnyDays} clear/partly cloudy days. Great for outdoor activities & solar.`,
        highlight: "good",
      });
    } else if (sunnyDays < 180) {
      impacts.push({
        icon: <Cloud className="h-4 w-4" />,
        title: "Often Overcast",
        description: `Only ~${sunnyDays} sunny days. Consider a light therapy lamp.`,
        highlight: "neutral",
      });
    }
  }

  // Snow Impact
  if (noaa.snowDays !== null && noaa.annualSnowfall !== null) {
    if (noaa.snowDays > 25) {
      impacts.push({
        icon: <Snowflake className="h-4 w-4" />,
        title: "Snowy Winters",
        description: `~${noaa.snowDays} snow days, ${noaa.annualSnowfall}" annually. Budget for snow removal.`,
        highlight: "neutral",
      });
    } else if (noaa.snowDays === 0) {
      impacts.push({
        icon: <Snowflake className="h-4 w-4" />,
        title: "Snow-Free",
        description: `No significant snowfall. No winter driving concerns.`,
        highlight: "good",
      });
    }
  }

  return impacts;
}

export function ClimateScorecard({ metrics, cityName }: ClimateScorecardProps) {
  const noaa = metrics.noaa;
  
  const persona = useMemo(() => getClimatePersona(noaa, metrics), [noaa, metrics]);
  const usabilityScores = useMemo(() => calculateUsabilityScores(noaa), [noaa]);
  const monthlyData = useMemo(() => getMonthlyComfortData(noaa, metrics), [noaa, metrics]);
  const lifestyleImpacts = useMemo(() => getLifestyleImpacts(noaa, metrics), [noaa, metrics]);

  return (
    <Card className="overflow-hidden">
      {/* Header - Climate Persona */}
      <CardHeader className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-red-500/20">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{persona.emoji}</span>
            <div>
              <h3 className="text-xl font-bold">{persona.title}</h3>
              <p className="text-sm font-normal text-muted-foreground">{persona.subtitle}</p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Climate persona based on 30-year NOAA normals. 
                Data from major airport weather station.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Section 1: Usability Rings */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
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
              tooltip="Days with no rain and comfortable temperatures (not too hot/cold)"
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

        {/* Section 2: Seasonal Comfort Band */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <Wind className="h-4 w-4" />
            Monthly Comfort Profile
          </h4>
          <SeasonalComfortBand data={monthlyData} />
        </div>

        {/* Section 3: Lifestyle Impacts */}
        {lifestyleImpacts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Lifestyle Impact
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lifestyleImpacts.map((impact, i) => (
                <LifestyleImpact key={i} {...impact} />
              ))}
            </div>
          </div>
        )}

        {/* No NOAA Data Warning */}
        {!noaa && (
          <div className="text-center py-6 text-muted-foreground">
            <CloudRain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Detailed climate data not yet available. 
              <br />
              Pull climate data from the Admin panel.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
