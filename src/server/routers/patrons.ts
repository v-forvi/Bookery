import { z } from "zod";
import {
  router,
  publicProcedure,
} from "../trpc";
import {
  telegramAuthProcedure,
  telegramRegisteredProcedure,
  librarianProcedure,
} from "../procedures";
import {
  getPatronByTelegramId,
  registerPatron,
  getAllPatrons,
  updatePatronLibrarianStatus,
  updatePatron,
  deletePatron,
} from "../services/patrons.service";

export const patronsRouter = router({
  /**
   * Get current patron from Telegram auth
   * Returns null if not registered
   */
  me: telegramAuthProcedure.query(async ({ ctx }) => {
    return ctx.patron;
  }),

  /**
   * Get patron by Telegram ID (public - used for registration check)
   * Returns null if not found
   */
  getByTelegramId: publicProcedure
    .input(z.object({ telegramId: z.number() }))
    .query(async ({ input }) => {
      return await getPatronByTelegramId(input.telegramId);
    }),

  /**
   * Register a new patron
   * Returns the patron (either newly created or existing)
   */
  register: publicProcedure
    .input(
      z.object({
        telegramId: z.number(),
        telegramUsername: z.string().optional(),
        fullName: z.string().min(1),
        phoneNumber: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const patron = await registerPatron(input);

      // Auto-set librarian status based on Telegram ID
      const librarianId = process.env.LIBRARIAN_TELEGRAM_ID;
      if (librarianId && parseInt(librarianId) === input.telegramId) {
        const updated = await updatePatronLibrarianStatus(patron.id, true);
        return updated;
      }

      return patron;
    }),

  /**
   * Check if current user is librarian
   * Uses Telegram auth headers
   */
  isLibrarian: telegramAuthProcedure.query(async ({ ctx }) => {
    return {
      isLibrarian: ctx.patron?.isLibrarian || false,
      isRegistered: !!ctx.patron,
    };
  }),

  /**
   * Get all patrons (librarian only)
   */
  list: librarianProcedure.query(async () => {
    return await getAllPatrons();
  }),

  /**
   * Update patron librarian status (librarian only)
   */
  setLibrarianStatus: librarianProcedure
    .input(
      z.object({
        patronId: z.number(),
        isLibrarian: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      return await updatePatronLibrarianStatus(input.patronId, input.isLibrarian);
    }),

  /**
   * Update current patron's profile
   */
  updateProfile: telegramRegisteredProcedure
    .input(
      z.object({
        fullName: z.string().min(1).optional(),
        phoneNumber: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: { fullName?: string; phoneNumber?: string } = {};
      if (input.fullName) updates.fullName = input.fullName;
      if (input.phoneNumber) updates.phoneNumber = input.phoneNumber;
      return await updatePatron(ctx.patron!.id, updates);
    }),

  /**
   * Delete patron (librarian only)
   */
  delete: librarianProcedure
    .input(z.object({ patronId: z.number() }))
    .mutation(async ({ input }) => {
      await deletePatron(input.patronId);
      return { success: true };
    }),
});
