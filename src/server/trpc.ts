import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return {
      ...shape,
      data: {
        ...shape.data,
      },
    };
  },
});

// Export tRPC utilities
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;
