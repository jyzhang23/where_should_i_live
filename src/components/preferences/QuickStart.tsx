"use client";

import { useState } from "react";
import { usePreferencesStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Home,
  Building,
  Key,
  Briefcase,
  TrendingUp,
  Palmtree,
  Sun,
  Snowflake,
  Leaf,
  DollarSign,
  Heart,
  Thermometer,
  GraduationCap,
  Baby,
  Train,
  Users,
  Activity,
  Scale,
} from "lucide-react";

type HousingSituation = "renter" | "homeowner" | "prospective-buyer";
type WorkSituation = "standard" | "local-earner" | "retiree";
type ClimatePref = "warm" | "mild" | "four-seasons" | "any";
type Priority = "cost" | "climate" | "quality" | "balanced";
type Lifestyle = "young-professional" | "family" | "retiree" | "community" | "car-free" | "balanced";

interface QuickStartProps {
  onComplete?: () => void;
}

export function QuickStart({ onComplete }: QuickStartProps) {
  const [open, setOpen] = useState(false);
  const { updateAdvanced, updateWeight, updateQoLWeight } = usePreferencesStore();

  // Local state for wizard
  const [housing, setHousing] = useState<HousingSituation>("renter");
  const [work, setWork] = useState<WorkSituation>("local-earner");
  const [climate, setClimate] = useState<ClimatePref>("any");
  const [lifestyle, setLifestyle] = useState<Lifestyle>("balanced");
  const [priority, setPriority] = useState<Priority>("balanced");

  const handleApply = () => {
    // Apply housing situation
    updateAdvanced("costOfLiving", "housingSituation", housing);

    // Apply work situation
    updateAdvanced("costOfLiving", "workSituation", work);

    // Apply climate preferences
    if (climate === "warm") {
      // Warm year-round: prioritize comfort days, penalize cold
      updateAdvanced("climate", "weightComfortDays", 80);
      updateAdvanced("climate", "weightFreezeDays", 80);
      updateAdvanced("climate", "maxFreezeDays", 5);
      updateAdvanced("climate", "weightExtremeHeat", 30);
      updateAdvanced("climate", "weightSnowDays", 60);
      updateAdvanced("climate", "maxSnowDays", 0);
    } else if (climate === "mild") {
      // Mild/moderate: avoid extremes
      updateAdvanced("climate", "weightComfortDays", 70);
      updateAdvanced("climate", "weightFreezeDays", 60);
      updateAdvanced("climate", "maxFreezeDays", 30);
      updateAdvanced("climate", "weightExtremeHeat", 70);
      updateAdvanced("climate", "maxExtremeHeatDays", 5);
      updateAdvanced("climate", "weightHumidity", 60);
    } else if (climate === "four-seasons") {
      // Four seasons: balance, accept some cold
      updateAdvanced("climate", "weightComfortDays", 50);
      updateAdvanced("climate", "weightFreezeDays", 30);
      updateAdvanced("climate", "maxFreezeDays", 60);
      updateAdvanced("climate", "weightSnowDays", 20);
      updateAdvanced("climate", "maxSnowDays", 30);
      updateAdvanced("climate", "weightSeasonalStability", 0);
    }
    // "any" = leave defaults

    // Apply lifestyle/persona preferences (QoL weights + Demographics)
    if (lifestyle === "young-professional") {
      // Prioritize walkability, transit, internet, economic health
      updateQoLWeight("walkability", 90);
      updateQoLWeight("safety", 60);
      updateQoLWeight("internet", 80);
      updateQoLWeight("schools", 20);
      updateQoLWeight("healthcare", 40);
      updateAdvanced("demographics", "weightEconomicHealth", 80);
      updateAdvanced("demographics", "preferredAgeGroup", "young");
      updateAdvanced("demographics", "weightAge", 50);
    } else if (lifestyle === "family") {
      // Prioritize schools, safety, healthcare
      updateQoLWeight("walkability", 50);
      updateQoLWeight("safety", 100);
      updateQoLWeight("schools", 100);
      updateQoLWeight("healthcare", 80);
      updateQoLWeight("internet", 60);
      updateAdvanced("demographics", "weightEconomicHealth", 70);
      updateAdvanced("demographics", "preferredAgeGroup", "any");
    } else if (lifestyle === "retiree") {
      // Prioritize healthcare, safety, air quality
      updateQoLWeight("walkability", 50);
      updateQoLWeight("safety", 90);
      updateQoLWeight("airQuality", 90);
      updateQoLWeight("healthcare", 100);
      updateQoLWeight("schools", 0);
      updateQoLWeight("internet", 40);
      updateAdvanced("demographics", "preferredAgeGroup", "retirement");
      updateAdvanced("demographics", "weightAge", 40);
    } else if (lifestyle === "community") {
      // Prioritize diversity, ethnic community presence
      updateAdvanced("demographics", "weightDiversity", 80);
      updateAdvanced("demographics", "minDiversityIndex", 50);
      updateAdvanced("demographics", "weightForeignBorn", 70);
      updateAdvanced("demographics", "minorityImportance", 80);
      // Bump up demographics weight for this persona
      updateWeight("demographics", 80);
    } else if (lifestyle === "car-free") {
      // Prioritize walkability, transit, bike scores
      updateQoLWeight("walkability", 100);
      updateQoLWeight("safety", 60);
      updateQoLWeight("internet", 50);
      updateAdvanced("qualityOfLife", "minWalkScore", 70);
      updateAdvanced("qualityOfLife", "minTransitScore", 60);
      updateAdvanced("demographics", "weightPopulationSize", 60);
      updateAdvanced("demographics", "minPopulation", 500000);
    }
    // "balanced" = leave defaults

    // Apply priority weights
    if (priority === "cost") {
      updateWeight("costOfLiving", 100);
      updateWeight("climate", 40);
      updateWeight("qualityOfLife", 60);
      updateWeight("demographics", 30);
    } else if (priority === "climate") {
      updateWeight("climate", 100);
      updateWeight("costOfLiving", 50);
      updateWeight("qualityOfLife", 50);
      updateWeight("demographics", 30);
    } else if (priority === "quality") {
      updateWeight("qualityOfLife", 100);
      updateWeight("costOfLiving", 60);
      updateWeight("climate", 50);
      updateWeight("demographics", 40);
    } else {
      // balanced
      updateWeight("climate", 70);
      updateWeight("costOfLiving", 70);
      updateWeight("qualityOfLife", 70);
      updateWeight("demographics", 50);
    }

    setOpen(false);
    onComplete?.();
  };

  const OptionCard = ({
    selected,
    onClick,
    icon,
    title,
    description,
    tooltip,
  }: {
    selected: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    description: string;
    tooltip?: string;
  }) => {
    const card = (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center",
          selected
            ? "border-primary bg-primary/10"
            : "border-muted hover:border-muted-foreground/30"
        )}
      >
        <div className={cn("mb-1", selected ? "text-primary" : "text-muted-foreground")}>
          {icon}
        </div>
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </button>
    );

    if (!tooltip) return card;

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Quick Setup
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Setup
          </DialogTitle>
          <DialogDescription>
            Answer a few questions to personalize your city rankings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Housing Situation */}
          <div>
            <h4 className="text-sm font-medium mb-3">Your housing situation</h4>
            <div className="grid grid-cols-3 gap-2">
              <OptionCard
                selected={housing === "renter"}
                onClick={() => setHousing("renter")}
                icon={<Building className="h-5 w-5" />}
                title="Renter"
                description="Currently renting"
                tooltip="Uses BEA rental cost index. Best for comparing apartment costs across cities."
              />
              <OptionCard
                selected={housing === "homeowner"}
                onClick={() => setHousing("homeowner")}
                icon={<Home className="h-5 w-5" />}
                title="Homeowner"
                description="Fixed mortgage"
                tooltip="Excludes housing costs since your mortgage is locked in. Compares groceries, utilities, etc."
              />
              <OptionCard
                selected={housing === "prospective-buyer"}
                onClick={() => setHousing("prospective-buyer")}
                icon={<Key className="h-5 w-5" />}
                title="Buyer"
                description="Looking to buy"
                tooltip="Uses current home prices and mortgage rates. Shows true cost of buying in each city today."
              />
            </div>
          </div>

          {/* Work Situation */}
          <div>
            <h4 className="text-sm font-medium mb-3">Your work situation</h4>
            <div className="grid grid-cols-3 gap-2">
              <OptionCard
                selected={work === "local-earner"}
                onClick={() => setWork("local-earner")}
                icon={<TrendingUp className="h-5 w-5" />}
                title="Local Earner"
                description="Salary varies by city"
                tooltip="Uses local income data. Shows how well locals afford their city—NYC earners make more but costs are higher."
              />
              <OptionCard
                selected={work === "standard"}
                onClick={() => setWork("standard")}
                icon={<Briefcase className="h-5 w-5" />}
                title="Standard / Moving"
                description="Same income anywhere"
                tooltip="Uses fixed national median income. Pure affordability comparison—same $70K salary, which city stretches further?"
              />
              <OptionCard
                selected={work === "retiree"}
                onClick={() => setWork("retiree")}
                icon={<Palmtree className="h-5 w-5" />}
                title="Retiree / Fixed"
                description="Fixed retirement income"
                tooltip="Uses your specified fixed income (Social Security, pension, etc.). Shows where your retirement dollars go furthest."
              />
            </div>
          </div>

          {/* Climate Preference */}
          <div>
            <h4 className="text-sm font-medium mb-3">Climate preference</h4>
            <div className="grid grid-cols-4 gap-2">
              <OptionCard
                selected={climate === "warm"}
                onClick={() => setClimate("warm")}
                icon={<Sun className="h-5 w-5" />}
                title="Warm"
                description="Year-round sun"
                tooltip="Like San Diego, Miami, Phoenix. Prioritizes comfort days, penalizes freezing temps and snow."
              />
              <OptionCard
                selected={climate === "mild"}
                onClick={() => setClimate("mild")}
                icon={<Thermometer className="h-5 w-5" />}
                title="Mild"
                description="No extremes"
                tooltip="Like San Francisco, Portland, Seattle. Avoids both extreme heat (>95°F) and harsh cold. May accept some rain/clouds."
              />
              <OptionCard
                selected={climate === "four-seasons"}
                onClick={() => setClimate("four-seasons")}
                icon={<Leaf className="h-5 w-5" />}
                title="4 Seasons"
                description="Variety is nice"
                tooltip="Like Boston, Denver, Nashville. Accepts cold winters and some snow in exchange for distinct seasons and fall foliage."
              />
              <OptionCard
                selected={climate === "any"}
                onClick={() => setClimate("any")}
                icon={<Snowflake className="h-5 w-5" />}
                title="Any"
                description="Don't care"
                tooltip="Climate won't be adjusted. Uses default balanced settings—you can fine-tune in Advanced Options later."
              />
            </div>
          </div>

          {/* Lifestyle / Persona */}
          <div>
            <h4 className="text-sm font-medium mb-3">Your lifestyle</h4>
            <div className="grid grid-cols-3 gap-2">
              <OptionCard
                selected={lifestyle === "young-professional"}
                onClick={() => setLifestyle("young-professional")}
                icon={<Briefcase className="h-5 w-5" />}
                title="Young Professional"
                description="Career-focused"
                tooltip="Prioritizes walkability, transit, fast internet, and economic opportunity. Prefers cities with younger median age."
              />
              <OptionCard
                selected={lifestyle === "family"}
                onClick={() => setLifestyle("family")}
                icon={<Baby className="h-5 w-5" />}
                title="Family with Kids"
                description="Schools & safety"
                tooltip="Prioritizes top schools, low crime, and good healthcare. Best for parents or those planning families."
              />
              <OptionCard
                selected={lifestyle === "retiree"}
                onClick={() => setLifestyle("retiree")}
                icon={<Heart className="h-5 w-5" />}
                title="Retiree"
                description="Health & peace"
                tooltip="Prioritizes healthcare access, safety, and air quality. De-prioritizes schools. Prefers older median age communities."
              />
              <OptionCard
                selected={lifestyle === "community"}
                onClick={() => setLifestyle("community")}
                icon={<Users className="h-5 w-5" />}
                title="Seeking Community"
                description="Diversity matters"
                tooltip="Prioritizes diversity index, foreign-born population, and ethnic community presence. Great for immigrants or those seeking multicultural environments."
              />
              <OptionCard
                selected={lifestyle === "car-free"}
                onClick={() => setLifestyle("car-free")}
                icon={<Train className="h-5 w-5" />}
                title="Car-Free Urban"
                description="Walk & transit"
                tooltip="Maximizes walkability, transit, and bike scores. Requires minimum population of 500K for urban density."
              />
              <OptionCard
                selected={lifestyle === "balanced"}
                onClick={() => setLifestyle("balanced")}
                icon={<Scale className="h-5 w-5" />}
                title="Balanced"
                description="A bit of everything"
                tooltip="No specific lifestyle adjustments. Uses default balanced settings for QoL and demographics."
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <h4 className="text-sm font-medium mb-3">What matters most?</h4>
            <div className="grid grid-cols-4 gap-2">
              <OptionCard
                selected={priority === "cost"}
                onClick={() => setPriority("cost")}
                icon={<DollarSign className="h-5 w-5" />}
                title="Cost"
                description="Affordability first"
                tooltip="Maximizes Cost weight. Great if you're budget-conscious or seeking the best value for your dollar."
              />
              <OptionCard
                selected={priority === "climate"}
                onClick={() => setPriority("climate")}
                icon={<Sun className="h-5 w-5" />}
                title="Climate"
                description="Weather matters"
                tooltip="Maximizes Climate weight. Perfect if weather is a dealbreaker and you'll pay more for better conditions."
              />
              <OptionCard
                selected={priority === "quality"}
                onClick={() => setPriority("quality")}
                icon={<Heart className="h-5 w-5" />}
                title="Quality"
                description="Best amenities"
                tooltip="Maximizes Quality of Life weight. Prioritizes walkability, safety, schools, healthcare, and internet."
              />
              <OptionCard
                selected={priority === "balanced"}
                onClick={() => setPriority("balanced")}
                icon={<Sparkles className="h-5 w-5" />}
                title="Balanced"
                description="A bit of everything"
                tooltip="Equal emphasis on all factors. Good starting point—you can adjust individual weights later."
              />
            </div>
          </div>
        </div>

        {/* Reminder */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 flex gap-2">
          <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Tip:</strong> These are starting points! Fine-tune individual settings in{" "}
            <span className="font-medium">Advanced Options</span>, then use the{" "}
            <span className="font-medium">Export</span> button to save your profile for later.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply & Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
