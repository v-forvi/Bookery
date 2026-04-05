/**
 * Protected tRPC procedures
 * These combine middleware with tRPC procedures to create pre-configured procedures
 */
import { t } from "./trpc";
import { telegramAuth, telegramRegistered, librarianOnly } from "./middleware";

// Procedure that adds Telegram user info to context (doesn't require registration)
export const telegramAuthProcedure = t.procedure.use(telegramAuth);

// Procedure that requires a registered patron
export const telegramRegisteredProcedure = t.procedure.use(telegramRegistered);

// Procedure that requires librarian role
export const librarianProcedure = t.procedure.use(librarianOnly);
