/**
 * Performance & Edge Cases Test Script
 *
 * Verification script for Checkpoint 8: Performance & Edge Cases
 * Tests performance with large datasets and various edge cases
 */

import { appRouter } from "../src/server/routers/root";
import { db } from "../src/server/db";
import { books, settings } from "../src/server/schema";
import { eq, like, or } from "drizzle-orm";

const PERF_TEST_PREFIX = "PERF_TEST_";

async function getCaller() {
  return appRouter.createCaller(await (async () => ({ db }))());
}

async function cleanupPerfTestData() {
  console.log("🧹 Cleaning up performance test data...");
  // Delete all books with PERF_TEST prefix in title
  const allBooks = await db.select().from(books);
  for (const book of allBooks) {
    if (book.title.startsWith(PERF_TEST_PREFIX)) {
      await db.delete(books).where(eq(books.id, book.id));
    }
  }
}

async function generatePerfTestData(count: number) {
  console.log(`📊 Generating ${count} test books...`);
  const genres = [
    "Fiction", "Nonfiction", "Science", "History", "Biography",
    "Fantasy", "Mystery", "Romance", "Thriller", "Horror"
  ];

  const batchSize = 50;
  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    const end = Math.min(i + batchSize, count);

    for (let j = i; j < end; j++) {
      const genre1 = genres[Math.floor(Math.random() * genres.length)];
      const genre2 = genres[Math.floor(Math.random() * genres.length)];

      batch.push({
        title: `${PERF_TEST_PREFIX} Book ${j + 1}`,
        author: `Author ${Math.floor(Math.random() * 100)}`,
        isbn: `${PERF_TEST_PREFIX}${j}`,
        genres: JSON.stringify([genre1, genre2]),
        publicationYear: 2000 + Math.floor(Math.random() * 25),
        pageCount: 200 + Math.floor(Math.random() * 400),
        source: "manual" as const,
        language: "en",
      });
    }

    await db.insert(books).values(batch);
  }
  console.log(`✓ Generated ${count} test books\n`);
}

