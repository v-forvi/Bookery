// src/server/services/graph-builder.service.ts

import { db } from "@/server/db";
import { books, concepts, bookConcepts } from "@/server/schema";
import { eq, or, like, inArray, sql, and, ne } from "drizzle-orm";
import { calculateEdgeStrength, strengthToWidth, getDomainColor, calculateNodeSize } from "@/lib/graph-utils";

export interface GraphNode {
  id: string; // "book-{id}"
  bookId: number;
  label: string;
  title: string;
  author: string;
  coverUrl?: string;
  genre?: string;
  readingStatus: string;
  color: string;
  size: number;
}

export interface GraphEdge {
  id: string; // "edge-{bookAId}-{bookBId}"
  from: string;
  to: string;
  strength: number;
  width: number;
  color: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total: number;
  hasMore: boolean;
}

export interface Connection {
  book: {
    id: number;
    title: string;
    author: string;
    coverUrl?: string;
  };
  sharedConcepts: Array<{
    id: number;
    name: string;
    weight: number;
  }>;
  strength: number;
}

export interface PathStep {
  type: "book" | "concept";
  id: number;
  name: string;
}

export interface BookPath {
  path: PathStep[];
  distance: number;
  sharedConcepts: string[];
}

/**
 * Graph Builder Service
 */
