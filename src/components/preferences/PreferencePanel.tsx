"use client";

import { useRef, useEffect, useState } from "react";
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
  Settings2,
  Loader2,
} from "lucide-react";

export function PreferencePanel() {
  const { exportPreferences, importPreferences, resetToDefaults } =
    usePreferencesStore();
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

            {/* Advanced Options Label */}
            <div className="flex items-center gap-2 text-sm py-2 text-muted-foreground border-t pt-4 mt-2">
              <Settings2 className="h-4 w-4" />
              <span className="font-medium">Advanced Options</span>
              <span className="text-xs">— fine-tune each category</span>
            </div>

            <AdvancedPreferences />
          </>
        )}
      </CardContent>
    </Card>
  );
}
