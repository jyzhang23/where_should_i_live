"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, Shield, CheckCircle, XCircle, Loader2, Download, CloudSun } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshResult {
  success: boolean;
  stats?: {
    citiesCreated?: number;
    citiesUpdated?: number;
    citiesSkipped?: number;
    totalCities?: number;
    metricsUpdated?: number;
    zhviPointsCreated?: number;
    msaCitiesMatched?: number;
    cityCitiesMatched?: number;
    dataPoints?: number;
    dataYear?: string;
    normalPeriod?: string;
    acisUpdated?: number;
    openMeteoUpdated?: number;
    errors?: string[];
  };
  message?: string;
  error?: string;
}

async function reinitializeData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const text = await response.text();
  if (!text) {
    throw new Error("Server returned empty response. Check server logs.");
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid server response: ${text.slice(0, 100)}`);
  }

  if (!response.ok) {
    throw new Error(data.error || "Reinitialize failed");
  }

  return data;
}

async function pullZillowData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/zillow-pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const text = await response.text();
  if (!text) {
    throw new Error("Server returned empty response. Check server logs.");
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid server response: ${text.slice(0, 100)}`);
  }

  if (!response.ok) {
    throw new Error(data.error || "Zillow pull failed");
  }

  return data;
}

async function pullBEAData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/bea-pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const text = await response.text();
  if (!text) {
    throw new Error("Server returned empty response. Check server logs.");
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid server response: ${text.slice(0, 100)}`);
  }

  if (!response.ok) {
    throw new Error(data.error || "BEA pull failed");
  }

  return data;
}

async function pullClimateData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/climate-pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const text = await response.text();
  if (!text) {
    throw new Error("Server returned empty response. Check server logs.");
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid server response: ${text.slice(0, 100)}`);
  }

  if (!response.ok) {
    throw new Error(data.error || "Climate pull failed");
  }

  return data;
}

type ActionType = "reinitialize" | "zillow" | "bea" | "climate";

export function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const queryClient = useQueryClient();

  const reinitMutation = useMutation({
    mutationFn: reinitializeData,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
    onError: (error: Error) => {
      setResult({ success: false, error: error.message });
    },
    onSettled: () => {
      setActiveAction(null);
    },
  });

  const zillowMutation = useMutation({
    mutationFn: pullZillowData,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
    onError: (error: Error) => {
      setResult({ success: false, error: error.message });
    },
    onSettled: () => {
      setActiveAction(null);
    },
  });

  const beaMutation = useMutation({
    mutationFn: pullBEAData,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
    onError: (error: Error) => {
      setResult({ success: false, error: error.message });
    },
    onSettled: () => {
      setActiveAction(null);
    },
  });

  const climateMutation = useMutation({
    mutationFn: pullClimateData,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
    onError: (error: Error) => {
      setResult({ success: false, error: error.message });
    },
    onSettled: () => {
      setActiveAction(null);
    },
  });

  const isPending = reinitMutation.isPending || zillowMutation.isPending || beaMutation.isPending || climateMutation.isPending;

  const handleReinitialize = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("reinitialize");
    reinitMutation.mutate(password);
  };

  const handleZillowPull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("zillow");
    zillowMutation.mutate(password);
  };

  const handleBEAPull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("bea");
    beaMutation.mutate(password);
  };

  const handleClimatePull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("climate");
    climateMutation.mutate(password);
  };

  const handleClose = () => {
    setIsOpen(false);
    setPassword("");
    setResult(null);
    setActiveAction(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Shield className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Admin: Data Management</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin: Data Management
          </DialogTitle>
          <DialogDescription>
            Manage city data and pull updates from external sources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password">Admin Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Reinitialize Data</p>
                  <p className="text-xs text-muted-foreground">
                    Reload all data from local JSON files
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReinitialize}
                  disabled={!password || isPending}
                >
                  {activeAction === "reinitialize" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Pull Zillow Data</p>
                  <p className="text-xs text-muted-foreground">
                    Download latest ZHVI prices from Zillow
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZillowPull}
                  disabled={!password || isPending}
                >
                  {activeAction === "zillow" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Pull BEA Data</p>
                  <p className="text-xs text-muted-foreground">
                    Cost of living, housing, goods prices (RPP)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBEAPull}
                  disabled={!password || isPending}
                >
                  {activeAction === "bea" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Pull Climate Data</p>
                  <p className="text-xs text-muted-foreground">
                    NOAA + Open-Meteo: temp, rain, snow, clouds, humidity
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClimatePull}
                  disabled={!password || isPending}
                >
                  {activeAction === "climate" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CloudSun className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Result Display */}
          {result && (
            <div
              className={cn(
                "p-4 rounded-lg text-sm",
                result.success
                  ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
              )}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  {result.success ? (
                    <>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {result.message || "Success!"}
                      </p>
                      {result.stats && (
                        <ul className="mt-2 space-y-1 text-green-700 dark:text-green-300">
                          {result.stats.totalCities !== undefined && (
                            <li>Total cities: {result.stats.totalCities}</li>
                          )}
                          {result.stats.citiesCreated !== undefined && (
                            <li>Cities created: {result.stats.citiesCreated}</li>
                          )}
                          {result.stats.citiesUpdated !== undefined && (
                            <li>Cities updated: {result.stats.citiesUpdated}</li>
                          )}
                          {result.stats.msaCitiesMatched !== undefined && (
                            <li>MSA matches: {result.stats.msaCitiesMatched}</li>
                          )}
                          {result.stats.cityCitiesMatched !== undefined && (
                            <li>City matches: {result.stats.cityCitiesMatched}</li>
                          )}
                          {result.stats.dataPoints !== undefined && (
                            <li>Data points: {result.stats.dataPoints.toLocaleString()}</li>
                          )}
                          {result.stats.zhviPointsCreated !== undefined && (
                            <li>ZHVI points: {result.stats.zhviPointsCreated.toLocaleString()}</li>
                          )}
                          {result.stats.acisUpdated !== undefined && (
                            <li>ACIS (NOAA): {result.stats.acisUpdated} cities</li>
                          )}
                          {result.stats.openMeteoUpdated !== undefined && (
                            <li>Open-Meteo: {result.stats.openMeteoUpdated} cities</li>
                          )}
                          {result.stats.citiesSkipped !== undefined && result.stats.citiesSkipped > 0 && (
                            <li>Cities skipped: {result.stats.citiesSkipped}</li>
                          )}
                          {result.stats.dataYear !== undefined && (
                            <li>Data year: {result.stats.dataYear}</li>
                          )}
                          {result.stats.normalPeriod !== undefined && (
                            <li>Normal period: {result.stats.normalPeriod}</li>
                          )}
                          {result.stats.errors && result.stats.errors.length > 0 && (
                            <li className="text-amber-600 dark:text-amber-400">
                              Errors: {result.stats.errors.length} cities failed
                            </li>
                          )}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="text-red-800 dark:text-red-200">
                      {result.error || "Operation failed"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isPending && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {activeAction === "zillow"
                  ? "Downloading Zillow data... This may take a moment."
                  : activeAction === "bea"
                  ? "Fetching BEA price data..."
                  : activeAction === "climate"
                  ? "Fetching climate data from NOAA + Open-Meteo... This may take a few minutes."
                  : "Reinitializing data..."}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result?.success ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
