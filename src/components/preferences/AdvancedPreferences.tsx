"use client";

import { usePreferencesStore } from "@/lib/store";
import { TOOLTIPS } from "@/types/preferences";
import { PreferenceSlider } from "./PreferenceSlider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronRight, Info, Thermometer, Users, Heart, Vote, DollarSign, 
  Home, Key, ShoppingCart, Sun, Snowflake, CloudRain, Zap, Leaf, Activity,
  Cloud, Droplets, HelpCircle, X, Church, ShieldCheck, Briefcase, TrendingUp,
  TreePine, Mountain, Waves, Wine, Palette, Utensils
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

type SectionId = "climate" | "cost" | "demographics" | "qol" | "cultural" | null;

interface CollapsibleSectionProps {
  id: SectionId;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  openSection: SectionId;
  onToggle: (id: SectionId) => void;
}

function CollapsibleSection({ id, title, icon, children, openSection, onToggle }: CollapsibleSectionProps) {
  const isOpen = openSection === id;

  return (
    <Collapsible open={isOpen} onOpenChange={(open) => onToggle(open ? id : null)}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors">
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 space-y-4 pt-2 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdvancedPreferences() {
  const { preferences, updateAdvanced, updateQoLWeight } = usePreferencesStore();
  const [openSection, setOpenSection] = useState<SectionId>(null);

  const isExpanded = openSection !== null;

  return (
    <div className={cn(
      "space-y-2 border-t pt-4 transition-all duration-300",
      isExpanded && "fixed inset-x-0 top-0 bottom-0 z-50 bg-background p-4 overflow-y-auto md:inset-x-auto md:left-0 md:w-[420px] md:border-r md:shadow-xl"
    )}>
      {/* Close button when expanded */}
      {isExpanded && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b">
          <h3 className="font-semibold text-lg">Advanced Options</h3>
          <button
            onClick={() => setOpenSection(null)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="Collapse all sections"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Climate Details - NOAA-based */}
      <CollapsibleSection
        id="climate"
        title="Climate Preferences"
        icon={<Thermometer className="h-4 w-4 text-orange-500" />}
        openSection={openSection}
        onToggle={setOpenSection}
      >
        <div className="space-y-4">
          {/* Comfort & Outdoor Days */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sun className="h-4 w-4 text-yellow-500" />
              T-Shirt Weather (65-80°F)
            </div>
            <PreferenceSlider
              label="Importance"
              value={preferences.advanced.climate.weightComfortDays}
              onChange={(v) => updateAdvanced("climate", "weightComfortDays", v)}
              tooltip={TOOLTIPS["advanced.climate.weightComfortDays"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            <PreferenceSlider
              label="Min Days Desired"
              value={preferences.advanced.climate.minComfortDays}
              onChange={(v) => updateAdvanced("climate", "minComfortDays", v)}
              min={50}
              max={300}
              step={10}
              tooltip={TOOLTIPS["advanced.climate.minComfortDays"]}
              formatValue={(v) => `${v} days`}
            />
            <p className="text-xs text-muted-foreground">San Diego: 267 days | Chicago: 89 days</p>
          </div>

          {/* Extreme Weather Tolerance */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Thermometer className="h-4 w-4 text-red-500" />
              Extreme Heat (&gt;95°F)
            </div>
            <PreferenceSlider
              label="Importance"
              value={preferences.advanced.climate.weightExtremeHeat}
              onChange={(v) => updateAdvanced("climate", "weightExtremeHeat", v)}
              tooltip={TOOLTIPS["advanced.climate.weightExtremeHeat"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            <PreferenceSlider
              label="Max Days Tolerable"
              value={preferences.advanced.climate.maxExtremeHeatDays}
              onChange={(v) => updateAdvanced("climate", "maxExtremeHeatDays", v)}
              min={0}
              max={120}
              step={5}
              tooltip={TOOLTIPS["advanced.climate.maxExtremeHeatDays"]}
              formatValue={(v) => `${v} days`}
            />
            <p className="text-xs text-muted-foreground">Phoenix: 107 days | Seattle: 3 days</p>
          </div>

          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Snowflake className="h-4 w-4 text-blue-400" />
              Freeze Days (&lt;32°F)
            </div>
            <PreferenceSlider
              label="Importance"
              value={preferences.advanced.climate.weightFreezeDays}
              onChange={(v) => updateAdvanced("climate", "weightFreezeDays", v)}
              tooltip={TOOLTIPS["advanced.climate.weightFreezeDays"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            <PreferenceSlider
              label="Max Days Tolerable"
              value={preferences.advanced.climate.maxFreezeDays}
              onChange={(v) => updateAdvanced("climate", "maxFreezeDays", v)}
              min={0}
              max={180}
              step={5}
              tooltip={TOOLTIPS["advanced.climate.maxFreezeDays"]}
              formatValue={(v) => `${v} days`}
            />
            <p className="text-xs text-muted-foreground">Minneapolis: 156 days | Miami: 0 days</p>
          </div>

          {/* Precipitation */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CloudRain className="h-4 w-4 text-blue-500" />
              Rain Days
            </div>
            <PreferenceSlider
              label="Importance"
              value={preferences.advanced.climate.weightRainDays}
              onChange={(v) => updateAdvanced("climate", "weightRainDays", v)}
              tooltip={TOOLTIPS["advanced.climate.weightRainDays"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            <PreferenceSlider
              label="Max Days Tolerable"
              value={preferences.advanced.climate.maxRainDays}
              onChange={(v) => updateAdvanced("climate", "maxRainDays", v)}
              min={30}
              max={200}
              step={5}
              tooltip={TOOLTIPS["advanced.climate.maxRainDays"]}
              formatValue={(v) => `${v} days`}
            />
            <p className="text-xs text-muted-foreground">Seattle: 152 days | Phoenix: 36 days</p>
          </div>

          {/* Snow */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Snowflake className="h-4 w-4 text-cyan-400" />
              Snow Days (&gt;1 inch)
            </div>
            <PreferenceSlider
              label="Importance"
              value={preferences.advanced.climate.weightSnowDays}
              onChange={(v) => updateAdvanced("climate", "weightSnowDays", v)}
              tooltip={TOOLTIPS["advanced.climate.weightSnowDays"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            <PreferenceSlider
              label="Max Days Tolerable"
              value={preferences.advanced.climate.maxSnowDays}
              onChange={(v) => updateAdvanced("climate", "maxSnowDays", v)}
              min={0}
              max={60}
              step={5}
              tooltip={TOOLTIPS["advanced.climate.maxSnowDays"]}
              formatValue={(v) => `${v} days`}
            />
            <p className="text-xs text-muted-foreground">Minneapolis: 40+ days | Miami: 0 days</p>
          </div>

          {/* Cloudy/Gloom */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Cloud className="h-4 w-4 text-gray-400" />
              Cloudy Days (Gloom Factor)
            </div>
            <PreferenceSlider
              label="Importance"
              value={preferences.advanced.climate.weightCloudyDays}
              onChange={(v) => updateAdvanced("climate", "weightCloudyDays", v)}
              tooltip={TOOLTIPS["advanced.climate.weightCloudyDays"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            <PreferenceSlider
              label="Max Days Tolerable"
              value={preferences.advanced.climate.maxCloudyDays}
              onChange={(v) => updateAdvanced("climate", "maxCloudyDays", v)}
              min={50}
              max={250}
              step={10}
              tooltip={TOOLTIPS["advanced.climate.maxCloudyDays"]}
              formatValue={(v) => `${v} days`}
            />
            <p className="text-xs text-muted-foreground">Seattle: 200+ days | Phoenix: 80 days</p>
          </div>

          {/* Humidity/Stickiness */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Droplets className="h-4 w-4 text-teal-500" />
              Summer Humidity (Stickiness)
            </div>
            <PreferenceSlider
              label="Importance"
              value={preferences.advanced.climate.weightHumidity}
              onChange={(v) => updateAdvanced("climate", "weightHumidity", v)}
              tooltip={TOOLTIPS["advanced.climate.weightHumidity"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            <PreferenceSlider
              label="Max July Dewpoint"
              value={preferences.advanced.climate.maxJulyDewpoint}
              onChange={(v) => updateAdvanced("climate", "maxJulyDewpoint", v)}
              min={50}
              max={75}
              tooltip={TOOLTIPS["advanced.climate.maxJulyDewpoint"]}
              formatValue={(v) => `${v}°F`}
            />
            <p className="text-xs text-muted-foreground">
              65°F+ = Muggy, 72°F+ = Oppressive. Miami: 75°F | Denver: 55°F
            </p>
          </div>

          {/* Utility Costs */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-amber-500" />
              Utility Costs (CDD + HDD)
            </div>
            <PreferenceSlider
              label="Importance"
              value={preferences.advanced.climate.weightUtilityCosts}
              onChange={(v) => updateAdvanced("climate", "weightUtilityCosts", v)}
              tooltip={TOOLTIPS["advanced.climate.weightUtilityCosts"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            <p className="text-xs text-muted-foreground">
              Based on Heating + Cooling Degree Days. San Diego: $low | Minneapolis: $high
            </p>
          </div>

          {/* Seasonal Patterns */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4 text-purple-500" />
              Seasonal Patterns
            </div>
            <PreferenceSlider
              label="Seasonal Stability"
              value={preferences.advanced.climate.weightSeasonalStability}
              onChange={(v) => updateAdvanced("climate", "weightSeasonalStability", v)}
              tooltip={TOOLTIPS["advanced.climate.weightSeasonalStability"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            <p className="text-xs text-muted-foreground mb-2">
              Prefer &quot;perpetual spring&quot;? San Diego: very stable | Chicago: high variation
            </p>
            <PreferenceSlider
              label="Daily Swing"
              value={preferences.advanced.climate.weightDiurnalSwing}
              onChange={(v) => updateAdvanced("climate", "weightDiurnalSwing", v)}
              tooltip={TOOLTIPS["advanced.climate.weightDiurnalSwing"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            <PreferenceSlider
              label="Max Daily Swing"
              value={preferences.advanced.climate.maxDiurnalSwing}
              onChange={(v) => updateAdvanced("climate", "maxDiurnalSwing", v)}
              min={10}
              max={35}
              tooltip={TOOLTIPS["advanced.climate.maxDiurnalSwing"]}
              formatValue={(v) => `${v}°F`}
            />
            <p className="text-xs text-muted-foreground">Miami: 10°F swing | Denver: 28°F swing</p>
          </div>

          {/* Growing Season (Optional) */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Leaf className="h-4 w-4 text-green-500" />
              Growing Season (Gardening)
            </div>
            <PreferenceSlider
              label="Importance"
              value={preferences.advanced.climate.weightGrowingSeason}
              onChange={(v) => updateAdvanced("climate", "weightGrowingSeason", v)}
              tooltip={TOOLTIPS["advanced.climate.weightGrowingSeason"]}
              formatValue={(v) => v === 0 ? "Off" : `${v}%`}
            />
            {preferences.advanced.climate.weightGrowingSeason > 0 && (
              <PreferenceSlider
                label="Min Season Length"
                value={preferences.advanced.climate.minGrowingSeasonDays}
                onChange={(v) => updateAdvanced("climate", "minGrowingSeasonDays", v)}
                min={90}
                max={365}
                step={15}
                tooltip={TOOLTIPS["advanced.climate.minGrowingSeasonDays"]}
                formatValue={(v) => `${v} days`}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Off by default. Miami: 365 days | Boston: 180 days
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Cost of Living - Housing Situation */}
      <CollapsibleSection
        id="cost"
        title="Cost of Living"
        icon={<DollarSign className="h-4 w-4 text-green-500" />}
        openSection={openSection}
        onToggle={setOpenSection}
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-1">
              <Label className="text-sm">Your Housing Situation</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{TOOLTIPS["advanced.costOfLiving.housingSituation"]}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {([
                { value: "renter", label: "Renter", icon: Key, desc: "Uses standard BEA rental index" },
                { value: "homeowner", label: "Homeowner", icon: Home, desc: "Excludes housing (mortgage is fixed)" },
                { value: "prospective-buyer", label: "Prospective Buyer", icon: ShoppingCart, desc: "Uses current home prices + rates" },
              ] as const).map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => updateAdvanced("costOfLiving", "housingSituation", value)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                    preferences.advanced.costOfLiving.housingSituation === value
                      ? "bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    preferences.advanced.costOfLiving.housingSituation === value
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                  )} />
                  <div>
                    <div className={cn(
                      "font-medium text-sm",
                      preferences.advanced.costOfLiving.housingSituation === value
                        ? "text-green-700 dark:text-green-300"
                        : ""
                    )}>
                      {label}
                    </div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Include Utilities toggle - only for renters */}
          {preferences.advanced.costOfLiving.housingSituation === "renter" && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1">
                <Label htmlFor="utilities" className="text-sm">
                  Include Utility Costs
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{TOOLTIPS["advanced.costOfLiving.includeUtilities"]}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="utilities"
                checked={preferences.advanced.costOfLiving.includeUtilities ?? true}
                onCheckedChange={(v) => updateAdvanced("costOfLiving", "includeUtilities", v)}
              />
            </div>
          )}

          {/* Info box based on housing selection */}
          <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            {preferences.advanced.costOfLiving.housingSituation === "renter" && (
              <p>
                <strong>Renter:</strong> The BEA index is most accurate for you, as it&apos;s heavily 
                weighted by rental data from the American Community Survey.
              </p>
            )}
            {preferences.advanced.costOfLiving.housingSituation === "homeowner" && (
              <p>
                <strong>Homeowner:</strong> Since your mortgage is fixed, housing costs are excluded. 
                Score uses only Goods (70%) + Services (30%) indices.
              </p>
            )}
            {preferences.advanced.costOfLiving.housingSituation === "prospective-buyer" && (
              <p>
                <strong>Buyer:</strong> BEA data is &quot;lagged&quot; (reflects old 3% mortgages). 
                We use current home prices with ~7% mortgage rates for accurate comparison.
              </p>
            )}
          </div>

          {/* Work Situation - Income Source */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-1">
              <Label className="text-sm">Your Work Situation</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{TOOLTIPS["advanced.costOfLiving.workSituation"]}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground">
              Per-capita income is skewed by ultra-high earners (DC lobbyists, SF tech execs). 
              Choose your situation for more realistic purchasing power calculations.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {([
                { value: "local-earner", label: "Local Earner", icon: TrendingUp, desc: "Uses local income levels - how locals fare" },
                { value: "standard", label: "Standard / Moving", icon: Briefcase, desc: "Pure affordability - same income, compare costs" },
                { value: "retiree", label: "Retiree / Fixed Income", icon: Heart, desc: "Uses your specified fixed income" },
              ] as const).map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => updateAdvanced("costOfLiving", "workSituation", value)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                    preferences.advanced.costOfLiving.workSituation === value
                      ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    preferences.advanced.costOfLiving.workSituation === value
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground"
                  )} />
                  <div>
                    <div className={cn(
                      "font-medium text-sm",
                      preferences.advanced.costOfLiving.workSituation === value
                        ? "text-blue-700 dark:text-blue-300"
                        : ""
                    )}>
                      {label}
                    </div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Retiree fixed income input - only shown for retiree persona */}
          {preferences.advanced.costOfLiving.workSituation === "retiree" && (
            <div className="space-y-2 pl-4 border-l-2 border-blue-500/50">
              <div className="flex items-center gap-1">
                <Label className="text-sm">Annual Fixed Income</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{TOOLTIPS["advanced.costOfLiving.retireeFixedIncome"]}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <input
                  type="number"
                  min="10000"
                  max="200000"
                  step="5000"
                  value={preferences.advanced.costOfLiving.retireeFixedIncome ?? 50000}
                  onChange={(e) => updateAdvanced("costOfLiving", "retireeFixedIncome", parseInt(e.target.value) || 50000)}
                  className="w-32 px-3 py-2 rounded-md border bg-background text-sm"
                />
                <span className="text-xs text-muted-foreground">/year (pre-tax)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Average Social Security: ~$22K | Median Retiree Income: ~$50K
              </p>
            </div>
          )}

          {/* Info box based on work selection */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-xs text-muted-foreground">
            {preferences.advanced.costOfLiving.workSituation === "local-earner" && (
              <p>
                <strong>Local Earner:</strong> Uses local Per Capita Income (BEA). Shows how well off 
                local workers are. Expensive cities score better because local incomes are higher. 
                Best for &quot;how do locals fare here?&quot;
              </p>
            )}
            {preferences.advanced.costOfLiving.workSituation === "standard" && (
              <p>
                <strong>Standard:</strong> Pure affordability comparison. Uses fixed national median 
                income (~$75K) and only varies by local costs. Expensive cities (SF, NYC) score poorly 
                as expected. Best for &quot;where can I afford to move?&quot;
              </p>
            )}
            {preferences.advanced.costOfLiving.workSituation === "retiree" && (
              <p>
                <strong>Retiree:</strong> Uses your specified fixed income. Shows how far your 
                retirement income goes in each city. Best for &quot;where can I retire affordably?&quot;
              </p>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Demographics Details */}
      <CollapsibleSection
        id="demographics"
        title="Demographics Details"
        icon={<Users className="h-4 w-4 text-blue-500" />}
        openSection={openSection}
        onToggle={setOpenSection}
      >
        {/* Population */}
        <div className="space-y-3 pb-3 border-b border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Population</h4>
          <PreferenceSlider
            label="Min City Population"
            value={preferences.advanced.demographics.minPopulation}
            onChange={(v) => updateAdvanced("demographics", "minPopulation", v)}
            min={0}
            max={2000000}
            step={50000}
            tooltip={TOOLTIPS["advanced.demographics.minPopulation"]}
            formatValue={(v) => v === 0 ? "Any" : v >= 1000000 ? `${(v / 1000000).toFixed(1)}M+` : `${(v / 1000).toFixed(0)}K+`}
          />
        </div>

        {/* Diversity */}
        <div className="space-y-3 py-3 border-b border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Diversity</h4>
          <PreferenceSlider
            label="Diversity Importance"
            value={preferences.advanced.demographics.weightDiversity}
            onChange={(v) => updateAdvanced("demographics", "weightDiversity", v)}
            min={0}
            max={100}
            tooltip={TOOLTIPS["advanced.demographics.weightDiversity"]}
            formatValue={(v) => v === 0 ? "Off" : `${v}%`}
          />
          {preferences.advanced.demographics.weightDiversity > 0 && (
            <PreferenceSlider
              label="Min Diversity Index"
              value={preferences.advanced.demographics.minDiversityIndex}
              onChange={(v) => updateAdvanced("demographics", "minDiversityIndex", v)}
              min={0}
              max={80}
              tooltip={TOOLTIPS["advanced.demographics.minDiversityIndex"]}
              formatValue={(v) => v === 0 ? "Any" : `${v}+`}
            />
          )}
        </div>

        {/* Age Demographics */}
        <div className="space-y-3 py-3 border-b border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Age Demographics</h4>
          <PreferenceSlider
            label="Age Importance"
            value={preferences.advanced.demographics.weightAge}
            onChange={(v) => updateAdvanced("demographics", "weightAge", v)}
            min={0}
            max={100}
            tooltip={TOOLTIPS["advanced.demographics.weightAge"]}
            formatValue={(v) => v === 0 ? "Off" : `${v}%`}
          />
          {preferences.advanced.demographics.weightAge > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                Preferred Age Group
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                    <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.preferredAgeGroup"]}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Select
                value={preferences.advanced.demographics.preferredAgeGroup}
                onValueChange={(v) => updateAdvanced("demographics", "preferredAgeGroup", v as "young" | "mixed" | "mature" | "any")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any (No preference)</SelectItem>
                  <SelectItem value="young">Young (Median &lt;35)</SelectItem>
                  <SelectItem value="mixed">Mixed (Median 35-45)</SelectItem>
                  <SelectItem value="mature">Mature (Median &gt;45)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Education */}
        <div className="space-y-3 py-3 border-b border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Education</h4>
          <PreferenceSlider
            label="Education Importance"
            value={preferences.advanced.demographics.weightEducation}
            onChange={(v) => updateAdvanced("demographics", "weightEducation", v)}
            min={0}
            max={100}
            tooltip={TOOLTIPS["advanced.demographics.weightEducation"]}
            formatValue={(v) => v === 0 ? "Off" : `${v}%`}
          />
          {preferences.advanced.demographics.weightEducation > 0 && (
            <PreferenceSlider
              label="Min Bachelor's Degree %"
              value={preferences.advanced.demographics.minBachelorsPercent}
              onChange={(v) => updateAdvanced("demographics", "minBachelorsPercent", v)}
              min={0}
              max={60}
              tooltip={TOOLTIPS["advanced.demographics.minBachelorsPercent"]}
              formatValue={(v) => v === 0 ? "Any" : `${v}%+`}
            />
          )}
        </div>

        {/* Foreign-Born / International Culture */}
        <div className="space-y-3 py-3 border-b border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">International Culture</h4>
          <PreferenceSlider
            label="International Importance"
            value={preferences.advanced.demographics.weightForeignBorn}
            onChange={(v) => updateAdvanced("demographics", "weightForeignBorn", v)}
            min={0}
            max={100}
            tooltip={TOOLTIPS["advanced.demographics.weightForeignBorn"]}
            formatValue={(v) => v === 0 ? "Off" : `${v}%`}
          />
          {preferences.advanced.demographics.weightForeignBorn > 0 && (
            <PreferenceSlider
              label="Min Foreign-Born %"
              value={preferences.advanced.demographics.minForeignBornPercent}
              onChange={(v) => updateAdvanced("demographics", "minForeignBornPercent", v)}
              min={0}
              max={40}
              tooltip={TOOLTIPS["advanced.demographics.minForeignBornPercent"]}
              formatValue={(v) => v === 0 ? "Any" : `${v}%+`}
            />
          )}
        </div>

        {/* Minority Community */}
        <div className="space-y-3 py-3 border-b border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Minority Community</h4>
          
          {/* Dropdown comes first */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              Find Community With
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                  <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.minorityGroup"]}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <Select
              value={preferences.advanced.demographics.minorityGroup}
              onValueChange={(v) => {
                updateAdvanced("demographics", "minorityGroup", v as "none" | "hispanic" | "black" | "asian" | "pacific-islander" | "native-american");
                // Reset subgroup when changing minority group
                updateAdvanced("demographics", "minoritySubgroup", "any");
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (don&apos;t factor in)</SelectItem>
                <SelectItem value="hispanic">Hispanic/Latino</SelectItem>
                <SelectItem value="black">Black/African American</SelectItem>
                <SelectItem value="asian">Asian</SelectItem>
                <SelectItem value="pacific-islander">Pacific Islander</SelectItem>
                <SelectItem value="native-american">Native American</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Options only show when a group is selected */}
          {preferences.advanced.demographics.minorityGroup !== "none" && (
            <>
              {/* Subgroup selector for Hispanic and Asian */}
              {(preferences.advanced.demographics.minorityGroup === "hispanic" || 
                preferences.advanced.demographics.minorityGroup === "asian") && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    Specific Subgroup
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                        <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.minoritySubgroup"]}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </label>
                  <Select
                    value={preferences.advanced.demographics.minoritySubgroup}
                    onValueChange={(v) => updateAdvanced("demographics", "minoritySubgroup", v as typeof preferences.advanced.demographics.minoritySubgroup)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any / All {preferences.advanced.demographics.minorityGroup === "hispanic" ? "Hispanic" : "Asian"}</SelectItem>
                      {preferences.advanced.demographics.minorityGroup === "hispanic" && (
                        <>
                          <SelectItem value="mexican">Mexican</SelectItem>
                          <SelectItem value="puerto-rican">Puerto Rican</SelectItem>
                          <SelectItem value="cuban">Cuban</SelectItem>
                          <SelectItem value="salvadoran">Salvadoran</SelectItem>
                          <SelectItem value="guatemalan">Guatemalan</SelectItem>
                          <SelectItem value="colombian">Colombian</SelectItem>
                        </>
                      )}
                      {preferences.advanced.demographics.minorityGroup === "asian" && (
                        <>
                          <SelectItem value="chinese">Chinese</SelectItem>
                          <SelectItem value="indian">Indian</SelectItem>
                          <SelectItem value="filipino">Filipino</SelectItem>
                          <SelectItem value="vietnamese">Vietnamese</SelectItem>
                          <SelectItem value="korean">Korean</SelectItem>
                          <SelectItem value="japanese">Japanese</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <PreferenceSlider
                label="Minimum Presence"
                value={preferences.advanced.demographics.minMinorityPresence}
                onChange={(v) => updateAdvanced("demographics", "minMinorityPresence", v)}
                min={0}
                max={30}
                tooltip={TOOLTIPS["advanced.demographics.minMinorityPresence"]}
                formatValue={(v) => v === 0 ? "Any" : `${v}%+`}
              />
              
              <PreferenceSlider
                label="Importance"
                value={preferences.advanced.demographics.minorityImportance}
                onChange={(v) => updateAdvanced("demographics", "minorityImportance", v)}
                min={0}
                max={100}
                tooltip={TOOLTIPS["advanced.demographics.minorityImportance"]}
                formatValue={(v) => `${v}%`}
              />
            </>
          )}
        </div>

        {/* Economic Health */}
        <div className="space-y-3 pt-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Economic Health</h4>
          <PreferenceSlider
            label="Economic Health Importance"
            value={preferences.advanced.demographics.weightEconomicHealth}
            onChange={(v) => updateAdvanced("demographics", "weightEconomicHealth", v)}
            min={0}
            max={100}
            tooltip={TOOLTIPS["advanced.demographics.weightEconomicHealth"]}
            formatValue={(v) => v === 0 ? "Off" : `${v}%`}
          />
          {preferences.advanced.demographics.weightEconomicHealth > 0 && (
            <>
              <PreferenceSlider
                label="Min Median Household Income"
                value={preferences.advanced.demographics.minMedianHouseholdIncome}
                onChange={(v) => updateAdvanced("demographics", "minMedianHouseholdIncome", v)}
                min={0}
                max={150000}
                step={5000}
                tooltip={TOOLTIPS["advanced.demographics.minMedianHouseholdIncome"]}
                formatValue={(v) => v === 0 ? "Any" : `$${(v / 1000).toFixed(0)}K+`}
              />
              <PreferenceSlider
                label="Max Poverty Rate"
                value={preferences.advanced.demographics.maxPovertyRate}
                onChange={(v) => updateAdvanced("demographics", "maxPovertyRate", v)}
                min={5}
                max={30}
                tooltip={TOOLTIPS["advanced.demographics.maxPovertyRate"]}
                formatValue={(v) => v >= 30 ? "Any" : `${v}%`}
              />
            </>
          )}
        </div>

        {/* Dating Favorability */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-pink-500" />
              Dating Favorability
            </h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.datingEnabled"]}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <Label htmlFor="dating-enabled" className="text-sm font-medium cursor-pointer">
              Enable Dating Scoring
            </Label>
            <Switch
              id="dating-enabled"
              checked={preferences.advanced.demographics.datingEnabled}
              onCheckedChange={(checked) => updateAdvanced("demographics", "datingEnabled", checked)}
            />
          </div>
          
          {preferences.advanced.demographics.datingEnabled && (
            <div className="space-y-3 pl-2 border-l-2 border-pink-200 dark:border-pink-800">
              {/* Seeking Gender */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  I&apos;m looking for
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                      <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.seekingGender"]}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <Select
                  value={preferences.advanced.demographics.seekingGender || ""}
                  onValueChange={(v) => updateAdvanced("demographics", "seekingGender", v === "" ? null : v as "men" | "women")}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="men">Men</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Age Range */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Age range interested in
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                      <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.datingAgeRange"]}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <Select
                  value={preferences.advanced.demographics.datingAgeRange || ""}
                  onValueChange={(v) => updateAdvanced("demographics", "datingAgeRange", v === "" ? null : v as "20-29" | "30-39" | "40-49")}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any age range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20-29">20-29 years</SelectItem>
                    <SelectItem value="30-39">30-39 years</SelectItem>
                    <SelectItem value="40-49">40-49 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Dating Weight */}
              <PreferenceSlider
                label="Dating Weight"
                value={preferences.advanced.demographics.datingWeight}
                onChange={(v) => updateAdvanced("demographics", "datingWeight", v)}
                min={0}
                max={100}
                tooltip={TOOLTIPS["advanced.demographics.datingWeight"]}
                formatValue={(v) => v === 0 ? "Off" : v === 100 ? "Max" : `${v}%`}
              />
              
              {/* Note about political alignment */}
              <p className="text-xs text-muted-foreground italic">
                Your political preference (in Cultural settings) is also used for dating alignment scoring.
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Quality of Life Details */}
      <CollapsibleSection
        id="qol"
        title="Quality of Life"
        icon={<Heart className="h-4 w-4 text-red-500" />}
        openSection={openSection}
        onToggle={setOpenSection}
      >
        {/* Category Weights */}
        <div className="space-y-3 pb-4 border-b">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Category Weights</h4>
          <PreferenceSlider
            label="Walk Score®"
            value={preferences.advanced.qualityOfLife.weights.walkability}
            onChange={(v) => updateQoLWeight("walkability", v)}
            min={0}
            max={50}
            tooltip={TOOLTIPS["advanced.qualityOfLife.weights.walkability"]}
            formatValue={(v) => `${v}%`}
          />
          <PreferenceSlider
            label="Safety"
            value={preferences.advanced.qualityOfLife.weights.safety}
            onChange={(v) => updateQoLWeight("safety", v)}
            min={0}
            max={50}
            tooltip={TOOLTIPS["advanced.qualityOfLife.weights.safety"]}
            formatValue={(v) => `${v}%`}
          />
          <PreferenceSlider
            label="Air Quality"
            value={preferences.advanced.qualityOfLife.weights.airQuality}
            onChange={(v) => updateQoLWeight("airQuality", v)}
            min={0}
            max={50}
            tooltip={TOOLTIPS["advanced.qualityOfLife.weights.airQuality"]}
            formatValue={(v) => `${v}%`}
          />
          <PreferenceSlider
            label="Internet"
            value={preferences.advanced.qualityOfLife.weights.internet}
            onChange={(v) => updateQoLWeight("internet", v)}
            min={0}
            max={50}
            tooltip={TOOLTIPS["advanced.qualityOfLife.weights.internet"]}
            formatValue={(v) => `${v}%`}
          />
          <PreferenceSlider
            label="Schools"
            value={preferences.advanced.qualityOfLife.weights.schools}
            onChange={(v) => updateQoLWeight("schools", v)}
            min={0}
            max={50}
            tooltip={TOOLTIPS["advanced.qualityOfLife.weights.schools"]}
            formatValue={(v) => `${v}%`}
          />
          <PreferenceSlider
            label="Healthcare"
            value={preferences.advanced.qualityOfLife.weights.healthcare}
            onChange={(v) => updateQoLWeight("healthcare", v)}
            min={0}
            max={50}
            tooltip={TOOLTIPS["advanced.qualityOfLife.weights.healthcare"]}
            formatValue={(v) => `${v}%`}
          />
        </div>

        {/* Walk Score® Thresholds */}
        <div className="space-y-3 pt-4 pb-4 border-b">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
            <a 
              href="https://www.walkscore.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              title="Data from walkscore.com"
            >
              Walk Score®
            </a>
          </h4>
          <PreferenceSlider
            label="Min Walk Score®"
            value={preferences.advanced.qualityOfLife.minWalkScore}
            onChange={(v) => updateAdvanced("qualityOfLife", "minWalkScore", v)}
            min={0}
            max={90}
            tooltip={TOOLTIPS["advanced.qualityOfLife.minWalkScore"]}
            formatValue={(v) => v === 0 ? "Any" : `${v}+`}
          />
          <PreferenceSlider
            label="Min Transit Score®"
            value={preferences.advanced.qualityOfLife.minTransitScore}
            onChange={(v) => updateAdvanced("qualityOfLife", "minTransitScore", v)}
            min={0}
            max={90}
            tooltip={TOOLTIPS["advanced.qualityOfLife.minTransitScore"]}
            formatValue={(v) => v === 0 ? "Any" : `${v}+`}
          />
        </div>

        {/* Safety */}
        <div className="space-y-3 pt-4 pb-4 border-b">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Safety</h4>
          <PreferenceSlider
            label="Max Violent Crime Rate"
            value={preferences.advanced.qualityOfLife.maxViolentCrimeRate}
            onChange={(v) => updateAdvanced("qualityOfLife", "maxViolentCrimeRate", v)}
            min={100}
            max={800}
            step={50}
            tooltip={TOOLTIPS["advanced.qualityOfLife.maxViolentCrimeRate"]}
            formatValue={(v) => `<${v}/100K`}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Label htmlFor="fallingCrime" className="text-sm">
                Prefer falling crime trend
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{TOOLTIPS["advanced.qualityOfLife.preferFallingCrime"]}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              id="fallingCrime"
              checked={preferences.advanced.qualityOfLife.preferFallingCrime}
              onCheckedChange={(v) => updateAdvanced("qualityOfLife", "preferFallingCrime", v)}
            />
          </div>
        </div>

        {/* Air Quality */}
        <div className="space-y-3 pt-4 pb-4 border-b">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Air Quality</h4>
          <PreferenceSlider
            label="Max Hazardous Days"
            value={preferences.advanced.qualityOfLife.maxHazardousDays}
            onChange={(v) => updateAdvanced("qualityOfLife", "maxHazardousDays", v)}
            min={0}
            max={60}
            tooltip={TOOLTIPS["advanced.qualityOfLife.maxHazardousDays"]}
            formatValue={(v) => v === 0 ? "0 days" : `${v} days/yr`}
          />
        </div>

        {/* Internet */}
        <div className="space-y-3 pt-4 pb-4 border-b">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Internet</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Label htmlFor="requireFiber" className="text-sm">
                Require fiber internet
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{TOOLTIPS["advanced.qualityOfLife.requireFiber"]}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              id="requireFiber"
              checked={preferences.advanced.qualityOfLife.requireFiber}
              onCheckedChange={(v) => updateAdvanced("qualityOfLife", "requireFiber", v)}
            />
          </div>
          <PreferenceSlider
            label="Min Providers"
            value={preferences.advanced.qualityOfLife.minProviders}
            onChange={(v) => updateAdvanced("qualityOfLife", "minProviders", v)}
            min={1}
            max={5}
            tooltip={TOOLTIPS["advanced.qualityOfLife.minProviders"]}
            formatValue={(v) => `${v}+`}
          />
        </div>

        {/* Schools */}
        <div className="space-y-3 pt-4 pb-4 border-b">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Schools</h4>
          <PreferenceSlider
            label="Max Student-Teacher Ratio"
            value={preferences.advanced.qualityOfLife.maxStudentTeacherRatio}
            onChange={(v) => updateAdvanced("qualityOfLife", "maxStudentTeacherRatio", v)}
            min={10}
            max={30}
            tooltip={TOOLTIPS["advanced.qualityOfLife.maxStudentTeacherRatio"]}
            formatValue={(v) => `${v}:1`}
          />
        </div>

        {/* Healthcare */}
        <div className="space-y-3 pt-4 pb-4 border-b">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Healthcare</h4>
          <PreferenceSlider
            label="Min Physicians per 100K"
            value={preferences.advanced.qualityOfLife.minPhysiciansPer100k}
            onChange={(v) => updateAdvanced("qualityOfLife", "minPhysiciansPer100k", v)}
            min={0}
            max={150}
            step={10}
            tooltip={TOOLTIPS["advanced.qualityOfLife.minPhysiciansPer100k"]}
            formatValue={(v) => v === 0 ? "Any" : `${v}+`}
          />
        </div>

        {/* Recreation & Outdoor Access */}
        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
            <TreePine className="h-4 w-4 text-green-600" />
            Recreation & Outdoor Access
          </h4>
          <PreferenceSlider
            label="Recreation Weight (in QoL)"
            value={preferences.advanced.qualityOfLife.weights.recreation}
            onChange={(v) => updateQoLWeight("recreation", v)}
            min={0}
            max={50}
            tooltip={TOOLTIPS["advanced.qualityOfLife.weights.recreation"]}
            formatValue={(v) => v === 0 ? "Off" : `${v}%`}
          />
          
          {preferences.advanced.qualityOfLife.weights.recreation > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Fine-tune which outdoor activities matter most to you:
              </p>
              
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TreePine className="h-4 w-4 text-green-600" />
                  Nature & Hiking
                </div>
                <PreferenceSlider
                  label="Importance"
                  value={preferences.advanced.qualityOfLife.natureImportance}
                  onChange={(v) => updateAdvanced("qualityOfLife", "natureImportance", v)}
                  tooltip={TOOLTIPS["advanced.qualityOfLife.natureImportance"]}
                  formatValue={(v) => v === 0 ? "Off" : `${v}%`}
                />
                <p className="text-xs text-muted-foreground">
                  Parks, hiking trails, protected lands. Denver: 300+ miles nearby.
                </p>
              </div>
              
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Waves className="h-4 w-4 text-blue-500" />
                  Beach & Coastal Access
                </div>
                <PreferenceSlider
                  label="Importance"
                  value={preferences.advanced.qualityOfLife.beachImportance}
                  onChange={(v) => updateAdvanced("qualityOfLife", "beachImportance", v)}
                  tooltip={TOOLTIPS["advanced.qualityOfLife.beachImportance"]}
                  formatValue={(v) => v === 0 ? "Off" : `${v}%`}
                />
                <p className="text-xs text-muted-foreground">
                  ~30% of US cities within 15mi of coastline. San Diego, Miami, Seattle.
                </p>
              </div>
              
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mountain className="h-4 w-4 text-slate-600" />
                  Mountains & Skiing
                </div>
                <PreferenceSlider
                  label="Importance"
                  value={preferences.advanced.qualityOfLife.mountainImportance}
                  onChange={(v) => updateAdvanced("qualityOfLife", "mountainImportance", v)}
                  tooltip={TOOLTIPS["advanced.qualityOfLife.mountainImportance"]}
                  formatValue={(v) => v === 0 ? "Off" : `${v}%`}
                />
                <p className="text-xs text-muted-foreground">
                  Elevation prominence and ski access. Salt Lake: 4000ft+ nearby, Dallas: flat.
                </p>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Cultural Preferences */}
      <CollapsibleSection
        id="cultural"
        title="Cultural Preferences"
        icon={<Church className="h-4 w-4 text-purple-500" />}
        openSection={openSection}
        onToggle={setOpenSection}
      >
        {/* Privacy Note */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mb-4">
          <ShieldCheck className="h-3 w-3 inline mr-1" />
          Political and religious preferences are stored locally in your browser only.
        </div>

        {/* Political Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium">Political Preference</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{TOOLTIPS["advanced.cultural.partisanPreference"]}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex flex-wrap gap-1">
              {(["strong-dem", "lean-dem", "swing", "lean-rep", "strong-rep", "neutral"] as const).map((pref) => (
                <button
                  key={pref}
                  onClick={() => updateAdvanced("cultural", "partisanPreference", pref)}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium transition-all",
                    preferences.advanced.cultural.partisanPreference === pref
                      ? pref === "strong-dem"
                        ? "bg-blue-600 text-white"
                        : pref === "lean-dem"
                        ? "bg-blue-400 text-white"
                        : pref === "swing"
                        ? "bg-purple-500 text-white"
                        : pref === "lean-rep"
                        ? "bg-red-400 text-white"
                        : pref === "strong-rep"
                        ? "bg-red-600 text-white"
                        : "bg-muted text-foreground ring-2 ring-primary"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {pref === "strong-dem" ? "Strong D" : 
                   pref === "lean-dem" ? "Lean D" :
                   pref === "swing" ? "Swing" :
                   pref === "lean-rep" ? "Lean R" :
                   pref === "strong-rep" ? "Strong R" : "Neutral"}
                </button>
              ))}
            </div>
          </div>

          {preferences.advanced.cultural.partisanPreference !== "neutral" && (
            <PreferenceSlider
              label="Political Weight"
              value={preferences.advanced.cultural.partisanWeight}
              onChange={(v) => updateAdvanced("cultural", "partisanWeight", v)}
              tooltip={TOOLTIPS["advanced.cultural.partisanWeight"]}
              formatValue={(v) => v === 0 ? "Ignore" : v >= 80 ? "Very Important" : v >= 40 ? "Important" : "Minor"}
            />
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="highTurnout"
              checked={preferences.advanced.cultural.preferHighTurnout}
              onCheckedChange={(v) => updateAdvanced("cultural", "preferHighTurnout", v)}
            />
            <div className="flex items-center gap-1">
              <Label htmlFor="highTurnout" className="text-sm">
                Prefer high voter turnout
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{TOOLTIPS["advanced.cultural.preferHighTurnout"]}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Religious Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium">Religious Traditions</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{TOOLTIPS["advanced.cultural.religiousTraditions"]}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "catholic", label: "Catholic" },
                { id: "evangelical", label: "Evangelical" },
                { id: "mainline", label: "Mainline Protestant" },
                { id: "jewish", label: "Jewish" },
                { id: "muslim", label: "Muslim" },
                { id: "unaffiliated", label: "Secular/None" },
              ].map((tradition) => (
                <div key={tradition.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={tradition.id}
                    checked={preferences.advanced.cultural.religiousTraditions.includes(tradition.id)}
                    onCheckedChange={(checked) => {
                      const current = preferences.advanced.cultural.religiousTraditions;
                      const updated = checked
                        ? [...current, tradition.id]
                        : current.filter((t) => t !== tradition.id);
                      updateAdvanced("cultural", "religiousTraditions", updated);
                    }}
                  />
                  <Label htmlFor={tradition.id} className="text-sm">
                    {tradition.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {preferences.advanced.cultural.religiousTraditions.length > 0 && (
            <>
              <PreferenceSlider
                label="Minimum Presence (per 1,000)"
                value={preferences.advanced.cultural.minTraditionPresence}
                onChange={(v) => updateAdvanced("cultural", "minTraditionPresence", v)}
                min={0}
                max={300}
                step={10}
                tooltip={TOOLTIPS["advanced.cultural.minTraditionPresence"]}
                formatValue={(v) => v === 0 ? "Any" : `${v}+`}
              />
              <PreferenceSlider
                label="Traditions Weight"
                value={preferences.advanced.cultural.traditionsWeight}
                onChange={(v) => updateAdvanced("cultural", "traditionsWeight", v)}
                tooltip={TOOLTIPS["advanced.cultural.traditionsWeight"]}
                formatValue={(v) => v === 0 ? "Ignore" : v >= 80 ? "Very Important" : v >= 40 ? "Important" : "Minor"}
              />
            </>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="religiousDiversity"
              checked={preferences.advanced.cultural.preferReligiousDiversity}
              onCheckedChange={(v) => updateAdvanced("cultural", "preferReligiousDiversity", v)}
            />
            <div className="flex items-center gap-1">
              <Label htmlFor="religiousDiversity" className="text-sm">
                Prefer religious diversity
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{TOOLTIPS["advanced.cultural.preferReligiousDiversity"]}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {preferences.advanced.cultural.preferReligiousDiversity && (
            <PreferenceSlider
              label="Diversity Weight"
              value={preferences.advanced.cultural.diversityWeight}
              onChange={(v) => updateAdvanced("cultural", "diversityWeight", v)}
              tooltip={TOOLTIPS["advanced.cultural.diversityWeight"]}
              formatValue={(v) => v === 0 ? "Ignore" : v >= 80 ? "Very Important" : v >= 40 ? "Important" : "Minor"}
            />
          )}
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Urban Lifestyle Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Wine className="h-4 w-4 text-purple-500" />
                Urban Lifestyle & Entertainment
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{TOOLTIPS["advanced.cultural.urbanLifestyleWeight"]}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <PreferenceSlider
            label="Urban Lifestyle Weight"
            value={preferences.advanced.cultural.urbanLifestyleWeight}
            onChange={(v) => updateAdvanced("cultural", "urbanLifestyleWeight", v)}
            tooltip={TOOLTIPS["advanced.cultural.urbanLifestyleWeight"]}
            formatValue={(v) => v === 0 ? "Off" : v >= 80 ? "Very Important" : v >= 40 ? "Important" : "Minor"}
          />

          {preferences.advanced.cultural.urbanLifestyleWeight > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Fine-tune which urban amenities matter most to you:
              </p>
              
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wine className="h-4 w-4 text-purple-500" />
                  Nightlife & Bars
                </div>
                <PreferenceSlider
                  label="Importance"
                  value={preferences.advanced.cultural.nightlifeImportance}
                  onChange={(v) => updateAdvanced("cultural", "nightlifeImportance", v)}
                  tooltip={TOOLTIPS["advanced.cultural.nightlifeImportance"]}
                  formatValue={(v) => v === 0 ? "Off" : `${v}%`}
                />
                <p className="text-xs text-muted-foreground">
                  Bars, clubs, late-night venues. NYC: 1,500+ bars, smaller cities: 50-100.
                </p>
              </div>
              
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Palette className="h-4 w-4 text-pink-500" />
                  Museums & Arts
                </div>
                <PreferenceSlider
                  label="Importance"
                  value={preferences.advanced.cultural.artsImportance}
                  onChange={(v) => updateAdvanced("cultural", "artsImportance", v)}
                  tooltip={TOOLTIPS["advanced.cultural.artsImportance"]}
                  formatValue={(v) => v === 0 ? "Off" : `${v}%`}
                />
                <p className="text-xs text-muted-foreground">
                  Museums, theaters, galleries. DC: 70+ museums, most cities: 10-20.
                </p>
              </div>
              
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Utensils className="h-4 w-4 text-amber-600" />
                  Dining Scene
                </div>
                <PreferenceSlider
                  label="Importance"
                  value={preferences.advanced.cultural.diningImportance}
                  onChange={(v) => updateAdvanced("cultural", "diningImportance", v)}
                  tooltip={TOOLTIPS["advanced.cultural.diningImportance"]}
                  formatValue={(v) => v === 0 ? "Off" : `${v}%`}
                />
                <p className="text-xs text-muted-foreground">
                  Fine dining, cuisine diversity, craft breweries. SF/NYC: world-class.
                </p>
              </div>
              
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-lg">🏈</span>
                  Professional Sports
                </div>
                <PreferenceSlider
                  label="Importance"
                  value={preferences.advanced.cultural.sportsImportance}
                  onChange={(v) => updateAdvanced("cultural", "sportsImportance", v)}
                  tooltip={TOOLTIPS["advanced.cultural.sportsImportance"]}
                  formatValue={(v) => v === 0 ? "Off" : `${v}%`}
                />
                <p className="text-xs text-muted-foreground">
                  NFL and NBA teams. NYC/LA: 4+ teams, most cities: 1-2, some: none.
                </p>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
