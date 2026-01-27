"use client";

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
import { getScoreColor } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface RankingTableProps {
  rankings: CityScore[];
  onCityClick?: (cityId: string) => void;
  selectedCityId?: string | null;
}

export function RankingTable({ rankings, onCityClick, selectedCityId }: RankingTableProps) {
  const includedCities = rankings.filter((r) => !r.excluded);
  const excludedCities = rankings.filter((r) => r.excluded);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="text-right">Climate</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Demographics</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {includedCities.map((city, index) => (
            <TableRow
              key={city.cityId}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                selectedCityId === city.cityId && "bg-primary/10 hover:bg-primary/15"
              )}
              onClick={() => onCityClick?.(city.cityId)}
            >
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div>
                  <span className="font-medium">{city.cityName}</span>
                  <span className="text-muted-foreground ml-1">
                    {city.state}
                  </span>
                </div>
              </TableCell>
              <TableCell className={`text-right ${getScoreColor(city.climateScore)}`}>
                {city.climateScore.toFixed(1)}
              </TableCell>
              <TableCell className={`text-right ${getScoreColor(city.costScore)}`}>
                {city.costScore.toFixed(1)}
              </TableCell>
              <TableCell className={`text-right ${getScoreColor(city.demographicsScore)}`}>
                {city.demographicsScore.toFixed(1)}
              </TableCell>
              <TableCell className={`text-right font-bold ${getScoreColor(city.totalScore)}`}>
                {city.totalScore.toFixed(1)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/city/${city.cityId}`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}

          {excludedCities.length > 0 && (
            <>
              <TableRow>
                <TableCell
                  colSpan={7}
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
                  <TableCell className="text-right text-muted-foreground">
                    —
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    —
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    —
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    —
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/city/${city.cityId}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
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
