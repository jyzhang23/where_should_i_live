import { useQuery } from "@tanstack/react-query";
import { CityWithMetrics } from "@/types/city";

async function fetchCity(id: string): Promise<CityWithMetrics> {
  const response = await fetch(`/api/cities/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch city");
  }
  return response.json();
}

export function useCity(id: string | null) {
  return useQuery({
    queryKey: ["city", id],
    queryFn: () => fetchCity(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