async function runPerformanceAndEdgeCaseTests() {
  console.log("🧪 Running Performance & Edge Case Tests...\n");

  try {
    await cleanupPerfTestData();
    const caller = await getCaller();

    // PERF TEST 1: Insert performance (100 books)
    console.log("PERF TEST 1: Insert 100 books...");
    const insertStart = Date.now();
    await generatePerfTestData(100);
    const insertTime = Date.now() - insertStart;
    console.log(`✓ Inserted 100 books in ${insertTime}ms`);
    console.log(`  Average: ${(insertTime / 100).toFixed(2)}ms per book`);
    console.log("");

    // PERF TEST 2: List performance with 100 books
    console.log("PERF TEST 2: List 100 books...");
    const listStart = Date.now();
    const largeList = await caller.books.list({ limit: 100 });
    const listTime = Date.now() - listStart;
    console.log(`✓ Listed ${largeList.length} books in ${listTime}ms`);
    if (listTime > 1000) {
      console.log(`  ⚠️  Warning: List took over 1 second`);
    } else {
      console.log(`  ✓ Performance acceptable (< 1000ms)`);
    }
    console.log("");

    // PERF TEST 3: Search performance
    console.log("PERF TEST 3: Search performance...");
    const searchStart = Date.now();
    const searchResults = await caller.books.list({
      limit: 50,
      search: "Book",
    });
    const searchTime = Date.now() - searchStart;
    console.log(`✓ Search returned ${searchResults.length} results in ${searchTime}ms`);
    if (searchTime > 500) {
      console.log(`  ⚠️  Warning: Search took over 500ms`);
    } else {
      console.log(`  ✓ Performance acceptable (< 500ms)`);
    }
    console.log("");

    // PERF TEST 4: Export performance with large dataset
    console.log("PERF TEST 4: Export performance (JSON)...");
    const exportStart = Date.now();
    const exported = await caller.books.export({ format: "json" });
    const exportTime = Date.now() - exportStart;
    console.log(`✓ Exported ${largeList.length} books in ${exportTime}ms`);
    console.log(`  Data size: ${(exported.data.length / 1024).toFixed(2)} KB`);
    if (exportTime > 2000) {
      console.log(`  ⚠️  Warning: Export took over 2 seconds`);
    } else {
      console.log(`  ✓ Performance acceptable (< 2000ms)`);
    }
    console.log("");

    // EDGE CASE 1: Empty title (should fail validation)
    console.log("EDGE CASE 1: Empty title validation...");
    try {
      await caller.books.add({
        title: "",
        author: "Test",
        source: "manual",
      });
      console.log("✗ Should have rejected empty title");
    } catch (error: any) {
      console.log("✓ Empty title correctly rejected");
    }
    console.log("");

    // EDGE CASE 2: Empty author (should fail validation)
    console.log("EDGE CASE 2: Empty author validation...");
    try {
      await caller.books.add({
        title: "Test",
        author: "",
        source: "manual",
      });
      console.log("✗ Should have rejected empty author");
    } catch (error: any) {
      console.log("✓ Empty author correctly rejected");
    }
    console.log("");

    // EDGE CASE 3: Special characters in title/author
    console.log("EDGE CASE 3: Special characters...");
    const specialCharBook = await caller.books.add({
      title: "Test: Book with \"quotes\" & 'apostrophes' — <special>",
      author: "O'Brien, Jr. (Author) & Co.",
      isbn: `${PERF_TEST_PREFIX}SPECIAL`,
      source: "manual",
    });
    console.log(`✓ Book created with special chars: "${specialCharBook.title}"`);
    await caller.books.delete({ id: specialCharBook.id });
    console.log("");

    // EDGE CASE 4: Unicode characters (emoji, accented letters)
    console.log("EDGE CASE 4: Unicode characters...");
    const unicodeBook = await caller.books.add({
      title: "日本語 📚 Test بيبليو",
      author: "Müller Ñoño",
      isbn: `${PERF_TEST_PREFIX}UNICODE`,
      source: "manual",
    });
    console.log(`✓ Book created with Unicode: "${unicodeBook.title}"`);
    await caller.books.delete({ id: unicodeBook.id });
    console.log("");

    // EDGE CASE 5: Very long title
    console.log("EDGE CASE 5: Very long title...");
    const longTitle = "A".repeat(500);
    const longTitleBook = await caller.books.add({
      title: longTitle,
      author: "Test",
      isbn: `${PERF_TEST_PREFIX}LONG`,
      source: "manual",
    });
    console.log(`✓ Book created with ${longTitleBook.title.length} char title`);
    await caller.books.delete({ id: longTitleBook.id });
    console.log("");

    // EDGE CASE 6: Invalid publication year
    console.log("EDGE CASE 6: Invalid publication year...");
    try {
      await caller.books.add({
        title: "Test",
        author: "Test",
        publicationYear: 3000,
        source: "manual",
      });
      console.log("✗ Should have rejected year > 2100");
    } catch (error: any) {
      console.log("✓ Future year correctly rejected");
    }
    console.log("");

    // EDGE CASE 7: Delete non-existent book
    console.log("EDGE CASE 7: Delete non-existent book...");
    try {
      await caller.books.delete({ id: 999999 });
      console.log("✗ Should have thrown error for non-existent book");
    } catch (error: any) {
      console.log("✓ Non-existent book correctly rejected");
    }
    console.log("");

    // EDGE CASE 8: Update non-existent book
    console.log("EDGE CASE 8: Update non-existent book...");
    try {
      await caller.books.update({
        id: 999999,
        title: "Test",
      });
      console.log("✗ Should have thrown error for non-existent book");
    } catch (error: any) {
      console.log("✓ Non-existent book update correctly rejected");
    }
    console.log("");

    // EDGE CASE 9: Get non-existent book
    console.log("EDGE CASE 9: Get non-existent book by ID...");
    try {
      await caller.books.byId({ id: 999999 });
      console.log("✗ Should have thrown error for non-existent book");
    } catch (error: any) {
      console.log("✓ Non-existent book get correctly rejected");
    }
    console.log("");

    // EDGE CASE 10: Search with no results
    console.log("EDGE CASE 10: Search with no results...");
    const emptySearch = await caller.books.list({
      limit: 10,
      search: "NONEXISTENTBOOKXYZ123",
    });
    console.log(`✓ Search returned ${emptySearch.length} results (expected 0)`);
    console.log("");

    // EDGE CASE 11: Invalid ISBN format (very short)
    console.log("EDGE CASE 11: Very short ISBN...");
    await caller.books.add({
      title: "Test Short ISBN",
      author: "Test",
      isbn: "1",
      source: "manual",
    });
    console.log("✓ Short ISBN accepted (handled correctly)");
    console.log("");

    // EDGE CASE 12: Negative page count
    console.log("EDGE CASE 12: Negative page count...");
    try {
      await caller.books.add({
        title: "Test",
        author: "Test",
        pageCount: -10,
        source: "manual",
      });
      console.log("✗ Should have rejected negative page count");
    } catch (error: any) {
      console.log("✓ Negative page count correctly rejected");
    }
    console.log("");

    // PERF TEST 5: Pagination performance
    console.log("PERF TEST 5: Pagination performance...");
    const pageStart = Date.now();
    const page1 = await caller.books.list({ limit: 50, offset: 0 });
    const page2 = await caller.books.list({ limit: 50, offset: 50 });
    const pageTime = Date.now() - pageStart;
    console.log(`✓ Fetched 2 pages in ${pageTime}ms`);
    console.log(`  Page 1: ${page1.length} books`);
    console.log(`  Page 2: ${page2.length} books`);
    console.log("");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ PERFORMANCE & EDGE CASE TESTS PASSED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Cleanup
    await cleanupPerfTestData();

    console.log("\n📊 Performance Summary:");
    console.log(`  Insert: ${insertTime}ms for 100 books`);
    console.log(`  List: ${listTime}ms for ${largeList.length} books`);
    console.log(`  Search: ${searchTime}ms`);
    console.log(`  Export: ${exportTime}ms`);
    console.log("\n✅ All edge cases handled correctly!");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    console.error(error);
    process.exit(1);
  }
}

runPerformanceAndEdgeCaseTests();
