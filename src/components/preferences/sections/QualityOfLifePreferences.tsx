"use client";

import { usePreferencesStore } from "@/lib/store";
import { TOOLTIPS } from "@/types/preferences";
import { PreferenceSlider } from "../PreferenceSlider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export function QualityOfLifePreferences() {
  const { preferences, updateAdvanced, updateQoLWeight } = usePreferencesStore();

  return (
    <>
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
      <div className="space-y-3 pt-4">
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

      {/* Note: Recreation has moved to Entertainment category */}
    </>
  );
}
