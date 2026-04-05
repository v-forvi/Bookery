// tests/lib/graph-utils.test.ts

import { describe, it, expect } from "vitest";
import {
  normalizeConceptName,
  levenshtein,
  calculateEdgeStrength,
  strengthToWidth,
  getDomainColor,
  calculateNodeSize,
} from "@/lib/graph-utils";

describe("normalizeConceptName", () => {
  it("converts to lowercase", () => {
    expect(normalizeConceptName("Free Will")).toBe("free will");
  });

  it("trims whitespace", () => {
    expect(normalizeConceptName("  free will  ")).toBe("free will");
  });

  it("replaces hyphens with spaces", () => {
    expect(normalizeConceptName("free-will")).toBe("free will");
  });

  it("removes special characters", () => {
    expect(normalizeConceptName("free-will!")).toBe("free will");
    expect(normalizeConceptName("consciousness?")).toBe("consciousness");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeConceptName("free   will")).toBe("free will");
  });
});

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("test", "test")).toBe(0);
  });

  it("returns correct distance for simple edits", () => {
    expect(levenshtein("test", "tast")).toBe(1);
    expect(levenshtein("test", "tent")).toBe(1);
    expect(levenshtein("test", "tex")).toBe(2);
  });

  it("handles empty strings", () => {
    expect(levenshtein("", "")).toBe(0);
    expect(levenshtein("test", "")).toBe(4);
    expect(levenshtein("", "test")).toBe(4);
  });
});

describe("calculateEdgeStrength", () => {
  it("returns 0 strength when no shared concepts", () => {
    const bookAConcepts = [{ conceptId: 1, weight: 80 }];
    const bookBConcepts = [{ conceptId: 2, weight: 70 }];
    const allConcepts = new Map([
      [1, { id: 1, name: "consciousness" }],
      [2, { id: 2, name: "freedom" }],
    ]);

    const result = calculateEdgeStrength(
      bookAConcepts as any,
      bookBConcepts as any,
      allConcepts
    );

    expect(result.strength).toBe(0);
    expect(result.sharedConcepts).toHaveLength(0);
  });

  it("calculates strength from shared concepts", () => {
    const bookAConcepts = [
      { conceptId: 1, weight: 80 },
      { conceptId: 2, weight: 60 },
    ];
    const bookBConcepts = [
      { conceptId: 1, weight: 70 },
    ];
    const allConcepts = new Map([
      [1, { id: 1, name: "consciousness" }],
    ]);

    const result = calculateEdgeStrength(
      bookAConcepts as any,
      bookBConcepts as any,
      allConcepts
    );

    expect(result.strength).toBeGreaterThan(0);
    expect(result.sharedConcepts).toHaveLength(1);
    expect(result.sharedConcepts[0].name).toBe("consciousness");
  });
});

describe("strengthToWidth", () => {
  it("returns 1px for low strength", () => {
    expect(strengthToWidth(10)).toBe(1);
  });

  it("returns 2px for medium-low strength", () => {
    expect(strengthToWidth(30)).toBe(2);
  });

  it("returns 3px for medium-high strength", () => {
    expect(strengthToWidth(70)).toBe(3);
  });

  it("returns 4px for high strength", () => {
    expect(strengthToWidth(90)).toBe(4);
  });
});

describe("getDomainColor", () => {
  it("returns correct color for known domain", () => {
    expect(getDomainColor("philosophy")).toBe("#8b5cf6");
    expect(getDomainColor("Psychology")).toBe("#3b82f6");
  });

  it("returns default color for unknown domain", () => {
    expect(getDomainColor("unknown")).toBe("#6b7280");
  });

  it("returns default color for undefined", () => {
    expect(getDomainColor()).toBe("#6b7280");
  });
});

describe("calculateNodeSize", () => {
  it("returns base size for no connections", () => {
    expect(calculateNodeSize(0)).toBe(20);
  });

  it("increases size with connections", () => {
    expect(calculateNodeSize(5)).toBe(30);
    expect(calculateNodeSize(10)).toBe(40);
  });

  it("caps size at maximum", () => {
    expect(calculateNodeSize(20)).toBe(50);
    expect(calculateNodeSize(100)).toBe(50);
  });
});
