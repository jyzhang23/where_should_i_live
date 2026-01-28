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
import { ChevronRight, Info, Thermometer, Users, Heart, Vote, DollarSign, Home, Key, ShoppingCart } from "lucide-react";
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
      {/* Climate Details */}
      <CollapsibleSection
        title="Climate Details"
        icon={<Thermometer className="h-4 w-4 text-orange-500" />}
      >
        <PreferenceSlider
          label="Ideal Temperature"
          value={preferences.advanced.climate.idealTemp}
          onChange={(v) => updateAdvanced("climate", "idealTemp", v)}
          min={40}
          max={85}
          tooltip={TOOLTIPS["advanced.climate.idealTemp"]}
          formatValue={(v) => `${v}°F`}
        />
        <PreferenceSlider
          label="Max Summer Temp"
          value={preferences.advanced.climate.maxSummerTemp}
          onChange={(v) => updateAdvanced("climate", "maxSummerTemp", v)}
          min={70}
          max={110}
          tooltip={TOOLTIPS["advanced.climate.maxSummerTemp"]}
          formatValue={(v) => `${v}°F`}
        />
        <PreferenceSlider
          label="Min Winter Temp"
          value={preferences.advanced.climate.minWinterTemp}
          onChange={(v) => updateAdvanced("climate", "minWinterTemp", v)}
          min={0}
          max={60}
          tooltip={TOOLTIPS["advanced.climate.minWinterTemp"]}
          formatValue={(v) => `${v}°F`}
        />
        <PreferenceSlider
          label="Min Sunshine Days"
          value={preferences.advanced.climate.minSunshineDays}
          onChange={(v) => updateAdvanced("climate", "minSunshineDays", v)}
          min={100}
          max={320}
          tooltip={TOOLTIPS["advanced.climate.minSunshineDays"]}
          formatValue={(v) => `${v} days`}
        />
        <PreferenceSlider
          label="Max Rain Days"
          value={preferences.advanced.climate.maxRainDays}
          onChange={(v) => updateAdvanced("climate", "maxRainDays", v)}
          min={30}
          max={200}
          tooltip={TOOLTIPS["advanced.climate.maxRainDays"]}
          formatValue={(v) => `${v} days`}
        />
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
