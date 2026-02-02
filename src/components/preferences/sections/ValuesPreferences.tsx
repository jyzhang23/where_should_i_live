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
import { Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function ValuesPreferences() {
  const { preferences, updateAdvanced } = usePreferencesStore();
  
  // Defensive: ensure values prefs exist (should be set by store defaults/migration)
  const valuesPrefs = preferences.advanced?.values ?? {
    partisanPreference: "neutral" as const,
    partisanWeight: 0,
    preferHighTurnout: false,
    religiousTraditions: [] as string[],
    minTraditionPresence: 50,
    traditionsWeight: 0,
    preferReligiousDiversity: false,
    diversityWeight: 0,
  };

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
                <p className="text-sm">{TOOLTIPS["advanced.values.partisanPreference"]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-wrap gap-1">
            {(["strong-dem", "lean-dem", "swing", "lean-rep", "strong-rep", "neutral"] as const).map((pref) => (
              <button
                key={pref}
                onClick={() => updateAdvanced("values", "partisanPreference", pref)}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium transition-all",
                  valuesPrefs.partisanPreference === pref
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

        {valuesPrefs.partisanPreference !== "neutral" && (
          <PreferenceSlider
            label="Political Weight"
            value={valuesPrefs.partisanWeight}
            onChange={(v) => updateAdvanced("values", "partisanWeight", v)}
            tooltip={TOOLTIPS["advanced.values.partisanWeight"]}
            formatValue={(v) => v === 0 ? "Ignore" : v >= 80 ? "Very Important" : v >= 40 ? "Important" : "Minor"}
          />
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="highTurnout"
            checked={valuesPrefs.preferHighTurnout}
            onCheckedChange={(v) => updateAdvanced("values", "preferHighTurnout", v)}
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
                <p className="text-sm">{TOOLTIPS["advanced.values.preferHighTurnout"]}</p>
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
                <p className="text-sm">{TOOLTIPS["advanced.values.religiousTraditions"]}</p>
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
                  checked={valuesPrefs.religiousTraditions.includes(tradition.id)}
                  onCheckedChange={(checked) => {
                    const current = valuesPrefs.religiousTraditions;
                    const updated = checked
                      ? [...current, tradition.id]
                      : current.filter((t) => t !== tradition.id);
                    updateAdvanced("values", "religiousTraditions", updated);
                  }}
                />
                <Label htmlFor={tradition.id} className="text-sm">
                  {tradition.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {valuesPrefs.religiousTraditions.length > 0 && (
          <>
            <PreferenceSlider
              label="Minimum Presence (per 1,000)"
              value={valuesPrefs.minTraditionPresence}
              onChange={(v) => updateAdvanced("values", "minTraditionPresence", v)}
              min={0}
              max={300}
              step={10}
              tooltip={TOOLTIPS["advanced.values.minTraditionPresence"]}
              formatValue={(v) => v === 0 ? "Any" : `${v}+`}
            />
            <PreferenceSlider
              label="Traditions Weight"
              value={valuesPrefs.traditionsWeight}
              onChange={(v) => updateAdvanced("values", "traditionsWeight", v)}
              tooltip={TOOLTIPS["advanced.values.traditionsWeight"]}
              formatValue={(v) => v === 0 ? "Ignore" : v >= 80 ? "Very Important" : v >= 40 ? "Important" : "Minor"}
            />
          </>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="religiousDiversity"
            checked={valuesPrefs.preferReligiousDiversity}
            onCheckedChange={(v) => updateAdvanced("values", "preferReligiousDiversity", v)}
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
                <p className="text-sm">{TOOLTIPS["advanced.values.preferReligiousDiversity"]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {valuesPrefs.preferReligiousDiversity && (
          <PreferenceSlider
            label="Diversity Weight"
            value={valuesPrefs.diversityWeight}
            onChange={(v) => updateAdvanced("values", "diversityWeight", v)}
            tooltip={TOOLTIPS["advanced.values.diversityWeight"]}
            formatValue={(v) => v === 0 ? "Ignore" : v >= 80 ? "Very Important" : v >= 40 ? "Important" : "Minor"}
          />
        )}
      </div>
    </>
  );
}
