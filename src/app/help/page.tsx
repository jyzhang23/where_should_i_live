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
                <p>
                  Uses data from <strong>NOAA ACIS</strong> (30-year normals 1991-2020) and 
                  <strong> Open-Meteo</strong> (2014-2023 averages) with weighted scoring across 
                  11 factors. Each factor has an importance weight (0-100%) that you control.
                </p>

                <h4>How Weighted Scoring Works</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Climate Score = Σ(Factor Score × Weight) / Σ(Weights)
                </div>
                <p className="text-xs text-muted-foreground">
                  Only factors with weight &gt; 0 are included. Set weight to 0 to ignore a factor.
                </p>

                <h4>Climate Factors</h4>
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Factor</th>
                      <th className="text-left">Source</th>
                      <th className="text-left">What It Measures</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Comfort Days</strong></td>
                      <td>ACIS</td>
                      <td>Days with max temp 65-80°F (&quot;T-shirt weather&quot;)</td>
                    </tr>
                    <tr>
                      <td><strong>Extreme Heat</strong></td>
                      <td>ACIS</td>
                      <td>Days with max temp &gt;95°F</td>
                    </tr>
                    <tr>
                      <td><strong>Freeze Days</strong></td>
                      <td>ACIS</td>
                      <td>Days with min temp &lt;32°F</td>
                    </tr>
                    <tr>
                      <td><strong>Rain Days</strong></td>
                      <td>ACIS</td>
                      <td>Days with any precipitation</td>
                    </tr>
                    <tr>
                      <td><strong>Snow Days</strong></td>
                      <td>ACIS</td>
                      <td>Days with snowfall &gt;1 inch</td>
                    </tr>
                    <tr>
                      <td><strong>Cloudy Days</strong></td>
                      <td>Open-Meteo</td>
                      <td>Days with &gt;75% cloud cover (gloom factor)</td>
                    </tr>
                    <tr>
                      <td><strong>Humidity</strong></td>
                      <td>Open-Meteo</td>
                      <td>July dewpoint (65°F+ = muggy, 72°F+ = oppressive)</td>
                    </tr>
                    <tr>
                      <td><strong>Utility Costs</strong></td>
                      <td>ACIS</td>
                      <td>CDD + HDD (heating/cooling degree days)</td>
                    </tr>
                    <tr>
                      <td><strong>Growing Season</strong></td>
                      <td>ACIS</td>
                      <td>Days between last spring and first fall freeze</td>
                    </tr>
                    <tr>
                      <td><strong>Seasonal Stability</strong></td>
                      <td>ACIS</td>
                      <td>StdDev of monthly temps (lower = &quot;perpetual spring&quot;)</td>
                    </tr>
                    <tr>
                      <td><strong>Daily Swing</strong></td>
                      <td>ACIS</td>
                      <td>Avg day/night temp range</td>
                    </tr>
                  </tbody>
                </table>

                <h4>Example Cities</h4>
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-left">City</th>
                      <th className="text-right">Comfort</th>
                      <th className="text-right">Snow</th>
                      <th className="text-right">Cloudy</th>
                      <th className="text-right">July Dewpt</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>San Diego</td><td className="text-right">267</td><td className="text-right">0</td><td className="text-right">~80</td><td className="text-right">~62°F</td></tr>
                    <tr><td>Phoenix</td><td className="text-right">89</td><td className="text-right">0</td><td className="text-right">~80</td><td className="text-right">~55°F</td></tr>
                    <tr><td>Seattle</td><td className="text-right">95</td><td className="text-right">5</td><td className="text-right">~200</td><td className="text-right">~55°F</td></tr>
                    <tr><td>Minneapolis</td><td className="text-right">89</td><td className="text-right">40+</td><td className="text-right">~160</td><td className="text-right">~65°F</td></tr>
                    <tr><td>Miami</td><td className="text-right">120</td><td className="text-right">0</td><td className="text-right">~120</td><td className="text-right">~75°F</td></tr>
                  </tbody>
                </table>

                <p className="text-muted-foreground text-xs">
                  Data sources: NOAA ACIS (data.rcc-acis.org) for temperature, precipitation, snow, 
                  and degree days. Open-Meteo (open-meteo.com) for cloud cover and dewpoint.
                </p>
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
                  adjusted based on your housing situation. The core formula is:
                </p>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  True Purchasing Power = Disposable Income ÷ (Adjusted RPP ÷ 100)
                </div>
                <p className="text-xs mt-2">
                  Where <strong>Disposable Income</strong> = Gross Income − All Taxes (federal + state + local),
                  and <strong>Adjusted RPP</strong> varies by your housing situation.
                </p>

                <h4>1. Renter</h4>
                <p className="text-xs">
                  The standard BEA RPP is most accurate for renters, as it&apos;s heavily weighted by 
                  American Community Survey rental data.
                </p>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Adjusted RPP = RPP All Items{"\n"}
                  {"\n"}
                  If &quot;Include Utilities&quot; is enabled:{"\n"}
                  {"  "}Adjusted RPP += (Utilities Index − 100) × 0.05
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Renters in older cities (Boston, Philly) often have higher utility costs 
                  not captured in base rent prices.
                </p>

                <h4>2. Homeowner (Fixed Mortgage)</h4>
                <p className="text-xs">
                  If you already own with a fixed-rate mortgage, housing costs are locked in and 
                  irrelevant. You only care about goods and services prices.
                </p>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Adjusted RPP = (0.70 × Goods Index) + (0.30 × Services Index)
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 This excludes housing entirely since your &quot;rent&quot; (mortgage) doesn&apos;t 
                  change based on local market conditions.
                </p>

                <h4>3. Prospective Buyer</h4>
                <p className="text-xs">
                  BEA data is &quot;lagged&quot; — it reflects homeowners locked into 3% mortgages from years ago. 
                  For buyers facing 7%+ rates in 2026, we swap BEA housing data for actual market prices.
                </p>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Monthly Mortgage = calculate(Home Price × 0.80, 7%, 30 years){"\n"}
                  Housing Index = (Monthly Mortgage ÷ $2,128) × 100{"\n"}
                  {"\n"}
                  Adjusted RPP = (0.40 × Housing Index){"\n"}
                  {"             "}+ (0.35 × Goods Index){"\n"}
                  {"             "}+ (0.25 × Services Index)
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 $2,128 is the national average monthly mortgage payment (2026 estimate based on 
                  ~$400K median home at 7%). Uses Zillow median home prices for each city.
                </p>

                <h4>What&apos;s Included Where</h4>
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Factor</th>
                      <th className="text-left">In RPP?</th>
                      <th className="text-left">In Taxes?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Rent / Housing</td><td>✓ Primary</td><td>—</td></tr>
                    <tr><td>Groceries / Goods</td><td>✓</td><td>—</td></tr>
                    <tr><td>Sales Tax</td><td>✓ (in prices)</td><td>—</td></tr>
                    <tr><td>State Income Tax</td><td>—</td><td>✓</td></tr>
                    <tr><td>Federal Income Tax</td><td>—</td><td>✓</td></tr>
                    <tr><td>Property Tax</td><td>—</td><td>✓</td></tr>
                    <tr><td>Utilities</td><td>✓ (optional)</td><td>—</td></tr>
                  </tbody>
                </table>

                <h4>Final Scoring</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Purchasing Power Index = (True PP ÷ $56,014) × 100{"\n"}
                  {"  "}where $56,014 = national avg disposable income{"\n"}
                  {"\n"}
                  Cost Score = ((Index − 70) ÷ 60) × 100{"\n"}
                  {"  "}Index 70 → Score 0 (very poor){"\n"}
                  {"  "}Index 100 → Score 50 (average){"\n"}
                  {"  "}Index 130 → Score 100 (excellent)
                </div>
                <p className="text-muted-foreground text-xs">
                  Data sources: BEA Regional Price Parities (MARPP), Personal Income (SAINC50), Zillow ZHVI.
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
