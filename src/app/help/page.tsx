"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Calculator,
  Sliders,
  Filter,
  Scale,
  Sun,
  Home,
  Users,
  Activity,
  HelpCircle,
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Rankings
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <HelpCircle className="h-8 w-8" />
            How Rankings Work
          </h1>
          <p className="text-muted-foreground mt-2">
            Understanding the scoring system and how your preferences affect city rankings
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Scoring Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-slate dark:prose-invert max-w-none">
          <p>
            Each city receives a <strong>total score from 0-100</strong> based on four categories:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 not-prose">
            <ScoreCard icon={<Sun className="h-5 w-5 text-amber-500" />} title="Climate" />
            <ScoreCard icon={<Home className="h-5 w-5 text-emerald-500" />} title="Cost of Living" />
            <ScoreCard icon={<Users className="h-5 w-5 text-violet-500" />} title="Demographics" />
            <ScoreCard icon={<Activity className="h-5 w-5 text-rose-500" />} title="Quality of Life" />
          </div>
          <p>
            Your <strong>category weights</strong> determine how much each category contributes to the final score.
            The formula is:
          </p>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm my-4">
            Total Score = (Climate × W₁ + Cost × W₂ + Demographics × W₃ + QoL × W₄) / (W₁ + W₂ + W₃ + W₄)
          </div>
          <p className="text-sm text-muted-foreground">
            Where W₁, W₂, W₃, W₄ are your weight settings (0-100 each).
          </p>
        </CardContent>
      </Card>

      {/* Detailed Formulas */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            Category Scoring Formulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* Climate */}
            <AccordionItem value="climate">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  Climate Score
                </span>
              </AccordionTrigger>
              <AccordionContent className="prose prose-slate dark:prose-invert max-w-none text-sm">
                <p>Starts at 100 points, with penalties and bonuses based on your preferences:</p>
                
                <h4>Temperature Penalty</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  penalty = |actual_temp - ideal_temp| × 2
                </div>
                <p>Lose 2 points for every degree away from your ideal temperature.</p>

                <h4>Summer Heat Penalty</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if summer_temp &gt; max_summer: penalty = (summer_temp - max_summer) × 3
                </div>
                <p>Lose 3 points for every degree above your maximum summer temperature.</p>

                <h4>Winter Cold Penalty</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if winter_temp &lt; min_winter: penalty = (min_winter - winter_temp) × 3
                </div>
                <p>Lose 3 points for every degree below your minimum winter temperature.</p>

                <h4>Sunshine Bonus/Penalty</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if sunny_days ≥ min_sunshine: bonus = +10{"\n"}
                  else: penalty = ((min_sunshine - sunny_days) / min_sunshine) × 20
                </div>

                <h4>Rain Penalty</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if rainy_days &gt; max_rain: penalty = ((rainy_days - max_rain) / max_rain) × 15
                </div>

                <p className="text-muted-foreground">Final score is clamped between 0 and 100.</p>
              </AccordionContent>
            </AccordionItem>

            {/* Cost of Living */}
            <AccordionItem value="cost">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-emerald-500" />
                  Cost of Living Score
                </span>
              </AccordionTrigger>
              <AccordionContent className="prose prose-slate dark:prose-invert max-w-none text-sm">
                <p>
                  Uses <strong>True Purchasing Power</strong> from the Bureau of Economic Analysis (BEA), 
                  which combines taxes and regional prices into a single measure of what your income can actually buy.
                </p>

                <h4>True Purchasing Power Formula</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  True Purchasing Power = Disposable Income ÷ (RPP ÷ 100)
                </div>
                <p>Where:</p>
                <ul className="text-xs">
                  <li><strong>Disposable Income</strong> = Gross Income - All Taxes (federal + state + local)</li>
                  <li><strong>RPP</strong> = Regional Price Parity (100 = national average cost of living)</li>
                </ul>

                <h4>What&apos;s Included</h4>
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Factor</th>
                      <th className="text-left">Captured Via</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Rent / Housing</td><td>RPP (primary factor)</td></tr>
                    <tr><td>Groceries / Goods</td><td>RPP</td></tr>
                    <tr><td>Sales Tax</td><td>RPP (in retail prices)</td></tr>
                    <tr><td>State Income Tax</td><td>Disposable Income</td></tr>
                    <tr><td>Federal Income Tax</td><td>Disposable Income</td></tr>
                    <tr><td>Local Taxes</td><td>Disposable Income</td></tr>
                  </tbody>
                </table>

                <h4>Scoring</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Purchasing Power Index: 100 = national average{"\n"}
                  {"\n"}
                  Score mapping:{"\n"}
                  {"  "}Index 70 → Score 0 (very poor value){"\n"}
                  {"  "}Index 100 → Score 50 (average){"\n"}
                  {"  "}Index 130 → Score 100 (excellent value)
                </div>
                <p className="text-muted-foreground">
                  Data source: Bureau of Economic Analysis (BEA) Regional Price Parities and Personal Income tables.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Demographics */}
            <AccordionItem value="demographics">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  Demographics Score
                </span>
              </AccordionTrigger>
              <AccordionContent className="prose prose-slate dark:prose-invert max-w-none text-sm">
                <p>Starts at 100 points with adjustments based on your preferences:</p>

                <h4>Population Check</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if population &lt; min_population: penalty = -30
                </div>
                <p>Cities below your minimum population threshold lose 30 points.</p>

                <h4>Diversity Index</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if diversity ≥ min_diversity:{"\n"}
                  {"  "}bonus = min(10, (diversity - min_diversity) / 5){"\n"}
                  else:{"\n"}
                  {"  "}penalty = (min_diversity - diversity) × 2
                </div>
                <p>Bonus for exceeding your diversity threshold, penalty for falling short.</p>

                <h4>East Asian Population (Optional)</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if target_east_asian &gt; 0:{"\n"}
                  {"  "}penalty = |actual_percent - target_percent| × 2
                </div>
                <p className="text-muted-foreground">
                  Only applies if you set a target East Asian population percentage.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Quality of Life */}
            <AccordionItem value="qol">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-500" />
                  Quality of Life Score
                </span>
              </AccordionTrigger>
              <AccordionContent className="prose prose-slate dark:prose-invert max-w-none text-sm">
                <p>Starts at 70 points (baseline) with various adjustments:</p>

                <h4>Walk Score</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if walk_score ≥ min_walk: bonus = (walk_score - min_walk) / 10{"\n"}
                  else: penalty = (min_walk - walk_score) / 5
                </div>

                <h4>Transit Score</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if transit_score ≥ min_transit: bonus = (transit_score - min_transit) / 10{"\n"}
                  else: penalty = (min_transit - transit_score) / 5
                </div>

                <h4>Crime Rate</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if crime_rate ≤ max_crime: bonus = +10{"\n"}
                  else: penalty = ((crime_rate - max_crime) / max_crime) × 20
                </div>

                <h4>International Airport</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  if requires_airport AND no_airport: penalty = -15
                </div>

                <h4>Environmental Factors</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  pollution_adjustment = (pollution_index - 40) / 4{"\n"}
                  water_adjustment = (water_quality - 70) / 4
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Hard Filters (Exclusions)
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-slate dark:prose-invert max-w-none">
          <p>
            Some preferences act as <strong>hard filters</strong> that exclude cities entirely
            (shown with strikethrough in the rankings):
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Filter</th>
                <th className="text-left">Exclusion Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Requires NFL Team</td>
                <td>City has no NFL team</td>
              </tr>
              <tr>
                <td>Requires NBA Team</td>
                <td>City has no NBA team</td>
              </tr>
              <tr>
                <td>Requires Int'l Airport</td>
                <td>City has no major international airport</td>
              </tr>
              <tr>
                <td>Max Home Price</td>
                <td>Median home price exceeds your budget</td>
              </tr>
            </tbody>
          </table>
          <p className="text-muted-foreground text-sm mt-4">
            Excluded cities appear at the bottom of the rankings with their exclusion reason shown.
          </p>
        </CardContent>
      </Card>

      {/* Preference Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Tips for Setting Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-slate dark:prose-invert max-w-none">
          <ul>
            <li>
              <strong>Category weights are relative:</strong> Setting Climate to 80 and Cost to 40 
              means climate is twice as important as cost. The actual numbers don&apos;t matter, 
              only their ratios.
            </li>
            <li>
              <strong>Set weight to 0 to ignore a category:</strong> If you don&apos;t care about 
              demographics at all, set its weight to 0.
            </li>
            <li>
              <strong>Use filters sparingly:</strong> Hard filters (max price, requires NFL/NBA) 
              completely exclude cities. Use the scoring system for softer preferences.
            </li>
            <li>
              <strong>Cost of Living uses official BEA data:</strong> The cost score automatically 
              accounts for taxes, housing, and regional prices using government data. No manual 
              configuration needed.
            </li>
            <li>
              <strong>Advanced options fine-tune scores:</strong> The advanced settings let you 
              adjust how climate, demographics, and quality of life metrics are evaluated.
            </li>
            <li>
              <strong>Export your preferences:</strong> Once you have settings you like, export 
              them as JSON to save or share with others.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          All scoring happens in your browser. Your preferences are stored locally and never sent to a server.
        </p>
      </div>
    </div>
  );
}

function ScoreCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-sm font-medium">{title}</div>
    </div>
  );
}
