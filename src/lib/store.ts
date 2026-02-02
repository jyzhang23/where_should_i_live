import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserPreferences, DEFAULT_PREFERENCES } from "@/types/preferences";

// Legacy interface for old cultural preferences (pre-v2 migration)
interface LegacyCultural {
  partisanPreference?: string;
  partisanWeight?: number;
  preferHighTurnout?: boolean;
  religiousTraditions?: string[];
  minTraditionPresence?: number;
  traditionsWeight?: number;
  preferReligiousDiversity?: boolean;
  diversityWeight?: number;
  urbanLifestyleWeight?: number;
  nightlifeImportance?: number;
  artsImportance?: number;
  diningImportance?: number;
  sportsImportance?: number;
}

// Legacy interface for old QoL preferences with recreation
interface LegacyQoL {
  recreationWeight?: number;
  natureImportance?: number;
  beachImportance?: number;
  mountainImportance?: number;
  weights?: {
    recreation?: number;
    [key: string]: number | undefined;
  };
  [key: string]: unknown;
}

// Legacy weights that might have 'cultural' instead of 'values'/'entertainment'
interface LegacyWeights {
  cultural?: number;
  values?: number;
  entertainment?: number;
  [key: string]: number | undefined;
}

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
  updateQoLWeight: (
    key: keyof UserPreferences["advanced"]["qualityOfLife"]["weights"],
    value: number
  ) => void;
  resetToDefaults: () => void;
  exportPreferences: () => string;
  importPreferences: (json: string) => boolean;
}

/**
 * Migrate old preferences format to new 6-category structure
 * - Split cultural → values + entertainment
 * - Move recreation from QoL to entertainment
 */
