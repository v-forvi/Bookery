import { db } from "../db";
import { patrons } from "../schema";
import { eq } from "drizzle-orm";

/**
 * Patrons service - Handle Telegram Mini App user operations
 */

export interface PatronInput {
  telegramId: number;
  telegramUsername?: string;
  fullName: string;
  phoneNumber: string;
}

/**
 * Get patron by Telegram ID
 */
export async function getPatronByTelegramId(telegramId: number) {
  const result = await db
    .select()
    .from(patrons)
    .where(eq(patrons.telegramId, telegramId))
    .limit(1);

  return result[0] || null;
}

/**
 * Register a new patron
 */
export async function registerPatron(input: PatronInput) {
  // Check if patron already exists
  const existing = await getPatronByTelegramId(input.telegramId);
  if (existing) {
    return existing;
  }

  // Create new patron
  const result = await db
    .insert(patrons)
    .values({
      telegramId: input.telegramId,
      telegramUsername: input.telegramUsername || null,
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      dateRegistered: new Date().toISOString(),
      isLibrarian: false, // Default to false, will be updated manually for librarian
    })
    .returning();

  return result[0];
}

/**
 * Check if a Telegram ID is the librarian
 */
export function isLibrarianTelegramId(telegramId: number): boolean {
  const librarianId = process.env.LIBRARIAN_TELEGRAM_ID;
  if (!librarianId) {
    console.warn('LIBRARIAN_TELEGRAM_ID not set');
    return false;
  }
  return parseInt(librarianId) === telegramId;
}

/**
 * Get all patrons (librarian only)
 */
export async function getAllPatrons() {
  return await db.select().from(patrons).orderBy(patrons.dateRegistered);
}

/**
 * Update patron librarian status (librarian only)
 */
export async function updatePatronLibrarianStatus(
  patronId: number,
  isLibrarian: boolean
) {
  const result = await db
    .update(patrons)
    .set({ isLibrarian })
    .where(eq(patrons.id, patronId))
    .returning();

  return result[0];
}

/**
 * Update patron profile
 */
export async function updatePatron(
  patronId: number,
  updates: Partial<Pick<typeof patrons.$inferInsert, 'fullName' | 'phoneNumber'>>
) {
  const result = await db
    .update(patrons)
    .set(updates)
    .where(eq(patrons.id, patronId))
    .returning();

  return result[0];
}

/**
 * Delete patron (librarian only)
 */
export async function deletePatron(patronId: number) {
  await db.delete(patrons).where(eq(patrons.id, patronId));
}
