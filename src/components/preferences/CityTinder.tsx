"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { usePreferencesStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Heart,
  X,
  Star,
  Flame,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Sparkles,
  Settings,
} from "lucide-react";
import {
  cityProfiles,
  traitMappings,
  personalityTypes,
  CityProfile,
  TraitMapping,
  PersonalityResult,
} from "./cityTinderProfiles";

type SwipeDirection = "left" | "right" | "up";
type GamePhase = "intro" | "swiping" | "results";

interface SwipeResult {
  cityId: string;
  direction: SwipeDirection;
}

interface CityTinderProps {
  onComplete?: () => void;
}

// Gradient backgrounds for cities (fallback when no image)
const cityGradients: Record<string, string> = {
  "new-york-city": "from-slate-800 to-slate-600",
  "san-francisco": "from-orange-600 to-amber-400",
  "miami": "from-cyan-400 to-blue-500",
  "denver": "from-blue-600 to-purple-500",
  "phoenix": "from-orange-500 to-red-500",
  "boston": "from-red-700 to-red-500",
  "nashville": "from-amber-600 to-yellow-400",
  "portland": "from-green-600 to-emerald-400",
  "chicago": "from-blue-800 to-blue-600",
  "austin": "from-purple-600 to-pink-500",
};

export function CityTinder({ onComplete }: CityTinderProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeResults, setSwipeResults] = useState<SwipeResult[]>([]);
  const [personality, setPersonality] = useState<PersonalityResult | null>(null);
  
  const { updateAdvanced, updateWeight, updateQoLWeight } = usePreferencesStore();

  // Get cities in reverse order (so first city is on top of stack)
  const cities = [...cityProfiles].reverse();
  const currentCity = cities[cities.length - 1 - currentIndex];

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (currentIndex >= cities.length) return;

    const city = cities[cities.length - 1 - currentIndex];
    setSwipeResults(prev => [...prev, { cityId: city.id, direction }]);
    
    if (currentIndex + 1 >= cities.length) {
      // All cards swiped, calculate results
      setTimeout(() => {
        const results = [...swipeResults, { cityId: city.id, direction }];
        const inferredPersonality = calculatePersonality(results);
        setPersonality(inferredPersonality);
        applyPreferences(results);
        setPhase("results");
      }, 300);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, cities.length, swipeResults]);

  const calculatePersonality = (results: SwipeResult[]): PersonalityResult => {
    // Count trait preferences based on swipes
    const traitScores: Record<string, number> = {};
    
    for (const result of results) {
      const city = cityProfiles.find(c => c.id === result.cityId);
      if (!city) continue;
      
      const multiplier = result.direction === "up" ? 2 : 
                        result.direction === "right" ? 1 : -0.5;
      
      for (const trait of city.traits) {
        traitScores[trait] = (traitScores[trait] || 0) + multiplier;
      }
    }
    
    // Determine personality based on highest scoring trait categories
    const urbanScore = (traitScores["urban"] || 0) + (traitScores["transit"] || 0) + (traitScores["walkable"] || 0);
    const natureScore = (traitScores["outdoors"] || 0) + (traitScores["nature"] || 0) + (traitScores["mountains"] || 0);
    const warmScore = (traitScores["warm"] || 0) + (traitScores["sunny"] || 0) + (traitScores["beaches"] || 0);
    const affordableScore = (traitScores["affordable"] || 0) - (traitScores["expensive"] || 0);
    const culturalScore = (traitScores["cultural"] || 0) + (traitScores["nightlife"] || 0) + (traitScores["music"] || 0);
    
    const scores = [
      { type: "urbanite", score: urbanScore },
      { type: "natureLover", score: natureScore },
      { type: "sunChaser", score: warmScore },
      { type: "budgetMinded", score: affordableScore },
      { type: "culturalConnoisseur", score: culturalScore },
    ];
    
    const maxScore = Math.max(...scores.map(s => s.score));
    const topType = scores.find(s => s.score === maxScore);
    
    // If no strong preference, return balanced
    if (maxScore < 2) {
      return personalityTypes.find(p => p.type === "balanced")!;
    }
    
    return personalityTypes.find(p => p.type === topType?.type) || personalityTypes[5];
  };

  const applyPreferences = (results: SwipeResult[]) => {
    // Aggregate trait deltas
    const weightDeltas: Record<string, number> = {};
    const climateDeltas: Record<string, number> = {};
    const qolDeltas: Record<string, number> = {};
    const culturalDeltas: Record<string, number> = {};
    const demographicsDeltas: Record<string, number> = {};
    
    for (const result of results) {
      const city = cityProfiles.find(c => c.id === result.cityId);
      if (!city) continue;
      
      const multiplier = result.direction === "up" ? 2 : 
                        result.direction === "right" ? 1 : -0.5;
      
      for (const trait of city.traits) {
        const mapping = traitMappings[trait];
        if (!mapping) continue;
        
        // Aggregate weight changes
        if (mapping.weights) {
          for (const [key, value] of Object.entries(mapping.weights)) {
            weightDeltas[key] = (weightDeltas[key] || 0) + (value as number) * multiplier;
          }
        }
        if (mapping.climate) {
          for (const [key, value] of Object.entries(mapping.climate)) {
            climateDeltas[key] = (climateDeltas[key] || 0) + (value as number) * multiplier;
          }
        }
        if (mapping.qol) {
          for (const [key, value] of Object.entries(mapping.qol)) {
            qolDeltas[key] = (qolDeltas[key] || 0) + (value as number) * multiplier;
          }
        }
        if (mapping.cultural) {
          for (const [key, value] of Object.entries(mapping.cultural)) {
            culturalDeltas[key] = (culturalDeltas[key] || 0) + (value as number) * multiplier;
          }
        }
        if (mapping.demographics) {
          for (const [key, value] of Object.entries(mapping.demographics)) {
            demographicsDeltas[key] = (demographicsDeltas[key] || 0) + (value as number) * multiplier;
          }
        }
      }
    }
    
    // Apply weight changes (clamp to 0-100)
    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));
    
    if (weightDeltas.climate) updateWeight("climate", clamp(70 + weightDeltas.climate));
    if (weightDeltas.costOfLiving) updateWeight("costOfLiving", clamp(70 + weightDeltas.costOfLiving));
    if (weightDeltas.qualityOfLife) updateWeight("qualityOfLife", clamp(70 + weightDeltas.qualityOfLife));
    if (weightDeltas.demographics) updateWeight("demographics", clamp(50 + weightDeltas.demographics));
    if (weightDeltas.cultural) updateWeight("cultural", clamp(50 + weightDeltas.cultural));
    
    // Apply climate preferences
    if (climateDeltas.weightComfortDays) {
      updateAdvanced("climate", "weightComfortDays", clamp(50 + climateDeltas.weightComfortDays));
    }
    if (climateDeltas.weightFreezeDays) {
      updateAdvanced("climate", "weightFreezeDays", clamp(50 + climateDeltas.weightFreezeDays));
    }
    if (climateDeltas.maxFreezeDays !== undefined) {
      updateAdvanced("climate", "maxFreezeDays", clamp(30 + climateDeltas.maxFreezeDays));
    }
    if (climateDeltas.maxSnowDays !== undefined) {
      updateAdvanced("climate", "maxSnowDays", clamp(15 + climateDeltas.maxSnowDays));
    }
    
    // Apply QoL weights
    if (qolDeltas.walkability) updateQoLWeight("walkability", clamp(50 + qolDeltas.walkability));
    if (qolDeltas.safety) updateQoLWeight("safety", clamp(70 + qolDeltas.safety));
    if (qolDeltas.recreation) updateQoLWeight("recreation", clamp(50 + qolDeltas.recreation));
    if (qolDeltas.schools) updateQoLWeight("schools", clamp(50 + qolDeltas.schools));
    if (qolDeltas.healthcare) updateQoLWeight("healthcare", clamp(50 + qolDeltas.healthcare));
    if (qolDeltas.internet) updateQoLWeight("internet", clamp(50 + qolDeltas.internet));
    
    // Apply cultural preferences
    if (culturalDeltas.urbanLifestyleWeight) {
      updateAdvanced("cultural", "urbanLifestyleWeight", clamp(50 + culturalDeltas.urbanLifestyleWeight));
    }
    if (culturalDeltas.nightlifeImportance) {
      updateAdvanced("cultural", "nightlifeImportance", clamp(50 + culturalDeltas.nightlifeImportance));
    }
    if (culturalDeltas.diningImportance) {
      updateAdvanced("cultural", "diningImportance", clamp(50 + culturalDeltas.diningImportance));
    }
    if (culturalDeltas.artsImportance) {
      updateAdvanced("cultural", "artsImportance", clamp(50 + culturalDeltas.artsImportance));
    }
    if (culturalDeltas.sportsImportance) {
      updateAdvanced("cultural", "sportsImportance", clamp(50 + culturalDeltas.sportsImportance));
    }
    
    // Apply demographics preferences
    if (demographicsDeltas.weightDiversity) {
      updateAdvanced("demographics", "weightDiversity", clamp(50 + demographicsDeltas.weightDiversity));
    }
    if (demographicsDeltas.weightEconomicHealth) {
      updateAdvanced("demographics", "weightEconomicHealth", clamp(50 + demographicsDeltas.weightEconomicHealth));
    }
  };

  const resetGame = () => {
    setPhase("intro");
    setCurrentIndex(0);
    setSwipeResults([]);
    setPersonality(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetGame();
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetGame();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          City Tinder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] p-0 overflow-hidden [&>button]:z-50">
        {phase === "intro" && (
          <IntroScreen onStart={() => setPhase("swiping")} />
        )}
        {phase === "swiping" && currentCity && (
          <SwipeScreen
            city={currentCity}
            progress={currentIndex + 1}
            total={cities.length}
            onSwipe={handleSwipe}
          />
        )}
        {phase === "results" && personality && (
          <ResultsScreen
            personality={personality}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="p-6 text-center">
      <div className="text-6xl mb-4">🏙️❤️</div>
      <DialogHeader>
        <DialogTitle className="text-2xl">City Tinder</DialogTitle>
        <DialogDescription className="text-base mt-2">
          Swipe through city profiles to discover your ideal lifestyle
        </DialogDescription>
      </DialogHeader>
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-red-500">
              <ChevronLeft className="h-4 w-4" />
              <X className="h-5 w-5" />
            </div>
            <span className="text-muted-foreground">Not for me</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-green-500">
              <Heart className="h-5 w-5" />
              <ChevronRight className="h-4 w-4" />
            </div>
            <span className="text-muted-foreground">I like it!</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
            <div className="flex flex-col items-center text-yellow-500">
              <ChevronUp className="h-4 w-4" />
              <Star className="h-5 w-5" />
            </div>
            <span className="text-muted-foreground">Love it!</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Swipe or use the buttons below each card
        </p>
        <Button onClick={onStart} className="w-full" size="lg">
          <Flame className="h-4 w-4 mr-2" />
          Start Swiping
        </Button>
      </div>
    </div>
  );
}

function SwipeScreen({
  city,
  progress,
  total,
  onSwipe,
}: {
  city: CityProfile;
  progress: number;
  total: number;
  onSwipe: (direction: SwipeDirection) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.5, 1, 1, 1, 0.5]
  );

  // Swipe indicators
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superOpacity = useTransform(y, [-100, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    if (info.offset.y < -swipeThreshold || info.velocity.y < -velocityThreshold) {
      onSwipe("up");
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      onSwipe("right");
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      onSwipe("left");
    }
  };

  const gradient = cityGradients[city.id] || "from-gray-600 to-gray-400";

  return (
    <div className="flex flex-col h-[520px]">
      {/* Progress indicator */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                i < progress ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-1">
          {progress} of {total}
        </p>
      </div>

      {/* Card area */}
      <div className="flex-1 px-4 pb-2 relative">
        <motion.div
          className="h-full cursor-grab active:cursor-grabbing"
          style={{ x, y, rotate, opacity }}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          whileTap={{ cursor: "grabbing" }}
        >
          <CityCardBackground cityId={city.id} gradient={gradient}>
            
            {/* Swipe indicators */}
            <motion.div
              className="absolute top-6 right-6 px-3 py-1.5 rounded-lg border-4 border-green-500 text-green-500 font-bold text-xl rotate-12 z-10"
              style={{ opacity: likeOpacity }}
            >
              LIKE
            </motion.div>
            <motion.div
              className="absolute top-6 left-6 px-3 py-1.5 rounded-lg border-4 border-red-500 text-red-500 font-bold text-xl -rotate-12 z-10"
              style={{ opacity: nopeOpacity }}
            >
              NOPE
            </motion.div>
            <motion.div
              className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg border-4 border-yellow-400 text-yellow-400 font-bold text-xl z-10"
              style={{ opacity: superOpacity }}
            >
              SUPER LIKE
            </motion.div>

            {/* City info - extends to bottom of card */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-16">
              <h3 className="text-xl font-bold text-white drop-shadow-lg">
                {city.name}
                <span className="text-base font-normal ml-2 text-white/90">
                  {city.state}
                </span>
              </h3>
              <p className="text-sm text-white/95 italic mt-1 drop-shadow">{city.tagline}</p>
              <p className="text-xs text-white/85 mt-2 leading-relaxed line-clamp-3">{city.bio}</p>
              
              {/* Trait tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {city.traits.slice(0, 4).map(trait => (
                  <span
                    key={trait}
                    className="px-2 py-0.5 text-xs rounded-full bg-white/25 text-white backdrop-blur-sm"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </CityCardBackground>
        </motion.div>
      </div>

      {/* Action buttons - below the card */}
      <div className="flex justify-center gap-4 py-3 px-4 border-t bg-background">
        <Button
          size="lg"
          variant="outline"
          className="rounded-full h-12 w-12 p-0 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          onClick={() => onSwipe("left")}
        >
          <X className="h-5 w-5" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full h-14 w-14 p-0 border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-white"
          onClick={() => onSwipe("up")}
        >
          <Star className="h-6 w-6" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full h-12 w-12 p-0 border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
          onClick={() => onSwipe("right")}
        >
          <Heart className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function ResultsScreen({
  personality,
  onClose,
}: {
  personality: PersonalityResult;
  onClose: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <div className="text-6xl mb-4">{personality.emoji}</div>
      <DialogHeader>
        <DialogTitle className="text-2xl">{personality.title}</DialogTitle>
        <DialogDescription className="text-base mt-2">
          {personality.description}
        </DialogDescription>
      </DialogHeader>
      
      <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">Preferences Updated!</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Your city rankings have been adjusted based on your swipes.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <Button onClick={onClose} className="w-full" size="lg">
          See My Rankings
        </Button>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Settings className="h-3 w-3" />
          Fine-tune your preferences in Advanced Options
        </p>
      </div>
    </div>
  );
}

function CityCardBackground({
  cityId,
  gradient,
  children,
}: {
  cityId: string;
  gradient: string;
  children: React.ReactNode;
}) {
  const [imageError, setImageError] = useState(false);
  const imagePath = `/cities/${cityId}.jpg`;

  return (
    <div className={cn(
      "h-full rounded-2xl overflow-hidden shadow-xl relative bg-gradient-to-br",
      gradient
    )}>
      {/* Try to load city image, fall back to gradient */}
      {!imageError && (
        <Image
          src={imagePath}
          alt={cityId}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
          priority
        />
      )}
      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-black/20" />
      {children}
    </div>
  );
}
