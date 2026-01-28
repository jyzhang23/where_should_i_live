"use client";

import { useState, useRef, useEffect } from "react";
import { usePreferencesStore } from "@/lib/store";
import { BasicPreferences } from "./BasicPreferences";
import { AdvancedPreferences } from "./AdvancedPreferences";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  Upload,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Settings2,
  Loader2,
  Info,
  Filter,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TOOLTIPS } from "@/types/preferences";
import { cn } from "@/lib/utils";

export function PreferencePanel() {
  const { preferences, exportPreferences, importPreferences, resetToDefaults, updateFilter } =
    usePreferencesStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wait for client-side hydration before showing preferences
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleExport = () => {
    const json = exportPreferences();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "city-preferences.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      const success = importPreferences(json);
      if (!success) {
        alert("Invalid preferences file. Please check the format.");
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = "";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Preferences</CardTitle>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export preferences</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import preferences</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToDefaults}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to defaults</TooltipContent>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isHydrated ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <BasicPreferences />

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                "flex items-center gap-2 text-sm w-full py-3 px-3 -mx-3 rounded-md transition-colors",
                showAdvanced
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Settings2 className="h-4 w-4" />
              <span className="font-medium flex-1 text-left">Advanced Options</span>
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {showAdvanced && <AdvancedPreferences />}

            {/* Filters - at the very bottom */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <h3 className="text-xs font-medium uppercase tracking-wide">
                  Hard Filters
                </h3>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Label htmlFor="nfl" className="text-sm">
                    Must have NFL team
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{TOOLTIPS["filters.requiresNFL"]}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  id="nfl"
                  checked={preferences.filters.requiresNFL}
                  onCheckedChange={(v) => updateFilter("requiresNFL", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Label htmlFor="nba" className="text-sm">
                    Must have NBA team
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{TOOLTIPS["filters.requiresNBA"]}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  id="nba"
                  checked={preferences.filters.requiresNBA}
                  onCheckedChange={(v) => updateFilter("requiresNBA", v)}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
