"use client";

import { useState, useMemo } from "react";
import { CitySelector } from "./CitySelector";
import { MetricsComparison } from "./MetricsComparison";
import { ScoreRadarChart } from "@/components/charts/ScoreRadarChart";
import { PriceTrendChart } from "@/components/charts/PriceTrendChart";
import { useCity } from "@/hooks/useCity";
import { CityScore } from "@/types/scores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitCompare, X } from "lucide-react";

interface ComparisonPanelProps {
  rankings: CityScore[];
  isOpen: boolean;
  onClose: () => void;
}

export function ComparisonPanel({ rankings, isOpen, onClose }: ComparisonPanelProps) {
  const [city1Id, setCity1Id] = useState<string | null>(null);
  const [city2Id, setCity2Id] = useState<string | null>(null);

  // Fetch full city data for both selected cities
  const { data: city1Data } = useCity(city1Id);
  const { data: city2Data } = useCity(city2Id);

  // Get scores for selected cities
  const city1Score = useMemo(
    () => rankings.find((r) => r.cityId === city1Id) || null,
    [rankings, city1Id]
  );
  const city2Score = useMemo(
    () => rankings.find((r) => r.cityId === city2Id) || null,
    [rankings, city2Id]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-4 md:inset-8 lg:inset-12 bg-background border rounded-lg shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Compare Cities</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* City Selectors */}
        <div className="p-4 border-b bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <CitySelector
              cities={rankings}
              selectedId={city1Id}
              onSelect={setCity1Id}
              excludeId={city2Id}
              label="City 1"
              placeholder="Select first city"
            />
            <CitySelector
              cities={rankings}
              selectedId={city2Id}
              onSelect={setCity2Id}
              excludeId={city1Id}
              label="City 2"
              placeholder="Select second city"
            />
          </div>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-auto p-4">
          {city1Id && city2Id ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Charts */}
              <div className="space-y-6">
                <ScoreRadarChart
                  cityScore={city1Score}
                  comparisonScore={city2Score}
                />
                <PriceTrendChart
                  cityName={city1Data?.name || null}
                  zhviHistory={city1Data?.zhviHistory || null}
                  comparisonCity={
                    city2Data
                      ? { name: city2Data.name, zhviHistory: city2Data.zhviHistory || [] }
                      : null
                  }
                />
              </div>

              {/* Right Column - Metrics Table */}
              <div>
                <MetricsComparison
                  city1={city1Data || null}
                  city2={city2Data || null}
                  score1={city1Score}
                  score2={city2Score}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <GitCompare className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg">Select two cities above to compare them</p>
              <p className="text-sm mt-2">
                Compare scores, climate, cost of living, and more
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
