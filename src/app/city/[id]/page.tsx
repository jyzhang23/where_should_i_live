"use client";

import { use, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useCity } from "@/hooks/useCity";
import { useCities } from "@/hooks/useCities";
import { usePreferencesStore } from "@/lib/store";
import { calculateScores } from "@/lib/scoring";
// PriceTrendChart is now embedded in CityMetricsGrid
import { CityMetricsGrid } from "@/components/city/CityMetricsGrid";
import { ComparisonPanel } from "@/components/comparison";
import { ScoreBreakdown } from "@/components/city/ScoreBreakdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, MapPin, TrendingUp, Award, GitCompare, HelpCircle } from "lucide-react";
import { getScoreColor, getGrade, getScoreRelative, getScoreLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CityWithMetrics } from "@/types/city";

interface CityPageProps {
  params: Promise<{ id: string }>;
}

export default function CityPage({ params }: CityPageProps) {
  const { id } = use(params);
  const { data: city, isLoading, error } = useCity(id);
  const { data: allCitiesData } = useCities();
  const { preferences } = usePreferencesStore();

  // Handle hydration
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Comparison mode
  const [showComparison, setShowComparison] = useState(false);
  
  // Score breakdown dialog
  const [breakdownCategory, setBreakdownCategory] = useState<
    "climate" | "cost" | "demographics" | "qol" | "cultural" | null
  >(null);

  // Calculate all rankings (needed for percentile-based scoring and comparison panel)
  const allRankings = useMemo(() => {
    if (!allCitiesData?.cities || !isHydrated) return null;
    return calculateScores(allCitiesData.cities, preferences);
  }, [allCitiesData, preferences, isHydrated]);

  // Find this city's score from the full rankings
  const cityScore = useMemo(() => {
    if (!city || !allRankings) return null;
    return allRankings.rankings.find(r => r.cityId === city.id) || null;
  }, [city, allRankings]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !city) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="pt-6">
            <p className="text-red-800 dark:text-red-200">
              City not found or error loading data.
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Rankings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Rankings
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {city.name}
            <span className="text-muted-foreground font-normal">{city.state}</span>
          </h1>
          {city.latitude && city.longitude && (
            <p className="text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {city.latitude.toFixed(4)}°N, {Math.abs(city.longitude).toFixed(4)}°W
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-2"
          >
            <GitCompare className="h-4 w-4" />
            Compare
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Score Overview */}
      {isHydrated && cityScore && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="col-span-2 md:col-span-1 bg-primary/5 border-primary/20">
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Overall</span>
              </div>
              <div className={cn("text-4xl font-bold", getScoreColor(cityScore.totalScore))}>
                {cityScore.totalScore.toFixed(1)}
              </div>
              <div className="text-lg font-semibold text-muted-foreground">
                {getGrade(cityScore.totalScore)}
              </div>
            </CardContent>
          </Card>
          
          <ScoreCard label="Climate" score={cityScore.climateScore} onClick={() => setBreakdownCategory("climate")} />
          <ScoreCard label="Cost" score={cityScore.costScore} onClick={() => setBreakdownCategory("cost")} />
          <ScoreCard label="Demographics" score={cityScore.demographicsScore} onClick={() => setBreakdownCategory("demographics")} />
          <ScoreCard label="Quality of Life" score={cityScore.qualityOfLifeScore} onClick={() => setBreakdownCategory("qol")} />
          <ScoreCard label="Cultural" score={cityScore.culturalScore} onClick={() => setBreakdownCategory("cultural")} />
        </div>
      )}

      {/* Detailed Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Detailed Metrics
        </h2>
        {city.metrics ? (
          <CityMetricsGrid 
            metrics={city.metrics} 
            cityName={city.name}
            stateName={city.state}
            zhviHistory={city.zhviHistory || null}
            costPreferences={isHydrated ? {
              housingSituation: preferences.advanced.costOfLiving.housingSituation,
              includeUtilities: preferences.advanced.costOfLiving.includeUtilities,
              workSituation: preferences.advanced.costOfLiving.workSituation,
              retireeFixedIncome: preferences.advanced.costOfLiving.retireeFixedIncome,
            } : undefined}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No detailed metrics available for this city.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Data timestamp */}
      {city.metrics?.dataAsOf && (
        <p className="text-xs text-muted-foreground text-center">
          Data as of: {new Date(city.metrics.dataAsOf).toLocaleDateString()}
        </p>
      )}

      {/* Comparison Panel */}
      {allRankings && (
        <ComparisonPanel
          rankings={allRankings.rankings}
          isOpen={showComparison}
          onClose={() => setShowComparison(false)}
          initialCityId={id}
        />
      )}

      {/* Score Breakdown Dialog */}
      {breakdownCategory && cityScore && (
        <ScoreBreakdown
          city={city as CityWithMetrics}
          preferences={preferences}
          category={breakdownCategory}
          score={
            breakdownCategory === "climate" ? cityScore.climateScore :
            breakdownCategory === "cost" ? cityScore.costScore :
            breakdownCategory === "demographics" ? cityScore.demographicsScore :
            breakdownCategory === "qol" ? cityScore.qualityOfLifeScore :
            cityScore.culturalScore
          }
          isOpen={true}
          onClose={() => setBreakdownCategory(null)}
        />
      )}
    </div>
  );
}

function ScoreCard({ label, score, onClick }: { label: string; score: number; onClick?: () => void }) {
  const relative = getScoreRelative(score);
  const scoreLabel = getScoreLabel(score);
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={cn(
              "cursor-pointer transition-colors hover:bg-muted/50",
              onClick && "hover:border-primary/50"
            )}
            onClick={onClick}
          >
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                {onClick && <HelpCircle className="h-3 w-3 text-muted-foreground/50" />}
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className={cn("text-2xl font-bold", getScoreColor(score))}>
                  {score.toFixed(1)}
                </span>
                <span className={cn("text-sm font-medium", relative.color)}>
                  {relative.text}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {getGrade(score)} · {scoreLabel}
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
          <p className="font-medium">{scoreLabel}</p>
          <p className="text-muted-foreground mt-1">
            {score >= 50 
              ? `${(score - 50).toFixed(0)} points above U.S. average` 
              : `${(50 - score).toFixed(0)} points below U.S. average`}
          </p>
          <p className="text-muted-foreground mt-1">Click for detailed breakdown</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
