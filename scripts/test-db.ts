/**
 * Database Test Script
 *
 * Verification script for Checkpoint 2: Database Layer
 * Tests basic CRUD operations on the books table
 *
 * Run with: npx ts-node scripts/test-db.ts
 */

import { db } from "../src/server/db";
import { books, settings } from "../src/server/schema";
import { eq } from "drizzle-orm";

async function testDatabase() {
  console.log("🧪 Testing Database Layer...\n");

  try {
    // CLEANUP: Remove any existing test data
    console.log("🧹 Cleaning up previous test data...");
    await db.delete(books).where(eq(books.title, "Test Book"));
    console.log("✓ Cleanup complete\n");

    // TEST 1: INSERT
    console.log("TEST 1: Inserting book...");
    const [inserted] = await db
      .insert(books)
      .values({
        title: "Test Book",
        author: "Test Author",
        isbn: "0000000000",
        source: "manual",
        genres: JSON.stringify(["Fiction", "Test"]),
        publicationYear: 2024,
      })
      .returning();

    console.log("✓ Insert successful:", {
      id: inserted.id,
      title: inserted.title,
      author: inserted.author,
    });
    console.log("");

    // TEST 2: SELECT
    console.log("TEST 2: Selecting book by ID...");
    const [found] = await db
      .select()
      .from(books)
      .where(eq(books.id, inserted.id))
      .limit(1);

    if (!found) {
      throw new Error("Book not found after insert");
    }

    console.log("✓ Select successful:", {
      title: found.title,
      author: found.author,
      genres: JSON.parse(found.genres || "[]"),
    });
    console.log("");

    // TEST 3: UPDATE
    console.log("TEST 3: Updating book...");
    const [updated] = await db
      .update(books)
      .set({
        title: "Updated Test Book",
        author: "Updated Test Author",
        lastModified: new Date().toISOString(),
      })
      .where(eq(books.id, inserted.id))
      .returning();

    if (!updated) {
      throw new Error("Update failed - no book returned");
    }

    console.log("✓ Update successful:", {
      title: updated.title,
      author: updated.author,
    });
    console.log("");

    // TEST 4: LIST ALL
    console.log("TEST 4: Listing all books...");
    const allBooks = await db.select().from(books).limit(10);
    console.log(`✓ Found ${allBooks.length} book(s)`);
    console.log("");

    // TEST 5: DELETE
    console.log("TEST 5: Deleting book...");
    const [deleted] = await db
      .delete(books)
      .where(eq(books.id, inserted.id))
      .returning();

    if (!deleted) {
      throw new Error("Delete failed - no book returned");
    }

    console.log("✓ Delete successful, removed book with ID:", deleted.id);
    console.log("");

    // TEST 6: VERIFY DELETION
    console.log("TEST 6: Verifying deletion...");
    const [shouldNotExist] = await db
      .select()
      .from(books)
      .where(eq(books.id, inserted.id))
      .limit(1);

    if (shouldNotExist) {
      throw new Error("Book still exists after deletion");
    }

    console.log("✓ Book successfully removed from database");
    console.log("");

    // TEST 7: SETTINGS TABLE
    console.log("TEST 7: Testing settings table...");
    await db
      .insert(settings)
      .values({
        key: "preferred_vision_api",
        value: "claude",
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: "claude" },
      });

    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "preferred_vision_api"))
      .limit(1);

    console.log("✓ Settings table working:", {
      key: setting?.key,
      value: setting?.value,
    });
    console.log("");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL DATABASE TESTS PASSED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ DATABASE TEST FAILED:");
    console.error(error);
    process.exit(1);
  }
}

testDatabase();
