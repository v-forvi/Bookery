// src/server/routers/concepts.ts

import { z } from "zod";
import { publicProcedure, router } from "@/server/trpc";
import { books, concepts, bookConcepts } from "@/server/schema";
import { eq, sql, inArray, and } from "drizzle-orm";
import { conceptExtractionService } from "@/server/services/concept-extraction.service";
import { normalizeConceptName, levenshtein } from "@/lib/graph-utils";

export const conceptsRouter = router({
  // Extract concepts from a book
  extractFromBook: publicProcedure
    .input(z.object({
      bookId: z.number(),
      preferredApi: z.enum(["claude", "gemini", "glm"]).optional(),
    }))
    .mutation(async ({ input }) => {
      return await conceptExtractionService.extractFromBook(
        input.bookId,
        input.preferredApi
      );
    }),

  // Get concepts for a book
  getByBook: publicProcedure
    .input(z.object({ bookId: z.number() }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select({
          id: bookConcepts.conceptId,
          name: concepts.name,
          domain: concepts.domain,
          description: concepts.description,
          weight: bookConcepts.weight,
          extractedAt: bookConcepts.extractedAt,
        })
        .from(bookConcepts)
        .innerJoin(concepts, eq(bookConcepts.conceptId, concepts.id))
        .where(eq(bookConcepts.bookId, input.bookId))
        .orderBy(sql`${bookConcepts.weight} DESC`);

      return results.map(r => ({
        id: r.id,
        name: r.name,
        domain: r.domain,
        description: r.description,
        weight: r.weight,
        extractedAt: r.extractedAt,
      }));
    }),

  // Update a concept
  update: publicProcedure
    .input(z.object({
      conceptId: z.number(),
      name: z.string().optional(),
      domain: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { conceptId, ...updateData } = input;

      const [updated] = await ctx.db
        .update(concepts)
        .set(updateData)
        .where(eq(concepts.id, conceptId))
        .returning();

      if (!updated) {
        throw new Error("Concept not found");
      }

      return updated;
    }),

  // Add a concept to a book
  addToBook: publicProcedure
    .input(z.object({
      bookId: z.number(),
      conceptName: z.string(),
      domain: z.string().optional(),
      weight: z.number().min(0).max(100).default(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const { bookId, conceptName, domain = "general", weight } = input;

      // Normalize concept name
      const normalizedName = normalizeConceptName(conceptName);

      // Find or create concept
      const [existingConcept] = await ctx.db
        .select()
        .from(concepts)
        .where(eq(concepts.name, normalizedName))
        .limit(1);

      let conceptId: number;

      if (existingConcept) {
        conceptId = existingConcept.id;
      } else {
        const [inserted] = await ctx.db
          .insert(concepts)
          .values({ name: normalizedName, domain })
          .returning();
        conceptId = inserted.id;
      }

      // Check if book-concept link already exists
      const [existingLink] = await ctx.db
        .select()
        .from(bookConcepts)
        .where(
          and(
            eq(bookConcepts.bookId, bookId),
            eq(bookConcepts.conceptId, conceptId)
          )
        )
        .limit(1);

      if (existingLink) {
        // Update weight
        const [updated] = await ctx.db
          .update(bookConcepts)
          .set({ weight })
          .where(eq(bookConcepts.id, existingLink.id))
          .returning();

        return updated;
      } else {
        // Create new link
        const [inserted] = await ctx.db
          .insert(bookConcepts)
          .values({ bookId, conceptId, weight })
          .returning();

        return inserted;
      }
    }),

  // Remove a concept from a book
  removeFromBook: publicProcedure
    .input(z.object({
      bookId: z.number(),
      conceptId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(bookConcepts)
        .where(
          and(
            eq(bookConcepts.bookId, input.bookId),
            eq(bookConcepts.conceptId, input.conceptId)
          )
        );

      return { success: true };
    }),

  // Update concept weight
  updateWeight: publicProcedure
    .input(z.object({
      bookId: z.number(),
      conceptId: z.number(),
      weight: z.number().min(0).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(bookConcepts)
        .set({ weight: input.weight })
        .where(
          and(
            eq(bookConcepts.bookId, input.bookId),
            eq(bookConcepts.conceptId, input.conceptId)
          )
        )
        .returning();

      return updated;
    }),

  // Merge two concepts
  merge: publicProcedure
    .input(z.object({
      keepConceptId: z.number(),
      mergeConceptId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { keepConceptId, mergeConceptId } = input;

      // Update all book_concepts to point to the kept concept
      const bookConceptsToUpdate = await ctx.db
        .select()
        .from(bookConcepts)
        .where(eq(bookConcepts.conceptId, mergeConceptId));

      for (const bc of bookConceptsToUpdate) {
        await ctx.db
          .update(bookConcepts)
          .set({ conceptId: keepConceptId })
          .where(eq(bookConcepts.id, bc.id));
      }

      // Delete the old concept
      await ctx.db.delete(concepts).where(eq(concepts.id, mergeConceptId));

      return { success: true };
    }),

  // Get suggested merges
  getSuggestedMerges: publicProcedure
    .query(async ({ ctx }) => {
      const allConcepts = await ctx.db.select().from(concepts);
      const suggestions: Array<{
        conceptId1: number;
        conceptId2: number;
        name1: string;
        name2: string;
        similarityScore: number;
        reason: string;
      }> = [];

      for (let i = 0; i < allConcepts.length; i++) {
        for (let j = i + 1; j < allConcepts.length; j++) {
          const c1 = allConcepts[i];
          const c2 = allConcepts[j];

          // Rule 1: Exact match after normalization
          if (normalizeConceptName(c1.name) === normalizeConceptName(c2.name)) {
            suggestions.push({
              conceptId1: c1.id,
              conceptId2: c2.id,
              name1: c1.name,
              name2: c2.name,
              similarityScore: 1.0,
              reason: "Identical after normalization",
            });
            continue;
          }

          // Rule 2: Levenshtein distance ≤ 2 for short names
          if (c1.name.length < 15 && c2.name.length < 15) {
            const distance = levenshtein(c1.name, c2.name);
            if (distance <= 2) {
              suggestions.push({
                conceptId1: c1.id,
                conceptId2: c2.id,
                name1: c1.name,
                name2: c2.name,
                similarityScore: 1 - (distance / Math.max(c1.name.length, c2.name.length)),
                reason: "Similar spelling",
              });
            }
          }

          // Rule 3: Same domain + one contains the other
          if (c1.domain === c2.domain && c1.domain) {
            const c1Lower = c1.name.toLowerCase();
            const c2Lower = c2.name.toLowerCase();
            const contains = c1Lower.includes(c2Lower) || c2Lower.includes(c1Lower);

            if (contains && c1Lower !== c2Lower) {
              suggestions.push({
                conceptId1: c1.id,
                conceptId2: c2.id,
                name1: c1.name,
                name2: c2.name,
                similarityScore: 0.7,
                reason: `Same domain (${c1.domain}) + similar name`,
              });
            }
          }
        }
      }

      // Return top 20 sorted by similarity
      return suggestions
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 20);
    }),

  // Batch extract
  batchExtract: publicProcedure
    .input(z.object({
      bookIds: z.array(z.number()).optional(),
      filter: z.enum(["all", "unread", "unanalyzed"]).optional(),
      preferredApi: z.enum(["claude", "gemini", "glm"]).optional(),
    }))
    .mutation(async ({ input }) => {
      return await conceptExtractionService.batchExtract(
        input.bookIds || [],
        input.filter,
        input.preferredApi
      );
    }),

  // Delete a concept (with safety check)
  delete: publicProcedure
    .input(z.object({ conceptId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Check if concept is used by any books
      const [usage] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(bookConcepts)
        .where(eq(bookConcepts.conceptId, input.conceptId));

      if (usage && usage.count > 0) {
        throw new Error(`Cannot delete concept used by ${usage.count} books. Merge it instead.`);
      }

      await ctx.db
        .delete(concepts)
        .where(eq(concepts.id, input.conceptId));

      return { success: true };
    }),
});
