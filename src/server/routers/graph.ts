// src/server/routers/graph.ts

import { z } from "zod";
import { publicProcedure, router } from "@/server/trpc";
import { graphBuilderService } from "@/server/services/graph-builder.service";
import { clusterDetectionService } from "@/server/services/cluster-detection.service";

export const graphRouter = router({
  // Get graph data
  getGraphData: publicProcedure
    .input(z.object({
      filters: z.object({
        genres: z.array(z.string()).optional(),
        readingStatus: z.array(z.string()).optional(),
        concepts: z.array(z.number()).optional(),
        searchQuery: z.string().optional(),
      }).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await graphBuilderService.buildGraphData({
        ...input.filters,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // Get connections for a book
  getBookConnections: publicProcedure
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input }) => {
      return await graphBuilderService.getBookConnections(input.bookId);
    }),

  // Get path between two books
  getPath: publicProcedure
    .input(z.object({
      fromBookId: z.number(),
      toBookId: z.number(),
    }))
    .query(async ({ input }) => {
      const path = await graphBuilderService.findPath(
        input.fromBookId,
        input.toBookId
      );
      if (!path) {
        throw new Error("No path found between these books");
      }
      return path;
    }),

  // Get clusters
  getClusters: publicProcedure
    .query(async () => {
      return await clusterDetectionService.detectClusters();
    }),
});
