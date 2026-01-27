"use client";

import { CityWithMetrics } from "@/types/city";
import { CityScore } from "@/types/scores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Sun,
  Home,
  Users,
  Activity,
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
  const formatPercent = (v: number | string | null) => 
    v !== null && typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "—";
  const formatPrice = (v: number | string | null) => {
    if (v === null || typeof v !== "number") return "—";
    if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
    return `$${(v / 1000).toFixed(0)}K`;
  };
  const formatNumber = (v: number | string | null, decimals = 1) =>
    v !== null && typeof v === "number" ? v.toFixed(decimals) : "—";
  const formatInt = (v: number | string | null) =>
    v !== null && typeof v === "number" ? v.toFixed(0) : "—";
  const formatPop = (v: number | string | null) => {
    if (v === null || typeof v !== "number") return "—";
    if (v >= 1000) return `${(v / 1000).toFixed(1)}M`;
    return `${v}K`;
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
            label="Climate Score"
            value1={score1.climateScore}
            value2={score2.climateScore}
            format={(v) => formatNumber(v, 1)}
          />
          <ComparisonRow
            label="Cost Score"
            value1={score1.costScore}
            value2={score2.costScore}
            format={(v) => formatNumber(v, 1)}
          />
          <ComparisonRow
            label="Demographics Score"
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
        </div>

        {/* Climate Section */}
        <div>
          <SectionHeader
            icon={<Sun className="h-4 w-4 text-amber-500" />}
            title="Climate"
            city1Name={city1.name}
            city2Name={city2.name}
          />
          <ComparisonRow
            label="Avg Temperature"
            value1={m1?.avgTemp ?? null}
            value2={m2?.avgTemp ?? null}
            format={formatTemp}
            showDiff={false}
          />
          <ComparisonRow
            label="Summer Temp"
            value1={m1?.avgSummerTemp ?? null}
            value2={m2?.avgSummerTemp ?? null}
            format={formatTemp}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Winter Temp"
            value1={m1?.avgWinterTemp ?? null}
            value2={m2?.avgWinterTemp ?? null}
            format={formatTemp}
          />
          <ComparisonRow
            label="Sunny Days"
            value1={m1?.daysOfSunshine ?? null}
            value2={m2?.daysOfSunshine ?? null}
            format={formatInt}
          />
          <ComparisonRow
            label="Rainy Days"
            value1={m1?.daysOfRain ?? null}
            value2={m2?.daysOfRain ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
        </div>

        {/* Cost Section */}
        <div>
          <SectionHeader
            icon={<Home className="h-4 w-4 text-emerald-500" />}
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
            label="State Tax Rate"
            value1={m1?.stateTaxRate ?? null}
            value2={m2?.stateTaxRate ?? null}
            format={formatPercent}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Property Tax"
            value1={m1?.propertyTaxRate ?? null}
            value2={m2?.propertyTaxRate ?? null}
            format={formatPercent}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Cost of Living Index"
            value1={m1?.costOfLivingIndex ?? null}
            value2={m2?.costOfLivingIndex ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
        </div>

        {/* Demographics Section */}
        <div>
          <SectionHeader
            icon={<Users className="h-4 w-4 text-violet-500" />}
            title="Demographics"
            city1Name={city1.name}
            city2Name={city2.name}
          />
          <ComparisonRow
            label="Metro Population"
            value1={m1?.population ?? null}
            value2={m2?.population ?? null}
            format={formatPop}
            showDiff={false}
          />
          <ComparisonRow
            label="Diversity Index"
            value1={m1?.diversityIndex ?? null}
            value2={m2?.diversityIndex ?? null}
            format={(v) => formatNumber(v, 1)}
          />
          <ComparisonRow
            label="East Asian %"
            value1={m1?.eastAsianPercent ?? null}
            value2={m2?.eastAsianPercent ?? null}
            format={formatPercent}
            showDiff={false}
          />
        </div>

        {/* Quality of Life Section */}
        <div>
          <SectionHeader
            icon={<Activity className="h-4 w-4 text-rose-500" />}
            title="Quality of Life"
            city1Name={city1.name}
            city2Name={city2.name}
          />
          <ComparisonRow
            label="Walk Score"
            value1={m1?.walkScore ?? null}
            value2={m2?.walkScore ?? null}
            format={formatInt}
          />
          <ComparisonRow
            label="Transit Score"
            value1={m1?.transitScore ?? null}
            value2={m2?.transitScore ?? null}
            format={formatInt}
          />
          <ComparisonRow
            label="Crime Rate"
            value1={m1?.crimeRate ?? null}
            value2={m2?.crimeRate ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Pollution Index"
            value1={m1?.pollutionIndex ?? null}
            value2={m2?.pollutionIndex ?? null}
            format={formatInt}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Int'l Airport"
            value1={m1?.hasInternationalAirport ? "Yes" : "No"}
            value2={m2?.hasInternationalAirport ? "Yes" : "No"}
            showDiff={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}
