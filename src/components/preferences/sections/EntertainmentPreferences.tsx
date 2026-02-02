"use client";

import { usePreferencesStore } from "@/lib/store";
import { TOOLTIPS } from "@/types/preferences";
import { PreferenceSlider } from "../PreferenceSlider";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Wine, Palette, Utensils, TreePine, Mountain, Waves } from "lucide-react";

export function EntertainmentPreferences() {
  const { preferences, updateAdvanced } = usePreferencesStore();
  
  // Defensive: ensure entertainment prefs exist (should be set by store defaults/migration)
  const entertainmentPrefs = preferences.advanced?.entertainment ?? {
    nightlifeImportance: 50,
    artsImportance: 50,
    diningImportance: 50,
    sportsImportance: 50,
    recreationImportance: 50,
    natureWeight: 50,
    beachWeight: 50,
    mountainWeight: 50,
  };

  return (
    <>
      {/* Urban Amenities Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Wine className="h-4 w-4 text-purple-500" />
              Urban Amenities
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">Configure how important nightlife, arts, dining, and sports are to you.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="space-y-3 p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wine className="h-4 w-4 text-purple-500" />
            Nightlife & Bars
          </div>
          <PreferenceSlider
            label="Importance"
            value={entertainmentPrefs.nightlifeImportance}
            onChange={(v) => updateAdvanced("entertainment", "nightlifeImportance", v)}
            tooltip={TOOLTIPS["advanced.entertainment.nightlifeImportance"]}
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
            value={entertainmentPrefs.artsImportance}
            onChange={(v) => updateAdvanced("entertainment", "artsImportance", v)}
            tooltip={TOOLTIPS["advanced.entertainment.artsImportance"]}
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
            value={entertainmentPrefs.diningImportance}
            onChange={(v) => updateAdvanced("entertainment", "diningImportance", v)}
            tooltip={TOOLTIPS["advanced.entertainment.diningImportance"]}
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
            value={entertainmentPrefs.sportsImportance}
            onChange={(v) => updateAdvanced("entertainment", "sportsImportance", v)}
            tooltip={TOOLTIPS["advanced.entertainment.sportsImportance"]}
            formatValue={(v) => v === 0 ? "Off" : `${v}%`}
          />
          <p className="text-xs text-muted-foreground">
            NFL and NBA teams. NYC/LA: 4+ teams, most cities: 1-2, some: none.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t my-4" />

      {/* Recreation & Outdoor Access Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label className="text-sm font-medium flex items-center gap-2">
              <TreePine className="h-4 w-4 text-green-600" />
              Recreation & Outdoor Access
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{TOOLTIPS["advanced.entertainment.recreationImportance"]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <PreferenceSlider
          label="Recreation Importance"
          value={entertainmentPrefs.recreationImportance}
          onChange={(v) => updateAdvanced("entertainment", "recreationImportance", v)}
          tooltip={TOOLTIPS["advanced.entertainment.recreationImportance"]}
          formatValue={(v) => v === 0 ? "Off" : `${v}%`}
        />

        {entertainmentPrefs.recreationImportance > 0 && (
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
                value={entertainmentPrefs.natureWeight}
                onChange={(v) => updateAdvanced("entertainment", "natureWeight", v)}
                tooltip={TOOLTIPS["advanced.entertainment.natureWeight"]}
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
                value={entertainmentPrefs.beachWeight}
                onChange={(v) => updateAdvanced("entertainment", "beachWeight", v)}
                tooltip={TOOLTIPS["advanced.entertainment.beachWeight"]}
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
                value={entertainmentPrefs.mountainWeight}
                onChange={(v) => updateAdvanced("entertainment", "mountainWeight", v)}
                tooltip={TOOLTIPS["advanced.entertainment.mountainWeight"]}
                formatValue={(v) => v === 0 ? "Off" : `${v}%`}
              />
              <p className="text-xs text-muted-foreground">
                Elevation prominence and ski access. Salt Lake: 4000ft+ nearby, Dallas: flat.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
