"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { AlertTriangle, CheckCircle, Info, TrendingDown, TrendingUp } from "lucide-react";

interface ScoreBreakdownProps {
  city: CityWithMetrics;
  preferences: UserPreferences;
  category: "climate" | "cost" | "demographics" | "qol" | "values" | "entertainment";
  score: number;
  isOpen: boolean;
  onClose: () => void;
}

interface FactorAnalysis {
  name: string;
  weight: number;
  value: string | number | null;
  unit?: string;
  threshold?: { value: number; type: "min" | "max"; label: string };
  score: number;
  status: "good" | "warning" | "bad" | "neutral";
  explanation: string;
}

export function ScoreBreakdown({
  city,
  preferences,
  category,
  score,
  isOpen,
  onClose,
}: ScoreBreakdownProps) {
  const analysis = useMemo(() => {
    switch (category) {
      case "qol":
        return analyzeQoL(city, preferences);
      case "climate":
        return analyzeClimate(city, preferences);
      case "cost":
        return analyzeCost(city, preferences);
      case "demographics":
        return analyzeDemographics(city, preferences);
      case "values":
        return analyzeValues(city, preferences);
      case "entertainment":
        return analyzeEntertainment(city, preferences);
      default:
        return { factors: [], summary: "" };
    }
  }, [city, preferences, category]);

  const categoryLabels: Record<string, string> = {
    climate: "Climate",
    cost: "Cost of Living",
    demographics: "Demographics",
    qol: "Quality of Life",
    values: "Values",
    entertainment: "Entertainment",
  };

  const problems = analysis.factors.filter((f) => f.status === "bad");
  const warnings = analysis.factors.filter((f) => f.status === "warning");
  const strengths = analysis.factors.filter((f) => f.status === "good");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Why is {categoryLabels[category]} scored {score.toFixed(1)}?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Summary */}
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm">{analysis.summary}</p>
          </div>

          {/* Problems */}
          {problems.length > 0 && (
            <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4" />
                Issues ({problems.length})
              </h3>
              <div className="space-y-3">
                {problems.map((factor, i) => (
                  <FactorCard key={i} factor={factor} />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div>
              <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-2 mb-3">
                <Info className="h-4 w-4" />
                Concerns ({warnings.length})
              </h3>
              <div className="space-y-3">
                {warnings.map((factor, i) => (
                  <FactorCard key={i} factor={factor} />
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {strengths.length > 0 && (
            <div>
              <h3 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4" />
                Strengths ({strengths.length})
              </h3>
              <div className="space-y-3">
                {strengths.map((factor, i) => (
                  <FactorCard key={i} factor={factor} />
                ))}
              </div>
            </div>
          )}

          {/* All Factors Detail */}
          <div>
            <h3 className="font-semibold mb-3">
              {category === "cost" ? "Cost Components" : "All Factors"}
            </h3>
            {category === "cost" && (
              <p className="text-xs text-muted-foreground mb-3">
                Cost score uses a persona-based &quot;True Purchasing Power&quot; calculation, 
                not weighted factors. These components show what drives the score for your profile.
              </p>
            )}
            <div className="space-y-2">
              {analysis.factors.map((factor, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon status={factor.status} />
                    <span className="text-sm">{factor.name}</span>
                    {factor.weight > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {factor.weight}%
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {factor.value !== null ? `${factor.value}${factor.unit || ""}` : "N/A"}
                    </span>
                    <div className="w-16">
                      <Progress
                        value={factor.score}
                        className={cn(
                          "h-2",
                          factor.status === "bad" && "[&>div]:bg-red-500",
                          factor.status === "warning" && "[&>div]:bg-yellow-500",
                          factor.status === "good" && "[&>div]:bg-green-500"
                        )}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{factor.score.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              {category === "cost" ? "About This Score" : "Adjust Your Preferences"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {category === "cost" 
                ? "Cost score compares local income to local prices, adjusted for your housing situation (renter/owner/buyer) and income type. Change your cost profile in Advanced Preferences to see how different scenarios affect affordability."
                : "If some factors matter less to you, adjust their weights in the Advanced Preferences panel. Scores are relative to your personal priorities."
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FactorCard({ factor }: { factor: FactorAnalysis }) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        factor.status === "bad" && "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
        factor.status === "warning" && "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900",
        factor.status === "good" && "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium flex items-center gap-2">
            {factor.name}
            <Badge variant="outline" className="text-xs">
              Weight: {factor.weight}%
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{factor.explanation}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">
            {factor.value !== null ? `${factor.value}${factor.unit || ""}` : "N/A"}
          </div>
          {factor.threshold && (
            <div className="text-xs text-muted-foreground">
              {factor.threshold.type === "max" ? "Max" : "Min"}: {factor.threshold.value}
              {factor.unit || ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: FactorAnalysis["status"] }) {
  switch (status) {
    case "good":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "warning":
      return <Info className="h-4 w-4 text-yellow-500" />;
    case "bad":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return <div className="h-4 w-4" />;
  }
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function analyzeQoL(
  city: CityWithMetrics,
  preferences: UserPreferences
): { factors: FactorAnalysis[]; summary: string } {
  const factors: FactorAnalysis[] = [];
  const qol = city.metrics?.qol;
  const prefs = preferences.advanced.qualityOfLife;
  const weights = prefs.weights;
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  // Walkability
  if (weights.walkability > 0) {
    const w = qol?.walkability;
    const walkScore = w?.walkScore ?? null;
    const transitScore = w?.transitScore ?? null;
    const avgScore = walkScore !== null && transitScore !== null
      ? (walkScore + transitScore) / 2
      : walkScore ?? transitScore ?? 50;
    
    let status: FactorAnalysis["status"] = "neutral";
    let explanation = "";
    
    if (walkScore !== null) {
      if (walkScore < prefs.minWalkScore) {
        status = "bad";
        explanation = `Walk Score® ${walkScore} is below your minimum of ${prefs.minWalkScore}. `;
      } else if (walkScore >= 70) {
        status = "good";
        explanation = `Walk Score® ${walkScore} indicates a very walkable area. `;
      }
    }
    if (transitScore !== null && transitScore < 40) {
      if (status !== "bad") status = "warning";
      explanation += `Transit Score® ${transitScore} is weak - limited public transportation.`;
    }
    if (!explanation) explanation = "Walk Score® is average for your preferences.";

    factors.push({
      name: "Walk Score®",
      weight: Math.round((weights.walkability / totalWeight) * 100),
      value: walkScore,
      unit: "",
      threshold: prefs.minWalkScore > 0 ? { value: prefs.minWalkScore, type: "min", label: "Min Walk Score®" } : undefined,
      score: avgScore,
      status,
      explanation,
    });
  }

  // Safety
  if (weights.safety > 0) {
    const crime = qol?.crime;
    const crimeRate = crime?.violentCrimeRate ?? null;
    
    let status: FactorAnalysis["status"] = "neutral";
    let explanation = "";
    let score = 50;

    if (crimeRate !== null) {
      if (crimeRate > prefs.maxViolentCrimeRate) {
        status = "bad";
        const pctOver = ((crimeRate - prefs.maxViolentCrimeRate) / prefs.maxViolentCrimeRate * 100).toFixed(0);
        explanation = `Violent crime rate of ${crimeRate}/100K exceeds your max of ${prefs.maxViolentCrimeRate} by ${pctOver}%.`;
        score = Math.max(0, 50 - (crimeRate - prefs.maxViolentCrimeRate) / 10);
      } else if (crimeRate < 300) {
        status = "good";
        explanation = `Violent crime rate of ${crimeRate}/100K is well below average (US avg ~380).`;
        score = 70 + (300 - crimeRate) / 10;
      } else {
        explanation = `Violent crime rate of ${crimeRate}/100K is within acceptable range.`;
        score = 50 + (prefs.maxViolentCrimeRate - crimeRate) / 10;
      }
    }

    factors.push({
      name: "Safety (Crime Rate)",
      weight: Math.round((weights.safety / totalWeight) * 100),
      value: crimeRate,
      unit: "/100K",
      threshold: { value: prefs.maxViolentCrimeRate, type: "max", label: "Max Crime Rate" },
      score: Math.min(100, Math.max(0, score)),
      status,
      explanation,
    });
  }

  // Air Quality
  if (weights.airQuality > 0) {
    const air = qol?.airQuality;
    const healthyDays = air?.healthyDaysPercent ?? null;
    const hazardousDays = air?.hazardousDays ?? null;

    let status: FactorAnalysis["status"] = "neutral";
    let explanation = "";
    let score = 50;

    if (healthyDays !== null) {
      score = healthyDays;
      if (healthyDays < 70) {
        status = "bad";
        explanation = `Only ${healthyDays}% of days have healthy air quality. `;
      } else if (healthyDays >= 85) {
        status = "good";
        explanation = `${healthyDays}% of days have healthy air quality - excellent! `;
      }
    }
    if (hazardousDays !== null && hazardousDays > prefs.maxHazardousDays) {
      if (status !== "bad") status = "warning";
      explanation += `${hazardousDays} hazardous air days/year exceeds your max of ${prefs.maxHazardousDays}.`;
    }
    if (!explanation) explanation = "Air quality is average.";

    factors.push({
      name: "Air Quality",
      weight: Math.round((weights.airQuality / totalWeight) * 100),
      value: healthyDays,
      unit: "% healthy days",
      threshold: prefs.maxHazardousDays > 0 ? { value: prefs.maxHazardousDays, type: "max", label: "Max Hazardous Days" } : undefined,
      score: Math.min(100, Math.max(0, score)),
      status,
      explanation,
    });
  }

  // Internet
  if (weights.internet > 0) {
    const broadband = qol?.broadband;
    const fiberPct = broadband?.fiberCoveragePercent ?? null;
    const providers = broadband?.providerCount ?? null;

    let status: FactorAnalysis["status"] = "neutral";
    let explanation = "";
    let score = fiberPct ?? 50;

    if (fiberPct !== null) {
      if (prefs.requireFiber && fiberPct < 50) {
        status = "bad";
        explanation = `Only ${fiberPct}% fiber coverage, but you require fiber internet.`;
      } else if (fiberPct >= 70) {
        status = "good";
        explanation = `${fiberPct}% fiber coverage with ${providers || "multiple"} providers.`;
      }
    }
    if (providers !== null && providers < prefs.minProviders) {
      if (status !== "bad") status = "warning";
      explanation = `Only ${providers} provider(s), below your minimum of ${prefs.minProviders}.`;
    }
    if (!explanation) explanation = "Internet infrastructure is average.";

    factors.push({
      name: "Internet/Broadband",
      weight: Math.round((weights.internet / totalWeight) * 100),
      value: fiberPct,
      unit: "% fiber",
      score: Math.min(100, Math.max(0, score)),
      status,
      explanation,
    });
  }

  // Schools
  if (weights.schools > 0) {
    const edu = qol?.education;
    const ratio = edu?.studentTeacherRatio ?? null;
    const gradRate = edu?.graduationRate ?? null;

    let status: FactorAnalysis["status"] = "neutral";
    let explanation = "";
    let score = 50;

    if (ratio !== null) {
      // Lower ratio is better
      score = Math.max(0, 100 - (ratio - 10) * 5);
      if (ratio > prefs.maxStudentTeacherRatio) {
        status = "bad";
        explanation = `Student-teacher ratio of ${ratio}:1 exceeds your max of ${prefs.maxStudentTeacherRatio}:1.`;
      } else if (ratio <= 15) {
        status = "good";
        explanation = `Excellent student-teacher ratio of ${ratio}:1.`;
      }
    }
    if (gradRate !== null) {
      score = (score + gradRate) / 2;
      if (gradRate >= 90) {
        if (status !== "bad") status = "good";
        explanation += ` ${gradRate}% graduation rate is excellent.`;
      } else if (gradRate < 80) {
        if (status !== "bad") status = "warning";
        explanation += ` ${gradRate}% graduation rate is below average.`;
      }
    }
    if (!explanation) explanation = "School metrics are average.";

    factors.push({
      name: "Schools/Education",
      weight: Math.round((weights.schools / totalWeight) * 100),
      value: ratio,
      unit: ":1 ratio",
      threshold: { value: prefs.maxStudentTeacherRatio, type: "max", label: "Max Ratio" },
      score: Math.min(100, Math.max(0, score)),
      status,
      explanation,
    });
  }

  // Healthcare
  if (weights.healthcare > 0) {
    const health = qol?.health;
    const physicians = health?.primaryCarePhysiciansPer100k ?? null;
    const hpsa = health?.hpsaScore ?? null;

    let status: FactorAnalysis["status"] = "neutral";
    let explanation = "";
    let score = physicians !== null ? Math.min(100, physicians) : 50;

    if (physicians !== null) {
      if (physicians < prefs.minPhysiciansPer100k) {
        status = "warning";
        explanation = `${physicians} physicians/100K is below your preferred ${prefs.minPhysiciansPer100k}.`;
      } else if (physicians >= 100) {
        status = "good";
        explanation = `${physicians} physicians/100K indicates good healthcare access.`;
      }
    }
    if (hpsa !== null && hpsa > 10) {
      if (status === "neutral" || status === "good") status = "warning";
      explanation += ` HPSA score of ${hpsa} indicates some provider shortage.`;
    }
    if (!explanation) explanation = "Healthcare access is average.";

    factors.push({
      name: "Healthcare Access",
      weight: Math.round((weights.healthcare / totalWeight) * 100),
      value: physicians,
      unit: "/100K",
      threshold: { value: prefs.minPhysiciansPer100k, type: "min", label: "Min Physicians" },
      score: Math.min(100, Math.max(0, score)),
      status,
      explanation,
    });
  }

  // Note: Recreation has been moved to Entertainment category

  // Generate summary
  const badFactors = factors.filter((f) => f.status === "bad");
  const goodFactors = factors.filter((f) => f.status === "good");
  
  let summary = "";
  if (badFactors.length > 0) {
    summary = `The main issues are: ${badFactors.map((f) => f.name.toLowerCase()).join(", ")}. `;
  }
  if (goodFactors.length > 0) {
    summary += `Strengths include: ${goodFactors.map((f) => f.name.toLowerCase()).join(", ")}.`;
  }
  if (!summary) {
    summary = "This city has average quality of life metrics across the board.";
  }

  return { factors, summary };
}

function analyzeClimate(
  city: CityWithMetrics,
  preferences: UserPreferences
): { factors: FactorAnalysis[]; summary: string } {
  const factors: FactorAnalysis[] = [];
  const noaa = city.metrics?.noaa;
  const prefs = preferences.advanced.climate;

  // Calculate total weight from actual preferences
  let totalWeight = 0;
  if (prefs.weightComfortDays > 0) totalWeight += prefs.weightComfortDays;
  if (prefs.weightExtremeHeat > 0) totalWeight += prefs.weightExtremeHeat;
  if (prefs.weightFreezeDays > 0) totalWeight += prefs.weightFreezeDays;
  if (prefs.weightRainDays > 0) totalWeight += prefs.weightRainDays;
  if (prefs.weightSnowDays > 0) totalWeight += prefs.weightSnowDays;
  if (prefs.weightCloudyDays > 0) totalWeight += prefs.weightCloudyDays;
  if (prefs.weightHumidity > 0) totalWeight += prefs.weightHumidity;
  if (prefs.weightUtilityCosts > 0) totalWeight += prefs.weightUtilityCosts;
  if (prefs.weightGrowingSeason > 0) totalWeight += prefs.weightGrowingSeason;
  if (prefs.weightSeasonalStability > 0) totalWeight += prefs.weightSeasonalStability;
  if (prefs.weightDiurnalSwing > 0) totalWeight += prefs.weightDiurnalSwing;

  const toPercent = (w: number) => totalWeight > 0 ? Math.round((w / totalWeight) * 100) : 0;

  // Helper: normalizeToRange matching actual scoring
  const normalize = (value: number, min: number, max: number, invert: boolean) => {
    const clamped = Math.max(min, Math.min(max, value));
    const normalized = (clamped - min) / (max - min);
    return Math.round(invert ? (1 - normalized) * 100 : normalized * 100);
  };

  // Climate ranges (matching constants.ts)
  const RANGES = {
    comfortDays: { min: 50, max: 280 },
    extremeHeatDays: { min: 0, max: 90 },
    freezeDays: { min: 0, max: 160 },
    rainDays: { min: 30, max: 180 },
    snowDays: { min: 0, max: 65 },
    cloudyDays: { min: 50, max: 220 },
    julyDewpoint: { min: 45, max: 75 },
    degreeDays: { min: 2000, max: 9000 },
    growingSeasonDays: { min: 120, max: 365 },
    seasonalStability: { min: 5, max: 28 },
    diurnalSwing: { min: 10, max: 35 },
  };

  // Comfort Days (more is better)
  if (prefs.weightComfortDays > 0 && noaa?.comfortDays != null) {
    const days = noaa.comfortDays;
    const score = normalize(days, RANGES.comfortDays.min, RANGES.comfortDays.max, false);
    factors.push({
      name: "Comfort Days (65-80°F)",
      weight: toPercent(prefs.weightComfortDays),
      value: days,
      unit: " days",
      score,
      status: score >= 70 ? "good" : score < 40 ? "bad" : "neutral",
      explanation: `${days} comfortable days/year (US range: 50-280).`,
    });
  }

  // Extreme Heat (fewer is better)
  if (prefs.weightExtremeHeat > 0 && noaa?.extremeHeatDays != null) {
    const days = noaa.extremeHeatDays;
    const score = normalize(days, RANGES.extremeHeatDays.min, RANGES.extremeHeatDays.max, true);
    factors.push({
      name: "Extreme Heat (>95°F)",
      weight: toPercent(prefs.weightExtremeHeat),
      value: days,
      unit: " days",
      threshold: { value: prefs.maxExtremeHeatDays, type: "max", label: "Your max" },
      score,
      status: days > prefs.maxExtremeHeatDays ? "bad" : days <= 5 ? "good" : "neutral",
      explanation: days > prefs.maxExtremeHeatDays
        ? `${days} extreme heat days exceeds your max of ${prefs.maxExtremeHeatDays}.`
        : `${days} extreme heat days (Phoenix: 107, Seattle: 3).`,
    });
  }

  // Freeze Days (fewer is better)
  if (prefs.weightFreezeDays > 0 && noaa?.freezeDays != null) {
    const days = noaa.freezeDays;
    const score = normalize(days, RANGES.freezeDays.min, RANGES.freezeDays.max, true);
    factors.push({
      name: "Freeze Days (<32°F)",
      weight: toPercent(prefs.weightFreezeDays),
      value: days,
      unit: " days",
      threshold: { value: prefs.maxFreezeDays, type: "max", label: "Your max" },
      score,
      status: days > prefs.maxFreezeDays ? "bad" : days <= 10 ? "good" : "neutral",
      explanation: days > prefs.maxFreezeDays
        ? `${days} freeze days exceeds your max of ${prefs.maxFreezeDays}.`
        : `${days} freeze days (Minneapolis: 156, Miami: 0).`,
    });
  }

  // Rain Days (fewer is better)
  if (prefs.weightRainDays > 0 && noaa?.rainDays != null) {
    const days = noaa.rainDays;
    const score = normalize(days, RANGES.rainDays.min, RANGES.rainDays.max, true);
    factors.push({
      name: "Rain Days",
      weight: toPercent(prefs.weightRainDays),
      value: days,
      unit: " days",
      threshold: { value: prefs.maxRainDays, type: "max", label: "Your max" },
      score,
      status: days > prefs.maxRainDays ? "bad" : days <= 60 ? "good" : "neutral",
      explanation: `${days} rainy days (Seattle: 152, Phoenix: 36).`,
    });
  }

  // Snow Days (direction depends on preferSnow)
  if (prefs.weightSnowDays > 0 && noaa?.snowDays != null) {
    const days = noaa.snowDays;
    const lovesSnow = prefs.preferSnow ?? false;
    const score = normalize(days, RANGES.snowDays.min, RANGES.snowDays.max, !lovesSnow);
    factors.push({
      name: lovesSnow ? "Snow Days ❄️" : "Snow Days",
      weight: toPercent(prefs.weightSnowDays),
      value: days,
      unit: " days",
      score,
      status: lovesSnow ? (days >= 20 ? "good" : days < 5 ? "bad" : "neutral") 
                        : (days <= 5 ? "good" : days > prefs.maxSnowDays ? "bad" : "neutral"),
      explanation: lovesSnow 
        ? `${days} snow days - ${days >= 20 ? "great for winter sports!" : "limited snow."}`
        : `${days} snow days (Minneapolis: 40+, Miami: 0).`,
    });
  }

  // Cloudy Days (fewer is better)
  if (prefs.weightCloudyDays > 0 && noaa?.cloudyDays != null) {
    const days = noaa.cloudyDays;
    const score = normalize(days, RANGES.cloudyDays.min, RANGES.cloudyDays.max, true);
    factors.push({
      name: "Cloudy Days",
      weight: toPercent(prefs.weightCloudyDays),
      value: days,
      unit: " days",
      threshold: { value: prefs.maxCloudyDays, type: "max", label: "Your max" },
      score,
      status: days > prefs.maxCloudyDays ? "bad" : days <= 100 ? "good" : "neutral",
      explanation: `${days} cloudy days (Seattle: 200+, Phoenix: 80).`,
    });
  }

  // Humidity (lower dewpoint is better)
  if (prefs.weightHumidity > 0 && noaa?.julyDewpoint != null) {
    const dp = noaa.julyDewpoint;
    const score = normalize(dp, RANGES.julyDewpoint.min, RANGES.julyDewpoint.max, true);
    factors.push({
      name: "Summer Humidity",
      weight: toPercent(prefs.weightHumidity),
      value: dp.toFixed(0),
      unit: "°F dewpoint",
      threshold: { value: prefs.maxJulyDewpoint, type: "max", label: "Your max" },
      score,
      status: dp > prefs.maxJulyDewpoint ? "bad" : dp < 60 ? "good" : "neutral",
      explanation: dp > 70 ? `${dp}°F dewpoint - oppressively humid.`
        : dp > 65 ? `${dp}°F dewpoint - muggy summers.`
        : `${dp}°F dewpoint - comfortable humidity.`,
    });
  }

  // Utility Costs (CDD+HDD, lower is better)
  if (prefs.weightUtilityCosts > 0 && noaa?.coolingDegreeDays != null && noaa?.heatingDegreeDays != null) {
    const total = noaa.coolingDegreeDays + noaa.heatingDegreeDays;
    const score = normalize(total, RANGES.degreeDays.min, RANGES.degreeDays.max, true);
    factors.push({
      name: "Utility Costs (CDD+HDD)",
      weight: toPercent(prefs.weightUtilityCosts),
      value: total.toLocaleString(),
      unit: " degree-days",
      score,
      status: score >= 70 ? "good" : score < 40 ? "bad" : "neutral",
      explanation: `${total.toLocaleString()} degree-days (San Diego: 2000, Minneapolis: 9000).`,
    });
  }

  // Growing Season (more is better) - only if enabled
  if (prefs.weightGrowingSeason > 0 && noaa?.growingSeasonDays != null) {
    const days = noaa.growingSeasonDays;
    const score = normalize(days, RANGES.growingSeasonDays.min, RANGES.growingSeasonDays.max, false);
    factors.push({
      name: "Growing Season",
      weight: toPercent(prefs.weightGrowingSeason),
      value: days,
      unit: " days",
      score,
      status: days >= 250 ? "good" : days < 150 ? "bad" : "neutral",
      explanation: `${days} frost-free days for gardening.`,
    });
  }

  // Seasonal Stability (direction depends on preferDistinctSeasons)
  if (prefs.weightSeasonalStability > 0 && noaa?.seasonalStability != null) {
    const stddev = noaa.seasonalStability;
    const lovesFourSeasons = prefs.preferDistinctSeasons ?? false;
    const score = normalize(stddev, RANGES.seasonalStability.min, RANGES.seasonalStability.max, !lovesFourSeasons);
    factors.push({
      name: lovesFourSeasons ? "Four Seasons 🍂" : "Weather Stability",
      weight: toPercent(prefs.weightSeasonalStability),
      value: stddev.toFixed(1),
      unit: "°F stddev",
      score,
      status: lovesFourSeasons ? (stddev >= 20 ? "good" : stddev < 12 ? "bad" : "neutral")
                               : (stddev <= 12 ? "good" : stddev > 20 ? "bad" : "neutral"),
      explanation: lovesFourSeasons
        ? `Temp variation ${stddev.toFixed(1)}°F - ${stddev >= 18 ? "distinct seasons!" : "mild seasons."}`
        : `Temp variation ${stddev.toFixed(1)}°F (San Diego: 5, Chicago: 25).`,
    });
  }

  // Diurnal Swing (smaller is better)
  if (prefs.weightDiurnalSwing > 0 && noaa?.diurnalSwing != null) {
    const swing = noaa.diurnalSwing;
    const score = normalize(swing, RANGES.diurnalSwing.min, RANGES.diurnalSwing.max, true);
    factors.push({
      name: "Day/Night Swing",
      weight: toPercent(prefs.weightDiurnalSwing),
      value: swing.toFixed(0),
      unit: "°F",
      threshold: { value: prefs.maxDiurnalSwing, type: "max", label: "Your max" },
      score,
      status: swing > prefs.maxDiurnalSwing ? "bad" : swing <= 15 ? "good" : "neutral",
      explanation: `${swing.toFixed(0)}°F day/night temp swing (Miami: 10, Denver: 28).`,
    });
  }

  const badFactors = factors.filter((f) => f.status === "bad");
  const goodFactors = factors.filter((f) => f.status === "good");
  
  let summary = "";
  if (badFactors.length > 0) {
    summary = `Climate concerns: ${badFactors.map((f) => f.name.toLowerCase()).join(", ")}. `;
  }
  if (goodFactors.length > 0) {
    summary += `Climate strengths: ${goodFactors.map((f) => f.name.toLowerCase()).join(", ")}.`;
  }
  if (!summary) {
    summary = "Climate is average for your preferences.";
  }

  return { factors, summary };
}

function analyzeCost(
  city: CityWithMetrics,
  preferences: UserPreferences
): { factors: FactorAnalysis[]; summary: string } {
  const factors: FactorAnalysis[] = [];
  const bea = city.metrics?.bea;
  const prefs = preferences.advanced.costOfLiving;
  const homePrice = city.metrics?.medianHomePrice;

  // Cost scoring uses persona-based "True Purchasing Power" - not weighted factors
  // Show components that feed into the calculation
  
  const personaLabel = {
    renter: "Renter",
    homeowner: "Homeowner (fixed mortgage)",
    "prospective-buyer": "Prospective Buyer",
  }[prefs.housingSituation] || "Renter";
  
  const workLabel = {
    "local-earner": "Local Earner",
    standard: "Standard Income",
    "high-earner": "High Earner",
    retiree: "Retiree",
  }[prefs.workSituation] || "Local Earner";

  // Your Cost Profile (informational)
  factors.push({
    name: "Your Cost Profile",
    weight: 0, // Not a weighted factor
    value: `${personaLabel} / ${workLabel}`,
    unit: "",
    score: 50,
    status: "neutral",
    explanation: `Cost calculated for ${personaLabel.toLowerCase()} with ${workLabel.toLowerCase()} income profile.`,
  });

  // Housing Cost (depends on persona)
  if (prefs.housingSituation === "prospective-buyer" && homePrice != null) {
    // For buyers, show actual home price impact
    const status: FactorAnalysis["status"] = homePrice > 600000 ? "bad" : homePrice < 350000 ? "good" : "neutral";
    factors.push({
      name: "Home Price",
      weight: 0,
      value: `$${(homePrice / 1000).toFixed(0)}K`,
      unit: "",
      score: Math.max(0, 100 - ((homePrice - 300000) / 12000)),
      status,
      explanation: homePrice > 600000
        ? `Median home price $${(homePrice / 1000).toFixed(0)}K is expensive for buyers.`
        : homePrice < 350000
        ? `Median home price $${(homePrice / 1000).toFixed(0)}K is affordable.`
        : `Median home price $${(homePrice / 1000).toFixed(0)}K (national median ~$420K).`,
    });
  } else if (bea?.regionalPriceParity?.housing != null) {
    const rpp = bea.regionalPriceParity.housing;
    const status: FactorAnalysis["status"] = rpp > 150 ? "bad" : rpp < 90 ? "good" : "neutral";
    factors.push({
      name: "Housing Cost Index",
      weight: 0,
      value: rpp.toFixed(0),
      unit: " (100=avg)",
      score: Math.max(0, Math.min(100, 150 - rpp)),
      status,
      explanation: rpp > 150
        ? `Housing costs ${(rpp - 100).toFixed(0)}% above national average.`
        : rpp < 90
        ? `Housing costs ${(100 - rpp).toFixed(0)}% below national average.`
        : `Housing costs near national average.`,
    });
  }

  // Goods & Services Cost
  if (bea?.regionalPriceParity?.goods != null && bea?.regionalPriceParity?.otherServices != null) {
    const goods = bea.regionalPriceParity.goods;
    const services = bea.regionalPriceParity.otherServices;
    const avg = (goods + services) / 2;
    const status: FactorAnalysis["status"] = avg > 110 ? "bad" : avg < 95 ? "good" : "neutral";
    factors.push({
      name: "Goods & Services",
      weight: 0,
      value: avg.toFixed(0),
      unit: " (100=avg)",
      score: Math.max(0, Math.min(100, 130 - avg)),
      status,
      explanation: `Goods ${goods.toFixed(0)}, Services ${services.toFixed(0)} (100 = national average).`,
    });
  }

  // State Tax Impact (important for standard/retiree personas)
  if (bea?.taxes?.effectiveTaxRate != null) {
    const rate = bea.taxes.effectiveTaxRate;
    const status: FactorAnalysis["status"] = rate > 18 ? "bad" : rate < 12 ? "good" : "neutral";
    const state = city.state;
    const noIncomeTaxStates = ["TX", "FL", "WA", "NV", "TN", "WY", "SD", "NH", "AK"];
    const isNoTax = noIncomeTaxStates.includes(state);
    
    factors.push({
      name: "Tax Burden",
      weight: 0,
      value: rate.toFixed(1),
      unit: "%",
      score: Math.max(0, Math.min(100, 100 - rate * 4)),
      status,
      explanation: isNoTax
        ? `${state} has no state income tax - ${rate.toFixed(1)}% effective rate (federal only).`
        : rate > 18
        ? `${rate.toFixed(1)}% effective tax rate is high.`
        : rate < 12
        ? `${rate.toFixed(1)}% effective tax rate is relatively low.`
        : `${rate.toFixed(1)}% effective tax rate is moderate.`,
    });
  }

  // Per Capita Income (context for local earner)
  if (prefs.workSituation === "local-earner" && bea?.taxes?.perCapitaIncome != null) {
    const income = bea.taxes.perCapitaIncome;
    const status: FactorAnalysis["status"] = income > 70000 ? "good" : income < 50000 ? "warning" : "neutral";
    factors.push({
      name: "Local Income",
      weight: 0,
      value: `$${(income / 1000).toFixed(0)}K`,
      unit: "/capita",
      score: Math.min(100, income / 800),
      status,
      explanation: `Local per capita income $${(income / 1000).toFixed(0)}K (US avg ~$60K). Higher income can offset higher costs.`,
    });
  }

  const badFactors = factors.filter((f) => f.status === "bad");
  const goodFactors = factors.filter((f) => f.status === "good");
  
  let summary = "";
  if (badFactors.length > 0) {
    summary = `Cost concerns: ${badFactors.slice(1).map((f) => f.name.toLowerCase()).join(", ")}. `;
  }
  if (goodFactors.length > 0) {
    summary += `Cost advantages: ${goodFactors.map((f) => f.name.toLowerCase()).join(", ")}.`;
  }
  if (!summary) {
    summary = `Cost of living is average for a ${personaLabel.toLowerCase()}.`;
  }

  return { factors, summary };
}

function analyzeDemographics(
  city: CityWithMetrics,
  preferences: UserPreferences
): { factors: FactorAnalysis[]; summary: string } {
  const factors: FactorAnalysis[] = [];
  const census = city.metrics?.census;
  const prefs = preferences.advanced.demographics;

  // Calculate total weight for percentage display
  let totalWeight = 0;
  if (prefs.weightDiversity > 0) totalWeight += prefs.weightDiversity;
  if (prefs.weightAge > 0) totalWeight += prefs.weightAge;
  if (prefs.weightEducation > 0) totalWeight += prefs.weightEducation;
  if (prefs.weightForeignBorn > 0) totalWeight += prefs.weightForeignBorn;
  if (prefs.minorityGroup !== "none") totalWeight += prefs.minorityImportance;
  if (prefs.weightEconomicHealth > 0) totalWeight += prefs.weightEconomicHealth;
  // Include dating weight in total when enabled
  if (prefs.datingEnabled && prefs.datingWeight > 0) totalWeight += prefs.datingWeight;
  
  // Helper to convert raw weight to percentage of total
  const toPercent = (w: number) => totalWeight > 0 ? Math.round((w / totalWeight) * 100) : 0;

  // Population penalty warning (only show if user set a minimum AND city is below it)
  // Population is NOT a weighted factor - it's a graduated penalty applied at the end
  if (census?.totalPopulation != null && prefs.minPopulation > 0) {
    const pop = census.totalPopulation;
    const minPop = prefs.minPopulation;

    if (pop < minPop) {
      // Only show when there's a penalty being applied
      const deficit = (minPop - pop) / minPop;
      const penalty = Math.round(50 * deficit);
      
      factors.push({
        name: "⚠️ Population Penalty",
        weight: 0, // Not a weighted factor
        value: pop > 1000000 ? (pop / 1000000).toFixed(1) + "M" : (pop / 1000).toFixed(0) + "K",
        threshold: { value: minPop / 1000, type: "min", label: "Min (K)" },
        score: Math.max(0, 100 - penalty),
        status: "bad",
        explanation: `Population ${(pop / 1000).toFixed(0)}K is below your minimum of ${(minPop / 1000).toFixed(0)}K. Score reduced by ${penalty} points.`,
      });
    }
  }

  // Diversity (only if weight > 0)
  if (prefs.weightDiversity > 0 && census?.diversityIndex != null) {
    const div = census.diversityIndex;
    const minDiv = prefs.minDiversityIndex;
    let status: FactorAnalysis["status"] = "neutral";
    // Match actual scoring: diversityScore = Math.min(100, (census.diversityIndex / 70) * 100)
    let score = Math.min(100, (div / 70) * 100);

    if (div < minDiv) {
      status = "bad";
      score = Math.max(0, 50 - (minDiv - div) * 2);
    } else if (div >= 70) {
      status = "good";
    }

    factors.push({
      name: "Diversity Index",
      weight: toPercent(prefs.weightDiversity),
      value: div,
      unit: "/100",
      threshold: minDiv > 0 ? { value: minDiv, type: "min", label: "Your min" } : undefined,
      score: Math.round(score),
      status,
      explanation: div < minDiv
        ? `Diversity index of ${div} is below your minimum of ${minDiv}.`
        : `Diversity index of ${div}/100 (US avg ~40).`,
    });
  }

  // Age (only if weight > 0)
  if (prefs.weightAge > 0 && census?.medianAge != null) {
    const age = census.medianAge;
    let status: FactorAnalysis["status"] = "neutral";
    let score = 50;
    let explanation = "";

    switch (prefs.preferredAgeGroup) {
      case "young":
        score = age < 30 ? 100 : age < 35 ? 80 : age < 40 ? 50 : 20;
        status = age < 35 ? "good" : age < 40 ? "neutral" : "warning";
        explanation = `Median age ${age.toFixed(1)} (you prefer young <35).`;
        break;
      case "mixed":
        score = age >= 35 && age <= 45 ? 100 : age >= 30 && age <= 50 ? 70 : 40;
        status = age >= 35 && age <= 45 ? "good" : "neutral";
        explanation = `Median age ${age.toFixed(1)} (you prefer 35-45 family range).`;
        break;
      case "mature":
        score = age > 50 ? 100 : age > 45 ? 80 : age > 40 ? 50 : 20;
        status = age > 45 ? "good" : age > 40 ? "neutral" : "warning";
        explanation = `Median age ${age.toFixed(1)} (you prefer mature >45).`;
        break;
      default:
        score = 70;
        explanation = `Median age ${age.toFixed(1)} years (US avg ~38).`;
    }

    factors.push({
      name: "Median Age",
      weight: toPercent(prefs.weightAge),
      value: age.toFixed(1),
      unit: " years",
      score,
      status,
      explanation,
    });
  }

  // Education (only if weight > 0)
  if (prefs.weightEducation > 0 && census?.bachelorsOrHigherPercent != null) {
    const edu = census.bachelorsOrHigherPercent;
    let status: FactorAnalysis["status"] = "neutral";
    // Match actual scoring: Math.min(100, 20 + (bachelorsPct * 1.3))
    let score = Math.min(100, 20 + (edu * 1.3));

    if (edu >= 45) {
      status = "good";
    } else if (edu < 25) {
      status = "warning";
    }

    factors.push({
      name: "Bachelor's Degree+",
      weight: toPercent(prefs.weightEducation),
      value: edu.toFixed(0),
      unit: "%",
      score: Math.round(score),
      status,
      explanation: edu >= 45
        ? `${edu.toFixed(0)}% have bachelor's or higher - highly educated.`
        : `${edu.toFixed(0)}% have bachelor's or higher (US avg ~33%).`,
    });
  }

  // Foreign-Born (only if weight > 0)
  if (prefs.weightForeignBorn > 0 && census?.foreignBornPercent != null) {
    const fb = census.foreignBornPercent;
    const minFb = prefs.minForeignBornPercent;
    let status: FactorAnalysis["status"] = "neutral";
    // Match actual scoring: Math.min(100, 30 + (fbPct * 2.3))
    let score = Math.min(100, 30 + (fb * 2.3));

    if (fb < minFb) {
      status = "warning";
      score = Math.max(0, 50 - (minFb - fb) * 3);
    } else if (fb >= 25) {
      status = "good";
    }

    factors.push({
      name: "Foreign-Born",
      weight: toPercent(prefs.weightForeignBorn),
      value: fb.toFixed(0),
      unit: "%",
      threshold: minFb > 0 ? { value: minFb, type: "min", label: "Your min" } : undefined,
      score: Math.round(score),
      status,
      explanation: fb >= 25
        ? `${fb.toFixed(0)}% foreign-born - rich international culture.`
        : `${fb.toFixed(0)}% foreign-born (US avg ~14%).`,
    });
  }

  // Economic Health (only if weight > 0)
  if (prefs.weightEconomicHealth > 0) {
    const income = census?.medianHouseholdIncome;
    const poverty = census?.povertyRate;
    let status: FactorAnalysis["status"] = "neutral";
    let score = 50;
    let value = "";
    let explanation = "";

    if (income != null && poverty != null) {
      // Match actual scoring logic
      const incomeScore = Math.min(100, income / 900);
      const povertyScore = Math.max(0, 120 - poverty * 4);
      score = (incomeScore + povertyScore) / 2;
      value = `$${(income / 1000).toFixed(0)}K / ${poverty.toFixed(0)}%`;
      
      if (score >= 70) {
        status = "good";
        explanation = `Strong economy: $${(income / 1000).toFixed(0)}K median income, ${poverty.toFixed(0)}% poverty.`;
      } else if (score < 40) {
        status = "warning";
        explanation = `Economic challenges: $${(income / 1000).toFixed(0)}K income, ${poverty.toFixed(0)}% poverty.`;
      } else {
        explanation = `$${(income / 1000).toFixed(0)}K median household income, ${poverty.toFixed(0)}% poverty rate.`;
      }
    } else if (income != null) {
      score = Math.min(100, income / 900);
      value = `$${(income / 1000).toFixed(0)}K`;
      explanation = `Median household income: $${(income / 1000).toFixed(0)}K.`;
    }

    factors.push({
      name: "Economic Health",
      weight: toPercent(prefs.weightEconomicHealth),
      value,
      unit: " income/poverty",
      score: Math.round(score),
      status,
      explanation,
    });
  }

  // === DATING FAVORABILITY (if enabled) ===
  if (prefs.datingEnabled && prefs.seekingGender) {
    const seekingGender = prefs.seekingGender;
    const ageRange = prefs.datingAgeRange;
    const datingWeight = prefs.datingWeight;
    const qol = city.metrics?.qol;
    const cultural = city.metrics?.cultural;
    const bea = city.metrics?.bea;

    // Dating sub-weights matching actual scoring formula (demographics.ts)
    // Pool 40% + Economic 30% + Alignment 20% + Walk/Safety 10% = 100%
    const DATING_WEIGHTS = {
      pool: 0.40,        // Gender ratio + singles combined
      economic: 0.30,    // Affordability/disposable income
      alignment: 0.20,   // Political preference match
      walkSafety: 0.10,  // Walkability + crime rate
    };

    // === 1. POOL SCORE (40%) - Gender ratio + singles combined ===
    let poolScore = 50;
    let poolStatus: FactorAnalysis["status"] = "neutral";
    let poolExplanation = "";
    let ratioValue: string | null = null;
    let singlesValue: string | null = null;

    // Get appropriate gender ratio
    let genderRatio: { male: number; female: number; ratio: number } | null = null;
    if (census?.genderRatios) {
      switch (ageRange) {
        case "20-29": genderRatio = census.genderRatios.age20to29; break;
        case "30-39": genderRatio = census.genderRatios.age30to39; break;
        case "40-49": genderRatio = census.genderRatios.age40to49; break;
        default: genderRatio = census.genderRatios.overall;
      }
    }

    // Calculate pool score (matching actual scoring in demographics.ts)
    if (genderRatio) {
      const ratio = genderRatio.ratio;
      const deviation = ratio - 100;
      const direction = seekingGender === "women" ? -1 : 1;
      poolScore = 50 + (direction * deviation * 2.5);
      ratioValue = ratio.toFixed(1);
      
      if (seekingGender === "women") {
        if (ratio < 95) poolExplanation = `Favorable ratio (${ratio.toFixed(1)} M/100F)`;
        else if (ratio > 105) poolExplanation = `Unfavorable ratio (${ratio.toFixed(1)} M/100F)`;
        else poolExplanation = `Balanced ratio (${ratio.toFixed(1)} M/100F)`;
      } else {
        if (ratio > 105) poolExplanation = `Favorable ratio (${ratio.toFixed(1)} M/100F)`;
        else if (ratio < 95) poolExplanation = `Unfavorable ratio (${ratio.toFixed(1)} M/100F)`;
        else poolExplanation = `Balanced ratio (${ratio.toFixed(1)} M/100F)`;
      }
    }

    // Singles adjustment
    const neverMarriedPct = seekingGender === "women" 
      ? census?.neverMarriedFemalePercent
      : census?.neverMarriedMalePercent;
    
    if (neverMarriedPct != null) {
      const singleAdjustment = (neverMarriedPct - 55) * 1.5;
      poolScore += singleAdjustment;
      singlesValue = neverMarriedPct.toFixed(0);
      poolExplanation += `, ${neverMarriedPct.toFixed(0)}% single`;
    }
    
    poolScore = Math.max(0, Math.min(100, poolScore));
    if (poolScore >= 65) poolStatus = "good";
    else if (poolScore < 40) poolStatus = "bad";

    factors.push({
      name: `Dating Pool${ageRange ? ` (${ageRange})` : ""}`,
      weight: toPercent(datingWeight * DATING_WEIGHTS.pool),
      value: ratioValue ? `${ratioValue} M/100F` : null,
      unit: singlesValue ? `, ${singlesValue}% single` : "",
      score: poolScore,
      status: poolStatus,
      explanation: poolExplanation || "Gender ratio and singles data combined.",
    });

    // === 2. ECONOMIC SCORE (30%) - Disposable income ===
    if (bea && census?.perCapitaIncome) {
      const income = census.perCapitaIncome;
      const housingRPP = bea.regionalPriceParity?.housing || 100;
      const estimatedRent = 16800 * (housingRPP / 100);
      const disposable = income - estimatedRent;
      
      // Match actual scoring: $25k = 50pts, $45k = 75pts ($800 per point)
      let econScore = 50 + ((disposable - 25000) / 800);
      econScore = Math.max(0, Math.min(100, econScore));
      
      let econStatus: FactorAnalysis["status"] = "neutral";
      if (econScore >= 65) econStatus = "good";
      else if (econScore < 40) econStatus = "bad";

      factors.push({
        name: "Dating: Affordability",
        weight: toPercent(datingWeight * DATING_WEIGHTS.economic),
        value: `$${(disposable / 1000).toFixed(0)}K`,
        unit: " disposable",
        score: econScore,
        status: econStatus,
        explanation: econScore >= 65
          ? `$${(disposable / 1000).toFixed(0)}K disposable income - great for dating.`
          : econScore < 40
          ? `Limited disposable income after rent.`
          : `$${(disposable / 1000).toFixed(0)}K disposable - moderate dating budget.`,
      });
    }

    // === 3. ALIGNMENT SCORE (20%) - Political match ===
    const political = cultural?.political;
    const valuesPrefs = preferences.advanced?.values;
    const targetPi = valuesPrefs?.partisanPreference === "neutral" ? null :
      (valuesPrefs?.partisanPreference === "strong-dem" ? 0.6 :
       valuesPrefs?.partisanPreference === "lean-dem" ? 0.2 :
       valuesPrefs?.partisanPreference === "lean-rep" ? -0.2 :
       valuesPrefs?.partisanPreference === "strong-rep" ? -0.6 : 0);

    let alignScore = 50;
    let alignStatus: FactorAnalysis["status"] = "neutral";
    let alignExplanation = "Political alignment not configured.";

    if (political?.partisanIndex != null && targetPi !== null) {
      const dist = Math.abs(political.partisanIndex - targetPi);
      // Match actual scoring: Gaussian decay, k ≈ 4.3
      alignScore = 100 * Math.exp(-4.3 * dist * dist);
      
      if (alignScore >= 70) alignStatus = "good";
      else if (alignScore < 40) alignStatus = "warning";
      
      const cityLean = political.partisanIndex > 0 ? "Democratic" : "Republican";
      alignExplanation = alignScore >= 70
        ? `City leans ${cityLean} - matches your preference.`
        : `City leans ${cityLean} (PI: ${political.partisanIndex.toFixed(2)}).`;
    } else if (targetPi === null) {
      alignExplanation = "Set political preference in Values to see alignment.";
    }

    factors.push({
      name: "Dating: Alignment",
      weight: toPercent(datingWeight * DATING_WEIGHTS.alignment),
      value: political?.democratPercent?.toFixed(0) || null,
      unit: political?.democratPercent ? "% Dem" : "",
      score: Math.round(alignScore),
      status: alignStatus,
      explanation: alignExplanation,
    });

    // === 4. WALK/SAFETY SCORE (10%) - Walkability + crime ===
    let vibeScore = 50;
    let vibeStatus: FactorAnalysis["status"] = "neutral";
    let vibeExplanation = "";
    
    const ws = qol?.walkability?.walkScore;
    const crimeRate = qol?.crime?.violentCrimeRate;
    
    if (ws != null && crimeRate != null) {
      // Match actual scoring: Walk 48 = 50pts, Crime 380 = 50pts
      const wScore = 50 + (ws - 48);
      const cScore = 50 + (380 - crimeRate) / 5;
      vibeScore = Math.max(0, Math.min(100, (wScore + cScore) / 2));
      
      if (vibeScore >= 65) vibeStatus = "good";
      else if (vibeScore < 40) vibeStatus = "warning";
      
      vibeExplanation = `Walk Score® ${ws}, crime ${crimeRate.toFixed(0)}/100K`;
      if (ws >= 70 && crimeRate < 300) vibeExplanation += " - great for meeting people safely.";
    } else if (ws != null) {
      vibeScore = ws >= 70 ? 75 : ws >= 50 ? 55 : 40;
      vibeExplanation = `Walk Score® ${ws}`;
      if (ws >= 70) vibeStatus = "good";
      else if (ws < 40) vibeStatus = "warning";
    }

    factors.push({
      name: "Dating: Walk/Safety",
      weight: toPercent(datingWeight * DATING_WEIGHTS.walkSafety),
      value: ws ?? null,
      unit: ws ? " Walk Score®" : "",
      score: Math.round(vibeScore),
      status: vibeStatus,
      explanation: vibeExplanation || "Walkability for meeting people organically.",
    });

    // Add note about dating weight dominance if other factors are at 0
    const nonDatingWeight = totalWeight - datingWeight;
    if (nonDatingWeight === 0 && factors.length > 0) {
      // Insert an info factor at the beginning explaining the score composition
      factors.unshift({
        name: "ℹ️ Dating Focus Mode",
        weight: 0,
        value: `${Math.round((datingWeight / totalWeight) * 100)}%`,
        unit: " of score",
        score: 50,
        status: "neutral",
        explanation: "Other demographic factors (diversity, age, education) are set to 0 weight. Adjust in Advanced Preferences to include them.",
      });
    }
  }

  const badFactors = factors.filter((f) => f.status === "bad");
  const goodFactors = factors.filter((f) => f.status === "good");
  
  let summary = "";
  if (badFactors.length > 0) {
    summary = `Demographics concerns: ${badFactors.map((f) => f.name.toLowerCase()).join(", ")}. `;
  }
  if (goodFactors.length > 0) {
    summary += `Demographics strengths: ${goodFactors.map((f) => f.name.toLowerCase()).join(", ")}.`;
  }
  if (!summary) {
    summary = "Demographics are average for your preferences.";
  }

  return { factors, summary };
}

function analyzeValues(
  city: CityWithMetrics,
  preferences: UserPreferences
): { factors: FactorAnalysis[]; summary: string } {
  const factors: FactorAnalysis[] = [];
  const cultural = city.metrics?.cultural;
  const prefs = preferences.advanced?.values;

  // If no values preferences, return minimal analysis
  if (!prefs) {
    return {
      factors: [],
      summary: "Values preferences not configured.",
    };
  }

  // Calculate total weight for percentage display
  let totalWeight = 0;
  if (prefs.partisanPreference !== "neutral" && prefs.partisanWeight > 0) {
    totalWeight += prefs.partisanWeight;
  } else if (prefs.preferHighTurnout) {
    totalWeight += 30; // Default turnout weight when only turnout is set
  }
  if (prefs.religiousTraditions.length > 0 && prefs.traditionsWeight > 0) {
    totalWeight += prefs.traditionsWeight;
  }
  if (prefs.preferReligiousDiversity && prefs.diversityWeight > 0) {
    totalWeight += prefs.diversityWeight;
  }

  const toPercent = (w: number) => totalWeight > 0 ? Math.round((w / totalWeight) * 100) : 0;

  // Political Alignment (using Gaussian decay like actual scoring)
  if (prefs.partisanPreference !== "neutral" && prefs.partisanWeight > 0 && cultural?.political?.partisanIndex != null) {
    const pi = cultural.political.partisanIndex;
    const demPct = cultural.political.democratPercent;
    
    // Map preference to target PI (same as actual scoring)
    const prefToPi: Record<string, number> = {
      "strong-dem": 0.6, "lean-dem": 0.2, "swing": 0, "lean-rep": -0.2, "strong-rep": -0.6,
    };
    const targetPi = prefToPi[prefs.partisanPreference] ?? 0;
    const distance = Math.abs(pi - targetPi);
    
    // Calculate Gaussian decay score (matching actual scoring)
    const k = 1.0 + (prefs.partisanWeight / 50);
    let alignScore = 100 * Math.exp(-k * distance * distance);
    
    // Tribal penalty for partisans crossing party lines
    const isOppositeSide = (pi > 0 && targetPi < 0) || (pi < 0 && targetPi > 0);
    const isUserPartisan = Math.abs(targetPi) >= 0.3;
    if (isOppositeSide && isUserPartisan) alignScore *= 0.85;
    else if (isOppositeSide) alignScore *= 0.95;
    
    let status: FactorAnalysis["status"] = "neutral";
    if (alignScore >= 70) status = "good";
    else if (alignScore < 40) status = "warning";
    
    const wantsDem = prefs.partisanPreference.includes("dem");
    const cityDem = pi > 0;

    factors.push({
      name: "Political Alignment",
      weight: toPercent(prefs.partisanWeight),
      value: demPct?.toFixed(0) || null,
      unit: "% Dem",
      score: Math.round(alignScore),
      status,
      explanation: (wantsDem && cityDem) || (!wantsDem && !cityDem)
        ? `City aligns with your ${wantsDem ? "Democratic" : "Republican"} preference (PI: ${pi.toFixed(2)}).`
        : `City leans ${cityDem ? "Democratic" : "Republican"} (PI: ${pi.toFixed(2)}) - ${distance.toFixed(2)} away from your preference.`,
    });
  } else if (prefs.preferHighTurnout && cultural?.political?.voterTurnout != null) {
    // Turnout only (no partisan preference)
    const turnout = cultural.political.voterTurnout;
    const score = Math.max(0, Math.min(100, (turnout - 40) * 2.5)); // 40% = 0, 80% = 100
    let status: FactorAnalysis["status"] = turnout >= 70 ? "good" : turnout < 55 ? "warning" : "neutral";
    
    factors.push({
      name: "Civic Engagement",
      weight: toPercent(30),
      value: turnout.toFixed(0),
      unit: "% turnout",
      score: Math.round(score),
      status,
      explanation: turnout >= 70
        ? `${turnout.toFixed(0)}% voter turnout - highly engaged community.`
        : turnout < 55
        ? `${turnout.toFixed(0)}% voter turnout is below average.`
        : `${turnout.toFixed(0)}% voter turnout (US avg ~60%).`,
    });
  }

  // Religious traditions (only if enabled)
  if (prefs.religiousTraditions.length > 0 && prefs.traditionsWeight > 0 && cultural?.religious) {
    const religious = cultural.religious;
    let score = 50;
    let status: FactorAnalysis["status"] = "neutral";
    
    const foundTraditions: string[] = [];
    const traditionMap: Record<string, number | null> = {
      "catholic": religious.catholic,
      "evangelical": religious.evangelicalProtestant,
      "mainline": religious.mainlineProtestant,
      "jewish": religious.jewish,
      "muslim": religious.muslim,
      "unaffiliated": religious.unaffiliated,
    };
    
    // National averages for concentration
    const nationalAvg: Record<string, number> = {
      "catholic": 205, "evangelical": 256, "mainline": 103,
      "jewish": 22, "muslim": 11, "unaffiliated": 290,
    };
    
    // Calculate score matching actual scoring logic
    let traditionsScore = 50;
    for (const tradition of prefs.religiousTraditions) {
      const presence = traditionMap[tradition];
      if (presence != null && presence >= prefs.minTraditionPresence) {
        foundTraditions.push(tradition);
        const concentration = presence / (nationalAvg[tradition] || 100);
        if (concentration > 2.0) traditionsScore += 20;
        else if (concentration > 1.5) traditionsScore += 15;
        else if (concentration > 1.0) traditionsScore += 10;
        else traditionsScore += 5;
      } else if (presence != null) {
        traditionsScore -= Math.min(20, (prefs.minTraditionPresence - presence) / 5);
      }
    }
    
    score = Math.max(0, Math.min(100, traditionsScore));
    if (foundTraditions.length === prefs.religiousTraditions.length) status = "good";
    else if (foundTraditions.length === 0) status = "warning";

    factors.push({
      name: "Religious Community",
      weight: toPercent(prefs.traditionsWeight),
      value: foundTraditions.length,
      unit: ` of ${prefs.religiousTraditions.length}`,
      score: Math.round(score),
      status,
      explanation: foundTraditions.length > 0
        ? `Found ${foundTraditions.join(", ")} communities above your threshold.`
        : "Selected religious traditions have limited presence.",
    });
  }

  // Religious diversity (only if enabled)
  if (prefs.preferReligiousDiversity && prefs.diversityWeight > 0 && cultural?.religious?.diversityIndex != null) {
    const diversity = cultural.religious.diversityIndex;
    let status: FactorAnalysis["status"] = "neutral";
    
    if (diversity >= 70) status = "good";
    else if (diversity < 40) status = "warning";

    factors.push({
      name: "Religious Diversity",
      weight: toPercent(prefs.diversityWeight),
      value: diversity,
      unit: "/100",
      score: diversity,
      status,
      explanation: diversity >= 70
        ? "High religious diversity - many traditions present."
        : diversity < 40
        ? "Low religious diversity - one tradition dominates."
        : "Moderate religious diversity.",
    });
  }

  const badFactors = factors.filter((f) => f.status === "bad" || f.status === "warning");
  const goodFactors = factors.filter((f) => f.status === "good");
  
  let summary = "";
  if (badFactors.length > 0) {
    summary = `Values concerns: ${badFactors.map((f) => f.name.toLowerCase()).join(", ")}. `;
  }
  if (goodFactors.length > 0) {
    summary += `Values alignment: ${goodFactors.map((f) => f.name.toLowerCase()).join(", ")}.`;
  }
  if (!summary) {
    summary = factors.length === 0 
      ? "Enable political or religious preferences to see analysis."
      : "Values factors are neutral for your preferences.";
  }

  return { factors, summary };
}

function analyzeEntertainment(
  city: CityWithMetrics,
  preferences: UserPreferences
): { factors: FactorAnalysis[]; summary: string } {
  const factors: FactorAnalysis[] = [];
  const cultural = city.metrics?.cultural;
  const qol = city.metrics?.qol;
  const prefs = preferences.advanced?.entertainment;
  const metrics = city.metrics;

  // If no entertainment preferences, return minimal analysis
  if (!prefs) {
    return {
      factors: [],
      summary: "Entertainment preferences not configured.",
    };
  }

  // Calculate total weight for percentages (only count enabled factors)
  let totalWeight = 0;
  if (prefs.nightlifeImportance > 0) totalWeight += prefs.nightlifeImportance;
  if (prefs.artsImportance > 0) totalWeight += prefs.artsImportance;
  if (prefs.diningImportance > 0) totalWeight += prefs.diningImportance;
  if (prefs.sportsImportance > 0) totalWeight += prefs.sportsImportance;
  if (prefs.recreationImportance > 0) totalWeight += prefs.recreationImportance;

  const toPercent = (w: number) => totalWeight > 0 ? Math.round((w / totalWeight) * 100) : 0;

  // Helper: urbanAmenityScore matching actual scoring (logarithmic critical mass)
  const urbanAmenityScore = (value: number, min: number, plateau: number, max: number) => {
    if (value <= min) return 30;
    if (value >= max) return 100;
    if (value >= plateau) {
      // Above plateau: logarithmic growth from 75 to 100
      const progress = (value - plateau) / (max - plateau);
      return 75 + 25 * Math.log10(1 + progress * 9);
    }
    // Below plateau: linear climb from 30 to 75
    const progress = (value - min) / (plateau - min);
    return 30 + 45 * progress;
  };

  // Calibrated ranges (matching constants.ts - Jan 2026 calibration)
  const RANGES = {
    barsAndClubsPer10K: { min: 0.5, plateau: 5, max: 10 },
    museums: { min: 5, plateau: 30, max: 150 },
    restaurantsPer10K: { min: 3, plateau: 20, max: 45 },
  };

  // Nightlife (only if weight > 0)
  if (prefs.nightlifeImportance > 0 && cultural?.urbanLifestyle?.nightlife) {
    const nl = cultural.urbanLifestyle.nightlife;
    const bars = nl.barsAndClubsPer10K;
    
    let score = 50;
    let status: FactorAnalysis["status"] = "neutral";

    if (bars !== null) {
      score = urbanAmenityScore(bars, RANGES.barsAndClubsPer10K.min, 
                                RANGES.barsAndClubsPer10K.plateau, RANGES.barsAndClubsPer10K.max);
      // Bonus for late-night options
      if (nl.lateNightVenues != null && nl.lateNightVenues >= 10) score = Math.min(100, score + 5);
      
      if (score >= 75) status = "good";
      else if (score < 45) status = "warning";
    }

    factors.push({
      name: "Nightlife",
      weight: toPercent(prefs.nightlifeImportance),
      value: bars?.toFixed(1) || null,
      unit: "/10K",
      score: Math.round(score),
      status,
      explanation: bars != null
        ? `${bars.toFixed(1)} bars/clubs per 10K (Portland: 7.7, LA: 0.4).`
        : "No nightlife data available.",
    });
  }

  // Arts (only if weight > 0)
  if (prefs.artsImportance > 0 && cultural?.urbanLifestyle?.arts) {
    const arts = cultural.urbanLifestyle.arts;
    const museums = arts.museums;
    
    let score = 50;
    let status: FactorAnalysis["status"] = "neutral";

    if (museums !== null) {
      score = urbanAmenityScore(museums, RANGES.museums.min, RANGES.museums.plateau, RANGES.museums.max);
      if (score >= 75) status = "good";
      else if (score < 45) status = "warning";
    }

    factors.push({
      name: "Arts & Culture",
      weight: toPercent(prefs.artsImportance),
      value: museums,
      unit: " museums",
      score: Math.round(score),
      status,
      explanation: museums != null
        ? `${museums} museums (NYC: 162, small cities: 8-15).`
        : "No arts data available.",
    });
  }

  // Dining (only if weight > 0)
  if (prefs.diningImportance > 0 && cultural?.urbanLifestyle?.dining) {
    const dining = cultural.urbanLifestyle.dining;
    const restaurants = dining.restaurantsPer10K;
    const diversity = dining.cuisineDiversity;
    
    let score = 50;
    let status: FactorAnalysis["status"] = "neutral";

    if (restaurants !== null) {
      score = urbanAmenityScore(restaurants, RANGES.restaurantsPer10K.min,
                                RANGES.restaurantsPer10K.plateau, RANGES.restaurantsPer10K.max);
      if (score >= 75) status = "good";
      else if (score < 45) status = "warning";
    }

    factors.push({
      name: "Dining Scene",
      weight: toPercent(prefs.diningImportance),
      value: restaurants?.toFixed(0) || null,
      unit: "/10K",
      score: Math.round(score),
      status,
      explanation: restaurants != null
        ? `${restaurants.toFixed(0)} restaurants/10K, ${diversity || "?"} cuisines (SF: 42, Houston: 4).`
        : "No dining data available.",
    });
  }

  // Sports (only if weight > 0)
  if (prefs.sportsImportance > 0) {
    const countTeams = (teams: string | null | undefined) => 
      teams ? teams.split(",").filter(t => t.trim()).length : 0;
    
    const totalTeams = countTeams(metrics?.nflTeams) + countTeams(metrics?.nbaTeams) + 
                       countTeams(metrics?.mlbTeams) + countTeams(metrics?.nhlTeams) + 
                       countTeams(metrics?.mlsTeams);
    
    // Sports scoring matching actual scoring logic
    let score = 30;
    if (totalTeams === 0) score = 30;
    else if (totalTeams <= 2) score = 50 + totalTeams * 10;
    else if (totalTeams <= 4) score = 65 + (totalTeams - 2) * 7;
    else if (totalTeams <= 6) score = 80 + (totalTeams - 4) * 5;
    else if (totalTeams <= 8) score = 92 + (totalTeams - 6) * 2;
    else score = Math.min(100, 97 + (totalTeams - 8));
    
    let status: FactorAnalysis["status"] = "neutral";
    if (score >= 80) status = "good";
    else if (totalTeams === 0) status = "warning";

    factors.push({
      name: "Pro Sports",
      weight: toPercent(prefs.sportsImportance),
      value: totalTeams,
      unit: " teams",
      score: Math.round(score),
      status,
      explanation: totalTeams >= 5
        ? `${totalTeams} major league teams - major sports market!`
        : totalTeams === 0
        ? "No major league teams."
        : `${totalTeams} major league team(s).`,
    });
  }

  // Recreation (only if weight > 0)
  if (prefs.recreationImportance > 0) {
    const rec = qol?.recreation;
    const hasCoast = rec?.geography?.coastlineWithin15Mi ?? false;
    const coastDist = rec?.geography?.coastlineDistanceMi ?? null;
    const trails = rec?.nature?.trailMilesWithin10Mi ?? null;
    const elevation = rec?.geography?.maxElevationDelta ?? null;

    // Calculate sub-scores matching actual scoring
    let natureScore = 50, beachScore = 50, mountainScore = 50;
    
    if (trails != null) natureScore = Math.min(100, trails / 1.5); // 150 trails = 100
    if (hasCoast) beachScore = 100;
    else if (coastDist != null && coastDist <= 100) beachScore = Math.max(0, 100 - (coastDist - 15) * 1.2);
    else beachScore = 0;
    if (elevation != null) mountainScore = Math.min(100, elevation / 40); // 4000ft = 100
    else mountainScore = 0;
    
    // Weighted average of recreation sub-scores
    const natureWt = prefs.natureWeight ?? 50;
    const beachWt = prefs.beachWeight ?? 50;
    const mountainWt = prefs.mountainWeight ?? 50;
    const recTotal = natureWt + beachWt + mountainWt;
    
    const score = recTotal > 0 
      ? (natureScore * natureWt + beachScore * beachWt + mountainScore * mountainWt) / recTotal
      : 50;

    const features: string[] = [];
    if (hasCoast) features.push("beach access");
    if (trails && trails > 100) features.push(`${trails}mi trails`);
    if (elevation && elevation > 2000) features.push(`${(elevation/1000).toFixed(1)}K ft mountains`);

    let status: FactorAnalysis["status"] = "neutral";
    if (score >= 70) status = "good";
    else if (score < 35) status = "warning";

    factors.push({
      name: "Recreation",
      weight: toPercent(prefs.recreationImportance),
      value: features.length > 0 ? features.join(", ") : "Limited",
      unit: "",
      score: Math.round(score),
      status,
      explanation: features.length > 0
        ? `Outdoor access: ${features.join(", ")}.`
        : "Limited outdoor recreation nearby.",
    });
  }

  const badFactors = factors.filter((f) => f.status === "bad" || f.status === "warning");
  const goodFactors = factors.filter((f) => f.status === "good");
  
  let summary = "";
  if (badFactors.length > 0) {
    summary = `Entertainment gaps: ${badFactors.map((f) => f.name.toLowerCase()).join(", ")}. `;
  }
  if (goodFactors.length > 0) {
    summary += `Entertainment highlights: ${goodFactors.map((f) => f.name.toLowerCase()).join(", ")}.`;
  }
  if (!summary) {
    summary = "Entertainment options are average.";
  }

  return { factors, summary };
}
