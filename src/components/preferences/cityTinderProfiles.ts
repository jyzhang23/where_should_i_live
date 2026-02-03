/**
 * City Tinder Profiles
 * 
 * 10 diverse cities chosen to represent different lifestyle preferences.
 * Each city has traits that map to preference updates when swiped.
 */

export interface CityProfile {
  id: string;
  name: string;
  state: string;
  image: string;
  tagline: string;
  bio: string;
  traits: string[];
}

export const cityProfiles: CityProfile[] = [
  {
    id: "new-york-city",
    name: "New York City",
    state: "NY",
    image: "/cities/new-york.jpg",
    tagline: "The city that never sleeps",
    bio: "Maximum urban energy with world-class culture, dining, and nightlife. Walk everywhere, take the subway anywhere. Yes, it's expensive, but you'll never be bored.",
    traits: ["urban", "cultural", "expensive", "transit", "nightlife", "diverse"],
  },
  {
    id: "san-francisco",
    name: "San Francisco",
    state: "CA",
    image: "/cities/san-francisco.jpg",
    tagline: "Tech, hills, and fog",
    bio: "Mild weather year-round, stunning views, and the heart of the tech world. Walkable neighborhoods, great food scene, and easy access to wine country and nature.",
    traits: ["mild", "walkable", "expensive", "tech", "cultural", "coastal"],
  },
  {
    id: "miami",
    name: "Miami",
    state: "FL",
    image: "/cities/miami.jpg",
    tagline: "Where the sun always shines",
    bio: "Endless summer vibes with beautiful beaches, vibrant Latin culture, and legendary nightlife. No state income tax and a truly international atmosphere.",
    traits: ["warm", "beaches", "nightlife", "diverse", "affordable", "coastal"],
  },
  {
    id: "denver",
    name: "Denver",
    state: "CO",
    image: "/cities/denver.jpg",
    tagline: "Mile high and loving it",
    bio: "300 days of sunshine with world-class skiing and hiking at your doorstep. Four distinct seasons, craft beer culture, and an active outdoor lifestyle.",
    traits: ["outdoors", "mountains", "fourSeasons", "active", "growing", "nature"],
  },
  {
    id: "phoenix",
    name: "Phoenix",
    state: "AZ",
    image: "/cities/phoenix.jpg",
    tagline: "Valley of the Sun",
    bio: "Affordable living with year-round warmth and over 300 sunny days. Sprawling suburbs, golf courses galore, and stunning desert landscapes.",
    traits: ["warm", "affordable", "suburban", "sunny", "retirement", "growing"],
  },
  {
    id: "boston",
    name: "Boston",
    state: "MA",
    image: "/cities/boston.jpg",
    tagline: "Where history meets innovation",
    bio: "World-renowned universities, rich history, and passionate sports fans. Classic four-season New England weather with charming neighborhoods and excellent healthcare.",
    traits: ["fourSeasons", "education", "historic", "walkable", "healthcare", "cultural"],
  },
  {
    id: "nashville",
    name: "Nashville",
    state: "TN",
    image: "/cities/nashville.jpg",
    tagline: "Music City, USA",
    bio: "Live music on every corner, friendly Southern hospitality, and a booming economy. Affordable cost of living with hot summers and mild winters. No state income tax!",
    traits: ["affordable", "music", "growing", "warm", "friendly", "nightlife"],
  },
  {
    id: "portland",
    name: "Portland",
    state: "OR",
    image: "/cities/portland.jpg",
    tagline: "Keep it weird",
    bio: "Quirky, sustainable, and surrounded by nature. Mild rainy winters, gorgeous summers, and a food/coffee/beer scene that punches way above its weight.",
    traits: ["mild", "nature", "quirky", "sustainable", "foodie", "outdoors"],
  },
  {
    id: "chicago",
    name: "Chicago",
    state: "IL",
    image: "/cities/chicago.jpg",
    tagline: "The Windy City with big shoulders",
    bio: "World-class architecture, deep-dish pizza, and passionate sports culture. Affordable for a major city with excellent transit and distinct neighborhoods. Yes, winters are cold.",
    traits: ["urban", "affordable", "fourSeasons", "sports", "transit", "cultural"],
  },
  {
    id: "austin",
    name: "Austin",
    state: "TX",
    image: "/cities/austin.jpg",
    tagline: "Keep Austin Weird",
    bio: "Live music capital with a booming tech scene and BBQ that'll change your life. Hot summers, mild winters, and no state income tax. Growing fast!",
    traits: ["warm", "music", "tech", "growing", "affordable", "foodie"],
  },
];

/**
 * Trait-to-Preference Mappings
 * 
 * Each trait maps to specific preference updates.
 * Values are deltas that get applied based on swipe direction:
 * - Right (like): +1.0x these values
 * - Left (reject): -0.5x these values  
 * - Up (superlike): +2.0x these values
 */
