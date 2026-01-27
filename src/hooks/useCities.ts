"use client";

import { useQuery } from "@tanstack/react-query";
import { CityWithMetrics } from "@/types/city";

interface CitiesResponse {
  cities: CityWithMetrics[];
  lastUpdated: string | null;
  count: number;
}

async function fetchCities(): Promise<CitiesResponse> {
  const response = await fetch("/api/cities");
  if (!response.ok) {
    throw new Error("Failed to fetch cities");
  }
  return response.json();
}

export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: fetchCities,
  });
}
