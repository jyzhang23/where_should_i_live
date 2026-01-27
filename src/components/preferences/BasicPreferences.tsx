"use client";

import { usePreferencesStore } from "@/lib/store";
import { TOOLTIPS } from "@/types/preferences";
import { PreferenceSlider } from "./PreferenceSlider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export function BasicPreferences() {
  const { preferences, updateWeight, updateFilter } = usePreferencesStore();

  return (
    <div className="space-y-6">
      {/* Category Weights */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Category Weights
        </h3>

        <PreferenceSlider
          label="Climate"
          value={preferences.weights.climate}
          onChange={(v) => updateWeight("climate", v)}
          tooltip={TOOLTIPS["weights.climate"]}
        />

        <PreferenceSlider
          label="Cost of Living"
          value={preferences.weights.costOfLiving}
          onChange={(v) => updateWeight("costOfLiving", v)}
          tooltip={TOOLTIPS["weights.costOfLiving"]}
        />

        <PreferenceSlider
          label="Demographics"
          value={preferences.weights.demographics}
          onChange={(v) => updateWeight("demographics", v)}
          tooltip={TOOLTIPS["weights.demographics"]}
        />
      </div>

      {/* Quick Filters */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Filters
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Label htmlFor="nfl" className="text-sm">
              Must have NFL team
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{TOOLTIPS["filters.requiresNFL"]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="nfl"
            checked={preferences.filters.requiresNFL}
            onCheckedChange={(v) => updateFilter("requiresNFL", v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Label htmlFor="nba" className="text-sm">
              Must have NBA team
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{TOOLTIPS["filters.requiresNBA"]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="nba"
            checked={preferences.filters.requiresNBA}
            onCheckedChange={(v) => updateFilter("requiresNBA", v)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="maxPrice" className="text-sm">
              Max home price
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{TOOLTIPS["filters.maxHomePrice"]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              id="maxPrice"
              type="number"
              placeholder="No limit"
              value={preferences.filters.maxHomePrice ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                updateFilter(
                  "maxHomePrice",
                  value === "" ? null : parseInt(value, 10)
                );
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