export class GraphBuilderService {
  /**
   * Build complete graph data
   */
  async buildGraphData(filters?: {
    genres?: string[];
    readingStatus?: string[];
    concepts?: number[];
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }): Promise<GraphData> {
    const limit = filters?.limit || 200;
    const offset = filters?.offset || 0;

    // Build base query
    let query = db.select().from(books).$dynamic();

    // Apply filters using proper Drizzle operators
    const conditions = [];

    if (filters?.readingStatus && filters.readingStatus.length > 0) {
      // Use inArray for reading status filter
      // @ts-ignore - readingStatus is added in Phase 1 migration
      conditions.push(inArray(books.readingStatus, filters.readingStatus));
    }

    if (filters?.searchQuery) {
      // Use or + like for search
      const searchPattern = `%${filters.searchQuery}%`;
      conditions.push(
        or(
          like(books.title, searchPattern),
          like(books.author, searchPattern)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    // Get total count (with same filters for accuracy)
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(books).$dynamic();
    if (conditions.length > 0) {
      // @ts-ignore - applying same conditions to count query
      countQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    const [{ count }] = await countQuery;

    // Fetch books with pagination
    const allBooks = await query.limit(limit).offset(offset);

    if (allBooks.length === 0) {
      return { nodes: [], edges: [], total: count, hasMore: false };
    }

    // Fetch all concepts for these books (batch load for performance)
    const bookIds = allBooks.map(b => b.id);
    const allBookConcepts = bookIds.length > 0
      ? await db
          .select()
          .from(bookConcepts)
          .where(inArray(bookConcepts.bookId, bookIds))
      : [];

    // Only fetch concepts that are actually used by these books (optimization)
    const conceptIdsUsed = [...new Set(allBookConcepts.map(bc => bc.conceptId))];
    const relevantConcepts = conceptIdsUsed.length > 0
      ? await db
          .select()
          .from(concepts)
          .where(inArray(concepts.id, conceptIdsUsed))
      : [];

    const conceptMap = new Map(relevantConcepts.map(c => [c.id, c]));
    const bookConceptsMap = new Map<number, typeof allBookConcepts>();
    for (const bc of allBookConcepts) {
      if (!bookConceptsMap.has(bc.bookId)) {
        bookConceptsMap.set(bc.bookId, []);
      }
      bookConceptsMap.get(bc.bookId)!.push(bc);
    }

    // Build nodes
    const nodes: GraphNode[] = allBooks.map(book => {
      const bookConceptList = bookConceptsMap.get(book.id) || [];
      const genres = book.genres ? JSON.parse(book.genres) : [];
      const primaryGenre = genres[0] || "Unknown";

      return {
        id: `book-${book.id}`,
        bookId: book.id,
        label: book.title,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl || undefined,
        genre: primaryGenre,
        // @ts-ignore - readingStatus is added in Phase 1 migration
        readingStatus: book.readingStatus || "unread",
        color: getDomainColor(primaryGenre),
        size: calculateNodeSize(bookConceptList.length),
      };
    });

    // Build edges (find books with shared concepts)
    // OPTIMIZATION: Only check books that have concepts
    const booksWithConcepts = allBooks.filter(b =>
      bookConceptsMap.has(b.id) && bookConceptsMap.get(b.id)!.length > 0
    );

    const edges: GraphEdge[] = [];
    const processedPairs = new Set<string>();

    // Build concept-to-books map for faster lookups
    const conceptToBooksMap = new Map<number, number[]>();
    for (const bc of allBookConcepts) {
      if (!conceptToBooksMap.has(bc.conceptId)) {
        conceptToBooksMap.set(bc.conceptId, []);
      }
      conceptToBooksMap.get(bc.conceptId)!.push(bc.bookId);
    }

    // Only check pairs that share at least one concept (much faster than O(n²))
    const candidatePairs = new Set<string>();
    for (const [conceptId, bookIds] of conceptToBooksMap) {
      // Sort to ensure consistent ordering
      const sortedIds = [...bookIds].sort((a, b) => a - b);
      // Create pairs for all combinations of books sharing this concept
      for (let i = 0; i < sortedIds.length; i++) {
        for (let j = i + 1; j < sortedIds.length; j++) {
          const pairKey = `${sortedIds[i]}-${sortedIds[j]}`;
          candidatePairs.add(pairKey);
        }
      }
    }

    // Now calculate edge strength only for candidate pairs
    for (const pairKey of candidatePairs) {
      const [bookAId, bookBId] = pairKey.split('-').map(Number);
      const conceptsA = bookConceptsMap.get(bookAId) || [];
      const conceptsB = bookConceptsMap.get(bookBId) || [];

      const result = calculateEdgeStrength(
        conceptsA,
        conceptsB,
        conceptMap
      );

      if (result.strength > 10) { // Minimum threshold
        edges.push({
          id: `edge-${bookAId}-${bookBId}`,
          from: `book-${bookAId}`,
          to: `book-${bookBId}`,
          strength: result.strength,
          width: strengthToWidth(result.strength),
          color: this.getEdgeColor(result.strength),
        });
      }
    }

    return {
      nodes,
      edges,
      total: count,
      hasMore: offset + limit < count,
    };
  }

  /**
   * Get color for edge based on strength
   */
  private getEdgeColor(strength: number): string {
    if (strength < 30) return "#9ca3af"; // gray-400
    if (strength < 50) return "#60a5fa"; // blue-400
    if (strength < 70) return "#818cf8"; // indigo-400
    return "#f472b6"; // pink-400 (strongest)
  }

  /**
   * Get connections for a specific book
   */
  async getBookConnections(bookId: number): Promise<Connection[]> {
    // Get this book's concepts
    const myConcepts = await db
      .select()
      .from(bookConcepts)
      .where(eq(bookConcepts.bookId, bookId));

    if (myConcepts.length === 0) return [];

    const myConceptIds = myConcepts.map(c => c.conceptId);

    // Find other books with shared concepts using proper Drizzle operators
    const otherBookConcepts = await db
      .select({
        bookId: bookConcepts.bookId,
        conceptId: bookConcepts.conceptId,
        weight: bookConcepts.weight,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookCover: books.coverUrl,
      })
      .from(bookConcepts)
      .innerJoin(books, eq(bookConcepts.bookId, books.id))
      .where(
        and(
          ne(bookConcepts.bookId, bookId),
          inArray(bookConcepts.conceptId, myConceptIds)
        )
      );

    // Group by book
    const byBook = new Map<number, any[]>();
    for (const bc of otherBookConcepts) {
      if (!byBook.has(bc.bookId)) {
        byBook.set(bc.bookId, []);
      }
      byBook.get(bc.bookId)!.push(bc);
    }

    // Fetch concept names using inArray
    const allConcepts = await db
      .select()
      .from(concepts)
      .where(inArray(concepts.id, myConceptIds));
    const conceptMap = new Map(allConcepts.map(c => [c.id, c]));

    // Build connections
    const connections: Connection[] = [];
    for (const [otherBookId, concepts] of byBook) {
      const shared = concepts.map(c => ({
        id: c.conceptId,
        name: conceptMap.get(c.conceptId)?.name || "Unknown",
        weight: c.weight,
      }));

      const totalWeight = shared.reduce((sum, s) => sum + s.weight, 0);
      const avgStrength = totalWeight / shared.length;

      connections.push({
        book: {
          id: otherBookId,
          title: concepts[0].bookTitle,
          author: concepts[0].bookAuthor,
          coverUrl: concepts[0].bookCover || undefined,
        },
        sharedConcepts: shared,
        strength: Math.min(avgStrength, 100),
      });
    }

    // Sort by strength
    connections.sort((a, b) => b.strength - a.strength);

    return connections;
  }

  /**
   * Find path between two books using BFS
   * OPTIMIZED: Batch loads all book-concept relationships upfront to avoid N+1 queries
   */
  async findPath(fromBookId: number, toBookId: number): Promise<BookPath | null> {
    if (fromBookId === toBookId) {
      return {
        path: [{ type: "book", id: fromBookId, name: "Start" }],
        distance: 0,
        sharedConcepts: [],
      };
    }

    // Batch load all necessary data upfront (performance optimization)
    const [allBooks, allBookConcepts, allConcepts] = await Promise.all([
      db.select().from(books),
      db.select().from(bookConcepts),
      db.select().from(concepts),
    ]);

    // Build lookup maps
    const bookMap = new Map(allBooks.map(b => [b.id, b]));
    const conceptMap = new Map(allConcepts.map(c => [c.id, c]));

    // Build concept-to-books map for O(1) lookup
    const conceptToBooksMap = new Map<number, number[]>();
    for (const bc of allBookConcepts) {
      if (!conceptToBooksMap.has(bc.conceptId)) {
        conceptToBooksMap.set(bc.conceptId, []);
      }
      conceptToBooksMap.get(bc.conceptId)!.push(bc.bookId);
    }

    // Build book-to-concepts map
    const bookToConceptsMap = new Map<number, typeof allBookConcepts>();
    for (const bc of allBookConcepts) {
      if (!bookToConceptsMap.has(bc.bookId)) {
        bookToConceptsMap.set(bc.bookId, []);
      }
      bookToConceptsMap.get(bc.bookId)!.push(bc);
    }

    // BFS for shortest path
    const visited = new Set<number>();
    const queue: Array<{ bookId: number; path: PathStep[]; concepts: Set<string> }> = [
      { bookId: fromBookId, path: [], concepts: new Set() },
    ];

    const maxDepth = 5;

    while (queue.length > 0) {
      const { bookId, path, concepts: accumulatedConcepts } = queue.shift()!;

      if (bookId === toBookId) {
        return {
          path,
          distance: path.length,
          sharedConcepts: Array.from(accumulatedConcepts),
        };
      }

      if (visited.has(bookId)) continue;
      visited.add(bookId);

      if (path.length >= maxDepth) continue;

      const book = bookMap.get(bookId);
      if (!book) continue;

      const currentPath = [...path, { type: "book" as const, id: bookId, name: book.title }];

      // Get this book's concepts from pre-loaded map
      const bookConcepts = bookToConceptsMap.get(bookId) || [];

      for (const bc of bookConcepts) {
        const conceptName = conceptMap.get(bc.conceptId)?.name || `Concept ${bc.conceptId}`;
        const newConcepts = new Set(accumulatedConcepts).add(conceptName);

        // Find other books with this concept (from pre-loaded map)
        const otherBookIds = conceptToBooksMap.get(bc.conceptId) || [];

        for (const otherBookId of otherBookIds) {
          if (otherBookId !== bookId && !visited.has(otherBookId)) {
            queue.push({
              bookId: otherBookId,
              path: [...currentPath, { type: "concept" as const, id: bc.conceptId, name: conceptName }],
              concepts: newConcepts,
            });
          }
        }
      }
    }

    return null; // No path found
  }
}

export const graphBuilderService = new GraphBuilderService();
