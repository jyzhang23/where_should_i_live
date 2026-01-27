"use client";

import { useMemo } from "react";
import { useCities } from "@/hooks/useCities";
import { usePreferencesStore } from "@/lib/store";
import { calculateScores } from "@/lib/scoring";
import { PreferencePanel } from "@/components/preferences/PreferencePanel";
import { RankingTable } from "@/components/rankings/RankingTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const { data, isLoading, error } = useCities();
  const { preferences } = usePreferencesStore();

  // Calculate scores whenever cities or preferences change
  const cities = data?.cities;
  const scoringResult = useMemo(() => {
    if (!cities) return null;
    return calculateScores(cities, preferences);
  }, [cities, preferences]);

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">City Rankings</h1>
        <p className="text-muted-foreground mt-1">
          Find your perfect city based on your preferences
        </p>
        {data?.lastUpdated && (
          <p className="text-xs text-muted-foreground mt-2">
            Data last updated:{" "}
            {new Date(data.lastUpdated).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Preferences Panel - Left Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <PreferencePanel />
          </div>
        </div>

        {/* Rankings Table - Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Rankings</span>
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
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : scoringResult ? (
                <RankingTable
                  rankings={scoringResult.rankings}
                  onCityClick={(id) => {
                    // TODO: Open city detail modal or navigate
                    console.log("City clicked:", id);
                  }}
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
    </div>
  );
}
