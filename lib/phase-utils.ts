/**
 * Formats a phase string into a user-friendly label without doubling the word "Phase".
 * Examples:
 *   "1" -> "Phase 1"
 *   "Phase 1" -> "Phase 1"
 *   "phase 2A" -> "phase 2A"
 *   "IV" -> "Phase IV"
 */
export function formatPhaseLabel(phase: string): string {
  const trimmed = phase.trim();
  if (/^phase\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Phase ${trimmed}`;
}
