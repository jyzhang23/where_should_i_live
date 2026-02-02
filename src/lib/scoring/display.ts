// ============================================================================
// DISPLAY UTILITIES - Grades, Colors, Labels for Score Presentation
// ============================================================================

/**
 * Get letter grade for a score
 */
export function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 77) return "B+";
  if (score >= 73) return "B";
  if (score >= 70) return "B-";
  if (score >= 67) return "C+";
  if (score >= 63) return "C";
  if (score >= 60) return "C-";
  if (score >= 50) return "D";
  return "F";
}

/**
 * Get color class for a score
 */
export function getScoreColor(score: number): string {
  if (score >= 75) return "text-score-high";
  if (score >= 50) return "text-score-medium";
  return "text-score-low";
}

/**
 * Get background color class for a score
 */
export function getScoreBgColor(score: number): string {
  if (score >= 75) return "bg-score-high";
  if (score >= 50) return "bg-score-medium";
  return "bg-score-low";
}

/**
 * Get interpretation label for a score (aligned with letter grades)
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return "Exceptional";  // A+
  if (score >= 80) return "Excellent";    // A/A-
  if (score >= 70) return "Good";         // B+/B/B-
  if (score >= 60) return "Average";      // C+/C/C-
  if (score >= 50) return "Below Average"; // D
  return "Poor";                          // F
}

/**
 * Get relative indicator for a score vs national average (50)
 * Returns "+X" for above average, "-X" for below, or "avg" for near-average
 */
export function getScoreRelative(score: number): { text: string; color: string } {
  const diff = score - 50;
  if (Math.abs(diff) < 5) {
    return { text: "avg", color: "text-muted-foreground" };
  }
  if (diff > 0) {
    return { text: `+${diff.toFixed(0)}`, color: "text-green-600 dark:text-green-400" };
  }
  return { text: `${diff.toFixed(0)}`, color: "text-red-600 dark:text-red-400" };
}

/**
 * Get tooltip explanation for a score category
 */
export function getScoreTooltip(category: string, score: number): string {
  const label = getScoreLabel(score);
  const relative = score >= 50 
    ? `${(score - 50).toFixed(0)} points above` 
    : `${(50 - score).toFixed(0)} points below`;
  
  const categoryExplanations: Record<string, string> = {
    climate: "Weather patterns compared to U.S. geographic extremes",
    cost: "Cost of living adjusted for your income scenario",
    demographics: "Population, diversity, and community metrics",
    qol: "Quality of life factors (walkability, safety, schools, etc.)",
    cultural: "Cultural amenities and political alignment",
    total: "Weighted average of all category scores",
  };

  const explanation = categoryExplanations[category.toLowerCase()] || "";
  return `${label} (${relative} national average)\n${explanation}`;
}
