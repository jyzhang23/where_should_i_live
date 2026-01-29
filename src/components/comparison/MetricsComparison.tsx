"use client";

import { CityWithMetrics } from "@/types/city";
import { CityScore } from "@/types/scores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  ArrowDown,
  Sun,
  Home,
  Users,
  Activity,
  DollarSign,
  Thermometer,
  CloudRain,
  Droplets,
  GraduationCap,
  Stethoscope,
  Shield,
  Wind,
  Vote,
  Church,
} from "lucide-react";

interface MetricsComparisonProps {
  city1: CityWithMetrics | null;
  city2: CityWithMetrics | null;
  score1: CityScore | null;
  score2: CityScore | null;
}

interface ComparisonRowProps {
  label: string;
  value1: number | string | null;
  value2: number | string | null;
  format?: (val: number | string | null) => string;
  higherIsBetter?: boolean;
  showDiff?: boolean;
}

function ComparisonRow({
  label,
  value1,
  value2,
  format = (v) => (v !== null ? String(v) : "—"),
  higherIsBetter = true,
  showDiff = true,
}: ComparisonRowProps) {
  const formatted1 = format(value1);
  const formatted2 = format(value2);

  // Determine which is better
  let comparison: "better" | "worse" | "equal" | "na" = "na";
  if (value1 !== null && value2 !== null && typeof value1 === "number" && typeof value2 === "number") {
    if (value1 === value2) {
      comparison = "equal";
    } else if (higherIsBetter) {
      comparison = value1 > value2 ? "better" : "worse";
    } else {
      comparison = value1 < value2 ? "better" : "worse";
    }
  }

  const getIndicator = (comp: typeof comparison, isCity1: boolean) => {
    if (comp === "na" || comp === "equal") return null;
    const isBetter = isCity1 ? comp === "better" : comp === "worse";
    if (isBetter) {
      return <ArrowUp className="h-3 w-3 text-score-high" />;
    }
    return <ArrowDown className="h-3 w-3 text-score-low" />;
  };

  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-border/50 last:border-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-center flex items-center justify-center gap-1">
        {formatted1}
        {showDiff && getIndicator(comparison, true)}
      </div>
      <div className="text-sm font-medium text-center flex items-center justify-center gap-1">
        {formatted2}
        {showDiff && getIndicator(comparison, false)}
      </div>
    </div>
  );
}

function SectionHeader({ 
  icon, 
  title, 
  city1Name, 
  city2Name 
}: { 
  icon: React.ReactNode; 
  title: string;
  city1Name: string;
  city2Name: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 bg-muted/30 px-3 rounded-t-lg -mx-3 mb-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="text-sm font-semibold text-center text-primary">
        {city1Name}
      </div>
      <div className="text-sm font-semibold text-center text-muted-foreground">
        {city2Name}
      </div>
    </div>
  );
}

