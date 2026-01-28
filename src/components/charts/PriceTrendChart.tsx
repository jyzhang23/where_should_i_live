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

  // Calculate comparison city's current price and change
  const comparisonCurrentPrice = comparisonCity?.zhviHistory?.length 
    ? comparisonCity.zhviHistory[comparisonCity.zhviHistory.length - 1]?.value 
    : null;
  const comparisonFiveYearsAgo = comparisonCity?.zhviHistory?.find((point) => {
    const date = new Date(point.date);
    const fiveYearsAgoDate = new Date();
    fiveYearsAgoDate.setFullYear(fiveYearsAgoDate.getFullYear() - 5);
    return date >= fiveYearsAgoDate;
  })?.value;
  const comparisonPriceChange = comparisonFiveYearsAgo && comparisonCurrentPrice
    ? ((comparisonCurrentPrice - comparisonFiveYearsAgo) / comparisonFiveYearsAgo) * 100
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Home Price History</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend with prices */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded bg-blue-500" />
            <span className="font-medium">{cityName}</span>
            {currentPrice && (
              <>
                <span className="font-bold text-blue-500">{formatPrice(currentPrice)}</span>
                {priceChange !== null && (
                  <span className={priceChange >= 0 ? "text-score-low" : "text-score-high"}>
                    ({priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}%)
                  </span>
                )}
              </>
            )}
          </div>
          {comparisonCity && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded bg-orange-500" />
              <span className="font-medium">{comparisonCity.name}</span>
              {comparisonCurrentPrice && (
                <>
                  <span className="font-bold text-orange-500">{formatPrice(comparisonCurrentPrice)}</span>
                  {comparisonPriceChange !== null && (
                    <span className={comparisonPriceChange >= 0 ? "text-score-low" : "text-score-high"}>
                      ({comparisonPriceChange >= 0 ? "+" : ""}{comparisonPriceChange.toFixed(1)}%)
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
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
                formatter={(value: number | undefined, name: string | undefined) => [
                  formatPrice(value ?? 0),
                  name === "value" ? cityName : comparisonCity?.name || "",
                ]}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={cityName || "City 1"}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3b82f6" }}
              />
              {comparisonCity && (
                <Line
                  type="monotone"
                  dataKey="comparison"
                  name={comparisonCity.name}
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#f97316" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
