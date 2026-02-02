"use client";

import { usePreferencesStore } from "@/lib/store";
import { TOOLTIPS } from "@/types/preferences";
import { PreferenceSlider } from "../PreferenceSlider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, ShieldCheck, Wine, Palette, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

export function CulturalPreferences() {
  const { preferences, updateAdvanced } = usePreferencesStore();

  return (
    <>
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
    </>
  );
}
