/**
 * City ID aliases and fuzzy matching utilities
 * 
 * This handles differences between our internal city IDs and how
 * various external APIs/data sources name the same cities.
 */

// Mapping of canonical city ID to known aliases
// These are variations that might appear in external data sources
export const CITY_ALIASES: Record<string, string[]> = {
  "tampa-bay": ["tampa", "tampa bay", "tampa-st-petersburg", "tampa-st. petersburg-clearwater"],
  "new-york-city": ["new york", "nyc", "new-york", "manhattan", "new york-newark-jersey city"],
  "washington-dc": ["washington", "dc", "washington dc", "district of columbia", "washington-arlington-alexandria"],
  "st-louis": ["st louis", "saint louis", "stlouis"],
  "las-vegas": ["vegas", "las vegas"],
  "salt-lake-city": ["salt lake", "slc", "salt lake city"],
  "oklahoma-city": ["okc", "oklahoma city"],
  "kansas-city": ["kc", "kansas city"],
  "san-francisco": ["sf", "san francisco", "san francisco-oakland-berkeley"],
  "los-angeles": ["la", "los angeles", "los angeles-long beach-anaheim"],
  "new-orleans": ["nola", "new orleans"],
  "green-bay": ["green bay", "greenbay"],
};

// Reverse mapping: alias -> canonical ID
const aliasToCanonical: Record<string, string> = {};
for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
  for (const alias of aliases) {
    aliasToCanonical[alias.toLowerCase()] = canonical;
  }
  // Also map the canonical ID to itself
  aliasToCanonical[canonical.toLowerCase()] = canonical;
}

/**
 * Normalize a city name/ID to our canonical city ID
 * @param input - City name, ID, or alias
 * @returns Canonical city ID or the normalized input if no match
 */
export function normalizeCityId(input: string): string {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[,\s]+/g, "-")  // Replace spaces/commas with dashes
    .replace(/[^a-z0-9-]/g, "") // Remove special chars except dashes
    .replace(/-+/g, "-")  // Collapse multiple dashes
    .replace(/-(fl|ca|tx|ny|wa|or|nv|co|az|ga|il|mi|mn|pa|nc|tn|mo|in|oh|ut|wi|la|nj|md|ma)$/i, ""); // Remove state suffixes

  // Check direct alias match
  if (aliasToCanonical[normalized]) {
    return aliasToCanonical[normalized];
  }

  // Check if input starts with a known canonical ID
  for (const canonical of Object.keys(CITY_ALIASES)) {
    if (normalized.startsWith(canonical)) {
      return canonical;
    }
  }

  return normalized;
}

/**
 * Get fallback data using fuzzy matching
 * @param cityId - The city ID to look up
 * @param fallbackData - Dictionary of fallback data keyed by city ID
 * @returns The fallback data or null if not found
 */
export function getFallbackData<T>(
  cityId: string,
  fallbackData: Record<string, T>
): T | null {
  // Try exact match first
  if (fallbackData[cityId]) {
    return fallbackData[cityId];
  }

  // Try normalized match
  const normalized = normalizeCityId(cityId);
  if (fallbackData[normalized]) {
    return fallbackData[normalized];
  }

  // Try aliases
  const aliases = CITY_ALIASES[cityId] || CITY_ALIASES[normalized];
  if (aliases) {
    for (const alias of aliases) {
      const aliasNorm = normalizeCityId(alias);
      if (fallbackData[aliasNorm]) {
        return fallbackData[aliasNorm];
      }
    }
  }

  // Check all canonical IDs to see if any match the input
  for (const [canonical, aliasList] of Object.entries(CITY_ALIASES)) {
    if (fallbackData[canonical]) {
      // Check if cityId matches any alias
      const cityIdNorm = cityId.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const alias of aliasList) {
        const aliasNorm = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cityIdNorm === aliasNorm || cityIdNorm.includes(aliasNorm) || aliasNorm.includes(cityIdNorm)) {
          return fallbackData[canonical];
        }
      }
    }
  }

  return null;
}

/**
 * Generate all possible search terms for a city
 * Useful for external API queries
 */
export function getCitySearchTerms(cityId: string, cityName: string, state: string): string[] {
  const terms = new Set<string>();
  
  // Add canonical forms
  terms.add(cityName);
  terms.add(`${cityName}, ${state}`);
  
  // Add aliases
  const aliases = CITY_ALIASES[cityId];
  if (aliases) {
    for (const alias of aliases) {
      terms.add(alias);
      // Capitalize first letter of each word
      terms.add(alias.split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
    }
  }
  
  // Common variations
  if (cityName.includes(" ")) {
    terms.add(cityName.replace(/ /g, "-"));
  }
  
  return Array.from(terms);
}
