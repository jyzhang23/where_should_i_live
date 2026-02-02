"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CityScore } from "@/types/scores";
import { getScoreColor, getScoreRelative } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SortField = "rank" | "city" | "climate" | "cost" | "demographics" | "qol" | "values" | "entertainment" | "total";
type SortDirection = "asc" | "desc";

interface RankingTableProps {
  rankings: CityScore[];
  onCityClick?: (cityId: string) => void;
  selectedCityId?: string | null;
}

export function RankingTable({ rankings, onCityClick, selectedCityId }: RankingTableProps) {
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      // New field, default to desc for scores, asc for rank/city
      setSortField(field);
      setSortDirection(field === "rank" || field === "city" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === "desc" 
      ? <ArrowDown className="h-3 w-3 ml-1" />
      : <ArrowUp className="h-3 w-3 ml-1" />;
  };

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={cn("cursor-pointer hover:bg-muted/50 select-none transition-colors", className)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-end">
        {children}
        <SortIcon field={field} />
      </div>
    </TableHead>
  );

  const includedCities = rankings.filter((r) => !r.excluded);
  const excludedCities = rankings.filter((r) => r.excluded);

  // Sort included cities
  const sortedIncludedCities = useMemo(() => {
    const sorted = [...includedCities].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "rank":
        case "total":
          comparison = b.totalScore - a.totalScore; // Higher score = better rank
          break;
        case "city":
          comparison = a.cityName.localeCompare(b.cityName);
          break;
        case "climate":
          comparison = b.climateScore - a.climateScore;
          break;
        case "cost":
          comparison = b.costScore - a.costScore;
          break;
        case "demographics":
          comparison = b.demographicsScore - a.demographicsScore;
          break;
        case "qol":
          comparison = b.qualityOfLifeScore - a.qualityOfLifeScore;
          break;
        case "values":
          comparison = b.valuesScore - a.valuesScore;
          break;
        case "entertainment":
          comparison = b.entertainmentScore - a.entertainmentScore;
          break;
      }
      
      return sortDirection === "desc" ? comparison : -comparison;
    });
    
    return sorted;
  }, [includedCities, sortField, sortDirection]);

  // Get the rank based on total score (original ranking)
  const getRank = (cityId: string) => {
    const originalIndex = includedCities
      .sort((a, b) => b.totalScore - a.totalScore)
      .findIndex(c => c.cityId === cityId);
    return originalIndex + 1;
  };

  // Score cell with tooltip showing relative to national average
  const ScoreCell = ({ score, category }: { score: number; category: string }) => {
    const relative = getScoreRelative(score);
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-end gap-1">
              <span className={getScoreColor(score)}>{score.toFixed(1)}</span>
              <span className={cn("text-[10px] font-medium w-6 text-right", relative.color)}>
                {relative.text}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>{score >= 50 ? "Above" : "Below"} national average</p>
            <p className="text-muted-foreground">50 = U.S. average for {category}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="rank" className="w-12 text-left">
              <span className="flex-1 text-left">Rank</span>
            </SortableHeader>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none transition-colors"
              onClick={() => handleSort("city")}
            >
              <div className="flex items-center">
                City
                <SortIcon field="city" />
              </div>
            </TableHead>
            <SortableHeader field="climate">Climate</SortableHeader>
            <SortableHeader field="cost">Cost</SortableHeader>
            <SortableHeader field="demographics">Demo</SortableHeader>
            <SortableHeader field="qol">QoL</SortableHeader>
            <SortableHeader field="entertainment">Ent</SortableHeader>
            <SortableHeader field="values">Values</SortableHeader>
            <SortableHeader field="total">Total</SortableHeader>
            <TableHead className="w-16 text-right text-xs">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedIncludedCities.map((city) => (
            <TableRow
              key={city.cityId}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                selectedCityId === city.cityId && "bg-primary/10 hover:bg-primary/15"
              )}
              onClick={() => onCityClick?.(city.cityId)}
            >
              <TableCell className="font-medium">{getRank(city.cityId)}</TableCell>
              <TableCell>
                <div>
                  <span className="font-medium">{city.cityName}</span>
                  <span className="text-muted-foreground ml-1">
                    {city.state}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <ScoreCell score={city.climateScore} category="climate" />
              </TableCell>
              <TableCell className="text-right">
                <ScoreCell score={city.costScore} category="cost" />
              </TableCell>
              <TableCell className="text-right">
                <ScoreCell score={city.demographicsScore} category="demographics" />
              </TableCell>
              <TableCell className="text-right">
                <ScoreCell score={city.qualityOfLifeScore} category="quality of life" />
              </TableCell>
              <TableCell className="text-right">
                <ScoreCell score={city.entertainmentScore} category="entertainment" />
              </TableCell>
              <TableCell className="text-right">
                <ScoreCell score={city.valuesScore} category="values" />
              </TableCell>
              <TableCell className="text-right font-bold">
                <ScoreCell score={city.totalScore} category="overall" />
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/city/${city.cityId}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  View <ExternalLink className="h-3 w-3" />
                </Link>
              </TableCell>
            </TableRow>
          ))}

          {excludedCities.length > 0 && (
            <>
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center text-muted-foreground bg-muted/30 py-2"
                >
                  Excluded ({excludedCities.length} cities)
                </TableCell>
              </TableRow>
              {excludedCities.map((city) => (
                <TableRow
                  key={city.cityId}
                  className="opacity-50 cursor-pointer hover:bg-muted/50"
                  onClick={() => onCityClick?.(city.cityId)}
                >
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{city.cityName}</span>
                      <span className="text-muted-foreground ml-1">
                        {city.state}
                      </span>
                    </div>
                    <span className="text-xs text-red-500">
                      {city.exclusionReason}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/city/${city.cityId}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
