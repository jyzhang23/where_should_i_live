"use client";

import { usePreferencesStore } from "@/lib/store";
import { TOOLTIPS } from "@/types/preferences";
import { PreferenceSlider } from "./PreferenceSlider";
import { QuickStart } from "./QuickStart";
import { CityTinder } from "./CityTinder";

export function BasicPreferences() {
  const { preferences, updateWeight } = usePreferencesStore();

  return (
    <div className="space-y-6">
      {/* Quick Setup */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold">New here?</h3>
          <p className="text-xs text-muted-foreground">
            Set your preferences with a quick wizard or fun game
          </p>
        </div>
        <div className="flex gap-2">
          <QuickStart />
          <CityTinder />
        </div>
      </div>

      <hr className="border-border" />

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

        <PreferenceSlider
          label="Quality of Life"
          value={preferences.weights.qualityOfLife}
          onChange={(v) => updateWeight("qualityOfLife", v)}
          tooltip={TOOLTIPS["weights.qualityOfLife"]}
        />

        <PreferenceSlider
          label="Entertainment"
          value={preferences.weights.entertainment}
          onChange={(v) => updateWeight("entertainment", v)}
          tooltip={TOOLTIPS["weights.entertainment"]}
        />

        <PreferenceSlider
          label="Values"
          value={preferences.weights.values}
          onChange={(v) => updateWeight("values", v)}
          tooltip={TOOLTIPS["weights.values"]}
        />
      </div>
    </div>
  );
}