export function MetricsComparison({
  city1,
  city2,
  score1,
  score2,
}: MetricsComparisonProps) {
  if (!city1 || !city2 || !score1 || !score2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Metrics Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Select two cities to compare their metrics
          </p>
        </CardContent>
      </Card>
    );
  }

  const m1 = city1.metrics;
  const m2 = city2.metrics;

  const formatTemp = (v: number | string | null) => 
    v !== null && typeof v === "number" ? `${v.toFixed(0)}°F` : "—";
  const formatPercentDecimal = (v: number | string | null) => 
    v !== null && typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "—";
  const formatPercent = (v: number | string | null) => 
    v !== null && typeof v === "number" ? `${v.toFixed(1)}%` : "—";
  const formatPrice = (v: number | string | null) => {
    if (v === null || typeof v !== "number") return "—";
    if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
    return `$${(v / 1000).toFixed(0)}K`;
  };
  const formatCurrency = (v: number | string | null) => {
    if (v === null || typeof v !== "number") return "—";
    return `$${v.toLocaleString()}`;
  };
  const formatNumber = (v: number | string | null, decimals = 1) =>
    v !== null && typeof v === "number" ? v.toFixed(decimals) : "—";
  const formatInt = (v: number | string | null) =>
    v !== null && typeof v === "number" ? v.toFixed(0) : "—";
  const formatPop = (v: number | string | null) => {
    if (v === null || typeof v !== "number") return "—";
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return String(v);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Detailed Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scores Section */}
        <div>
          <SectionHeader
            icon={<Activity className="h-4 w-4" />}
            title="Scores"
            city1Name={city1.name}
            city2Name={city2.name}
          />
          <ComparisonRow
            label="Overall Score"
            value1={score1.totalScore}
            value2={score2.totalScore}
            format={(v) => formatNumber(v, 1)}
          />
          <ComparisonRow
            label="Climate"
            value1={score1.climateScore}
            value2={score2.climateScore}
            format={(v) => formatNumber(v, 1)}
          />
          <ComparisonRow
            label="Cost"
            value1={score1.costScore}
            value2={score2.costScore}
            format={(v) => formatNumber(v, 1)}
          />
          <ComparisonRow
            label="Demographics"
            value1={score1.demographicsScore}
            value2={score2.demographicsScore}
            format={(v) => formatNumber(v, 1)}
          />
          <ComparisonRow
            label="Quality of Life"
            value1={score1.qualityOfLifeScore}
            value2={score2.qualityOfLifeScore}
            format={(v) => formatNumber(v, 1)}
          />
          <ComparisonRow
            label="Cultural"
            value1={score1.culturalScore}
            value2={score2.culturalScore}
            format={(v) => formatNumber(v, 1)}
          />
        </div>

        {/* Climate Section - Enhanced with NOAA data */}
        <div>
          <SectionHeader
            icon={<Sun className="h-4 w-4 text-amber-500" />}
            title="Climate"
            city1Name={city1.name}
            city2Name={city2.name}
          />
          <ComparisonRow
            label="Comfort Days (65-80°F)"
            value1={m1?.noaa?.comfortDays ?? null}
            value2={m2?.noaa?.comfortDays ?? null}
            format={formatInt}
          />
          <ComparisonRow
            label="Extreme Heat Days (>95°F)"
            value1={m1?.noaa?.extremeHeatDays ?? null}
            value2={m2?.noaa?.extremeHeatDays ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Freeze Days (<32°F)"
            value1={m1?.noaa?.freezeDays ?? null}
            value2={m2?.noaa?.freezeDays ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Rainy Days"
            value1={m1?.noaa?.rainDays ?? m1?.daysOfRain ?? null}
            value2={m2?.noaa?.rainDays ?? m2?.daysOfRain ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Annual Snowfall"
            value1={m1?.noaa?.annualSnowfall ?? null}
            value2={m2?.noaa?.annualSnowfall ?? null}
            format={(v) => v !== null && typeof v === "number" ? `${v.toFixed(1)}"` : "—"}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Cloudy Days"
            value1={m1?.noaa?.cloudyDays ?? null}
            value2={m2?.noaa?.cloudyDays ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="July Dewpoint (Humidity)"
            value1={m1?.noaa?.julyDewpoint ?? null}
            value2={m2?.noaa?.julyDewpoint ?? null}
            format={(v) => v !== null && typeof v === "number" ? `${v.toFixed(0)}°F` : "—"}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Avg Temperature"
            value1={m1?.avgTemp ?? null}
            value2={m2?.avgTemp ?? null}
            format={formatTemp}
            showDiff={false}
          />
        </div>

        {/* Cost Section - Enhanced with BEA data */}
        <div>
          <SectionHeader
            icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
            title="Cost of Living"
            city1Name={city1.name}
            city2Name={city2.name}
          />
          <ComparisonRow
            label="Median Home Price"
            value1={m1?.medianHomePrice ?? null}
            value2={m2?.medianHomePrice ?? null}
            format={formatPrice}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="RPP (Cost Index)"
            value1={m1?.bea?.regionalPriceParity?.allItems ?? null}
            value2={m2?.bea?.regionalPriceParity?.allItems ?? null}
            format={(v) => formatNumber(v, 1)}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Housing Index"
            value1={m1?.bea?.regionalPriceParity?.housing ?? null}
            value2={m2?.bea?.regionalPriceParity?.housing ?? null}
            format={(v) => formatNumber(v, 1)}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Disposable Income"
            value1={m1?.bea?.taxes?.perCapitaDisposable ?? null}
            value2={m2?.bea?.taxes?.perCapitaDisposable ?? null}
            format={formatCurrency}
          />
          <ComparisonRow
            label="Effective Tax Rate"
            value1={m1?.bea?.taxes?.effectiveTaxRate ?? null}
            value2={m2?.bea?.taxes?.effectiveTaxRate ?? null}
            format={formatPercent}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Median Household Income"
            value1={m1?.census?.medianHouseholdIncome ?? null}
            value2={m2?.census?.medianHouseholdIncome ?? null}
            format={formatCurrency}
          />
        </div>

        {/* Demographics Section - Enhanced with Census data */}
        <div>
          <SectionHeader
            icon={<Users className="h-4 w-4 text-violet-500" />}
            title="Demographics"
            city1Name={city1.name}
            city2Name={city2.name}
          />
          <ComparisonRow
            label="City Population"
            value1={m1?.census?.totalPopulation ?? null}
            value2={m2?.census?.totalPopulation ?? null}
            format={formatPop}
            showDiff={false}
          />
          <ComparisonRow
            label="Median Age"
            value1={m1?.census?.medianAge ?? null}
            value2={m2?.census?.medianAge ?? null}
            format={(v) => formatNumber(v, 1)}
            showDiff={false}
          />
          <ComparisonRow
            label="Young Adults (18-34)"
            value1={m1?.census?.age18to34Percent ?? null}
            value2={m2?.census?.age18to34Percent ?? null}
            format={formatPercent}
            showDiff={false}
          />
          <ComparisonRow
            label="Diversity Index"
            value1={m1?.census?.diversityIndex ?? m1?.diversityIndex ?? null}
            value2={m2?.census?.diversityIndex ?? m2?.diversityIndex ?? null}
            format={(v) => formatNumber(v, 0)}
          />
          <ComparisonRow
            label="Bachelor's Degree+"
            value1={m1?.census?.bachelorsOrHigherPercent ?? null}
            value2={m2?.census?.bachelorsOrHigherPercent ?? null}
            format={formatPercent}
          />
          <ComparisonRow
            label="Foreign-Born"
            value1={m1?.census?.foreignBornPercent ?? null}
            value2={m2?.census?.foreignBornPercent ?? null}
            format={formatPercent}
            showDiff={false}
          />
        </div>

        {/* Quality of Life Section - Enhanced with QoL API data */}
        <div>
          <SectionHeader
            icon={<Activity className="h-4 w-4 text-rose-500" />}
            title="Quality of Life"
            city1Name={city1.name}
            city2Name={city2.name}
          />
          <ComparisonRow
            label="Walk Score"
            value1={m1?.qol?.walkability?.walkScore ?? m1?.walkScore ?? null}
            value2={m2?.qol?.walkability?.walkScore ?? m2?.walkScore ?? null}
            format={formatInt}
          />
          <ComparisonRow
            label="Transit Score"
            value1={m1?.transitScore ?? null}
            value2={m2?.transitScore ?? null}
            format={formatInt}
          />
          <ComparisonRow
            label="Violent Crime Rate"
            value1={m1?.qol?.crime?.violentCrimeRate ?? null}
            value2={m2?.qol?.crime?.violentCrimeRate ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Property Crime Rate"
            value1={m1?.qol?.crime?.propertyCrimeRate ?? null}
            value2={m2?.qol?.crime?.propertyCrimeRate ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Air Quality (AQI)"
            value1={m1?.qol?.airQuality?.annualAQI ?? null}
            value2={m2?.qol?.airQuality?.annualAQI ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Healthy Air Days"
            value1={m1?.qol?.airQuality?.healthyDaysPercent ?? null}
            value2={m2?.qol?.airQuality?.healthyDaysPercent ?? null}
            format={formatPercent}
          />
          <ComparisonRow
            label="Broadband Speed (Mbps)"
            value1={m1?.qol?.broadband?.maxDownloadSpeed ?? null}
            value2={m2?.qol?.broadband?.maxDownloadSpeed ?? null}
            format={formatInt}
          />
          <ComparisonRow
            label="Graduation Rate"
            value1={m1?.qol?.education?.graduationRate ?? null}
            value2={m2?.qol?.education?.graduationRate ?? null}
            format={formatPercent}
          />
          <ComparisonRow
            label="Primary Care Physicians"
            value1={m1?.qol?.health?.primaryCarePhysiciansPer100k ?? null}
            value2={m2?.qol?.health?.primaryCarePhysiciansPer100k ?? null}
            format={(v) => v !== null && typeof v === "number" ? `${v}/100K` : "—"}
          />
        </div>

        {/* Cultural Section */}
        <div>
          <SectionHeader
            icon={<Vote className="h-4 w-4 text-purple-500" />}
            title="Cultural Profile"
            city1Name={city1.name}
            city2Name={city2.name}
          />
          <ComparisonRow
            label="Partisan Index"
            value1={m1?.cultural?.political?.partisanIndex != null ? (m1.cultural!.political!.partisanIndex * 100) : null}
            value2={m2?.cultural?.political?.partisanIndex != null ? (m2.cultural!.political!.partisanIndex * 100) : null}
            format={(v) => v !== null && typeof v === "number" ? (v > 0 ? `D+${v.toFixed(0)}` : v < 0 ? `R+${Math.abs(v).toFixed(0)}` : "Even") : "—"}
            showDiff={false}
          />
          <ComparisonRow
            label="Voter Turnout"
            value1={m1?.cultural?.political?.voterTurnout ?? null}
            value2={m2?.cultural?.political?.voterTurnout ?? null}
            format={formatPercent}
          />
          <ComparisonRow
            label="Religious Diversity"
            value1={m1?.cultural?.religious?.diversityIndex ?? null}
            value2={m2?.cultural?.religious?.diversityIndex ?? null}
            format={formatInt}
          />
          <ComparisonRow
            label="Dominant Tradition"
            value1={m1?.cultural?.religious?.dominantTradition ?? null}
            value2={m2?.cultural?.religious?.dominantTradition ?? null}
            showDiff={false}
          />
          <ComparisonRow
            label="Secular/Unaffiliated"
            value1={m1?.cultural?.religious?.unaffiliated ?? null}
            value2={m2?.cultural?.religious?.unaffiliated ?? null}
            format={(v) => v !== null && typeof v === "number" ? `${v}/1K` : "—"}
            showDiff={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}