export interface TraitMapping {
  weights?: Partial<{
    climate: number;
    costOfLiving: number;
    demographics: number;
    qualityOfLife: number;
    entertainment: number;
    values: number;
  }>;
  climate?: Partial<{
    weightComfortDays: number;
    weightFreezeDays: number;
    maxFreezeDays: number;
    weightSnowDays: number;
    maxSnowDays: number;
    preferSnow: boolean;
    preferDistinctSeasons: boolean;
  }>;
  qol?: Partial<{
    walkability: number;
    safety: number;
    internet: number;
    schools: number;
    healthcare: number;
  }>;
  entertainment?: Partial<{
    nightlifeImportance: number;
    artsImportance: number;
    diningImportance: number;
    sportsImportance: number;
    recreationImportance: number;
    natureWeight: number;
    beachWeight: number;
    mountainWeight: number;
  }>;
  demographics?: Partial<{
    weightDiversity: number;
    weightEconomicHealth: number;
  }>;
}

export const traitMappings: Record<string, TraitMapping> = {
  // Climate traits
  warm: {
    climate: { weightComfortDays: 15, maxFreezeDays: -20, maxSnowDays: -10 },
  },
  mild: {
    climate: { weightComfortDays: 10, weightFreezeDays: 10 },
  },
  fourSeasons: {
    climate: { maxFreezeDays: 20, maxSnowDays: 15, weightComfortDays: -5, preferDistinctSeasons: true, preferSnow: true },
  },
  sunny: {
    climate: { weightComfortDays: 10 },
  },

  // Urban/lifestyle traits
  urban: {
    weights: { qualityOfLife: 10, entertainment: 10 },
    qol: { walkability: 20 },
    entertainment: { nightlifeImportance: 15, diningImportance: 10 },
  },
  suburban: {
    qol: { walkability: -10 },
    entertainment: { nightlifeImportance: -15 },
  },
  walkable: {
    qol: { walkability: 20 },
  },
  transit: {
    qol: { walkability: 15 },
  },

  // Cost traits
  expensive: {
    weights: { costOfLiving: -10 },
  },
  affordable: {
    weights: { costOfLiving: 15 },
  },

  // Cultural/entertainment traits
  cultural: {
    weights: { entertainment: 15 },
    entertainment: { artsImportance: 20 },
  },
  nightlife: {
    entertainment: { nightlifeImportance: 20 },
  },
  music: {
    entertainment: { artsImportance: 15, nightlifeImportance: 10 },
  },
  foodie: {
    entertainment: { diningImportance: 20 },
  },
  sports: {
    entertainment: { sportsImportance: 20 },
  },

  // Nature/outdoor traits
  outdoors: {
    entertainment: { recreationImportance: 25, natureWeight: 20 },
  },
  nature: {
    entertainment: { recreationImportance: 20, natureWeight: 20 },
  },
  mountains: {
    entertainment: { recreationImportance: 15, mountainWeight: 20 },
  },
  beaches: {
    entertainment: { recreationImportance: 15, beachWeight: 20 },
  },
  coastal: {
    entertainment: { beachWeight: 15 },
  },
  active: {
    entertainment: { recreationImportance: 15 },
  },

  // Demographics/community traits
  diverse: {
    weights: { demographics: 10 },
    demographics: { weightDiversity: 15 },
  },
  friendly: {
    demographics: { weightDiversity: 5 },
  },
  historic: {
    entertainment: { artsImportance: 10 },
  },

  // Quality of life traits
  education: {
    qol: { schools: 20 },
  },
  healthcare: {
    qol: { healthcare: 20 },
  },
  tech: {
    qol: { internet: 15 },
    demographics: { weightEconomicHealth: 10 },
  },
  growing: {
    demographics: { weightEconomicHealth: 15 },
  },
  retirement: {
    qol: { healthcare: 15, safety: 10 },
  },
  sustainable: {
    // Maps to general quality focus
    weights: { qualityOfLife: 10 },
  },
  quirky: {
    weights: { entertainment: 10 },
    demographics: { weightDiversity: 10 },
  },
};

/**
 * Personality types based on swipe patterns
 */
export interface PersonalityResult {
  type: string;
  emoji: string;
  title: string;
  description: string;
}

export const personalityTypes: PersonalityResult[] = [
  {
    type: "urbanite",
    emoji: "🏙️",
    title: "The Urban Explorer",
    description: "You thrive in the energy of big cities. Walkability, nightlife, and cultural offerings are your jam.",
  },
  {
    type: "natureLover",
    emoji: "🏔️",
    title: "The Nature Seeker",
    description: "Mountains, trails, and outdoor adventures call to you. You'd trade a subway for a hiking trail any day.",
  },
  {
    type: "sunChaser",
    emoji: "☀️",
    title: "The Sun Chaser",
    description: "Warm weather is non-negotiable. You're happiest when the forecast says sunshine.",
  },
  {
    type: "budgetMinded",
    emoji: "💰",
    title: "The Smart Spender",
    description: "You value bang for your buck. Why pay NYC prices when other great cities cost half as much?",
  },
  {
    type: "culturalConnoisseur",
    emoji: "🎭",
    title: "The Cultural Connoisseur",
    description: "Museums, music, food scenes - you want a city with soul and culture to explore.",
  },
  {
    type: "balanced",
    emoji: "⚖️",
    title: "The Well-Rounded One",
    description: "You appreciate a bit of everything. Balance is key - you want the full package.",
  },
];
