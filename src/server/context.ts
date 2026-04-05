import type { inferAsyncReturnType } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { db } from "./db";

// Create context for tRPC
export async function createContext(_opts: CreateNextContextOptions) {
  return {
    db,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
