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
  category: "climate" | "cost" | "demographics" | "qol" | "cultural";
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
      case "cultural":
        return analyzeCultural(city, preferences);
      default:
        return { factors: [], summary: "" };
    }
  }, [city, preferences, category]);

  const categoryLabels: Record<string, string> = {
    climate: "Climate",
    cost: "Cost of Living",
    demographics: "Demographics",
    qol: "Quality of Life",
    cultural: "Cultural",
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
            <h3 className="font-semibold mb-3">All Factors</h3>
            <div className="space-y-2">
              {analysis.factors.map((factor, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon status={factor.status} />
                    <span className="text-sm">{factor.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {factor.weight}%
                    </Badge>
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
              Adjust Your Preferences
            </h4>
            <p className="text-sm text-muted-foreground">
              If some factors matter less to you, adjust their weights in the Advanced
              Preferences panel. Scores are relative to your personal priorities.
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

  // Recreation (if enabled)
  if (weights.recreation > 0) {
    const rec = qol?.recreation;
    const hasCoast = rec?.geography?.coastlineWithin15Mi ?? false;
    const trails = rec?.nature?.trailMilesWithin10Mi ?? null;
    const elevation = rec?.geography?.maxElevationDelta ?? null;

    let status: FactorAnalysis["status"] = "neutral";
    let explanation = "";
    let score = 50;

    const features: string[] = [];
    if (hasCoast) features.push("coastal access");
    if (trails && trails > 100) features.push(`${trails}mi of trails`);
    if (elevation && elevation > 2000) features.push(`${elevation}ft elevation range`);

    if (features.length >= 2) {
      status = "good";
      explanation = `Great outdoor access: ${features.join(", ")}.`;
      score = 70 + features.length * 10;
    } else if (features.length === 1) {
      explanation = `Has ${features[0]}, but limited other outdoor options.`;
      score = 60;
    } else {
      status = "warning";
      explanation = "Limited outdoor recreation options nearby.";
      score = 30;
    }

    factors.push({
      name: "Recreation/Outdoors",
      weight: Math.round((weights.recreation / totalWeight) * 100),
      value: trails,
      unit: "mi trails",
      score: Math.min(100, Math.max(0, score)),
      status,
      explanation,
    });
  }

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
  const metrics = city.metrics;
  const noaa = metrics?.noaa;
  const prefs = preferences.advanced.climate;

  // Comfort Days
  if (noaa?.comfortDays !== null && noaa?.comfortDays !== undefined) {
    const days = noaa.comfortDays;
    let status: FactorAnalysis["status"] = "neutral";
    let explanation = "";

    if (days >= 200) {
      status = "good";
      explanation = `${days} comfortable days/year is excellent (60-80°F, low humidity).`;
    } else if (days < 100) {
      status = "bad";
      explanation = `Only ${days} comfortable days/year - extreme weather is common.`;
    } else {
      explanation = `${days} comfortable days/year is average.`;
    }

    factors.push({
      name: "Comfort Days",
      weight: 25,
      value: days,
      unit: " days",
      score: Math.min(100, days / 2.5),
      status,
      explanation,
    });
  }

  // Extreme Heat
  if (noaa?.extremeHeatDays !== null && noaa?.extremeHeatDays !== undefined) {
    const days = noaa.extremeHeatDays;
    const maxHeat = prefs.maxExtremeHeatDays;
    let status: FactorAnalysis["status"] = "neutral";

    if (days > maxHeat) {
      status = "bad";
    } else if (days <= 5) {
      status = "good";
    }

    factors.push({
      name: "Extreme Heat Days (>95°F)",
      weight: 15,
      value: days,
      unit: " days",
      threshold: { value: maxHeat, type: "max", label: "Your max" },
      score: Math.max(0, 100 - days * 2),
      status,
      explanation: days > maxHeat 
        ? `${days} extreme heat days exceeds your max of ${maxHeat}.`
        : `${days} extreme heat days is within your tolerance.`,
    });
  }

  // Sunshine
  if (metrics?.daysOfSunshine !== null && metrics?.daysOfSunshine !== undefined) {
    const days = metrics.daysOfSunshine;
    const minSun = prefs.minSunshineDays;
    let status: FactorAnalysis["status"] = "neutral";

    if (days < minSun) {
      status = "bad";
    } else if (days >= 250) {
      status = "good";
    }

    factors.push({
      name: "Days of Sunshine",
      weight: 20,
      value: days,
      unit: " days",
      threshold: minSun > 0 ? { value: minSun, type: "min", label: "Your min" } : undefined,
      score: Math.min(100, days / 3),
      status,
      explanation: days < minSun
        ? `${days} sunny days is below your minimum of ${minSun}.`
        : `${days} sunny days per year.`,
    });
  }

  // Summer Humidity (using July dewpoint as proxy)
  if (noaa?.julyDewpoint !== null && noaa?.julyDewpoint !== undefined) {
    const dewpoint = noaa.julyDewpoint;
    const maxDewpoint = prefs.maxJulyDewpoint;
    let status: FactorAnalysis["status"] = "neutral";

    if (dewpoint > maxDewpoint) {
      status = "bad";
    } else if (dewpoint < 60) {
      status = "good";
    }

    factors.push({
      name: "Summer Humidity (Dewpoint)",
      weight: 15,
      value: dewpoint,
      unit: "°F",
      threshold: { value: maxDewpoint, type: "max", label: "Your max" },
      score: Math.max(0, 100 - (dewpoint - 50) * 2),
      status,
      explanation: dewpoint > maxDewpoint
        ? `July dewpoint of ${dewpoint}°F exceeds your max of ${maxDewpoint}°F (muggy).`
        : dewpoint < 60 
        ? `July dewpoint of ${dewpoint}°F is comfortable and dry.`
        : `July dewpoint of ${dewpoint}°F is moderate.`,
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

  // Housing (RPP)
  if (bea?.regionalPriceParity?.housing != null) {
    const rpp = bea.regionalPriceParity.housing;
    let status: FactorAnalysis["status"] = "neutral";

    if (rpp > 150) {
      status = "bad";
    } else if (rpp < 90) {
      status = "good";
    }

    factors.push({
      name: "Housing Cost Index",
      weight: 40,
      value: rpp.toFixed(0),
      unit: " (100=avg)",
      score: Math.max(0, 150 - rpp),
      status,
      explanation: rpp > 150
        ? `Housing costs ${(rpp - 100).toFixed(0)}% above national average - very expensive.`
        : rpp < 90
        ? `Housing costs ${(100 - rpp).toFixed(0)}% below national average - affordable!`
        : `Housing costs are near national average.`,
    });
  }

  // Overall Cost of Living
  if (bea?.regionalPriceParity?.allItems != null) {
    const rpp = bea.regionalPriceParity.allItems;
    let status: FactorAnalysis["status"] = "neutral";

    if (rpp > 115) {
      status = "bad";
    } else if (rpp < 95) {
      status = "good";
    }

    factors.push({
      name: "Overall Cost Index",
      weight: 30,
      value: rpp.toFixed(0),
      unit: " (100=avg)",
      score: Math.max(0, 130 - rpp),
      status,
      explanation: `Overall cost of living is ${(rpp - 100).toFixed(0)}% ${rpp > 100 ? "above" : "below"} national average.`,
    });
  }

  // Tax Rate
  if (bea?.taxes?.effectiveTaxRate != null) {
    const rate = bea.taxes.effectiveTaxRate;
    let status: FactorAnalysis["status"] = "neutral";

    if (rate > 20) {
      status = "bad";
    } else if (rate < 12) {
      status = "good";
    }

    factors.push({
      name: "Effective Tax Rate",
      weight: 20,
      value: rate.toFixed(1),
      unit: "%",
      score: Math.max(0, 100 - rate * 4),
      status,
      explanation: rate > 20
        ? `${rate.toFixed(1)}% effective tax rate is high.`
        : rate < 12
        ? `${rate.toFixed(1)}% effective tax rate is relatively low.`
        : `${rate.toFixed(1)}% effective tax rate is moderate.`,
    });
  }

  const badFactors = factors.filter((f) => f.status === "bad");
  const goodFactors = factors.filter((f) => f.status === "good");
  
  let summary = "";
  if (badFactors.length > 0) {
    summary = `Cost concerns: ${badFactors.map((f) => f.name.toLowerCase()).join(", ")}. `;
  }
  if (goodFactors.length > 0) {
    summary += `Cost advantages: ${goodFactors.map((f) => f.name.toLowerCase()).join(", ")}.`;
  }
  if (!summary) {
    summary = "Cost of living is average.";
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

  // Population
  if (census?.totalPopulation != null) {
    const pop = census.totalPopulation;
    const minPop = prefs.minPopulation;
    let status: FactorAnalysis["status"] = "neutral";

    if (pop < minPop) {
      status = "bad";
    } else if (pop > 500000) {
      status = "good";
    }

    factors.push({
      name: "Population",
      weight: 25,
      value: (pop / 1000).toFixed(0) + "K",
      threshold: minPop > 0 ? { value: minPop / 1000, type: "min", label: "Min (K)" } : undefined,
      score: Math.min(100, pop / 20000),
      status,
      explanation: pop < minPop
        ? `Population of ${(pop / 1000).toFixed(0)}K is below your minimum of ${(minPop / 1000).toFixed(0)}K.`
        : `Population of ${(pop / 1000000).toFixed(1)}M.`,
    });
  }

  // Diversity
  if (census?.diversityIndex != null) {
    const div = census.diversityIndex;
    const minDiv = prefs.minDiversityIndex;
    let status: FactorAnalysis["status"] = "neutral";

    if (div < minDiv) {
      status = "bad";
    } else if (div >= 70) {
      status = "good";
    }

    factors.push({
      name: "Diversity Index",
      weight: 25,
      value: div,
      unit: "/100",
      threshold: minDiv > 0 ? { value: minDiv, type: "min", label: "Your min" } : undefined,
      score: div,
      status,
      explanation: div < minDiv
        ? `Diversity index of ${div} is below your minimum of ${minDiv}.`
        : `Diversity index of ${div}/100.`,
    });
  }

  // Median Age
  if (census?.medianAge != null) {
    const age = census.medianAge;
    let status: FactorAnalysis["status"] = "neutral";

    factors.push({
      name: "Median Age",
      weight: 15,
      value: age.toFixed(1),
      unit: " years",
      score: 50,
      status,
      explanation: `Median age is ${age.toFixed(1)} years (US avg ~38).`,
    });
  }

  // Education
  if (census?.bachelorsOrHigherPercent != null) {
    const edu = census.bachelorsOrHigherPercent;
    let status: FactorAnalysis["status"] = "neutral";

    if (edu >= 45) {
      status = "good";
    } else if (edu < 25) {
      status = "warning";
    }

    factors.push({
      name: "Bachelor's Degree+",
      weight: 20,
      value: edu.toFixed(0),
      unit: "%",
      score: Math.min(100, edu * 2),
      status,
      explanation: edu >= 45
        ? `${edu.toFixed(0)}% have bachelor's or higher - highly educated.`
        : `${edu.toFixed(0)}% have bachelor's or higher (US avg ~33%).`,
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

    // Pool: Gender Ratio
    if (genderRatio) {
      const ratio = genderRatio.ratio;
      let status: FactorAnalysis["status"] = "neutral";
      let score = 50;
      let explanation = "";
      
      if (seekingGender === "women") {
        // Looking for women: ratio < 100 is favorable (more women)
        score = Math.max(0, Math.min(100, 100 - (ratio - 85) * (100 / 30)));
        if (ratio < 95) {
          status = "good";
          explanation = `Ratio of ${ratio.toFixed(1)} males per 100 females - more women available.`;
        } else if (ratio > 105) {
          status = "bad";
          explanation = `Ratio of ${ratio.toFixed(1)} males per 100 females - fewer women available.`;
        } else {
          explanation = `Gender ratio of ${ratio.toFixed(1)} is near balanced.`;
        }
      } else {
        // Looking for men: ratio > 100 is favorable (more men)
        score = Math.max(0, Math.min(100, (ratio - 85) * (100 / 30)));
        if (ratio > 105) {
          status = "good";
          explanation = `Ratio of ${ratio.toFixed(1)} males per 100 females - more men available.`;
        } else if (ratio < 95) {
          status = "bad";
          explanation = `Ratio of ${ratio.toFixed(1)} males per 100 females - fewer men available.`;
        } else {
          explanation = `Gender ratio of ${ratio.toFixed(1)} is near balanced.`;
        }
      }

      factors.push({
        name: `Dating: Gender Ratio${ageRange ? ` (${ageRange})` : ""}`,
        weight: Math.round(datingWeight * 0.4),
        value: ratio.toFixed(1),
        unit: " M/100F",
        score,
        status,
        explanation,
      });
    }

    // Pool: Never Married %
    const neverMarriedPct = seekingGender === "women" 
      ? census?.neverMarriedFemalePercent
      : census?.neverMarriedMalePercent;
    
    if (neverMarriedPct != null) {
      let status: FactorAnalysis["status"] = "neutral";
      let score = Math.min(100, 30 + neverMarriedPct * 1.5);
      
      if (neverMarriedPct >= 40) {
        status = "good";
      } else if (neverMarriedPct < 25) {
        status = "warning";
      }

      factors.push({
        name: `Dating: ${seekingGender === "women" ? "Single Women" : "Single Men"} %`,
        weight: Math.round(datingWeight * 0.15),
        value: neverMarriedPct.toFixed(0),
        unit: "%",
        score,
        status,
        explanation: neverMarriedPct >= 40
          ? `${neverMarriedPct.toFixed(0)}% never married - large dating pool.`
          : `${neverMarriedPct.toFixed(0)}% never married (15+).`,
      });
    }

    // Economic: Dating Affordability
    if (bea && census?.medianHouseholdIncome) {
      const income = census.medianHouseholdIncome;
      const housingRPP = bea.regionalPriceParity?.housing || 100;
      const estimatedAnnualRent = 16800 * (housingRPP / 100);
      const disposableIncome = income - estimatedAnnualRent;
      const rentToIncomeRatio = estimatedAnnualRent / income;
      
      let status: FactorAnalysis["status"] = "neutral";
      let score = Math.min(100, 20 + (disposableIncome / 1000));
      
      if (rentToIncomeRatio < 0.25) {
        status = "good";
        score += 10;
      } else if (rentToIncomeRatio > 0.35) {
        status = "bad";
        score -= 15;
      }
      score = Math.max(0, Math.min(100, score));

      factors.push({
        name: "Dating: Affordability",
        weight: Math.round(datingWeight * 0.3),
        value: `$${(disposableIncome / 1000).toFixed(0)}K`,
        unit: "/yr",
        score,
        status,
        explanation: rentToIncomeRatio < 0.25
          ? `${(rentToIncomeRatio * 100).toFixed(0)}% rent burden - affordable for dating.`
          : rentToIncomeRatio > 0.35
          ? `${(rentToIncomeRatio * 100).toFixed(0)}% rent burden - limited disposable income.`
          : `${(rentToIncomeRatio * 100).toFixed(0)}% rent burden - moderate dating budget.`,
      });
    }

    // Walk Score for dating
    if (qol?.walkability?.walkScore != null) {
      const ws = qol.walkability.walkScore;
      let status: FactorAnalysis["status"] = "neutral";
      let score = ws >= 70 ? Math.min(100, 60 + ws * 0.5) 
                : ws >= 50 ? 50 + (ws - 50) * 0.5
                : Math.max(20, ws);
      
      if (ws >= 70) {
        status = "good";
      } else if (ws < 40) {
        status = "warning";
      }

      factors.push({
        name: "Dating: Walkability",
        weight: Math.round(datingWeight * 0.1),
        value: ws,
        unit: "",
        score,
        status,
        explanation: ws >= 70
          ? `Walk Score® ${ws} - great for meeting people organically.`
          : ws < 40
          ? `Walk Score® ${ws} - car-dependent, harder to meet casually.`
          : `Walk Score® ${ws} - moderate walkability.`,
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

function analyzeCultural(
  city: CityWithMetrics,
  preferences: UserPreferences
): { factors: FactorAnalysis[]; summary: string } {
  const factors: FactorAnalysis[] = [];
  const cultural = city.metrics?.cultural;
  const prefs = preferences.advanced.cultural;

  // Political Alignment
  if (cultural?.political?.partisanIndex != null) {
    const pi = cultural.political.partisanIndex;
    const demPct = cultural.political.democratPercent;
    const prefAlign = prefs.partisanPreference;
    
    let status: FactorAnalysis["status"] = "neutral";
    let explanation = "";

    if (prefAlign !== "neutral") {
      const wantsDem = prefAlign.includes("dem");
      const cityDem = pi > 0;
      
      if ((wantsDem && cityDem) || (!wantsDem && !cityDem)) {
        status = "good";
        explanation = `City aligns with your ${wantsDem ? "Democratic" : "Republican"} preference.`;
      } else {
        status = "warning";
        explanation = `City leans ${cityDem ? "Democratic" : "Republican"}, opposite your preference.`;
      }
    } else {
      explanation = `${demPct?.toFixed(0) || "??"}% Democratic lean. Partisan index: ${pi.toFixed(2)}.`;
    }

    factors.push({
      name: "Political Alignment",
      weight: prefs.partisanWeight > 0 ? 30 : 0,
      value: demPct?.toFixed(0) || null,
      unit: "% Dem",
      score: prefAlign === "neutral" ? 50 : (status === "good" ? 80 : 30),
      status,
      explanation,
    });
  }

  // Urban Lifestyle
  if (cultural?.urbanLifestyle) {
    const ul = cultural.urbanLifestyle;
    const bars = ul.nightlife?.barsAndClubsPer10K ?? null;
    const museums = ul.arts?.museums ?? null;
    const restaurants = ul.dining?.restaurantsPer10K ?? null;

    let score = 50;
    let status: FactorAnalysis["status"] = "neutral";
    const features: string[] = [];

    if (bars && bars > 3) features.push(`${bars.toFixed(1)} bars/10K`);
    if (museums && museums > 10) features.push(`${museums} museums`);
    if (restaurants && restaurants > 50) features.push(`${restaurants.toFixed(0)} restaurants/10K`);

    if (features.length >= 2) {
      status = "good";
      score = 75;
    } else if (features.length === 0 && (bars || museums || restaurants)) {
      status = "warning";
      score = 35;
    }

    factors.push({
      name: "Urban Lifestyle",
      weight: prefs.urbanLifestyleWeight > 0 ? 40 : 0,
      value: museums,
      unit: " museums",
      score,
      status,
      explanation: features.length > 0
        ? `Urban amenities: ${features.join(", ")}.`
        : "Limited urban entertainment options.",
    });
  }

  const badFactors = factors.filter((f) => f.status === "bad");
  const goodFactors = factors.filter((f) => f.status === "good");
  
  let summary = "";
  if (badFactors.length > 0) {
    summary = `Cultural mismatches: ${badFactors.map((f) => f.name.toLowerCase()).join(", ")}. `;
  }
  if (goodFactors.length > 0) {
    summary += `Cultural fits: ${goodFactors.map((f) => f.name.toLowerCase()).join(", ")}.`;
  }
  if (!summary) {
    summary = "Cultural factors are neutral for your preferences.";
  }

  return { factors, summary };
}
