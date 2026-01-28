"use client";

import { usePreferencesStore } from "@/lib/store";
import { TOOLTIPS } from "@/types/preferences";
import { PreferenceSlider } from "./PreferenceSlider";
import { QuickStart } from "./QuickStart";

export function BasicPreferences() {
  const { preferences, updateWeight } = usePreferencesStore();

  return (
    <div className="space-y-6">
      {/* Quick Setup */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">New here?</h3>
          <p className="text-xs text-muted-foreground">
            Answer a few questions to get started
          </p>
        </div>
        <QuickStart />
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
          label="Cultural"
          value={preferences.weights.cultural}
          onChange={(v) => updateWeight("cultural", v)}
          tooltip={TOOLTIPS["weights.cultural"]}
        />
      </div>
    </div>
  );
}
