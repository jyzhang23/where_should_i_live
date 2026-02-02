"use client";

import { usePreferencesStore } from "@/lib/store";
import { TOOLTIPS } from "@/types/preferences";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Home, Key, ShoppingCart, Briefcase, TrendingUp, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function CostPreferences() {
  const { preferences, updateAdvanced } = usePreferencesStore();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-1">
          <Label className="text-sm">Your Housing Situation</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">{TOOLTIPS["advanced.costOfLiving.housingSituation"]}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {([
            { value: "renter", label: "Renter", icon: Key, desc: "Uses standard BEA rental index" },
            { value: "homeowner", label: "Homeowner", icon: Home, desc: "Excludes housing (mortgage is fixed)" },
            { value: "prospective-buyer", label: "Prospective Buyer", icon: ShoppingCart, desc: "Uses current home prices + rates" },
          ] as const).map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => updateAdvanced("costOfLiving", "housingSituation", value)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                preferences.advanced.costOfLiving.housingSituation === value
                  ? "bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 flex-shrink-0",
                preferences.advanced.costOfLiving.housingSituation === value
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
              )} />
              <div>
                <div className={cn(
                  "font-medium text-sm",
                  preferences.advanced.costOfLiving.housingSituation === value
                    ? "text-green-700 dark:text-green-300"
                    : ""
                )}>
                  {label}
                </div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Include Utilities toggle - only for renters */}
      {preferences.advanced.costOfLiving.housingSituation === "renter" && (
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
            <Label htmlFor="utilities" className="text-sm">
              Include Utility Costs
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{TOOLTIPS["advanced.costOfLiving.includeUtilities"]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="utilities"
            checked={preferences.advanced.costOfLiving.includeUtilities ?? true}
            onCheckedChange={(v) => updateAdvanced("costOfLiving", "includeUtilities", v)}
          />
        </div>
      )}

      {/* Info box based on housing selection */}
      <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        {preferences.advanced.costOfLiving.housingSituation === "renter" && (
          <p>
            <strong>Renter:</strong> The BEA index is most accurate for you, as it&apos;s heavily 
            weighted by rental data from the American Community Survey.
          </p>
        )}
        {preferences.advanced.costOfLiving.housingSituation === "homeowner" && (
          <p>
            <strong>Homeowner:</strong> Since your mortgage is fixed, housing costs are excluded. 
            Score uses only Goods (70%) + Services (30%) indices.
          </p>
        )}
        {preferences.advanced.costOfLiving.housingSituation === "prospective-buyer" && (
          <p>
            <strong>Buyer:</strong> BEA data is &quot;lagged&quot; (reflects old 3% mortgages). 
            We use current home prices with ~7% mortgage rates for accurate comparison.
          </p>
        )}
      </div>

      {/* Work Situation - Income Source */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center gap-1">
          <Label className="text-sm">Your Work Situation</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">{TOOLTIPS["advanced.costOfLiving.workSituation"]}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground">
          Per-capita income is skewed by ultra-high earners (DC lobbyists, SF tech execs). 
          Choose your situation for more realistic purchasing power calculations.
        </p>
        <div className="grid grid-cols-1 gap-2">
          {([
            { value: "local-earner", label: "Local Earner", icon: TrendingUp, desc: "Uses local income levels - how locals fare" },
            { value: "standard", label: "Standard / Moving", icon: Briefcase, desc: "Pure affordability - same income, compare costs" },
            { value: "retiree", label: "Retiree / Fixed Income", icon: Heart, desc: "Uses your specified fixed income" },
          ] as const).map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => updateAdvanced("costOfLiving", "workSituation", value)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                preferences.advanced.costOfLiving.workSituation === value
                  ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 flex-shrink-0",
                preferences.advanced.costOfLiving.workSituation === value
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground"
              )} />
              <div>
                <div className={cn(
                  "font-medium text-sm",
                  preferences.advanced.costOfLiving.workSituation === value
                    ? "text-blue-700 dark:text-blue-300"
                    : ""
                )}>
                  {label}
                </div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Retiree fixed income input - only shown for retiree persona */}
      {preferences.advanced.costOfLiving.workSituation === "retiree" && (
        <div className="space-y-2 pl-4 border-l-2 border-blue-500/50">
          <div className="flex items-center gap-1">
            <Label className="text-sm">Annual Fixed Income</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{TOOLTIPS["advanced.costOfLiving.retireeFixedIncome"]}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <input
              type="number"
              min="10000"
              max="200000"
              step="5000"
              value={preferences.advanced.costOfLiving.retireeFixedIncome ?? 50000}
              onChange={(e) => updateAdvanced("costOfLiving", "retireeFixedIncome", parseInt(e.target.value) || 50000)}
              className="w-32 px-3 py-2 rounded-md border bg-background text-sm"
            />
            <span className="text-xs text-muted-foreground">/year (pre-tax)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Average Social Security: ~$22K | Median Retiree Income: ~$50K
          </p>
        </div>
      )}

      {/* Info box based on work selection */}
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-xs text-muted-foreground">
        {preferences.advanced.costOfLiving.workSituation === "local-earner" && (
          <p>
            <strong>Local Earner:</strong> Uses local Per Capita Income (BEA). Shows how well off 
            local workers are. Expensive cities score better because local incomes are higher. 
            Best for &quot;how do locals fare here?&quot;
          </p>
        )}
        {preferences.advanced.costOfLiving.workSituation === "standard" && (
          <p>
            <strong>Standard:</strong> Pure affordability comparison. Uses fixed national median 
            income (~$75K) and only varies by local costs. Expensive cities (SF, NYC) score poorly 
            as expected. Best for &quot;where can I afford to move?&quot;
          </p>
        )}
        {preferences.advanced.costOfLiving.workSituation === "retiree" && (
          <p>
            <strong>Retiree:</strong> Uses your specified fixed income. Shows how far your 
            retirement income goes in each city. Best for &quot;where can I retire affordably?&quot;
          </p>
        )}
      </div>
    </div>
  );
}
