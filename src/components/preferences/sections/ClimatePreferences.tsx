"use client";

import { usePreferencesStore } from "@/lib/store";
import { TOOLTIPS } from "@/types/preferences";
import { PreferenceSlider } from "../PreferenceSlider";
import {
  Sun, Snowflake, CloudRain, Zap, Leaf, Activity,
  Cloud, Droplets, Thermometer
} from "lucide-react";

export function ClimatePreferences() {
  const { preferences, updateAdvanced } = usePreferencesStore();

  return (
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
  );
}
