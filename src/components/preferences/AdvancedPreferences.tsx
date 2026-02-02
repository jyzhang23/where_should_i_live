"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ChevronRight, Thermometer, Users, Heart, DollarSign, X, Church
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Import section components
import {
  ClimatePreferences,
  CostPreferences,
  DemographicsPreferences,
  QualityOfLifePreferences,
  CulturalPreferences,
} from "./sections";

type SectionId = "climate" | "cost" | "demographics" | "qol" | "cultural" | null;

interface CollapsibleSectionProps {
  id: SectionId;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  openSection: SectionId;
  onToggle: (id: SectionId) => void;
}

function CollapsibleSection({ id, title, icon, children, openSection, onToggle }: CollapsibleSectionProps) {
  const isOpen = openSection === id;

  return (
    <Collapsible open={isOpen} onOpenChange={(open) => onToggle(open ? id : null)}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors">
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 space-y-4 pt-2 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdvancedPreferences() {
  const [openSection, setOpenSection] = useState<SectionId>(null);

  const isExpanded = openSection !== null;

  return (
    <div className={cn(
      "space-y-2 border-t pt-4 transition-all duration-300",
      isExpanded && "fixed inset-x-0 top-0 bottom-0 z-50 bg-background p-4 overflow-y-auto md:inset-x-auto md:left-0 md:w-[420px] md:border-r md:shadow-xl"
    )}>
      {/* Close button when expanded */}
      {isExpanded && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b">
          <h3 className="font-semibold text-lg">Advanced Options</h3>
          <button
            onClick={() => setOpenSection(null)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="Collapse all sections"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Climate Details - NOAA-based */}
      <CollapsibleSection
        id="climate"
        title="Climate Preferences"
        icon={<Thermometer className="h-4 w-4 text-orange-500" />}
        openSection={openSection}
        onToggle={setOpenSection}
      >
        <ClimatePreferences />
      </CollapsibleSection>

      {/* Cost of Living - Housing Situation */}
      <CollapsibleSection
        id="cost"
        title="Cost of Living"
        icon={<DollarSign className="h-4 w-4 text-green-500" />}
        openSection={openSection}
        onToggle={setOpenSection}
      >
        <CostPreferences />
      </CollapsibleSection>

      {/* Demographics Details */}
      <CollapsibleSection
        id="demographics"
        title="Demographics Details"
        icon={<Users className="h-4 w-4 text-blue-500" />}
        openSection={openSection}
        onToggle={setOpenSection}
      >
        <DemographicsPreferences />
      </CollapsibleSection>

      {/* Quality of Life Details */}
      <CollapsibleSection
        id="qol"
        title="Quality of Life"
        icon={<Heart className="h-4 w-4 text-red-500" />}
        openSection={openSection}
        onToggle={setOpenSection}
      >
        <QualityOfLifePreferences />
      </CollapsibleSection>

      {/* Cultural Preferences */}
      <CollapsibleSection
        id="cultural"
        title="Cultural Preferences"
        icon={<Church className="h-4 w-4 text-purple-500" />}
        openSection={openSection}
        onToggle={setOpenSection}
      >
        <CulturalPreferences />
      </CollapsibleSection>
    </div>
  );
}
