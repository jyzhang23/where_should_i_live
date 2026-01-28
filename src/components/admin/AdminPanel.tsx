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
import { Shield, CheckCircle, XCircle, Loader2, Download, CloudSun, Users, ShieldAlert, Wind, Wifi, GraduationCap, Stethoscope, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshResult {
  success: boolean;
  stats?: {
    citiesCreated?: number;
    citiesUpdated?: number;
    citiesSkipped?: number;
    citiesUsedFallback?: number;
    fallbackCities?: string[];
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
    acsYear?: number;
    politicalDataYear?: number;
    religiousDataYear?: number;
    errors?: string[];
  };
  message?: string;
  error?: string;
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

async function pullCensusData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/census-pull", {
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
    throw new Error(data.error || "Census pull failed");
  }

  return data;
}

// QoL API pull functions
async function pullFBICrimeData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/fbi-crime-pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const text = await response.text();
  if (!text) throw new Error("Server returned empty response.");
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
  if (!response.ok) throw new Error(data.error || "FBI crime pull failed");
  return data;
}

async function pullEPAAirData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/epa-air-pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const text = await response.text();
  if (!text) throw new Error("Server returned empty response.");
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
  if (!response.ok) throw new Error(data.error || "EPA air quality pull failed");
  return data;
}

async function pullFCCBroadbandData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/fcc-broadband-pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const text = await response.text();
  if (!text) throw new Error("Server returned empty response.");
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
  if (!response.ok) throw new Error(data.error || "FCC broadband pull failed");
  return data;
}

async function pullNCESEducationData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/nces-education-pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const text = await response.text();
  if (!text) throw new Error("Server returned empty response.");
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
  if (!response.ok) throw new Error(data.error || "NCES education pull failed");
  return data;
}

async function pullHRSAHealthData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/hrsa-health-pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const text = await response.text();
  if (!text) throw new Error("Server returned empty response.");
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
  if (!response.ok) throw new Error(data.error || "HRSA health pull failed");
  return data;
}

async function pullWalkScoreData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/walkscore-pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const text = await response.text();
  if (!text) throw new Error("Server returned empty response.");
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
  if (!response.ok) throw new Error(data.error || "Walk Score pull failed");
  return data;
}

async function pullCulturalData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/cultural-pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const text = await response.text();
  if (!text) throw new Error("Server returned empty response.");
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
  if (!response.ok) throw new Error(data.error || "Cultural data pull failed");
  return data;
}

type ActionType = "zillow" | "bea" | "climate" | "census" | "fbi-crime" | "epa-air" | "fcc-broadband" | "nces-education" | "hrsa-health" | "walkscore" | "cultural";

