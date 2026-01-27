import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserPreferences, DEFAULT_PREFERENCES } from "@/types/preferences";

interface PreferencesState {
  preferences: UserPreferences;
  setPreferences: (preferences: UserPreferences) => void;
  updateWeight: (key: keyof UserPreferences["weights"], value: number) => void;
  updateFilter: <K extends keyof UserPreferences["filters"]>(
    key: K,
    value: UserPreferences["filters"][K]
  ) => void;
  updateAdvanced: <
    Category extends keyof UserPreferences["advanced"],
    Key extends keyof UserPreferences["advanced"][Category]
  >(
    category: Category,
    key: Key,
    value: UserPreferences["advanced"][Category][Key]
  ) => void;
  resetToDefaults: () => void;
  exportPreferences: () => string;
  importPreferences: (json: string) => boolean;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFERENCES,

      setPreferences: (preferences) => set({ preferences }),

      updateWeight: (key, value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            weights: {
              ...state.preferences.weights,
              [key]: value,
            },
          },
        })),

      updateFilter: (key, value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            filters: {
              ...state.preferences.filters,
              [key]: value,
            },
          },
        })),

      updateAdvanced: (category, key, value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            advanced: {
              ...state.preferences.advanced,
              [category]: {
                ...state.preferences.advanced[category],
                [key]: value,
              },
            },
          },
        })),

      resetToDefaults: () => set({ preferences: DEFAULT_PREFERENCES }),

      exportPreferences: () => {
        return JSON.stringify(get().preferences, null, 2);
      },

      importPreferences: (json: string) => {
        try {
          const parsed = JSON.parse(json);
          // Basic validation - check required top-level keys
          if (parsed.weights && parsed.filters && parsed.advanced) {
            // Merge with defaults to ensure all fields exist
            const merged: UserPreferences = {
              weights: { ...DEFAULT_PREFERENCES.weights, ...parsed.weights },
              filters: { ...DEFAULT_PREFERENCES.filters, ...parsed.filters },
              advanced: {
                climate: {
                  ...DEFAULT_PREFERENCES.advanced.climate,
                  ...parsed.advanced?.climate,
                },
                costOfLiving: {
                  ...DEFAULT_PREFERENCES.advanced.costOfLiving,
                  ...parsed.advanced?.costOfLiving,
                },
                demographics: {
                  ...DEFAULT_PREFERENCES.advanced.demographics,
                  ...parsed.advanced?.demographics,
                },
                qualityOfLife: {
                  ...DEFAULT_PREFERENCES.advanced.qualityOfLife,
                  ...parsed.advanced?.qualityOfLife,
                },
                political: {
                  ...DEFAULT_PREFERENCES.advanced.political,
                  ...parsed.advanced?.political,
                },
              },
            };
            set({ preferences: merged });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "city-preferences",
    }
  )
);
