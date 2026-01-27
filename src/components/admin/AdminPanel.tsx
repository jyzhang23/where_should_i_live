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
import { RefreshCw, Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshResult {
  success: boolean;
  stats?: {
    citiesCreated: number;
    citiesUpdated: number;
    metricsUpdated: number;
    zhviPointsCreated: number;
  };
  message?: string;
  error?: string;
}

async function refreshData(password: string): Promise<RefreshResult> {
  const response = await fetch("/api/admin/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Refresh failed");
  }

  return data;
}

export function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<RefreshResult | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: refreshData,
    onSuccess: (data) => {
      setResult(data);
      // Invalidate cities query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
    onError: (error: Error) => {
      setResult({ success: false, error: error.message });
    },
  });

  const handleRefresh = () => {
    if (!password) return;
    setResult(null);
    mutation.mutate(password);
  };

  const handleClose = () => {
    setIsOpen(false);
    setPassword("");
    setResult(null);
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
        <TooltipContent>Admin: Refresh Data</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin: Refresh Data
          </DialogTitle>
          <DialogDescription>
            Re-import data from the Excel spreadsheet. This will update all city
            metrics and price history.
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && password && !mutation.isPending) {
                  handleRefresh();
                }
              }}
              disabled={mutation.isPending}
            />
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
                        Refresh successful!
                      </p>
                      {result.stats && (
                        <ul className="mt-2 space-y-1 text-green-700 dark:text-green-300">
                          <li>Cities created: {result.stats.citiesCreated}</li>
                          <li>Cities updated: {result.stats.citiesUpdated}</li>
                          <li>Metrics updated: {result.stats.metricsUpdated}</li>
                          <li>ZHVI data points: {result.stats.zhviPointsCreated}</li>
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="text-red-800 dark:text-red-200">
                      {result.error || "Refresh failed"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {mutation.isPending && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Refreshing data... This may take a moment.</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {result?.success ? "Done" : "Cancel"}
          </Button>
          {!result?.success && (
            <Button
              onClick={handleRefresh}
              disabled={!password || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
