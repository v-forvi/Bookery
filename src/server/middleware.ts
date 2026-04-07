import { TRPCError } from "@trpc/server";
import { middleware } from "./trpc";
import type { Context } from "./context";
import { getPatronByTelegramId } from "./services/patrons.service";

/**
 * Auth middleware type - extends context with patron info
 */
export interface AuthContext extends Context {
  patron: {
    id: number;
    telegramId: number;
    telegramUsername: string | null;
    fullName: string;
    phoneNumber: string;
    dateRegistered: string;
    isLibrarian: boolean;
  } | null;
  telegramId: number | null;
}

/**
 * Helper to extract telegramId from request headers
 */
function getTelegramIdFromRequest(req: Context["req"]): number | null {
  if (!req) return null;

  // Handle Fetch API Request (used in Next.js 13+ app directory)
  if ("headers" in req && typeof req.headers.get === "function") {
    const header = req.headers.get("x-telegram-id");
    return header ? Number(header) : null;
  }

  // Handle Next.js pages API request
  if ("headers" in req && req.headers) {
    const header = (req.headers as Record<string, string | string[] | undefined>)["x-telegram-id"];
    if (typeof header === "string") {
      return Number(header);
    }
    if (Array.isArray(header) && header[0]) {
      return Number(header[0]);
    }
  }

  return null;
}

/**
 * telegramAuth middleware
 *
 * Validates the request comes from a Telegram user.
 * Extracts telegramId from the x-telegram-id header.
 * Adds patron info to context if registered, or null if not.
 *
 * Use this for routes that need to know the user but allow unregistered access.
 */
export const telegramAuth = middleware(async ({ ctx, next }) => {
  // Extract telegramId from headers
  const telegramId = getTelegramIdFromRequest(ctx.req);

  // DEBUG: Log telegram ID
  console.log('[telegramAuth] telegramId from headers:', telegramId);

  // Get patron from database if telegramId is present
  let patron = null;
  if (telegramId) {
    patron = await getPatronByTelegramId(telegramId);
    console.log('[telegramAuth] patron found:', patron ? 'YES' : 'NO', patron);
  }

  return next({
    ctx: {
      ...ctx,
      telegramId,
      patron,
    },
  });
});

/**
 * telegramRegistered middleware
 *
 * Like telegramAuth, but throws an error if the user is not registered.
 * Use this for routes that require a registered patron.
 */
export const telegramRegistered = telegramAuth.unstable_pipe(async ({ ctx, next }) => {
  if (!ctx.patron) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be a registered patron to access this resource",
    });
  }

  return next({
    ctx,
  });
});

/**
 * librarianOnly middleware
 *
 * Validates the user is a librarian.
 * Must be used after telegramAuth/telegramRegistered.
 * Throws an error if the user is not a librarian.
 *
 * Use this for routes that are restricted to librarians only.
 */
export const librarianOnly = telegramAuth.unstable_pipe(async ({ ctx, next }) => {
  if (!ctx.patron) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be a registered patron to access this resource",
    });
  }

  if (!ctx.patron.isLibrarian) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This resource is only accessible to librarians",
    });
  }

  return next({
    ctx,
  });
});
