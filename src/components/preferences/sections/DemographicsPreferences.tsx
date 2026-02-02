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
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, HelpCircle } from "lucide-react";

export function DemographicsPreferences() {
  const { preferences, updateAdvanced } = usePreferencesStore();

  return (
    <>
      {/* Population */}
      <div className="space-y-3 pb-3 border-b border-border/50">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Population</h4>
        <PreferenceSlider
          label="Min City Population"
          value={preferences.advanced.demographics.minPopulation}
          onChange={(v) => updateAdvanced("demographics", "minPopulation", v)}
          min={0}
          max={2000000}
          step={50000}
          tooltip={TOOLTIPS["advanced.demographics.minPopulation"]}
          formatValue={(v) => v === 0 ? "Any" : v >= 1000000 ? `${(v / 1000000).toFixed(1)}M+` : `${(v / 1000).toFixed(0)}K+`}
        />
      </div>

      {/* Diversity */}
      <div className="space-y-3 py-3 border-b border-border/50">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Diversity</h4>
        <PreferenceSlider
          label="Diversity Importance"
          value={preferences.advanced.demographics.weightDiversity}
          onChange={(v) => updateAdvanced("demographics", "weightDiversity", v)}
          min={0}
          max={100}
          tooltip={TOOLTIPS["advanced.demographics.weightDiversity"]}
          formatValue={(v) => v === 0 ? "Off" : `${v}%`}
        />
        {preferences.advanced.demographics.weightDiversity > 0 && (
          <PreferenceSlider
            label="Min Diversity Index"
            value={preferences.advanced.demographics.minDiversityIndex}
            onChange={(v) => updateAdvanced("demographics", "minDiversityIndex", v)}
            min={0}
            max={80}
            tooltip={TOOLTIPS["advanced.demographics.minDiversityIndex"]}
            formatValue={(v) => v === 0 ? "Any" : `${v}+`}
          />
        )}
      </div>

      {/* Age Demographics */}
      <div className="space-y-3 py-3 border-b border-border/50">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Age Demographics</h4>
        <PreferenceSlider
          label="Age Importance"
          value={preferences.advanced.demographics.weightAge}
          onChange={(v) => updateAdvanced("demographics", "weightAge", v)}
          min={0}
          max={100}
          tooltip={TOOLTIPS["advanced.demographics.weightAge"]}
          formatValue={(v) => v === 0 ? "Off" : `${v}%`}
        />
        {preferences.advanced.demographics.weightAge > 0 && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              Preferred Age Group
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                  <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.preferredAgeGroup"]}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <Select
              value={preferences.advanced.demographics.preferredAgeGroup}
              onValueChange={(v) => updateAdvanced("demographics", "preferredAgeGroup", v as "young" | "mixed" | "mature" | "any")}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any (No preference)</SelectItem>
                <SelectItem value="young">Young (Median &lt;35)</SelectItem>
                <SelectItem value="mixed">Mixed (Median 35-45)</SelectItem>
                <SelectItem value="mature">Mature (Median &gt;45)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Education */}
      <div className="space-y-3 py-3 border-b border-border/50">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Education</h4>
        <PreferenceSlider
          label="Education Importance"
          value={preferences.advanced.demographics.weightEducation}
          onChange={(v) => updateAdvanced("demographics", "weightEducation", v)}
          min={0}
          max={100}
          tooltip={TOOLTIPS["advanced.demographics.weightEducation"]}
          formatValue={(v) => v === 0 ? "Off" : `${v}%`}
        />
        {preferences.advanced.demographics.weightEducation > 0 && (
          <PreferenceSlider
            label="Min Bachelor's Degree %"
            value={preferences.advanced.demographics.minBachelorsPercent}
            onChange={(v) => updateAdvanced("demographics", "minBachelorsPercent", v)}
            min={0}
            max={60}
            tooltip={TOOLTIPS["advanced.demographics.minBachelorsPercent"]}
            formatValue={(v) => v === 0 ? "Any" : `${v}%+`}
          />
        )}
      </div>

      {/* Foreign-Born / International Culture */}
      <div className="space-y-3 py-3 border-b border-border/50">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">International Culture</h4>
        <PreferenceSlider
          label="International Importance"
          value={preferences.advanced.demographics.weightForeignBorn}
          onChange={(v) => updateAdvanced("demographics", "weightForeignBorn", v)}
          min={0}
          max={100}
          tooltip={TOOLTIPS["advanced.demographics.weightForeignBorn"]}
          formatValue={(v) => v === 0 ? "Off" : `${v}%`}
        />
        {preferences.advanced.demographics.weightForeignBorn > 0 && (
          <PreferenceSlider
            label="Min Foreign-Born %"
            value={preferences.advanced.demographics.minForeignBornPercent}
            onChange={(v) => updateAdvanced("demographics", "minForeignBornPercent", v)}
            min={0}
            max={40}
            tooltip={TOOLTIPS["advanced.demographics.minForeignBornPercent"]}
            formatValue={(v) => v === 0 ? "Any" : `${v}%+`}
          />
        )}
      </div>

      {/* Minority Community */}
      <div className="space-y-3 py-3 border-b border-border/50">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Minority Community</h4>
        
        {/* Dropdown comes first */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Find Community With
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.minorityGroup"]}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </label>
          <Select
            value={preferences.advanced.demographics.minorityGroup}
            onValueChange={(v) => {
              updateAdvanced("demographics", "minorityGroup", v as "none" | "hispanic" | "black" | "asian" | "pacific-islander" | "native-american");
              // Reset subgroup when changing minority group
              updateAdvanced("demographics", "minoritySubgroup", "any");
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (don&apos;t factor in)</SelectItem>
              <SelectItem value="hispanic">Hispanic/Latino</SelectItem>
              <SelectItem value="black">Black/African American</SelectItem>
              <SelectItem value="asian">Asian</SelectItem>
              <SelectItem value="pacific-islander">Pacific Islander</SelectItem>
              <SelectItem value="native-american">Native American</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Options only show when a group is selected */}
        {preferences.advanced.demographics.minorityGroup !== "none" && (
          <>
            {/* Subgroup selector for Hispanic and Asian */}
            {(preferences.advanced.demographics.minorityGroup === "hispanic" || 
              preferences.advanced.demographics.minorityGroup === "asian") && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Specific Subgroup
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                      <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.minoritySubgroup"]}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <Select
                  value={preferences.advanced.demographics.minoritySubgroup}
                  onValueChange={(v) => updateAdvanced("demographics", "minoritySubgroup", v as typeof preferences.advanced.demographics.minoritySubgroup)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any / All {preferences.advanced.demographics.minorityGroup === "hispanic" ? "Hispanic" : "Asian"}</SelectItem>
                    {preferences.advanced.demographics.minorityGroup === "hispanic" && (
                      <>
                        <SelectItem value="mexican">Mexican</SelectItem>
                        <SelectItem value="puerto-rican">Puerto Rican</SelectItem>
                        <SelectItem value="cuban">Cuban</SelectItem>
                        <SelectItem value="salvadoran">Salvadoran</SelectItem>
                        <SelectItem value="guatemalan">Guatemalan</SelectItem>
                        <SelectItem value="colombian">Colombian</SelectItem>
                      </>
                    )}
                    {preferences.advanced.demographics.minorityGroup === "asian" && (
                      <>
                        <SelectItem value="chinese">Chinese</SelectItem>
                        <SelectItem value="indian">Indian</SelectItem>
                        <SelectItem value="filipino">Filipino</SelectItem>
                        <SelectItem value="vietnamese">Vietnamese</SelectItem>
                        <SelectItem value="korean">Korean</SelectItem>
                        <SelectItem value="japanese">Japanese</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <PreferenceSlider
              label="Minimum Presence"
              value={preferences.advanced.demographics.minMinorityPresence}
              onChange={(v) => updateAdvanced("demographics", "minMinorityPresence", v)}
              min={0}
              max={30}
              tooltip={TOOLTIPS["advanced.demographics.minMinorityPresence"]}
              formatValue={(v) => v === 0 ? "Any" : `${v}%+`}
            />
            
            <PreferenceSlider
              label="Importance"
              value={preferences.advanced.demographics.minorityImportance}
              onChange={(v) => updateAdvanced("demographics", "minorityImportance", v)}
              min={0}
              max={100}
              tooltip={TOOLTIPS["advanced.demographics.minorityImportance"]}
              formatValue={(v) => `${v}%`}
            />
          </>
        )}
      </div>

      {/* Economic Health */}
      <div className="space-y-3 pt-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Economic Health</h4>
        <PreferenceSlider
          label="Economic Health Importance"
          value={preferences.advanced.demographics.weightEconomicHealth}
          onChange={(v) => updateAdvanced("demographics", "weightEconomicHealth", v)}
          min={0}
          max={100}
          tooltip={TOOLTIPS["advanced.demographics.weightEconomicHealth"]}
          formatValue={(v) => v === 0 ? "Off" : `${v}%`}
        />
        {preferences.advanced.demographics.weightEconomicHealth > 0 && (
          <>
            <PreferenceSlider
              label="Min Median Household Income"
              value={preferences.advanced.demographics.minMedianHouseholdIncome}
              onChange={(v) => updateAdvanced("demographics", "minMedianHouseholdIncome", v)}
              min={0}
              max={150000}
              step={5000}
              tooltip={TOOLTIPS["advanced.demographics.minMedianHouseholdIncome"]}
              formatValue={(v) => v === 0 ? "Any" : `$${(v / 1000).toFixed(0)}K+`}
            />
            <PreferenceSlider
              label="Max Poverty Rate"
              value={preferences.advanced.demographics.maxPovertyRate}
              onChange={(v) => updateAdvanced("demographics", "maxPovertyRate", v)}
              min={5}
              max={30}
              tooltip={TOOLTIPS["advanced.demographics.maxPovertyRate"]}
              formatValue={(v) => v >= 30 ? "Any" : `${v}%`}
            />
          </>
        )}
      </div>

      {/* Dating Favorability */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-pink-500" />
            Dating Favorability
          </h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
              <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.datingEnabled"]}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
          <Label htmlFor="dating-enabled" className="text-sm font-medium cursor-pointer">
            Enable Dating Scoring
          </Label>
          <Switch
            id="dating-enabled"
            checked={preferences.advanced.demographics.datingEnabled}
            onCheckedChange={(checked) => updateAdvanced("demographics", "datingEnabled", checked)}
          />
        </div>
        
        {preferences.advanced.demographics.datingEnabled && (
          <div className="space-y-3 pl-2 border-l-2 border-pink-200 dark:border-pink-800">
            {/* Seeking Gender */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                I&apos;m looking for
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                    <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.seekingGender"]}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Select
                value={preferences.advanced.demographics.seekingGender || ""}
                onValueChange={(v) => updateAdvanced("demographics", "seekingGender", v === "" ? null : v as "men" | "women")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="women">Women</SelectItem>
                  <SelectItem value="men">Men</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Age Range */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                Age range interested in
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-3 w-3" /></TooltipTrigger>
                    <TooltipContent><p className="max-w-xs text-xs">{TOOLTIPS["advanced.demographics.datingAgeRange"]}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Select
                value={preferences.advanced.demographics.datingAgeRange || ""}
                onValueChange={(v) => updateAdvanced("demographics", "datingAgeRange", v === "" ? null : v as "20-29" | "30-39" | "40-49")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Any age range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20-29">20-29 years</SelectItem>
                  <SelectItem value="30-39">30-39 years</SelectItem>
                  <SelectItem value="40-49">40-49 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Dating Weight */}
            <PreferenceSlider
              label="Dating Weight"
              value={preferences.advanced.demographics.datingWeight}
              onChange={(v) => updateAdvanced("demographics", "datingWeight", v)}
              min={0}
              max={100}
              tooltip={TOOLTIPS["advanced.demographics.datingWeight"]}
              formatValue={(v) => v === 0 ? "Off" : v === 100 ? "Max" : `${v}%`}
            />
            
            {/* Note about political alignment */}
            <p className="text-xs text-muted-foreground italic">
              Your political preference (in Cultural settings) is also used for dating alignment scoring.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
