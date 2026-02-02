import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { normalizeToRange, urbanAmenityScore, toPercentileScore } from "./utils";
import { URBAN_LIFESTYLE_RANGES, RECREATION_RANGES } from "./constants";
import { getQoLPercentilesCache } from "./types";

/**
 * Calculate entertainment score (0-100) based on urban amenities and recreation
 * 
 * This category answers: "Is it fun?"
 * Scoring is OBJECTIVE - based on amenity density and variety
 * Uses logarithmic "critical mass" curves (diminishing returns after certain threshold)
 * 
 * Sub-categories:
 * - Nightlife: bars, clubs, late-night venues
 * - Arts: museums, theaters, galleries, music venues
 * - Dining: restaurants, fine dining, cuisine diversity, breweries
 * - Sports: professional sports teams (NFL, NBA, MLB, NHL, MLS)
 * - Recreation: parks, trails, beach access, mountains (moved from QoL)
 */
export function calculateEntertainmentScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const cultural = metrics.cultural;
  const qol = metrics.qol;
  const prefs = preferences.advanced?.entertainment;
  const percentiles = getQoLPercentilesCache();

  // If no entertainment preferences, return neutral score
  if (!prefs) {
    return 50;
  }

  // Get sub-category weights
  const nightlifeWeight = prefs.nightlifeImportance ?? 50;
  const artsWeight = prefs.artsImportance ?? 50;
  const diningWeight = prefs.diningImportance ?? 50;
  const sportsWeight = prefs.sportsImportance ?? 50;
  const recreationWeight = prefs.recreationImportance ?? 50;
  
  const totalWeight = nightlifeWeight + artsWeight + diningWeight + sportsWeight + recreationWeight;
  
  // If no weights set, return neutral score
  if (totalWeight === 0) {
    return 50;
  }

  let nightlifeScore = 50;
  let artsScore = 50;
  let diningScore = 50;
  let sportsScore = 50;
  let recreationScore = 50;

  const urbanLifestyle = cultural?.urbanLifestyle;

  // === NIGHTLIFE SCORING ===
  // Logarithmic curve (critical mass at ~30 bars/clubs per 10K)
  if (nightlifeWeight > 0 && urbanLifestyle?.nightlife) {
    const nl = urbanLifestyle.nightlife;
    
    if (nl.barsAndClubsPer10K !== null) {
      nightlifeScore = urbanAmenityScore(
        nl.barsAndClubsPer10K,
        URBAN_LIFESTYLE_RANGES.barsAndClubsPer10K.min,
        URBAN_LIFESTYLE_RANGES.barsAndClubsPer10K.plateau,
        URBAN_LIFESTYLE_RANGES.barsAndClubsPer10K.max
      );
      
      // Bonus for late-night options
      if (nl.lateNightVenues !== null && nl.lateNightVenues >= 10) {
        nightlifeScore = Math.min(100, nightlifeScore + 5);
      }
    }
  }

  // === ARTS SCORING ===
  // Logarithmic curve (critical mass at ~20 museums)
  if (artsWeight > 0 && urbanLifestyle?.arts) {
    const arts = urbanLifestyle.arts;
    let artsSubScores = 0;
    let artsSubCount = 0;
    
    if (arts.museums !== null) {
      artsSubScores += urbanAmenityScore(
        arts.museums,
        URBAN_LIFESTYLE_RANGES.museums.min,
        URBAN_LIFESTYLE_RANGES.museums.plateau,
        URBAN_LIFESTYLE_RANGES.museums.max
      );
      artsSubCount++;
    }
    
    // Theaters and galleries as secondary factors
    if (arts.theaters !== null && arts.theaters > 0) {
      artsSubScores += Math.min(100, 50 + arts.theaters * 3);
      artsSubCount++;
    }
    
    if (arts.artGalleries !== null && arts.artGalleries > 0) {
      artsSubScores += Math.min(100, 40 + arts.artGalleries * 2);
      artsSubCount++;
    }
    
    if (arts.musicVenues !== null && arts.musicVenues > 0) {
      artsSubScores += Math.min(100, 50 + arts.musicVenues * 2);
      artsSubCount++;
    }
    
    if (artsSubCount > 0) {
      artsScore = artsSubScores / artsSubCount;
    }
  }

  // === DINING SCORING ===
  // Logarithmic curve + diversity bonus
  if (diningWeight > 0 && urbanLifestyle?.dining) {
    const dining = urbanLifestyle.dining;
    let diningSubScores = 0;
    let diningSubCount = 0;
    
    // Restaurant density
    if (dining.restaurantsPer10K !== null) {
      diningSubScores += urbanAmenityScore(
        dining.restaurantsPer10K,
        URBAN_LIFESTYLE_RANGES.restaurantsPer10K.min,
        URBAN_LIFESTYLE_RANGES.restaurantsPer10K.plateau,
        URBAN_LIFESTYLE_RANGES.restaurantsPer10K.max
      );
      diningSubCount++;
    }
    
    // Fine dining presence
    if (dining.fineDiningCount !== null && dining.fineDiningCount > 0) {
      diningSubScores += Math.min(100, 40 + dining.fineDiningCount * 3);
      diningSubCount++;
    }
    
    // Cuisine diversity (linear scale)
    if (dining.cuisineDiversity !== null) {
      const diversityScore = normalizeToRange(
        dining.cuisineDiversity,
        URBAN_LIFESTYLE_RANGES.cuisineDiversity.min,
        URBAN_LIFESTYLE_RANGES.cuisineDiversity.max,
        false
      );
      diningSubScores += diversityScore;
      diningSubCount++;
    }
    
    // Craft breweries as bonus
    if (dining.breweries !== null && dining.breweries > 0) {
      diningSubScores += Math.min(80, 50 + dining.breweries * 3);
      diningSubCount++;
    }
    
    if (diningSubCount > 0) {
      diningScore = diningSubScores / diningSubCount;
    }
  }

  // === SPORTS SCORING ===
  // Based on major pro sports team presence (NFL, NBA, MLB, NHL, MLS)
  if (sportsWeight > 0) {
    const countTeams = (teams: string | null) => 
      teams ? teams.split(",").filter(t => t.trim()).length : 0;
    
    const nflCount = countTeams(metrics.nflTeams);
    const nbaCount = countTeams(metrics.nbaTeams);
    const mlbCount = countTeams(metrics.mlbTeams);
    const nhlCount = countTeams(metrics.nhlTeams);
    const mlsCount = countTeams(metrics.mlsTeams);
    const totalTeams = nflCount + nbaCount + mlbCount + nhlCount + mlsCount;
    
    // Count how many different leagues are represented
    const leaguesPresent = [nflCount, nbaCount, mlbCount, nhlCount, mlsCount]
      .filter(count => count > 0).length;
    
    // Sports scoring thresholds:
    // 0 teams = 30 (city still livable, but no major sports)
    // 1-2 teams = 55-70 (small sports market)
    // 3-4 teams = 75-85 (solid sports city)
    // 5-6 teams = 88-93 (major sports market)
    // 7+ teams = 95-100 (elite sports city like NYC, LA, Chicago)
    if (totalTeams === 0) {
      sportsScore = 30;
    } else if (totalTeams <= 2) {
      sportsScore = 50 + totalTeams * 10; // 60-70
    } else if (totalTeams <= 4) {
      sportsScore = 65 + (totalTeams - 2) * 7; // 72-79
    } else if (totalTeams <= 6) {
      sportsScore = 80 + (totalTeams - 4) * 5; // 85-90
    } else if (totalTeams <= 8) {
      sportsScore = 92 + (totalTeams - 6) * 2; // 94-96
    } else {
      sportsScore = Math.min(100, 97 + (totalTeams - 8)); // 98-100
    }
    
    // Bonus for league diversity (having teams in 3+ different leagues)
    if (leaguesPresent >= 4) {
      sportsScore = Math.min(100, sportsScore + 5);
    } else if (leaguesPresent >= 3) {
      sportsScore = Math.min(100, sportsScore + 3);
    }
  }

  // === RECREATION SCORING ===
  // Nature, beach, and mountain access (moved from QoL)
  if (recreationWeight > 0 && qol?.recreation) {
    const rec = qol.recreation;
    const natureWeight = prefs.natureWeight;
    const beachWeight = prefs.beachWeight;
    const mountainWeight = prefs.mountainWeight;
    const recSubTotal = natureWeight + beachWeight + mountainWeight;
    
    if (recSubTotal > 0) {
      let natureScore = 50;
      let beachScore = 50;
      let mountainScore = 50;
      
      // Nature scoring (parks + trails + protected land) - Percentile-based
      if (rec.nature && natureWeight > 0) {
        let natureSubScores = 0;
        let natureSubCount = 0;
        
        // Trail miles - percentile if we have data, else range-based
        if (rec.nature.trailMilesWithin10Mi !== null) {
          if (percentiles?.trailMiles.length) {
            natureSubScores += toPercentileScore(rec.nature.trailMilesWithin10Mi, percentiles.trailMiles, true);
          } else {
            natureSubScores += normalizeToRange(rec.nature.trailMilesWithin10Mi, 
              RECREATION_RANGES.trailMiles.min, RECREATION_RANGES.trailMiles.max, false);
          }
          natureSubCount++;
        }
        
        // Park acres - percentile if we have data, else range-based
        if (rec.nature.parkAcresPer1K !== null) {
          if (percentiles?.parkAcres.length) {
            natureSubScores += toPercentileScore(rec.nature.parkAcresPer1K, percentiles.parkAcres, true);
          } else {
            natureSubScores += normalizeToRange(rec.nature.parkAcresPer1K,
              RECREATION_RANGES.parkAcres.min, RECREATION_RANGES.parkAcres.max, false);
          }
          natureSubCount++;
        }
        
        // Protected land percentage - range-based
        if (rec.nature.protectedLandPercent !== null) {
          natureSubScores += normalizeToRange(rec.nature.protectedLandPercent,
            RECREATION_RANGES.protectedLandPercent.min, RECREATION_RANGES.protectedLandPercent.max, false);
          natureSubCount++;
        }
        
        if (natureSubCount > 0) {
          natureScore = natureSubScores / natureSubCount;
        }
      }
      
      // Beach scoring - Binary bonus + distance decay
      if (rec.geography && beachWeight > 0) {
        if (rec.geography.coastlineWithin15Mi) {
          // Full score if within 15 miles
          beachScore = 100;
          // Small bonus for water quality
          if (rec.geography.waterQualityIndex !== null && rec.geography.waterQualityIndex >= 70) {
            beachScore = Math.min(100, beachScore + 5);
          }
        } else if (rec.geography.coastlineDistanceMi !== null && rec.geography.coastlineDistanceMi <= 100) {
          // Distance decay: 15mi = 100, 50mi = 50, 100mi = 0
          beachScore = Math.max(0, 100 - (rec.geography.coastlineDistanceMi - 15) * 1.2);
        } else {
          // No ocean access
          beachScore = 0;
        }
      }
      
      // Mountain scoring - Range-based on elevation delta
      if (rec.geography && mountainWeight > 0) {
        if (rec.geography.maxElevationDelta !== null) {
          // Use percentile if available, else range-based
          if (percentiles?.elevationDeltas.length) {
            mountainScore = toPercentileScore(rec.geography.maxElevationDelta, percentiles.elevationDeltas, true);
          } else {
            mountainScore = normalizeToRange(rec.geography.maxElevationDelta,
              RECREATION_RANGES.elevationDelta.min, RECREATION_RANGES.elevationDelta.max, false);
          }
          
          // Bonus for nearby ski resorts
          if (rec.geography.nearestSkiResortMi !== null && rec.geography.nearestSkiResortMi <= 60) {
            mountainScore = Math.min(100, mountainScore + 10);
          }
        } else {
          // No elevation data - flat city
          mountainScore = 0;
        }
      }
      
      // Weighted average of recreation sub-scores
      recreationScore = (
        natureScore * natureWeight +
        beachScore * beachWeight +
        mountainScore * mountainWeight
      ) / recSubTotal;
    }
  }

  // Calculate final weighted average
  const finalScore = (
    nightlifeScore * nightlifeWeight +
    artsScore * artsWeight +
    diningScore * diningWeight +
    sportsScore * sportsWeight +
    recreationScore * recreationWeight
  ) / totalWeight;

  return Math.max(0, Math.min(100, finalScore));
}