function migratePreferences(persisted: {
  weights?: LegacyWeights;
  advanced?: {
    cultural?: LegacyCultural;
    qualityOfLife?: LegacyQoL;
    values?: UserPreferences["advanced"]["values"];
    entertainment?: UserPreferences["advanced"]["entertainment"];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}): Partial<UserPreferences> {
  const result: Partial<UserPreferences> = {};
  
  // Migrate weights: cultural → values + entertainment (50/50 split)
  if (persisted.weights) {
    const legacyWeights = persisted.weights as LegacyWeights;
    if (legacyWeights.cultural !== undefined && legacyWeights.values === undefined) {
      const culturalWeight = legacyWeights.cultural;
      result.weights = {
        ...DEFAULT_PREFERENCES.weights,
        ...persisted.weights,
        values: Math.round(culturalWeight * 0.5),
        entertainment: Math.round(culturalWeight * 0.5),
      } as UserPreferences["weights"];
      // Remove the deprecated cultural key
      delete (result.weights as LegacyWeights).cultural;
    }
  }
  
  // Migrate advanced.cultural → advanced.values + advanced.entertainment
  if (persisted.advanced?.cultural && !persisted.advanced?.values) {
    const cultural = persisted.advanced.cultural as LegacyCultural;
    
    // Extract values (political + religious)
    result.advanced = {
      ...DEFAULT_PREFERENCES.advanced,
      values: {
        ...DEFAULT_PREFERENCES.advanced.values,
        partisanPreference: (cultural.partisanPreference as UserPreferences["advanced"]["values"]["partisanPreference"]) || "neutral",
        partisanWeight: cultural.partisanWeight || 0,
        preferHighTurnout: cultural.preferHighTurnout || false,
        religiousTraditions: cultural.religiousTraditions || [],
        minTraditionPresence: cultural.minTraditionPresence || 50,
        traditionsWeight: cultural.traditionsWeight || 0,
        preferReligiousDiversity: cultural.preferReligiousDiversity || false,
        diversityWeight: cultural.diversityWeight || 0,
      },
      entertainment: {
        ...DEFAULT_PREFERENCES.advanced.entertainment,
        nightlifeImportance: cultural.nightlifeImportance || 50,
        artsImportance: cultural.artsImportance || 50,
        diningImportance: cultural.diningImportance || 50,
        sportsImportance: cultural.sportsImportance || 50,
        // Recreation will be merged from QoL below
      },
    };
  }
  
  // Migrate advanced.qualityOfLife.recreation* → advanced.entertainment
  if (persisted.advanced?.qualityOfLife) {
    const qol = persisted.advanced.qualityOfLife as LegacyQoL;
    
    if (qol.recreationWeight !== undefined || qol.natureImportance !== undefined) {
      if (!result.advanced) {
        result.advanced = { ...DEFAULT_PREFERENCES.advanced };
      }
      if (!result.advanced.entertainment) {
        result.advanced.entertainment = { ...DEFAULT_PREFERENCES.advanced.entertainment };
      }
      
      // Move recreation prefs to entertainment
      result.advanced.entertainment = {
        ...result.advanced.entertainment,
        recreationImportance: qol.recreationWeight || qol.weights?.recreation || 50,
        natureWeight: qol.natureImportance || 50,
        beachWeight: qol.beachImportance || 50,
        mountainWeight: qol.mountainImportance || 50,
      };
    }
  }
  
  return result;
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

      updateQoLWeight: (key, value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            advanced: {
              ...state.preferences.advanced,
              qualityOfLife: {
                ...state.preferences.advanced.qualityOfLife,
                weights: {
                  ...state.preferences.advanced.qualityOfLife.weights,
                  [key]: value,
                },
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
          if (parsed.weights && parsed.advanced) {
            // Check if migration is needed (old format has 'cultural', new format has 'values')
            const migrated = migratePreferences(parsed);
            
            // Merge with defaults to ensure all fields exist
            const merged: UserPreferences = {
              weights: { 
                ...DEFAULT_PREFERENCES.weights, 
                ...parsed.weights,
                ...migrated.weights,
              },
              filters: {}, // Empty - old filters are obsolete
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
                  weights: {
                    ...DEFAULT_PREFERENCES.advanced.qualityOfLife.weights,
                    ...parsed.advanced?.qualityOfLife?.weights,
                  },
                },
                values: {
                  ...DEFAULT_PREFERENCES.advanced.values,
                  ...parsed.advanced?.values,
                  ...migrated.advanced?.values,
                },
                entertainment: {
                  ...DEFAULT_PREFERENCES.advanced.entertainment,
                  ...parsed.advanced?.entertainment,
                  ...migrated.advanced?.entertainment,
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
      // Merge stored data with defaults to handle new fields added over time
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PreferencesState | undefined;
        if (!persisted?.preferences) {
          return currentState;
        }
        
        // Check if migration is needed (old format has 'cultural', new format has 'values')
        const migrated = migratePreferences(persisted.preferences as unknown as Parameters<typeof migratePreferences>[0]);
        
        // Deep merge preferences with defaults
        return {
          ...currentState,
          preferences: {
            weights: {
              ...DEFAULT_PREFERENCES.weights,
              ...persisted.preferences.weights,
              ...migrated.weights,
            },
            filters: {}, // Empty - old filters migrated to sportsImportance preference
            advanced: {
              climate: {
                ...DEFAULT_PREFERENCES.advanced.climate,
                ...persisted.preferences.advanced?.climate,
              },
              costOfLiving: {
                ...DEFAULT_PREFERENCES.advanced.costOfLiving,
                ...persisted.preferences.advanced?.costOfLiving,
              },
              demographics: {
                ...DEFAULT_PREFERENCES.advanced.demographics,
                ...persisted.preferences.advanced?.demographics,
              },
              qualityOfLife: {
                ...DEFAULT_PREFERENCES.advanced.qualityOfLife,
                ...persisted.preferences.advanced?.qualityOfLife,
                // Ensure nested weights object is properly merged
                weights: {
                  ...DEFAULT_PREFERENCES.advanced.qualityOfLife.weights,
                  ...persisted.preferences.advanced?.qualityOfLife?.weights,
                },
              },
              values: {
                ...DEFAULT_PREFERENCES.advanced.values,
                ...persisted.preferences.advanced?.values,
                ...migrated.advanced?.values,
                // Migrate from very old political preferences if values doesn't exist
                ...(persisted.preferences.advanced?.values === undefined && 
                    (persisted.preferences.advanced as { political?: { preferredLeaning?: string; strengthOfPreference?: number } })?.political ? {
                  partisanPreference: 
                    (persisted.preferences.advanced as { political: { preferredLeaning: string } }).political.preferredLeaning === "blue" ? "lean-dem" :
                    (persisted.preferences.advanced as { political: { preferredLeaning: string } }).political.preferredLeaning === "red" ? "lean-rep" : "neutral",
                  partisanWeight: (persisted.preferences.advanced as { political: { strengthOfPreference?: number } }).political.strengthOfPreference || 0,
                } : {}),
              },
              entertainment: {
                ...DEFAULT_PREFERENCES.advanced.entertainment,
                ...persisted.preferences.advanced?.entertainment,
                ...migrated.advanced?.entertainment,
              },
            },
          },
        };
      },
    }
  )
);
