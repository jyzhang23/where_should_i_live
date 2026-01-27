"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ZHVIDataPoint } from "@/types/city";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PriceTrendChartProps {
  cityName: string | null;
  zhviHistory: ZHVIDataPoint[] | null;
  comparisonCity?: {
    name: string;
    zhviHistory: ZHVIDataPoint[];
  } | null;
}

export function PriceTrendChart({
  cityName,
  zhviHistory,
  comparisonCity,
}: PriceTrendChartProps) {
  const chartData = useMemo(() => {
    if (!zhviHistory || zhviHistory.length === 0) return [];

    // Create a map for quick lookup of comparison data
    const comparisonMap = new Map<string, number>();
    if (comparisonCity?.zhviHistory) {
      comparisonCity.zhviHistory.forEach((point) => {
        const dateKey = new Date(point.date).toISOString().slice(0, 7);
        comparisonMap.set(dateKey, point.value);
      });
    }

    // Sort by date and format for chart
    return zhviHistory
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((point) => {
        const date = new Date(point.date);
        const dateKey = date.toISOString().slice(0, 7);
        return {
          date: dateKey,
          displayDate: date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          }),
          value: point.value,
          comparison: comparisonMap.get(dateKey) ?? null,
        };
      });
  }, [zhviHistory, comparisonCity]);

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  if (!cityName || !zhviHistory || zhviHistory.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Home Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            {cityName ? "No price history available" : "Select a city to see price history"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate current and 5-year change
  const currentPrice = chartData[chartData.length - 1]?.value;
  const fiveYearsAgo = chartData.find((d) => {
    const date = new Date(d.date);
    const fiveYearsAgoDate = new Date();
    fiveYearsAgoDate.setFullYear(fiveYearsAgoDate.getFullYear() - 5);
    return date >= fiveYearsAgoDate;
  })?.value;
  
  const priceChange = fiveYearsAgo
    ? ((currentPrice - fiveYearsAgo) / fiveYearsAgo) * 100
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>
            Home Prices: {cityName}
            {comparisonCity && (
              <span className="text-muted-foreground font-normal">
                {" "}vs {comparisonCity.name}
              </span>
            )}
          </span>
          {currentPrice && (
            <span className="text-sm font-normal">
              Current: <span className="font-semibold">{formatPrice(currentPrice)}</span>
              {priceChange !== null && (
                <span
                  className={`ml-2 ${
                    priceChange >= 0 ? "text-score-low" : "text-score-high"
                  }`}
                >
                  {priceChange >= 0 ? "+" : ""}
                  {priceChange.toFixed(1)}% (5yr)
                </span>
              )}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <XAxis
                dataKey="displayDate"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={{ stroke: "var(--border)" }}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={{ stroke: "var(--border)" }}
                tickFormatter={formatPrice}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number, name: string) => [
                  formatPrice(value),
                  name === "value" ? cityName : comparisonCity?.name || "",
                ]}
                labelFormatter={(label) => label}
              />
              <ReferenceLine
                y={currentPrice}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--primary)" }}
              />
              {comparisonCity && (
                <Line
                  type="monotone"
                  dataKey="comparison"
                  stroke="var(--muted-foreground)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--muted-foreground)" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
