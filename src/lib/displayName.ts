/**
 * Turns a map's URL name into a title: "polite-moose" -> "Polite moose",
 * "2025-election-results" -> "2025 election results". Only ASCII hyphens
 * separate words; the non-breaking hyphens inside generated words like
 * "snow‑capped" are kept.
 */
export function displayName(name: string): string {
    const spaced = name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
