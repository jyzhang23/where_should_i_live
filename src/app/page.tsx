"use client";

import { useMemo, useState, useEffect } from "react";
import { useCities } from "@/hooks/useCities";
import { useCity } from "@/hooks/useCity";
import { usePreferencesStore } from "@/lib/store";
import { calculateScores } from "@/lib/scoring";
import { PreferencePanel } from "@/components/preferences/PreferencePanel";
import { RankingTable } from "@/components/rankings/RankingTable";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { ComparisonPanel } from "@/components/comparison";
import {
  ScoreRadarChart,
  RankingBarChart,
  PriceTrendChart,
} from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GitCompare, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { data, isLoading, error } = useCities();
  const { preferences } = usePreferencesStore();
  
  // Handle hydration - wait for client-side store to be ready
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Selected city for detailed view
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const { data: selectedCityData } = useCity(selectedCityId);

  // Comparison mode
  const [showComparison, setShowComparison] = useState(false);

  // Calculate scores whenever cities or preferences change
  const cities = data?.cities;
  const scoringResult = useMemo(() => {
    if (!cities || !isHydrated) return null;
    return calculateScores(cities, preferences);
  }, [cities, preferences, isHydrated]);

  // Auto-select the top city when scoring results change
  useEffect(() => {
    if (scoringResult && scoringResult.rankings.length > 0) {
      const topCity = scoringResult.rankings.find(r => !r.excluded);
      if (topCity && (!selectedCityId || !scoringResult.rankings.find(r => r.cityId === selectedCityId))) {
        setSelectedCityId(topCity.cityId);
      }
    }
  }, [scoringResult, selectedCityId]);

  // Find the score for the selected city
  const selectedCityScore = useMemo(() => {
    if (!selectedCityId || !scoringResult) return null;
    return scoringResult.rankings.find((r) => r.cityId === selectedCityId) || null;
  }, [selectedCityId, scoringResult]);

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">
              Error loading cities. Make sure the database is set up and seeded.
            </p>
            <p className="text-sm text-red-600 mt-2">
              Run: <code className="bg-red-100 px-1 rounded">npm run db:push</code> then{" "}
              <code className="bg-red-100 px-1 rounded">npm run db:seed</code>
            </p>
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
          <div className="flex items-baseline gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Where Should I Live</h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-help hover:text-foreground transition-colors">
                  v2.1
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">Version 2.1.0</p>
                <p className="text-xs text-muted-foreground mt-1">
                  45 cities • 6 scoring categories • Walk Score® data • Dating Favorability
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground mt-1">
            Find your perfect city based on your preferences
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/help">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>How Rankings Work</TooltipContent>
            </Tooltip>
            {process.env.NODE_ENV === "development" && <AdminPanel />}
            <ThemeToggle />
          </div>
          {data?.lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Data last updated:{" "}
              {new Date(data.lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Top Row: Three Charts */}
      {isHydrated && scoringResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          <RankingBarChart
            rankings={scoringResult.rankings}
            topN={10}
            onCitySelect={setSelectedCityId}
            selectedCityId={selectedCityId}
          />
          <ScoreRadarChart cityScore={selectedCityScore} />
          <PriceTrendChart
            cityName={selectedCityScore?.cityName || null}
            zhviHistory={selectedCityData?.zhviHistory || null}
          />
        </div>
      )}

      {/* Bottom Row: Preferences + Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Preferences Panel - Left Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <PreferencePanel />
          </div>
        </div>

        {/* Rankings Table */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>All Rankings</span>
                {scoringResult && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {scoringResult.includedCount} cities
                    {scoringResult.excludedCount > 0 && (
                      <span className="text-orange-600">
                        {" "}
                        ({scoringResult.excludedCount} excluded)
                      </span>
                    )}
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Click a row to see charts update. Click{" "}
                  <span className="inline-flex items-center gap-1 text-primary">
                    View <span className="text-xs">↗</span>
                  </span>{" "}
                  for full details, or compare two cities side by side.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComparison(true)}
                  className="flex items-center gap-2 shrink-0"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : scoringResult ? (
                <RankingTable
                  rankings={scoringResult.rankings}
                  onCityClick={setSelectedCityId}
                  selectedCityId={selectedCityId}
                />
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  No cities to display
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comparison Panel */}
      {scoringResult && (
        <ComparisonPanel
          rankings={scoringResult.rankings}
          isOpen={showComparison}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}
