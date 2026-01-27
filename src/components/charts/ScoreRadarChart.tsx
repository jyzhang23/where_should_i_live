"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CityScore } from "@/types/scores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoreRadarChartProps {
  cityScore: CityScore | null;
  comparisonScore?: CityScore | null;
}

export function ScoreRadarChart({ cityScore, comparisonScore }: ScoreRadarChartProps) {
  if (!cityScore) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Select a city to see breakdown
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = [
    {
      category: "Climate",
      score: cityScore.climateScore,
      comparison: comparisonScore?.climateScore,
      fullMark: 100,
    },
    {
      category: "Cost",
      score: cityScore.costScore,
      comparison: comparisonScore?.costScore,
      fullMark: 100,
    },
    {
      category: "Demographics",
      score: cityScore.demographicsScore,
      comparison: comparisonScore?.demographicsScore,
      fullMark: 100,
    },
    {
      category: "Quality of Life",
      score: cityScore.qualityOfLifeScore,
      comparison: comparisonScore?.qualityOfLifeScore,
      fullMark: 100,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {cityScore.cityName}, {cityScore.state}
          {comparisonScore && (
            <span className="text-muted-foreground font-normal">
              {" "}vs {comparisonScore.cityName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: "var(--foreground)", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickCount={5}
              />
              <Radar
                name={cityScore.cityName}
                dataKey="score"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              {comparisonScore && (
                <Radar
                  name={comparisonScore.cityName}
                  dataKey="comparison"
                  stroke="var(--muted-foreground)"
                  fill="var(--muted-foreground)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number) => [value.toFixed(1), ""]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-center">
          <span className="text-2xl font-bold text-primary">
            {cityScore.totalScore.toFixed(1)}
          </span>
          <span className="text-muted-foreground ml-1">overall score</span>
        </div>
      </CardContent>
    </Card>
  );
}
