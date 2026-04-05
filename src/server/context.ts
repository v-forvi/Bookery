import type { inferAsyncReturnType } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { db } from "./db";

// Create context for tRPC
// Works with both Next.js pages and fetch API
export async function createContext(
  opts: CreateNextContextOptions | FetchCreateContextFnOptions | Record<string, never>
) {
  // Extract request from either Next.js or fetch adapter
  const req = "req" in opts ? opts.req : opts;

  return {
    db,
    req,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
