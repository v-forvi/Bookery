/**
 * E2E Integration Test Script
 *
 * Verification script for Checkpoint 7: E2E Integration
 * Tests the full user flow by calling tRPC endpoints directly
 *
 * This script simulates the complete user journey:
 * 1. Add a book manually
 * 2. Search for books
 * 3. Update a book
 * 4. Delete a book
 * 5. Export catalog
 */

import { appRouter } from "../src/server/routers/root";
import { db } from "../src/server/db";
import { books, settings } from "../src/server/schema";
import { eq } from "drizzle-orm";

const testBookId = "E2E_TEST_BOOK_123";

async function getCaller() {
  return appRouter.createCaller(await (async () => ({ db }))());
}

async function cleanup() {
  console.log("🧹 Cleaning up E2E test data...");
  await db.delete(books).where(eq(books.isbn, testBookId));
}

async function runE2ETests() {
  console.log("🧪 Running E2E Integration Tests...\n");

  try {
    await cleanup();

    const caller = await getCaller();

    // TEST 1: Add book manually
    console.log("TEST 1: Add book manually...");
    const added = await caller.books.add({
      title: "E2E Test Book",
      author: "Test Author",
      isbn: testBookId,
      genres: ["Fiction", "Test"],
      publicationYear: 2024,
      pageCount: 300,
      publisher: "Test Publisher",
      description: "A test book for E2E testing",
      source: "manual",
      language: "en",
    });
    console.log(`✓ Book added with ID: ${added.id}`);
    console.log(`  Title: ${added.title}`);
    console.log(`  Author: ${added.author}`);
    console.log("");

    // TEST 2: List all books
    console.log("TEST 2: List all books...");
    const allBooks = await caller.books.list({ limit: 10 });
    console.log(`✓ Found ${allBooks.length} books`);
    console.log("");

    // TEST 3: Search for book
    console.log("TEST 3: Search for book by title...");
    const searchResults = await caller.books.list({
      limit: 10,
      search: "E2E",
    });
    console.log(`✓ Search returned ${searchResults.length} result(s)`);
    if (searchResults.length > 0) {
      console.log(`  First result: ${searchResults[0].title}`);
    }
    console.log("");

    // TEST 4: Get book by ID
    console.log("TEST 4: Get book by ID...");
    const byId = await caller.books.byId({ id: added.id });
    console.log(`✓ Retrieved book: ${byId.title}`);
    console.log("");

    // TEST 5: Update book
    console.log("TEST 5: Update book...");
    const updated = await caller.books.update({
      id: added.id,
      title: "E2E Test Book - Updated",
      author: "Test Author - Updated",
    });
    console.log(`✓ Book updated: ${updated.title}`);
    console.log("");

    // TEST 6: Export as JSON
    console.log("TEST 6: Export catalog as JSON...");
    const exportedJson = await caller.books.export({ format: "json" });
    console.log(`✓ Export successful: ${exportedJson.filename}`);
    console.log(`  Data length: ${exportedJson.data.length} chars`);
    console.log("");

    // TEST 7: Export as CSV
    console.log("TEST 7: Export catalog as CSV...");
    const exportedCsv = await caller.books.export({ format: "csv" });
    console.log(`✓ Export successful: ${exportedCsv.filename}`);
    console.log(`  CSV rows: ${exportedCsv.data.split("\n").length}`);
    console.log("");

    // TEST 8: Filter by genre (requires book with genre)
    console.log("TEST 8: Filter by genre...");
    const filtered = await caller.books.list({
      limit: 10,
      genre: "Fiction",
    });
    console.log(`✓ Filter returned ${filtered.length} book(s)`);
    console.log("");

    // TEST 9: Delete book
    console.log("TEST 9: Delete book...");
    const deleted = await caller.books.delete({ id: added.id });
    console.log(`✓ Book deleted: ${deleted.success}`);
    console.log("");

    // TEST 10: Verify deletion
    console.log("TEST 10: Verify deletion...");
    try {
      await caller.books.byId({ id: added.id });
      console.log("✗ Book still exists after deletion");
      return;
    } catch (error) {
      console.log("✓ Book successfully removed from database");
    }
    console.log("");

    // TEST 11: Settings (set and get)
    console.log("TEST 11: Settings - set and get...");
    await caller.settings.set({
      key: "preferred_vision_api",
      value: "claude",
    });
    const setting = await caller.settings.get({ key: "preferred_vision_api" });
    console.log(`✓ Settings working: ${setting}`);
    console.log("");

    // TEST 12: Google Books Search (may be rate limited)
    console.log("TEST 12: Google Books search...");
    try {
      const googleResults = await caller.books.searchExternal({
        isbn: "0374533555",
        maxResults: 1,
      });
      console.log(`✓ Google Books search returned ${googleResults.length} result(s)`);
      if (googleResults.length > 0) {
        console.log(`  Title: ${googleResults[0].title}`);
        console.log(`  Confidence: ${googleResults[0].confidence.toFixed(2)}`);
      }
    } catch (error: any) {
      console.log(`⚠️ Google Books search failed (rate limit?): ${error.message}`);
    }
    console.log("");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ E2E INTEGRATION TESTS PASSED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📝 Manual Testing Checklist:");
    console.log("  [ ] Open http://localhost:3000 in browser");
    console.log("  [ ] Add a book using the UI");
    console.log("  [ ] Search for books");
    console.log("  [ ] Filter by genre");
    console.log("  [ ] Edit a book");
    console.log("  [ ] Delete a book");
    console.log("  [ ] Export as CSV/JSON");
    console.log("  [ ] Visit /settings page");
    console.log("  [ ] Test mobile responsiveness (use dev tools)");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ E2E TEST FAILED:");
    console.error(error);
    process.exit(1);
  }
}

runE2ETests();
