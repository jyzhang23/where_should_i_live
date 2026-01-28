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
} from "@/components/ui/tooltip";
import { 
  ChevronRight, Info, Thermometer, Users, Heart, Vote, DollarSign, 
  Home, Key, ShoppingCart, Sun, Snowflake, CloudRain, Zap, Leaf, Activity,
  Cloud, Droplets
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
  const { preferences, updateAdvanced } = usePreferencesStore();

  return (
    <div className="space-y-2 border-t pt-4">
      {/* Climate Details - NOAA-based */}
      <CollapsibleSection
        title="Climate Preferences"
        icon={<Thermometer className="h-4 w-4 text-orange-500" />}
        defaultOpen
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
        title="Cost of Living"
        icon={<DollarSign className="h-4 w-4 text-green-500" />}
        defaultOpen
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

          {/* Info box based on selection */}
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
        </div>
      </CollapsibleSection>

      {/* Demographics Details */}
      <CollapsibleSection
        title="Demographics Details"
        icon={<Users className="h-4 w-4 text-blue-500" />}
      >
        <PreferenceSlider
          label="Min Metro Population"
          value={preferences.advanced.demographics.minPopulation}
          onChange={(v) => updateAdvanced("demographics", "minPopulation", v)}
          min={0}
          max={5000}
          step={100}
          tooltip={TOOLTIPS["advanced.demographics.minPopulation"]}
          formatValue={(v) => v === 0 ? "Any" : `${(v / 1000).toFixed(1)}M+`}
        />
        <PreferenceSlider
          label="Min Diversity Index"
          value={preferences.advanced.demographics.minDiversityIndex}
          onChange={(v) => updateAdvanced("demographics", "minDiversityIndex", v)}
          min={0}
          max={80}
          tooltip={TOOLTIPS["advanced.demographics.minDiversityIndex"]}
          formatValue={(v) => v === 0 ? "Any" : `${v}+`}
        />
        <PreferenceSlider
          label="Target East Asian %"
          value={preferences.advanced.demographics.targetEastAsianPercent}
          onChange={(v) => updateAdvanced("demographics", "targetEastAsianPercent", v)}
          min={0}
          max={30}
          tooltip={TOOLTIPS["advanced.demographics.targetEastAsianPercent"]}
          formatValue={(v) => v === 0 ? "No pref" : `~${v}%`}
        />
      </CollapsibleSection>

      {/* Quality of Life Details */}
      <CollapsibleSection
        title="Quality of Life"
        icon={<Heart className="h-4 w-4 text-red-500" />}
      >
        <PreferenceSlider
          label="Min Walk Score"
          value={preferences.advanced.qualityOfLife.minWalkScore}
          onChange={(v) => updateAdvanced("qualityOfLife", "minWalkScore", v)}
          min={0}
          max={90}
          tooltip={TOOLTIPS["advanced.qualityOfLife.minWalkScore"]}
          formatValue={(v) => v === 0 ? "Any" : `${v}+`}
        />
        <PreferenceSlider
          label="Min Transit Score"
          value={preferences.advanced.qualityOfLife.minTransitScore}
          onChange={(v) => updateAdvanced("qualityOfLife", "minTransitScore", v)}
          min={0}
          max={90}
          tooltip={TOOLTIPS["advanced.qualityOfLife.minTransitScore"]}
          formatValue={(v) => v === 0 ? "Any" : `${v}+`}
        />
        <PreferenceSlider
          label="Max Crime Rate"
          value={preferences.advanced.qualityOfLife.maxCrimeRate}
          onChange={(v) => updateAdvanced("qualityOfLife", "maxCrimeRate", v)}
          min={100}
          max={1000}
          step={50}
          tooltip={TOOLTIPS["advanced.qualityOfLife.maxCrimeRate"]}
          formatValue={(v) => `<${v}/100K`}
        />
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="airport" className="text-sm">
              Require International Airport
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{TOOLTIPS["advanced.qualityOfLife.requiresAirport"]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="airport"
            checked={preferences.advanced.qualityOfLife.requiresAirport}
            onCheckedChange={(v) => updateAdvanced("qualityOfLife", "requiresAirport", v)}
          />
        </div>
      </CollapsibleSection>

      {/* Political Preferences */}
      <CollapsibleSection
        title="Political Preferences"
        icon={<Vote className="h-4 w-4 text-purple-500" />}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-1">
            <Label className="text-sm">Preferred Leaning</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{TOOLTIPS["advanced.political.preferredLeaning"]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            {(["blue", "neutral", "red"] as const).map((leaning) => (
              <button
                key={leaning}
                onClick={() => updateAdvanced("political", "preferredLeaning", leaning)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all",
                  preferences.advanced.political.preferredLeaning === leaning
                    ? leaning === "blue"
                      ? "bg-blue-500 text-white"
                      : leaning === "red"
                      ? "bg-red-500 text-white"
                      : "bg-muted text-foreground ring-2 ring-primary"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {leaning === "blue" ? "Blue" : leaning === "red" ? "Red" : "Neutral"}
              </button>
            ))}
          </div>
        </div>
        {preferences.advanced.political.preferredLeaning !== "neutral" && (
          <PreferenceSlider
            label="Strength of Preference"
            value={preferences.advanced.political.strengthOfPreference}
            onChange={(v) => updateAdvanced("political", "strengthOfPreference", v)}
            tooltip={TOOLTIPS["advanced.political.strengthOfPreference"]}
            formatValue={(v) => v === 0 ? "Weak" : v >= 80 ? "Strong" : "Moderate"}
          />
        )}
      </CollapsibleSection>
    </div>
  );
}
