/**
 * City Tinder Profiles - "The Dirty Dozen"
 * 
 * 12 cities selected to maximize algorithmic variance across all 6 scoring categories.
 * Each city acts as a "polarizing filter" to reveal user dealbreakers.
 * 
 * Design principles:
 * - No two cities test the exact same combination of preferences
 * - Creates triangulation for Safety, Urban Form, Winter, and Values
 * - Replaces "trendy mid-sized cities" with distinct archetypes
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
  // === KEPT FROM ORIGINAL ===
  {
    id: "new-york-city",
    name: "New York City",
    state: "NY",
    image: "/cities/new-york-city.jpg",
    tagline: "The city that never sleeps",
    bio: "Maximum urban energy with world-class culture, dining, and nightlife. Walk everywhere, take the subway anywhere. Yes, it's expensive, but you'll never be bored.",
    traits: ["urban", "cultural", "expensive", "transit", "nightlife", "diverse", "progressive"],
  },
  {
    id: "san-francisco",
    name: "San Francisco",
    state: "CA",
    image: "/cities/san-francisco.jpg",
    tagline: "Tech, hills, and fog",
    bio: "Mild weather year-round, stunning views, and the heart of the tech world. Walkable neighborhoods, great food scene, and easy access to wine country and nature.",
    traits: ["mild", "walkable", "expensive", "tech", "cultural", "coastal", "progressive"],
  },
  {
    id: "miami",
    name: "Miami",
    state: "FL",
    image: "/cities/miami.jpg",
    tagline: "Where the sun always shines",
    bio: "Endless summer vibes with beautiful beaches, vibrant Latin culture, and legendary nightlife. No state income tax and a truly international atmosphere.",
    traits: ["warm", "beaches", "nightlife", "diverse", "humid", "coastal"],
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

  // === NEW ADDITIONS ===
  {
    id: "boise",
    name: "Boise",
    state: "ID",
    image: "/cities/boise.jpg", // PLACEHOLDER - needs image
    tagline: "The gem of the Northwest",
    bio: "Safe, affordable, and surrounded by nature. A fast-growing city that offers outdoor access without big-city hassle. Perfect for families seeking stability and space.",
    traits: ["affordable", "safe", "nature", "conservative", "growing", "suburban"],
  },
  {
    id: "minneapolis",
    name: "Minneapolis",
    state: "MN",
    image: "/cities/minneapolis.jpg", // PLACEHOLDER - needs image
    tagline: "The Nordic model in America",
    bio: "Excellent schools, low crime, and world-class parks—if you can handle the winters. A progressive city that proves you can have it all (except warm weather).",
    traits: ["fourSeasons", "safe", "education", "affordable", "progressive", "cold"],
  },
  {
    id: "salt-lake-city",
    name: "Salt Lake City",
    state: "UT",
    image: "/cities/salt-lake-city.jpg", // PLACEHOLDER - needs image
    tagline: "Mountains meet community",
    bio: "World-class skiing and stunning mountain access with a strong sense of community. Family-oriented with a unique cultural identity. Growing tech scene.",
    traits: ["mountains", "outdoors", "conservative", "religious", "safe", "fourSeasons"],
  },
  {
    id: "new-orleans",
    name: "New Orleans",
    state: "LA",
    image: "/cities/new-orleans.jpg", // PLACEHOLDER - needs image
    tagline: "Let the good times roll",
    bio: "Unmatched culture, legendary food, and music on every corner. Yes, the stats are rough (crime, economy), but no city has more soul. Live music any night of the week.",
    traits: ["cultural", "nightlife", "foodie", "music", "diverse", "humid", "historic"],
  },
  {
    id: "seattle",
    name: "Seattle",
    state: "WA",
    image: "/cities/seattle.jpg", // PLACEHOLDER - needs image
    tagline: "Emerald City in the clouds",
    bio: "Tech jobs, stunning nature, and world-class coffee—if you can handle the grey. Surrounded by mountains and water, with a laid-back Pacific Northwest vibe.",
    traits: ["tech", "nature", "cloudy", "progressive", "coastal", "outdoors", "expensive"],
  },
  {
    id: "las-vegas",
    name: "Las Vegas",
    state: "NV",
    image: "/cities/las-vegas.jpg", // PLACEHOLDER - needs image
    tagline: "Entertainment capital of the world",
    bio: "24/7 entertainment, world-class dining, and surprisingly affordable housing. Desert heat, no state income tax, and endless things to do. Not just for tourists.",
    traits: ["nightlife", "affordable", "warm", "entertainment", "sunny", "desert"],
  },
  {
    id: "boston",
    name: "Boston",
    state: "MA",
    image: "/cities/boston.jpg", // PLACEHOLDER - needs image
    tagline: "Where history meets innovation",
    bio: "World-renowned universities, rich history, and passionate sports fans. Classic four-season New England weather with charming neighborhoods and excellent healthcare.",
    traits: ["fourSeasons", "education", "historic", "walkable", "healthcare", "cultural", "expensive", "cold"],
  },
  {
    id: "houston",
    name: "Houston",
    state: "TX",
    image: "/cities/houston.jpg", // PLACEHOLDER - needs image
    tagline: "Space City with room to grow",
    bio: "Massive diversity, affordable housing, and no state income tax. Yes, you'll need a car and AC, but your dollar goes far. NASA, world-class medical center, and incredible food.",
    traits: ["affordable", "diverse", "sprawl", "warm", "humid", "growing", "suburban"],
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
    weightCloudyDays: number;
    weightHumidity: number;
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
  values?: Partial<{
    partisanWeight: number;
    partisanPreference: number; // positive = dem, negative = rep
  }>;
}

export const traitMappings: Record<string, TraitMapping> = {
  // === CLIMATE TRAITS ===
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
    climate: { weightComfortDays: 10, weightCloudyDays: 15 },
  },
  cloudy: {
    climate: { weightCloudyDays: -15, weightComfortDays: -5 },
  },
  humid: {
    climate: { weightHumidity: -10 },
  },
  cold: {
    climate: { weightFreezeDays: -10, maxFreezeDays: 30, preferSnow: true },
  },
  desert: {
    climate: { weightComfortDays: 10, weightHumidity: 15 },
  },

  // === URBAN/LIFESTYLE TRAITS ===
  urban: {
    weights: { qualityOfLife: 10, entertainment: 10 },
    qol: { walkability: 20 },
    entertainment: { nightlifeImportance: 15, diningImportance: 10 },
  },
  suburban: {
    qol: { walkability: -15, safety: 10 },
    entertainment: { nightlifeImportance: -15 },
  },
  sprawl: {
    qol: { walkability: -25 },
    entertainment: { nightlifeImportance: -10 },
  },
  walkable: {
    qol: { walkability: 20 },
  },
  transit: {
    qol: { walkability: 15 },
  },
  safe: {
    qol: { safety: 25 },
    weights: { qualityOfLife: 10 },
  },

  // === COST TRAITS ===
  expensive: {
    weights: { costOfLiving: -15 },
  },
  affordable: {
    weights: { costOfLiving: 20 },
  },

  // === CULTURAL/ENTERTAINMENT TRAITS ===
  cultural: {
    weights: { entertainment: 15 },
    entertainment: { artsImportance: 20 },
  },
  nightlife: {
    entertainment: { nightlifeImportance: 25 },
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
  entertainment: {
    weights: { entertainment: 20 },
    entertainment: { nightlifeImportance: 15, diningImportance: 15 },
  },
  historic: {
    entertainment: { artsImportance: 10 },
  },

  // === NATURE/OUTDOOR TRAITS ===
  outdoors: {
    entertainment: { recreationImportance: 25, natureWeight: 20 },
  },
  nature: {
    entertainment: { recreationImportance: 20, natureWeight: 20 },
  },
  mountains: {
    entertainment: { recreationImportance: 15, mountainWeight: 25 },
  },
  beaches: {
    entertainment: { recreationImportance: 15, beachWeight: 25 },
  },
  coastal: {
    entertainment: { beachWeight: 15 },
  },
  active: {
    entertainment: { recreationImportance: 15 },
  },

  // === DEMOGRAPHICS/COMMUNITY TRAITS ===
  diverse: {
    weights: { demographics: 15 },
    demographics: { weightDiversity: 20 },
  },
  growing: {
    demographics: { weightEconomicHealth: 15 },
  },

  // === VALUES/POLITICAL TRAITS (NEW) ===
  progressive: {
    weights: { values: 15 },
    values: { partisanWeight: 15, partisanPreference: 10 }, // leans dem
  },
  conservative: {
    weights: { values: 15 },
    values: { partisanWeight: 15, partisanPreference: -10 }, // leans rep
  },
  religious: {
    weights: { values: 10 },
    values: { partisanWeight: 10 },
  },

  // === QOL TRAITS ===
  education: {
    qol: { schools: 25 },
  },
  healthcare: {
    qol: { healthcare: 25 },
  },
  tech: {
    qol: { internet: 15 },
    demographics: { weightEconomicHealth: 15 },
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
    type: "safetyFirst",
    emoji: "🛡️",
    title: "The Safety Seeker",
    description: "Low crime and good schools matter most. You prioritize stability and peace of mind.",
  },
  {
    type: "balanced",
    emoji: "⚖️",
    title: "The Well-Rounded One",
    description: "You appreciate a bit of everything. Balance is key - you want the full package.",
  },
];
