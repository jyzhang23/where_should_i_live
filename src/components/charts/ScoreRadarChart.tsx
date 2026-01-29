"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
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
      nationalAvg: 50,
      fullMark: 100,
    },
    {
      category: "Cost",
      score: cityScore.costScore,
      comparison: comparisonScore?.costScore,
      nationalAvg: 50,
      fullMark: 100,
    },
    {
      category: "Demographics",
      score: cityScore.demographicsScore,
      comparison: comparisonScore?.demographicsScore,
      nationalAvg: 50,
      fullMark: 100,
    },
    {
      category: "Quality of Life",
      score: cityScore.qualityOfLifeScore,
      comparison: comparisonScore?.qualityOfLifeScore,
      nationalAvg: 50,
      fullMark: 100,
    },
    {
      category: "Cultural",
      score: cityScore.culturalScore,
      comparison: comparisonScore?.culturalScore,
      nationalAvg: 50,
      fullMark: 100,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend above chart */}
        {comparisonScore && (
          <div className="flex items-center justify-center gap-6 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm bg-blue-500" />
              <span className="text-sm font-medium">{cityScore.cityName}</span>
              <span className="text-lg font-bold text-blue-500">{cityScore.totalScore.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm bg-orange-500" />
              <span className="text-sm font-medium">{comparisonScore.cityName}</span>
              <span className="text-lg font-bold text-orange-500">{comparisonScore.totalScore.toFixed(1)}</span>
            </div>
          </div>
        )}
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
              {/* National Average reference line (50 = U.S. average) */}
              <Radar
                name="National Avg"
                dataKey="nationalAvg"
                stroke="#888888"
                fill="none"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
              <Radar
                name={cityScore.cityName}
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              {comparisonScore && (
                <Radar
                  name={comparisonScore.cityName}
                  dataKey="comparison"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number | undefined, name: string | undefined) => [
                  (value ?? 0).toFixed(1),
                  name === "score" ? cityScore.cityName : comparisonScore?.cityName || ""
                ]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {/* Single city - show score below */}
        {!comparisonScore && (
          <div className="mt-2 text-center">
            <span className="text-sm text-muted-foreground">{cityScore.cityName}: </span>
            <span className="text-2xl font-bold text-blue-500">
              {cityScore.totalScore.toFixed(1)}
            </span>
            <span className="text-muted-foreground ml-1">overall</span>
          </div>
        )}
        {/* National average legend */}
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          <span className="inline-block w-6 border-t-2 border-dashed" style={{ borderColor: '#888888' }} />
          <span>Dashed line = U.S. national average (50)</span>
        </div>
      </CardContent>
    </Card>
  );
}