export function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const queryClient = useQueryClient();

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

  const censusMutation = useMutation({
    mutationFn: pullCensusData,
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

  // QoL Mutations
  const fbiCrimeMutation = useMutation({
    mutationFn: pullFBICrimeData,
    onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ["cities"] }); },
    onError: (error: Error) => { setResult({ success: false, error: error.message }); },
    onSettled: () => { setActiveAction(null); },
  });

  const epaAirMutation = useMutation({
    mutationFn: pullEPAAirData,
    onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ["cities"] }); },
    onError: (error: Error) => { setResult({ success: false, error: error.message }); },
    onSettled: () => { setActiveAction(null); },
  });

  const fccBroadbandMutation = useMutation({
    mutationFn: pullFCCBroadbandData,
    onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ["cities"] }); },
    onError: (error: Error) => { setResult({ success: false, error: error.message }); },
    onSettled: () => { setActiveAction(null); },
  });

  const ncesEducationMutation = useMutation({
    mutationFn: pullNCESEducationData,
    onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ["cities"] }); },
    onError: (error: Error) => { setResult({ success: false, error: error.message }); },
    onSettled: () => { setActiveAction(null); },
  });

  const hrsaHealthMutation = useMutation({
    mutationFn: pullHRSAHealthData,
    onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ["cities"] }); },
    onError: (error: Error) => { setResult({ success: false, error: error.message }); },
    onSettled: () => { setActiveAction(null); },
  });

  const walkScoreMutation = useMutation({
    mutationFn: pullWalkScoreData,
    onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ["cities"] }); },
    onError: (error: Error) => { setResult({ success: false, error: error.message }); },
    onSettled: () => { setActiveAction(null); },
  });

  const culturalMutation = useMutation({
    mutationFn: pullCulturalData,
    onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ["cities"] }); },
    onError: (error: Error) => { setResult({ success: false, error: error.message }); },
    onSettled: () => { setActiveAction(null); },
  });

  const isPending = zillowMutation.isPending || beaMutation.isPending || 
    climateMutation.isPending || censusMutation.isPending || fbiCrimeMutation.isPending || 
    epaAirMutation.isPending || fccBroadbandMutation.isPending || ncesEducationMutation.isPending || 
    hrsaHealthMutation.isPending || walkScoreMutation.isPending || culturalMutation.isPending;

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

  const handleCensusPull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("census");
    censusMutation.mutate(password);
  };

  // QoL handlers
  const handleFBICrimePull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("fbi-crime");
    fbiCrimeMutation.mutate(password);
  };

  const handleEPAAirPull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("epa-air");
    epaAirMutation.mutate(password);
  };

  const handleFCCBroadbandPull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("fcc-broadband");
    fccBroadbandMutation.mutate(password);
  };

  const handleNCESEducationPull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("nces-education");
    ncesEducationMutation.mutate(password);
  };

  const handleHRSAHealthPull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("hrsa-health");
    hrsaHealthMutation.mutate(password);
  };

  const handleWalkScorePull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("walkscore");
    walkScoreMutation.mutate(password);
  };

  const handleCulturalPull = () => {
    if (!password) return;
    setResult(null);
    setActiveAction("cultural");
    culturalMutation.mutate(password);
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

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Pull Census Data</p>
                  <p className="text-xs text-muted-foreground">
                    Demographics: age, race, education, income
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCensusPull}
                  disabled={!password || isPending}
                >
                  {activeAction === "census" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Pull Cultural Data</p>
                  <p className="text-xs text-muted-foreground">
                    Political lean, religious adherence
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCulturalPull}
                  disabled={!password || isPending}
                >
                  {activeAction === "cultural" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Quality of Life Section */}
            <div className="pt-3 mt-3 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quality of Life</p>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">FBI Crime</p>
                      <p className="text-[10px] text-muted-foreground truncate">Crime rates</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleFBICrimePull}
                      disabled={!password || isPending}
                    >
                      {activeAction === "fbi-crime" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldAlert className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-2 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">EPA Air</p>
                      <p className="text-[10px] text-muted-foreground truncate">Air quality</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleEPAAirPull}
                      disabled={!password || isPending}
                    >
                      {activeAction === "epa-air" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wind className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-2 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">FCC Broadband</p>
                      <p className="text-[10px] text-muted-foreground truncate">Internet</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleFCCBroadbandPull}
                      disabled={!password || isPending}
                    >
                      {activeAction === "fcc-broadband" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wifi className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-2 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">NCES Schools</p>
                      <p className="text-[10px] text-muted-foreground truncate">Education</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleNCESEducationPull}
                      disabled={!password || isPending}
                    >
                      {activeAction === "nces-education" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <GraduationCap className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-2 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">HRSA Health</p>
                      <p className="text-[10px] text-muted-foreground truncate">Healthcare</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleHRSAHealthPull}
                      disabled={!password || isPending}
                    >
                      {activeAction === "hrsa-health" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Stethoscope className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-2 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">Walk Score</p>
                      <p className="text-[10px] text-muted-foreground truncate">Walkability</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleWalkScorePull}
                      disabled={!password || isPending}
                    >
                      {activeAction === "walkscore" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Footprints className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
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
                          {result.stats.citiesUsedFallback !== undefined && result.stats.citiesUsedFallback > 0 && (
                            <li className="text-amber-600 dark:text-amber-400">
                              Used fallback data: {result.stats.citiesUsedFallback} cities
                              {result.stats.fallbackCities && result.stats.fallbackCities.length <= 10 && (
                                <span className="text-xs ml-1">
                                  ({result.stats.fallbackCities.join(", ")})
                                </span>
                              )}
                            </li>
                          )}
                          {result.stats.dataYear !== undefined && (
                            <li>Data year: {result.stats.dataYear}</li>
                          )}
                          {result.stats.normalPeriod !== undefined && (
                            <li>Normal period: {result.stats.normalPeriod}</li>
                          )}
                          {result.stats.acsYear !== undefined && (
                            <li>ACS Year: {result.stats.acsYear}</li>
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
                  : activeAction === "census"
                  ? "Fetching Census demographics... This may take a minute."
                  : activeAction === "fbi-crime"
                  ? "Fetching FBI crime data..."
                  : activeAction === "epa-air"
                  ? "Fetching EPA air quality data..."
                  : activeAction === "fcc-broadband"
                  ? "Fetching FCC broadband data..."
                  : activeAction === "nces-education"
                  ? "Fetching NCES education data..."
                  : activeAction === "hrsa-health"
                  ? "Fetching HRSA health data..."
                  : activeAction === "walkscore"
                  ? "Fetching Walk Score data..."
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
