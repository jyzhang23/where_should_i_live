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
  Church,
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
            Each city receives a <strong>total score from 0-100</strong> based on five categories:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 my-6 not-prose">
            <ScoreCard icon={<Sun className="h-5 w-5 text-orange-500" />} title="Climate" />
            <ScoreCard icon={<Home className="h-5 w-5 text-green-500" />} title="Cost of Living" />
            <ScoreCard icon={<Users className="h-5 w-5 text-blue-500" />} title="Demographics" />
            <ScoreCard icon={<Activity className="h-5 w-5 text-red-500" />} title="Quality of Life" />
            <ScoreCard icon={<Church className="h-5 w-5 text-purple-500" />} title="Cultural" />
          </div>
          <p>
            Your <strong>category weights</strong> determine how much each category contributes to the final score.
            The formula is:
          </p>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm my-4">
            Total Score = (Climate × W₁ + Cost × W₂ + Demographics × W₃ + QoL × W₄ + Cultural × W₅) / (W₁ + W₂ + W₃ + W₄ + W₅)
          </div>
          <p className="text-sm text-muted-foreground">
            Where W₁–W₅ are your weight settings (0-100 each). Cultural is off by default (W₅=0).
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
                  <Sun className="h-4 w-4 text-orange-500" />
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
                  <Home className="h-4 w-4 text-green-500" />
                  Cost of Living Score
                </span>
              </AccordionTrigger>
              <AccordionContent className="prose prose-slate dark:prose-invert max-w-none text-sm">
                <p>
                  Uses <strong>True Purchasing Power</strong> with dual persona adjustments: your 
                  <strong> housing situation</strong> affects the cost index (denominator), while your 
                  <strong> work situation</strong> affects the income used (numerator).
                </p>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  True Purchasing Power = Selected Income ÷ (Adjusted RPP ÷ 100)
                </div>
                <p className="text-xs mt-2">
                  Where <strong>Selected Income</strong> varies by your work situation (Standard, High-Earner, Retiree),
                  and <strong>Adjusted RPP</strong> varies by your housing situation (Renter, Homeowner, Buyer).
                </p>
                
                <h4>Housing Situation (Cost Denominator)</h4>

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
                  Raw Housing Index = (Monthly Mortgage ÷ $2,128) × 100{"\n"}
                  {"\n"}
                  // Logarithmic compression for expensive markets:{"\n"}
                  If Raw Index &gt; 150: Housing Index = 150 + log₁₀(1 + excess/50) × 50{"\n"}
                  {"\n"}
                  Adjusted RPP = (0.35 × Housing Index){"\n"}
                  {"             "}+ (0.35 × Goods Index){"\n"}
                  {"             "}+ (0.30 × Services Index)
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 The logarithmic compression prevents extremely expensive cities (SF, NYC) from 
                  getting scores of 0. A city with 3× national average mortgage gets a housing index 
                  of ~180 instead of 300, acknowledging it&apos;s expensive without being absurdly punitive.
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

                <h4>Work Situation (Income Source)</h4>
                <p className="text-xs">
                  Choose how income is factored into purchasing power:
                </p>
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Persona</th>
                      <th className="text-left">Income Source</th>
                      <th className="text-left">Best For</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Local Earner (default)</td>
                      <td>Local Per Capita Income (BEA)</td>
                      <td>&quot;How do local workers fare?&quot;</td>
                    </tr>
                    <tr>
                      <td>Standard / Moving</td>
                      <td>Fixed national median (~$75K)</td>
                      <td>&quot;Where can I afford to move?&quot;</td>
                    </tr>
                    <tr>
                      <td>Retiree / Fixed Income</td>
                      <td>Your specified amount</td>
                      <td>&quot;Where can I retire affordably?&quot;</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Local Earner</strong> (default) uses local income levels, so expensive cities 
                  with high salaries score better. <strong>Standard</strong> and <strong>Retiree</strong> use 
                  state-specific tax calculations so no-income-tax states (TX, FL, WA) score higher.
                </p>

                <h4>State-Specific Tax Calculation</h4>
                <p className="text-xs">
                  For <strong>Standard</strong> and <strong>Retiree</strong> personas, we calculate actual 
                  after-tax income using state-specific rates:
                </p>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  After-Tax Income = Gross Income × (1 − Effective Tax Rate){"\n"}
                  {"\n"}
                  Effective Tax Rate = Federal Rate + State Rate{"\n"}
                  {"\n"}
                  Example ($50K Retiree):{"\n"}
                  {"  "}Texas (0% state): ~$42,500 after tax{"\n"}
                  {"  "}California (9.3% state): ~$37,000 after tax{"\n"}
                  {"  "}→ Texas retiree keeps ~$5,500 more per year
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 No-income-tax states: Alaska, Florida, Nevada, New Hampshire, South Dakota, 
                  Tennessee, Texas, Washington, Wyoming. These score significantly better for 
                  retirees and those with fixed incomes.
                </p>

                <h4>Property Tax (Homeowners Only)</h4>
                <p className="text-xs">
                  For <strong>existing homeowners</strong>, we subtract estimated annual property tax from 
                  after-tax income. This reflects the ongoing cost burden of homeownership.
                </p>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Property Tax = Estimated Home Value × Local Property Tax Rate{"\n"}
                  {"\n"}
                  // Home value estimated at 60% of current median{"\n"}
                  // (accounts for historical purchase price, Prop 13-style caps){"\n"}
                  {"\n"}
                  Disposable = After-Tax Income − Annual Property Tax
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Prospective buyers</strong> don&apos;t have property tax deducted separately 
                  because it&apos;s already reflected in the mortgage-adjusted RPP calculation.
                </p>

                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Formula by Persona:{"\n"}
                  {"\n"}
                  Local Earner: Local Disposable Income ÷ (local RPP ÷ 100){"\n"}
                  {"  "}→ How well local workers fare (default){"\n"}
                  {"\n"}
                  Standard: (Fixed Income − State Tax − Property Tax*) ÷ RPP{"\n"}
                  {"  "}→ Pure cost comparison with real tax impact{"\n"}
                  {"\n"}
                  Retiree: (Your Income − State Tax − Property Tax*) ÷ RPP{"\n"}
                  {"  "}→ How far your retirement income goes{"\n"}
                  {"\n"}
                  * Property tax only for homeowners, not renters/buyers
                </div>

                <h4>Final Scoring</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Purchasing Power Index = (Your Purchasing Power ÷ Baseline) × 100{"\n"}
                  {"\n"}
                  Baseline varies by persona:{"\n"}
                  {"  "}Local Earner: $56,014 (national avg disposable){"\n"}
                  {"  "}Standard/Retiree: Same income with avg state taxes{"\n"}
                  {"\n"}
                  Cost Score = 50 + (Index − 100) × 0.75{"\n"}
                  {"  "}Index 60 → Score 20 (very expensive){"\n"}
                  {"  "}Index 80 → Score 35 (expensive){"\n"}
                  {"  "}Index 100 → Score 50 (national average){"\n"}
                  {"  "}Index 120 → Score 65 (affordable){"\n"}
                  {"  "}Index 140 → Score 80 (very affordable)
                </div>
                <p className="text-muted-foreground text-xs">
                  Data sources: BEA Regional Price Parities (MARPP), Personal Income (SAINC50), 
                  Zillow ZHVI, State income tax rates (2024).
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Demographics */}
            <AccordionItem value="demographics">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Demographics Score
                </span>
              </AccordionTrigger>
              <AccordionContent className="prose prose-slate dark:prose-invert max-w-none text-sm">
                <p>
                  Demographics scoring uses <strong>U.S. Census Bureau American Community Survey (ACS)</strong> data 
                  to provide accurate population, diversity, education, income, and ethnic composition metrics.
                </p>

                <h4>Data Source</h4>
                <p>
                  Data is pulled from the ACS 5-Year Estimates, which provides reliable statistics for all cities 
                  regardless of population size. The data includes detailed breakdowns for race/ethnicity (including 
                  Hispanic and Asian subgroups), educational attainment, income, poverty rates, and household composition.
                </p>

                <h4>Weighted Scoring System</h4>
                <p>
                  Each demographic factor has its own importance weight (0-100%). The final score is calculated 
                  as a weighted average of all enabled factors:
                </p>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Final Score = Σ(Factor Score × Factor Weight) / Σ(Weights)
                </div>

                <h4>Factor Scores</h4>
                <ul className="space-y-2">
                  <li>
                    <strong>Population:</strong> Hard filter. Cities below your minimum are scored at 30 (significant penalty).
                  </li>
                  <li>
                    <strong>Diversity Index:</strong> Simpson&apos;s Diversity Index (0-100). Score scales with diversity level; 
                    70+ diversity ≈ 100 points. NYC: 77, Salt Lake: 35.
                  </li>
                  <li>
                    <strong>Age Demographics:</strong> Matches city median age to your preference. 
                    Young (&lt;35) = college towns, Mixed (35-45) = family hubs, Mature (&gt;45) = retirement areas.
                  </li>
                  <li>
                    <strong>Education:</strong> % with Bachelor&apos;s degree or higher (25+ population). 
                    Score scales: 20% ≈ 40 pts, 40% ≈ 80 pts, 60%+ ≈ 100 pts.
                  </li>
                  <li>
                    <strong>Foreign-Born:</strong> % born outside US. Proxy for international food, culture, 
                    and immigrant communities. Miami: 40%, Memphis: 5%.
                  </li>
                  <li>
                    <strong>Economic Health:</strong> Combined score of median household income and poverty rate. 
                    Higher income and lower poverty = higher score.
                  </li>
                </ul>

                <h4>Minority Community</h4>
                <p>
                  If you select a minority group (Hispanic, Black, Asian, Pacific Islander, or Native American), 
                  you can specify a <strong>minimum presence</strong> threshold. This helps find cities with enough 
                  community presence for cultural infrastructure (grocery stores, restaurants, religious institutions).
                </p>
                <p>
                  <strong>Subgroups</strong> are currently available for Hispanic and Asian communities only:
                </p>
                <ul className="text-xs">
                  <li><strong>Hispanic:</strong> Mexican, Puerto Rican, Cuban, Salvadoran, Guatemalan, Colombian</li>
                  <li><strong>Asian:</strong> Chinese, Indian, Filipino, Vietnamese, Korean, Japanese</li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Black, Pacific Islander, and Native American use aggregate group percentages (no subgroups).
                </p>
                
                <h4>Minority Community Scoring</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs overflow-x-auto">
                  if (cityPercent &gt;= minPresence):{"\n"}
                  {"  "}score = 70 + (cityPercent - minPresence) × 2{"\n"}
                  {"  "}(capped at 100){"\n"}
                  else:{"\n"}
                  {"  "}score = 70 - (minPresence - cityPercent) × 5{"\n"}
                  {"  "}(min 0)
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: Min presence 5%, city has 12% → 70 + (12-5)×2 = 84 points<br/>
                  Example: Min presence 10%, city has 3% → 70 - (10-3)×5 = 35 points
                </p>

                <h4>Example Calculation</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs overflow-x-auto">
                  Diversity: score=85, weight=25{"\n"}
                  Education: score=70, weight=25{"\n"}
                  Economic: score=60, weight=25{"\n"}
                  Minority (Asian, min 5%): score=84, weight=50{"\n"}
                  {"\n"}
                  Final = (85×25 + 70×25 + 60×25 + 84×50) / (25+25+25+50){"\n"}
                  Final = 9575 / 125 = 76.6
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Quality of Life */}
            <AccordionItem value="qol">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-red-500" />
                  Quality of Life Score
                </span>
              </AccordionTrigger>
              <AccordionContent className="prose prose-slate dark:prose-invert max-w-none text-sm">
                <p>QoL uses data from 6 APIs with user-configurable weights (default sum to 100%):</p>

                <h4>Data Sources</h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left">Category</th>
                      <th className="text-left">Source</th>
                      <th className="text-left">Default Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Walkability</td><td>EPA Walkability Index + Walk Score (manual)</td><td>20%</td></tr>
                    <tr><td>Safety</td><td>FBI Crime Data Explorer</td><td>25%</td></tr>
                    <tr><td>Air Quality</td><td>EPA AQS</td><td>15%</td></tr>
                    <tr><td>Internet</td><td>FCC Broadband Map</td><td>10%</td></tr>
                    <tr><td>Schools</td><td>NCES Education</td><td>15%</td></tr>
                    <tr><td>Healthcare</td><td>HRSA</td><td>15%</td></tr>
                  </tbody>
                </table>

                <h4>Walkability &amp; Transit Scores</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Walk Score: EPA NatWalkInd (1-20) → 0-100 scale{"\n"}
                  Bike Score: EPA street density (D3B) normalized{"\n"}
                  Transit Score: Manual data from walkscore.com (Jan 2025)
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Walk/Bike:</strong> From EPA National Walkability Index API (based on intersection density, land use mix).{" "}
                  <strong>Transit:</strong> Manually researched from walkscore.com — EPA transit metrics (D4A, D4C, D5BR) 
                  proved too noisy at metro scale for reliable national comparisons.
                </p>

                <h4>Safety (FBI Crime Data)</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  base_score = 100 - ((violent_crime - 100) / 7){"\n"}
                  Bonus +10 if 3-year trend is &quot;falling&quot;{"\n"}
                  Penalty if exceeds max threshold
                </div>
                <p className="text-xs text-muted-foreground">National avg violent crime rate: ~380 per 100K. Lower is better.</p>

                <h4>Air Quality (EPA AQS)</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  score = healthy_days_percent{"\n"}
                  Penalty for hazardous days exceeding max
                </div>
                <p className="text-xs text-muted-foreground">AQI &lt; 50 = good, &gt; 100 = unhealthy. Important for respiratory health.</p>

                <h4>Internet (FCC Broadband)</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  score = fiber_coverage_percent{"\n"}
                  Bonus for provider competition (multiple ISPs){"\n"}
                  Penalty if fiber required but unavailable
                </div>
                <p className="text-xs text-muted-foreground">More providers = better prices and service quality.</p>

                <h4>Schools (NCES Education)</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  ratio_score = 100 - ((student_teacher_ratio - 10) / 15) × 100{"\n"}
                  final_score = (ratio_score + graduation_rate) / 2
                </div>
                <p className="text-xs text-muted-foreground">Lower student-teacher ratio = more individual attention. National avg: ~16:1.</p>

                <h4>Healthcare (HRSA)</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  score = (physicians_per_100k / 150) × 100{"\n"}
                  Penalty for HPSA (shortage area) score
                </div>
                <p className="text-xs text-muted-foreground">HPSA 0 = no shortage, 25+ = severe shortage. National avg: ~75 physicians/100K.</p>

                <h4>Recreation & Outdoor Access (NEW)</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Measures access to outdoor recreation amenities. Off by default - enable in Advanced Options.
                </p>
                <ul className="text-xs space-y-1">
                  <li><strong>Nature Score:</strong> Parks, trails, protected lands (percentile ranking)</li>
                  <li><strong>Beach Score:</strong> 100 if coast within 15mi, distance decay for further</li>
                  <li><strong>Mountain Score:</strong> Elevation prominence within 30mi (0-4000ft range)</li>
                </ul>
                <div className="bg-muted p-3 rounded font-mono text-xs mt-2">
                  Recreation = (nature × w1 + beach × w2 + mountain × w3) / (w1 + w2 + w3)
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Denver: high nature + mountains | San Diego: beaches | Dallas: flat, no coast
                </p>

                <h4>Final Calculation</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs overflow-x-auto">
                  QoL_Score = (walkability × w1 + safety × w2 + air × w3 +{"\n"}
                              internet × w4 + schools × w5 + health × w6 + recreation × w7){"\n"}
                              / (w1 + w2 + w3 + w4 + w5 + w6 + w7)
                </div>

                <h4 className="mt-4">Data Sources Note</h4>
                <p className="text-xs text-muted-foreground">
                  QoL data is pulled from official government APIs when available. For cities where
                  API queries fail or return incomplete data, verified fallback data from the following
                  sources is used:
                </p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 mt-2 space-y-1">
                  <li><strong>Walk/Bike Score:</strong> EPA National Walkability Index (ArcGIS) — walk score from NatWalkInd, bike score from street density (D3B)</li>
                  <li><strong>Transit Score:</strong> Manually researched from walkscore.com (January 2025) — EPA transit metrics proved unreliable at metro scale</li>
                  <li><strong>Crime:</strong> FBI Uniform Crime Reports (UCR) 2022 state-level data</li>
                  <li><strong>Air Quality:</strong> EPA Air Quality System (AQS) annual summaries</li>
                  <li><strong>Broadband:</strong> FCC National Broadband Map / BroadbandMap.com 2024 - verified city-level fiber coverage and provider counts</li>
                  <li><strong>Education:</strong> NCES Common Core of Data estimates</li>
                  <li><strong>Healthcare:</strong> HRSA Area Health Resources Files, America&apos;s Health Rankings state data, and regional hospital infrastructure analysis</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <em>Note:</em> For some smaller metros where city-specific data is unavailable, healthcare and broadband
                  metrics are estimated from state-level averages adjusted for local factors (presence of major
                  medical centers, known shortage area designations, regional ISP coverage reports).
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <em>Transit Score Methodology:</em> We attempted to calculate transit scores from EPA Smart Location Database 
                  metrics (D4A proximity, D4C frequency, D5BR job accessibility), but metro-level aggregation produced inaccurate 
                  results due to suburban census blocks diluting city-center scores. The AllTransit API from CNT would be ideal 
                  but requires paid access.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Cultural Preferences */}
            <AccordionItem value="cultural">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Church className="h-4 w-4 text-purple-500" />
                  Cultural Preferences
                </span>
              </AccordionTrigger>
              <AccordionContent className="prose prose-slate dark:prose-invert max-w-none text-sm">
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded mb-4">
                  <p className="text-xs text-amber-800 dark:text-amber-200 m-0">
                    <strong>Privacy Note:</strong> Political and religious preferences are stored locally 
                    in your browser only and are never sent to our servers.
                  </p>
                </div>

                <p>
                  Cultural preferences let you find cities that match your political and religious community 
                  needs. This data is provided at the <strong>county/metro level</strong> — individual 
                  neighborhoods may vary significantly.
                </p>

                <h4>Data Sources</h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left">Category</th>
                      <th className="text-left">Source</th>
                      <th className="text-left">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Political Lean</td><td>MIT Election Lab County Returns</td><td>2024</td></tr>
                    <tr><td>Voter Turnout</td><td>US Elections Project</td><td>2024</td></tr>
                    <tr><td>Religious Adherence</td><td>ARDA U.S. Religion Census</td><td>2020</td></tr>
                  </tbody>
                </table>

                <h4>Political Scoring</h4>
                <p>
                  The <strong>Partisan Index (PI)</strong> measures the political lean of a city:
                </p>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  PI = (Dem% - Rep%) / 100{"\n"}
                  Range: -1.0 (100% Republican) to +1.0 (100% Democrat){"\n"}
                  {"\n"}
                  |PI| &gt; 0.20: &quot;Solid&quot; lean{"\n"}
                  |PI| &lt; 0.05: &quot;Swing/Purple&quot;
                </div>
                
                <p>Your preference options:</p>
                <ul className="text-xs">
                  <li><strong>Strong D/R:</strong> Matches cities with PI near ±0.6</li>
                  <li><strong>Lean D/R:</strong> Matches cities with PI near ±0.2</li>
                  <li><strong>Swing:</strong> Matches cities with |PI| &lt; 0.10 (competitive)</li>
                  <li><strong>Neutral:</strong> Political lean not factored into score</li>
                </ul>

                <p>
                  The <strong>High Voter Turnout</strong> toggle gives bonus points to cities with 
                  turnout above 65%, which often correlates with civic engagement and community activism.
                </p>

                <h4>Religious Scoring</h4>
                <p>
                  Religious adherence is measured in <strong>adherents per 1,000 residents</strong>.
                  National averages:
                </p>
                <ul className="text-xs">
                  <li>Catholic: 205</li>
                  <li>Evangelical Protestant: 256</li>
                  <li>Mainline Protestant: 103</li>
                  <li>Jewish: 22</li>
                  <li>Muslim: 11</li>
                  <li>Unaffiliated/Secular: 290</li>
                </ul>

                <p>
                  The <strong>Concentration Score</strong> compares local presence to national average:
                </p>
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  Concentration = Local Adherence / National Average{"\n"}
                  {"\n"}
                  &gt; 2.0: Strong presence (bonus +20){"\n"}
                  &gt; 1.5: Above average (bonus +15){"\n"}
                  &gt; 1.0: Average (bonus +10){"\n"}
                  &lt; 1.0: Below average (smaller bonus)
                </div>

                <p>
                  The <strong>Religious Diversity Index</strong> uses Simpson&apos;s Diversity formula 
                  (same as racial diversity) to measure whether a city has one dominant tradition 
                  or a pluralistic mix.
                </p>

                <h4>Urban Lifestyle (NEW)</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Measures urban entertainment and lifestyle amenities. Off by default.
                </p>
                <ul className="text-xs space-y-1">
                  <li><strong>Nightlife Score:</strong> Bars/clubs per 10K (logarithmic curve, plateaus at ~30)</li>
                  <li><strong>Arts Score:</strong> Museums, theaters, galleries (logarithmic, plateaus at ~20)</li>
                  <li><strong>Dining Score:</strong> Restaurant density, cuisine diversity, breweries</li>
                </ul>
                <div className="bg-muted p-3 rounded font-mono text-xs mt-2">
                  UrbanLifestyle = (nightlife × w1 + arts × w2 + dining × w3) / (w1 + w2 + w3)
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  NYC: 1,500+ bars | DC: 70+ museums | Smaller cities: 50-100 bars, 10-20 museums
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <em>Diminishing returns:</em> Once a city has &quot;enough&quot; bars/museums (critical mass), 
                  the score plateaus. Having 100 vs 80 museums matters less than 10 vs 20.
                </p>

                <h4>Final Calculation</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs overflow-x-auto">
                  Cultural_Score = (Political_Score × Political_Weight +{"\n"}
                                   Religious_Score × Religious_Weight +{"\n"}
                                   UrbanLifestyle_Score × Lifestyle_Weight){"\n"}
                                   / (Political_Weight + Religious_Weight + Lifestyle_Weight)
                </div>
                <p className="text-xs text-muted-foreground">
                  If all cultural preferences are set to neutral/off, the score defaults to 50 (national average).
                </p>
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
            </tbody>
          </table>
          <p className="text-muted-foreground text-sm mt-4">
            Excluded cities appear at the bottom of the rankings with their exclusion reason shown.
          </p>
        </CardContent>
      </Card>

      {/* Score Interpretation */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Understanding Your Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-slate dark:prose-invert max-w-none">
          <h4>The 50-Point Baseline</h4>
          <p>
            All scores are normalized so that <strong>50 = U.S. national average</strong>. This means:
          </p>
          <ul className="text-sm">
            <li><strong>Above 50</strong>: Better than the typical U.S. city</li>
            <li><strong>Below 50</strong>: Below average for that metric</li>
            <li><strong>75+</strong>: Exceptional (top 25% nationally)</li>
            <li><strong>25 or below</strong>: Poor (bottom 25% nationally)</li>
          </ul>

          <h4>Climate Scores</h4>
          <p className="text-sm">
            Climate scores use <strong>range-based normalization</strong> against U.S. geographic extremes. 
            For example, San Diego (267 comfort days) scores near 100, while cities with 50 comfort days 
            score near 0. This reflects actual climate variety across the country.
          </p>

          <h4>Quality of Life Scores</h4>
          <p className="text-sm">
            QoL sub-scores (walkability, safety, schools, etc.) use <strong>percentile ranking</strong> 
            among all cities in our database. A city in the top 10% for safety scores 90, regardless 
            of the underlying crime rate numbers. This ensures all factors have equal &quot;pull&quot; on your rankings.
          </p>

          <h4>Demographics: Critical Mass</h4>
          <p className="text-sm">
            When searching for minority community presence, scores use a <strong>logarithmic curve</strong> 
            with diminishing returns. This reflects reality: a city with 25% Asian population offers 
            essentially the same community infrastructure (grocery stores, restaurants, cultural events) 
            as one with 40%. The &quot;critical mass&quot; threshold is where practical benefits plateau.
          </p>
          <div className="bg-muted p-3 rounded text-xs">
            <p className="font-medium mb-1">Example: Seeking 10% minimum Chinese community</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>5% presence → Score ~55 (below threshold penalty)</li>
              <li>10% presence → Score 75 (meets threshold)</li>
              <li>15% presence → Score ~85 (bonus for exceeding)</li>
              <li>25% presence → Score ~92 (diminishing returns kick in)</li>
              <li>40% presence → Score ~95 (plateau—practical benefit maxed)</li>
            </ul>
          </div>

          <h4>Reading the Visual Indicators</h4>
          <p className="text-sm">
            Throughout the app, you&apos;ll see relative indicators next to scores:
          </p>
          <ul className="text-sm">
            <li><span className="text-green-600 dark:text-green-400 font-medium">+15</span> means 15 points above U.S. average</li>
            <li><span className="text-red-600 dark:text-red-400 font-medium">-12</span> means 12 points below U.S. average</li>
            <li><span className="text-muted-foreground font-medium">avg</span> means within 5 points of average (45-55)</li>
          </ul>
          <p className="text-sm">
            In radar charts, the dashed line at 50 represents the national average—points outside 
            that line are above average, points inside are below.
          </p>

          <h4>Real-World Anchor Points</h4>
          <p className="text-sm">
            To help you interpret scores, here are actual examples from our scoring system:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose text-sm">
            <div className="bg-muted/50 p-3 rounded">
              <p className="font-medium text-orange-600 dark:text-orange-400 mb-2">Climate</p>
              <ul className="space-y-1 text-xs">
                <li><strong>San Diego</strong>: ~91 (best U.S. weather)</li>
                <li><strong>Minneapolis</strong>: ~41 (harsh winters)</li>
                <li className="text-muted-foreground">Spread of ~50 points reflects real climate diversity</li>
              </ul>
            </div>
            <div className="bg-muted/50 p-3 rounded">
              <p className="font-medium text-red-600 dark:text-red-400 mb-2">Safety (QoL)</p>
              <ul className="space-y-1 text-xs">
                <li><strong>Safest cities</strong>: 90-100 (top percentile)</li>
                <li><strong>High-crime cities</strong>: 10-20 (bottom percentile)</li>
                <li className="text-muted-foreground">Based on violent crime rate per 100K</li>
              </ul>
            </div>
            <div className="bg-muted/50 p-3 rounded">
              <p className="font-medium text-blue-600 dark:text-blue-400 mb-2">Demographics (Minority Community)</p>
              <ul className="space-y-1 text-xs">
                <li><strong>5% presence</strong>: ~55 (below 10% threshold)</li>
                <li><strong>25% presence</strong>: ~97 (above threshold)</li>
                <li><strong>40% presence</strong>: ~100 (plateau effect)</li>
                <li className="text-muted-foreground">Only 3pt diff between 25% and 40%</li>
              </ul>
            </div>
            <div className="bg-muted/50 p-3 rounded">
              <p className="font-medium text-green-600 dark:text-green-400 mb-2">Cost of Living</p>
              <ul className="space-y-1 text-xs">
                <li><strong>Houston (buyer)</strong>: ~60 (no state tax + affordable)</li>
                <li><strong>Austin (buyer)</strong>: ~50 (no state tax but pricey housing)</li>
                <li><strong>SF (homeowner)</strong>: ~35 (high tax + high cost)</li>
                <li><strong>SF (buyer)</strong>: ~25 (expensive housing compressed)</li>
                <li className="text-muted-foreground">State taxes + housing situation matter greatly</li>
              </ul>
            </div>
          </div>
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
              <strong>Use filters sparingly:</strong> Hard filters (requires NFL/NBA) 
              completely exclude cities. Use the scoring system for softer preferences.
            </li>
            <li>
              <strong>Cost of Living has two persona selectors:</strong> Choose your housing situation 
              (renter, homeowner, buyer) AND your work situation (standard, high-earner, retiree) 
              for accurate purchasing power calculations.
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
