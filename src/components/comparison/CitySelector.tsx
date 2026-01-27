"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CityScore } from "@/types/scores";

interface CitySelectorProps {
  cities: CityScore[];
  selectedId: string | null;
  onSelect: (cityId: string | null) => void;
  excludeId?: string | null;
  placeholder?: string;
  label?: string;
}

export function CitySelector({
  cities,
  selectedId,
  onSelect,
  excludeId,
  placeholder = "Select a city",
  label,
}: CitySelectorProps) {
  // Filter out excluded city and sort by score
  const availableCities = cities
    .filter((c) => !c.excluded && c.cityId !== excludeId)
    .sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <Select
        value={selectedId || ""}
        onValueChange={(value) => onSelect(value || null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            <span className="text-muted-foreground">{placeholder}</span>
          </SelectItem>
          {availableCities.map((city) => (
            <SelectItem key={city.cityId} value={city.cityId}>
              <span className="flex items-center justify-between gap-4">
                <span>
                  {city.cityName}, {city.state}
                </span>
                <span className="text-muted-foreground text-xs">
                  {city.totalScore.toFixed(1)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
