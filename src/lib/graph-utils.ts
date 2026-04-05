// src/lib/graph-utils.ts

import type { Concept, BookConcept } from "@/server/schema";

/**
 * Normalize concept name for deduplication
 */
export function normalizeConceptName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/-/g, " ")
    .replace(/[^\w\s]/g, "");
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = matrix[0];
    matrix[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = matrix[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j] = Math.min(
        matrix[j] + 1,     // deletion
        matrix[j - 1] + 1, // insertion
        prev + cost        // substitution
      );
      prev = temp;
    }
  }

  return matrix[b.length];
}

/**
 * Edge strength result
 */
export interface EdgeStrengthResult {
  strength: number;        // 0-100
  sharedConcepts: Array<{
    id: number;
    name: string;
    weight: number;
  }>;
}

/**
 * Calculate edge strength between two books based on shared concepts
 */
export function calculateEdgeStrength(
  bookAConcepts: BookConcept[],
  bookBConcepts: BookConcept[],
  allConcepts: Map<number, Concept>
): EdgeStrengthResult {
  // Find shared concepts
  const sharedConcepts = bookAConcepts.filter(ac =>
    bookBConcepts.some(bc => bc.conceptId === ac.conceptId)
  );

  if (sharedConcepts.length === 0) {
    return { strength: 0, sharedConcepts: [] };
  }

  // Build shared concept details
  const shared = sharedConcepts.map(sc => {
    const concept = allConcepts.get(sc.conceptId);
    return {
      id: sc.conceptId,
      name: concept?.name || "Unknown",
      weight: sc.weight,
    };
  });

  // Sum the weights (0-100 each) and normalize to 0-100
  const totalWeight = shared.reduce((sum, c) => sum + c.weight, 0);
  const avgWeight = totalWeight / shared.length;

  // Count-based factor (more shared concepts = stronger connection)
  const countFactor = Math.min(sharedConcepts.length * 10, 50);

  // Combine: 60% weight, 40% count
  const strength = Math.min((avgWeight * 0.6) + countFactor, 100);

  return { strength, sharedConcepts: shared };
}

/**
 * Convert edge strength to line width in pixels
 */
export function strengthToWidth(strength: number): number {
  if (strength <= 20) return 1;
  if (strength <= 50) return 2;
  if (strength <= 80) return 3;
  return 4;
}

/**
 * Get color for a domain
 */
export function getDomainColor(domain?: string): string {
  if (!domain) return "#6b7280"; // gray for unknown

  const normalized = domain.toLowerCase();

  const domainColors: Record<string, string> = {
    philosophy: "#8b5cf6",    // purple
    psychology: "#3b82f6",    // blue
    biology: "#22c55e",       // green
    science: "#06b6d4",       // cyan
    physics: "#0ea5e9",       // sky
    mathematics: "#f59e0b",   // amber
    computer: "#14b8a6",      // teal
    history: "#ef4444",       // red
    literature: "#f97316",    // orange
    art: "#ec4899",           // pink
    religion: "#a855f7",      // violet
    sociology: "#6366f1",     // indigo
    economics: "#10b981",     // emerald
    politics: "#84cc16",      // lime
    general: "#6b7280",       // gray
  };

  return domainColors[normalized] || "#6b7280";
}

/**
 * Calculate node size based on connection count
 */
export function calculateNodeSize(connectionCount: number): number {
  // Base size of 20, plus 2 per connection, capped at 50
  return Math.min(20 + connectionCount * 2, 50);
}
