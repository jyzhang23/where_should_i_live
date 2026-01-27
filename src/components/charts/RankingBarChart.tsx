"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CityScore } from "@/types/scores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RankingBarChartProps {
  rankings: CityScore[];
  topN?: number;
  onCitySelect?: (cityId: string) => void;
  selectedCityId?: string | null;
}

export function RankingBarChart({
  rankings,
  topN = 10,
  onCitySelect,
  selectedCityId,
}: RankingBarChartProps) {
  // Filter out excluded cities and take top N
  const topCities = rankings
    .filter((r) => !r.excluded)
    .slice(0, topN)
    .map((r, index) => ({
      ...r,
      rank: index + 1,
      displayName: `${r.cityName}, ${r.state.slice(0, 2)}`,
    }));

  if (topCities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top {topN} Cities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No cities match your criteria
          </div>
        </CardContent>
      </Card>
    );
  }

  const getBarColor = (score: number, isSelected: boolean) => {
    if (isSelected) return "var(--primary)";
    if (score >= 75) return "var(--score-high)";
    if (score >= 50) return "var(--score-medium)";
    return "var(--score-low)";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top {topN} Cities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topCities}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                tick={{ fill: "var(--foreground)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number) => [value.toFixed(1), "Score"]}
                labelFormatter={(label) => label}
              />
              <Bar
                dataKey="totalScore"
                radius={[0, 4, 4, 0]}
                onClick={(data) => onCitySelect?.(data.cityId)}
                cursor={onCitySelect ? "pointer" : "default"}
              >
                {topCities.map((entry) => (
                  <Cell
                    key={entry.cityId}
                    fill={getBarColor(
                      entry.totalScore,
                      entry.cityId === selectedCityId
                    )}
                    opacity={
                      selectedCityId && entry.cityId !== selectedCityId ? 0.5 : 1
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
