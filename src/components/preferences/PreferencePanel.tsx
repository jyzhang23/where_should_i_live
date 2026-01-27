"use client";

import { useState, useRef } from "react";
import { usePreferencesStore } from "@/lib/store";
import { BasicPreferences } from "./BasicPreferences";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download,
  Upload,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export function PreferencePanel() {
  const { exportPreferences, importPreferences, resetToDefaults } =
    usePreferencesStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              title="Export preferences"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              title="Import preferences"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              title="Reset to defaults"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
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
        <BasicPreferences />

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full pt-2 border-t"
        >
          {showAdvanced ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium">Advanced Options</span>
        </button>

        {showAdvanced && (
          <div className="text-sm text-muted-foreground pl-6">
            <p>Advanced preference controls coming soon...</p>
            <p className="mt-2">
              This will include detailed climate preferences, tax thresholds,
              demographic targets, and more.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
