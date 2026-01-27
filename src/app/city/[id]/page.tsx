"use client";

import { use, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useCity } from "@/hooks/useCity";
import { usePreferencesStore } from "@/lib/store";
import { calculateScores } from "@/lib/scoring";
import { ScoreRadarChart, PriceTrendChart } from "@/components/charts";
import { CityMetricsGrid } from "@/components/city/CityMetricsGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, MapPin, TrendingUp, Award } from "lucide-react";
import { getScoreColor, getGrade } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface CityPageProps {
  params: Promise<{ id: string }>;
}

export default function CityPage({ params }: CityPageProps) {
  const { id } = use(params);
  const { data: city, isLoading, error } = useCity(id);
  const { preferences } = usePreferencesStore();

  // Handle hydration
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Calculate score for this city
  const cityScore = useMemo(() => {
    if (!city || !city.metrics || !isHydrated) return null;
    const result = calculateScores([city], preferences);
    return result.rankings[0] || null;
  }, [city, preferences, isHydrated]);

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
        <ThemeToggle />
      </div>

      {/* Score Overview */}
      {isHydrated && cityScore && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
          
          <ScoreCard label="Climate" score={cityScore.climateScore} />
          <ScoreCard label="Cost" score={cityScore.costScore} />
          <ScoreCard label="Demographics" score={cityScore.demographicsScore} />
          <ScoreCard label="Quality of Life" score={cityScore.qualityOfLifeScore} />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {isHydrated && (
          <ScoreRadarChart cityScore={cityScore} />
        )}
        <PriceTrendChart
          cityName={city.name}
          zhviHistory={city.zhviHistory || null}
        />
      </div>

      {/* Detailed Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Detailed Metrics
        </h2>
        {city.metrics ? (
          <CityMetricsGrid metrics={city.metrics} />
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
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={cn("text-2xl font-bold", getScoreColor(score))}>
          {score.toFixed(1)}
        </div>
        <div className="text-sm text-muted-foreground">
          {getGrade(score)}
        </div>
      </CardContent>
    </Card>
  );
}
