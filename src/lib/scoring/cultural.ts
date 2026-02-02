import { CityWithMetrics } from "@/types/city";
import { UserPreferences } from "@/types/preferences";
import { normalizeToRange, urbanAmenityScore } from "./utils";
import { URBAN_LIFESTYLE_RANGES } from "./constants";

/**
 * Calculate cultural score (0-100) based on political and religious preferences
 * 
 * Political scoring based on partisan index match and voter turnout
 * Religious scoring based on tradition presence and diversity
 */
export function calculateCulturalScore(
  city: CityWithMetrics,
  preferences: UserPreferences
): number {
  const metrics = city.metrics!;
  const cultural = metrics.cultural;
  const prefs = preferences.advanced.cultural;

  // If no cultural data or all preferences are neutral/zero, return neutral score (50 = national avg)
  if (!cultural) {
    return 50;
  }

  let totalScore = 0;
  let totalWeight = 0;

  // === POLITICAL SCORING ===
  const political = cultural.political;
  
  if (prefs.partisanPreference !== "neutral" && political && prefs.partisanWeight > 0) {
    let politicalScore = 70; // Base score
    const pi = political.partisanIndex ?? 0; // -1 (strong R) to +1 (strong D)
    
    // Map user preference to a target PI value
    const prefToPi: Record<string, number> = {
      "strong-dem": 0.6,
      "lean-dem": 0.2,
      "swing": 0,
      "lean-rep": -0.2,
      "strong-rep": -0.6,
    };
    
    const targetPi = prefToPi[prefs.partisanPreference] ?? 0;
    
    if (prefs.partisanPreference === "swing") {
      // For swing preference, reward cities with |PI| < 0.1 (competitive)
      const absMargin = Math.abs(pi);
      if (absMargin < 0.05) {
        politicalScore = 100; // Very competitive
      } else if (absMargin < 0.10) {
        politicalScore = 90; // Competitive
      } else if (absMargin < 0.15) {
        politicalScore = 75;
      } else if (absMargin < 0.25) {
        politicalScore = 50;
      } else {
        politicalScore = 30; // Not competitive at all
      }
    } else {
      // For partisan preferences, measure alignment
      const distance = Math.abs(pi - targetPi);
      
      if (distance < 0.1) {
        // Very aligned
        politicalScore = 100;
      } else if (distance < 0.2) {
        // Aligned
        politicalScore = 85;
      } else if (distance < 0.4) {
        // Somewhat aligned
        politicalScore = 65;
      } else if (distance < 0.6) {
        // Opposite direction
        politicalScore = 40;
      } else {
        // Strongly opposite
        politicalScore = 20;
      }
    }
    
    // Bonus for high voter turnout if preferred
    if (prefs.preferHighTurnout && political.voterTurnout !== null) {
      if (political.voterTurnout >= 70) {
        politicalScore += 10;
      } else if (political.voterTurnout >= 65) {
        politicalScore += 5;
      } else if (political.voterTurnout < 55) {
        politicalScore -= 5;
      }
    }
    
    politicalScore = Math.max(0, Math.min(100, politicalScore));
    totalScore += politicalScore * prefs.partisanWeight;
    totalWeight += prefs.partisanWeight;
  } else if (prefs.preferHighTurnout && political && political.voterTurnout !== null) {
    // If only turnout preference is set (no partisan preference)
    let turnoutScore = 70;
    if (political.voterTurnout >= 75) {
      turnoutScore = 100;
    } else if (political.voterTurnout >= 70) {
      turnoutScore = 90;
    } else if (political.voterTurnout >= 65) {
      turnoutScore = 80;
    } else if (political.voterTurnout >= 60) {
      turnoutScore = 65;
    } else if (political.voterTurnout >= 55) {
      turnoutScore = 50;
    } else {
      turnoutScore = 35;
    }
    // Give turnout a default weight of 30 if user only cares about turnout
    totalScore += turnoutScore * 30;
    totalWeight += 30;
  }

  // === RELIGIOUS SCORING ===
  const religious = cultural.religious;
  
  if (religious) {
    // Tradition presence scoring
    if (prefs.religiousTraditions.length > 0 && prefs.traditionsWeight > 0) {
      let traditionsScore = 50;
      let traditionsFound = 0;
      let traditionsMetThreshold = 0;
      
      // Map preference IDs to religious data fields
      const traditionMap: Record<string, number | null> = {
        "catholic": religious.catholic,
        "evangelical": religious.evangelicalProtestant,
        "mainline": religious.mainlineProtestant,
        "jewish": religious.jewish,
        "muslim": religious.muslim,
        "unaffiliated": religious.unaffiliated,
      };
      
      // National averages for concentration calculation
      const nationalAvg: Record<string, number> = {
        "catholic": 205,
        "evangelical": 256,
        "mainline": 103,
        "jewish": 22,
        "muslim": 11,
        "unaffiliated": 290,
      };
      
      for (const tradition of prefs.religiousTraditions) {
        const presence = traditionMap[tradition];
        if (presence !== null && presence !== undefined) {
          traditionsFound++;
          
          if (presence >= prefs.minTraditionPresence) {
            traditionsMetThreshold++;
            
            // Concentration bonus: above national average = extra points
            const natAvg = nationalAvg[tradition] || 100;
            const concentration = presence / natAvg;
            
            if (concentration > 2.0) {
              traditionsScore += 20; // Strong presence
            } else if (concentration > 1.5) {
              traditionsScore += 15;
            } else if (concentration > 1.0) {
              traditionsScore += 10;
            } else {
              traditionsScore += 5; // At least meets threshold
            }
          } else {
            // Below threshold penalty
            const deficit = prefs.minTraditionPresence - presence;
            traditionsScore -= Math.min(20, deficit / 5);
          }
        }
      }
      
      // Adjust based on how many traditions were found vs requested
      if (prefs.religiousTraditions.length > 0) {
        const foundRatio = traditionsMetThreshold / prefs.religiousTraditions.length;
        if (foundRatio === 1) {
          traditionsScore += 10; // All traditions meet threshold
        } else if (foundRatio < 0.5) {
          traditionsScore -= 15; // Less than half meet threshold
        }
      }
      
      traditionsScore = Math.max(0, Math.min(100, traditionsScore));
      totalScore += traditionsScore * prefs.traditionsWeight;
      totalWeight += prefs.traditionsWeight;
    }
    
    // Religious diversity scoring
    if (prefs.preferReligiousDiversity && prefs.diversityWeight > 0 && religious.diversityIndex !== null) {
      // Religious diversity index is 0-100 (Simpson's)
      // Higher = more diverse
      const diversityScore = religious.diversityIndex;
      totalScore += diversityScore * prefs.diversityWeight;
      totalWeight += prefs.diversityWeight;
    }
  }

  // === URBAN LIFESTYLE SCORING (includes Sports) ===
  const urbanLifestyle = cultural.urbanLifestyle;
  
  if (prefs.urbanLifestyleWeight > 0) {
    const nightlifeWeight = prefs.nightlifeImportance;
    const artsWeight = prefs.artsImportance;
    const diningWeight = prefs.diningImportance;
    const sportsWeight = prefs.sportsImportance;
    const subTotal = nightlifeWeight + artsWeight + diningWeight + sportsWeight;
    
    if (subTotal > 0) {
      let nightlifeScore = 50;
      let artsScore = 50;
      let diningScore = 50;
      let sportsScore = 50;
      
      // Nightlife scoring - Logarithmic curve (critical mass at ~30 bars/clubs per 10K)
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
      
      // Arts scoring - Logarithmic curve (critical mass at ~20 museums)
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
      
      // Dining scoring - Logarithmic curve + diversity bonus
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
        
        // Craft breweries as bonus (cap at +10)
        if (dining.breweries !== null && dining.breweries > 0) {
          diningSubScores += Math.min(80, 50 + dining.breweries * 3);
          diningSubCount++;
        }
        
        if (diningSubCount > 0) {
          diningScore = diningSubScores / diningSubCount;
        }
      }
      
      // Sports scoring - based on major pro sports team presence
      // Counts NFL, NBA, MLB, NHL, and MLS teams (comma-separated strings)
      if (sportsWeight > 0) {
        // Count teams from each league
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
        
        // Sports scoring thresholds (5 major leagues = potential for 10+ teams):
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
      
      // Weighted average of sub-scores (now including sports)
      const urbanLifestyleScore = (
        nightlifeScore * nightlifeWeight +
        artsScore * artsWeight +
        diningScore * diningWeight +
        sportsScore * sportsWeight
      ) / subTotal;
      
      totalScore += Math.max(0, Math.min(100, urbanLifestyleScore)) * prefs.urbanLifestyleWeight;
      totalWeight += prefs.urbanLifestyleWeight;
    }
  }

  // If no weights were set, return neutral score (50 = national average)
  if (totalWeight === 0) {
    return 50;
  }

  return Math.max(0, Math.min(100, totalScore / totalWeight));
}
