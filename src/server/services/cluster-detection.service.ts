// src/server/services/cluster-detection.service.ts

import { db } from "@/server/db";
import { books, concepts, bookConcepts } from "@/server/schema";
import { eq, inArray, sql, and } from "drizzle-orm";
import { getDomainColor } from "@/lib/graph-utils";

export interface Cluster {
  id: string;
  name: string;
  theme: string;
  domain: string;
  bookIds: number[];
  conceptIds: number[];
  color: string;
}

/**
 * Cluster Detection Service
 * v1: Simple domain-based grouping with co-occurrence
 */
export class ClusterDetectionService {
  /**
   * Detect themed clusters from the library
   * v1: Simple domain-based grouping with co-occurrence
   */
  async detectClusters(): Promise<Cluster[]> {
    // Get all concepts grouped by domain
    const allConcepts = await db.select().from(concepts);
    const byDomain = new Map<string, typeof allConcepts>();

    for (const concept of allConcepts) {
      const domain = concept.domain || "general";
      if (!byDomain.has(domain)) {
        byDomain.set(domain, []);
      }
      byDomain.get(domain)!.push(concept);
    }

    const clusters: Cluster[] = [];

    // For each domain, find co-occurring concepts
    for (const [domain, domainConcepts] of byDomain) {
      if (domainConcepts.length < 2) {
        // Single concept becomes its own cluster
        const concept = domainConcepts[0];
        const bookIds = await this.getBookIdsForConcept(concept.id);

        if (bookIds.length > 0) {
          clusters.push({
            id: `cluster-${domain}-${concept.id}`,
            name: concept.name,
            theme: concept.name,
            domain,
            bookIds,
            conceptIds: [concept.id],
            color: getDomainColor(domain),
          });
        }
        continue;
      }

      // Find co-occurrence patterns (simplified for v1)
      // Group by first concept in domain as "theme"
      const primaryConcept = domainConcepts[0];
      const relatedConceptIds = domainConcepts.slice(0, 5).map(c => c.id);

      // Get books that have any of these concepts
      const allBookConcepts = await db
        .select()
        .from(bookConcepts)
        .where(inArray(bookConcepts.conceptId, relatedConceptIds));

      // Group by book
      const booksInCluster = new Set<number>();
      for (const bc of allBookConcepts) {
        booksInCluster.add(bc.bookId);
      }

      const bookIds = Array.from(booksInCluster);

      if (bookIds.length > 0) {
        clusters.push({
          id: `cluster-${domain}-${primaryConcept.id}`,
          name: this.generateClusterName(domain, domainConcepts.slice(0, 3)),
          theme: primaryConcept.name,
          domain,
          bookIds,
          conceptIds: relatedConceptIds,
          color: getDomainColor(domain),
        });
      }
    }

    return clusters;
  }

  /**
   * Get book IDs for a specific concept
   */
  private async getBookIdsForConcept(conceptId: number): Promise<number[]> {
    const results = await db
      .select({ bookId: bookConcepts.bookId })
      .from(bookConcepts)
      .where(eq(bookConcepts.conceptId, conceptId));

    return results.map(r => r.bookId);
  }

  /**
   * Generate cluster name from domain and concepts
   */
  private generateClusterName(domain: string, topConcepts: Array<{ name: string }>): string {
    const conceptNames = topConcepts.slice(0, 3).map(c => c.name);
    if (conceptNames.length === 1) {
      return conceptNames[0];
    }
    if (conceptNames.length === 2) {
      return `${conceptNames[0]} + ${conceptNames[1]}`;
    }
    return `${domain} (${conceptNames[0]}, ${conceptNames[1]}, ...)`;
  }
}

export const clusterDetectionService = new ClusterDetectionService();
