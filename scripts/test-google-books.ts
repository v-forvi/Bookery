/**
 * Google Books Service Test Script
 *
 * Verification script for Checkpoint 5: Google Books Service
 * Tests book metadata lookup via Google Books API
 *
 * No API key required - Google Books API is free.
 */

import { googleBooksService } from "../src/server/services/google-books.service";

interface TestResult {
  test: string;
  status: "PASS" | "FAIL" | "WARN";
  details?: any;
  duration: number;
}

const results: TestResult[] = [];

/**
 * Run a single test
 */
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  process.stdout.write(`TEST: ${name}... `);

  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ test: name, status: "PASS", duration });
    console.log(`✓ (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({ test: name, status: "FAIL", details: error.message, duration });
    console.log(`✗ ${error.message}`);
  }
}

async function testGoogleBooksService() {
  console.log("🧪 Testing Google Books Service...\n");

  // TEST 1: Search by ISBN (exact match)
  await runTest("Search by ISBN (0374533555 - Thinking, Fast and Slow)", async () => {
    const matches = await googleBooksService.search({
      isbn: "0374533555",
    });

    if (matches.length === 0) {
      throw new Error("No results found for valid ISBN");
    }

    const topMatch = matches[0];
    if (!topMatch.title.toLowerCase().includes("thinking")) {
      throw new Error(`Expected 'Thinking, Fast and Slow', got '${topMatch.title}'`);
    }

    if (topMatch.confidence < 0.9) {
      throw new Error(`ISBN match should have high confidence, got ${topMatch.confidence}`);
    }

    console.log(`\n   Title: "${topMatch.title}"`);
    console.log(`   Authors: ${topMatch.authors.join(", ")}`);
    console.log(`   ISBN: ${topMatch.isbn || topMatch.isbn13 || "N/A"}`);
    console.log(`   Confidence: ${topMatch.confidence.toFixed(2)}`);
  });

  // TEST 2: Search by title
  await runTest("Search by title (Art of War)", async () => {
    const matches = await googleBooksService.search({
      title: "Art of War",
      maxResults: 3,
    });

    if (matches.length === 0) {
      throw new Error("No results found for title search");
    }

    console.log(`\n   Found ${matches.length} matches:`);
    matches.forEach((m, i) => {
      console.log(`   ${i + 1}. "${m.title}" by ${m.authors.join(", ")} (${m.confidence.toFixed(2)})`);
    });
  });

  // TEST 3: Search by title and author
  await runTest("Search by title + author (Sun Tzu + Art of War)", async () => {
    const matches = await googleBooksService.search({
      title: "Art of War",
      author: "Sun Tzu",
      maxResults: 3,
    });

    if (matches.length === 0) {
      throw new Error("No results found for title+author search");
    }

    const topMatch = matches[0];
    const hasCorrectAuthor = topMatch.authors.some(a =>
      a.toLowerCase().includes("sun") || a.toLowerCase().includes("tzu")
    );

    if (!hasCorrectAuthor) {
      console.log(`\n   ⚠️ Top result author: ${topMatch.authors.join(", ")}`);
    } else {
      console.log(`\n   Top match: "${topMatch.title}" by ${topMatch.authors.join(", ")}`);
    }
  });

  // TEST 4: Search with maxResults
  await runTest("Search with maxResults=5", async () => {
    const matches = await googleBooksService.search({
      title: "Harry Potter",
      maxResults: 5,
    });

    if (matches.length > 5) {
      throw new Error(`Expected max 5 results, got ${matches.length}`);
    }

    console.log(`\n   Returned ${matches.length} results (limit: 5)`);
  });

  // TEST 5: Get by volume ID
  await runTest("Get by volume ID", async () => {
    // First get a valid ID from search
    const searchResults = await googleBooksService.search({
      title: "1984",
      maxResults: 1,
    });

    if (searchResults.length === 0) {
      throw new Error("Could not find a book to test getById");
    }

    const volumeId = searchResults[0].id;
    const book = await googleBooksService.getById(volumeId);

    if (!book) {
      throw new Error("getById returned null for valid ID");
    }

    if (book.id !== volumeId) {
      throw new Error(`ID mismatch: expected ${volumeId}, got ${book.id}`);
    }

    console.log(`\n   Retrieved: "${book.title}" (${book.id})`);
  });

  // TEST 6: Error handling - empty search
  await runTest("Error handling (no search parameters)", async () => {
    try {
      await googleBooksService.search({});
      throw new Error("Should have thrown error for empty search");
    } catch (error: any) {
      if (!error.message.includes("At least one")) {
        throw error;
      }
      // Expected error
    }
  });

  // TEST 7: Metadata extraction (description, cover, etc.)
  await runTest("Metadata extraction", async () => {
    const matches = await googleBooksService.search({
      isbn: "0374533555", // Thinking, Fast and Slow
    });

    if (matches.length === 0) {
      throw new Error("No results for metadata test");
    }

    const book = matches[0];
    const checks: string[] = [];

    if (book.description) checks.push("description");
    if (book.coverUrl) checks.push("coverUrl");
    if (book.pageCount) checks.push("pageCount");
    if (book.publisher) checks.push("publisher");
    if (book.publicationYear) checks.push("publicationYear");
    if (book.genres && book.genres.length > 0) checks.push("genres");

    console.log(`\n   Metadata present: ${checks.join(", ") || "none"}`);

    if (checks.length < 3) {
      throw new Error(`Expected at least 3 metadata fields, got ${checks.length}`);
    }
  });

  // TEST 8: ISBN extraction
  await runTest("ISBN extraction", async () => {
    const matches = await googleBooksService.search({
      isbn: "0439023521", // Hunger Games
    });

    if (matches.length === 0) {
      throw new Error("No results for ISBN test");
    }

    const book = matches[0];
    if (!book.isbn && !book.isbn13) {
      throw new Error("ISBN not extracted from result");
    }

    console.log(`\n   ISBN-10: ${book.isbn || "N/A"}`);
    console.log(`   ISBN-13: ${book.isbn13 || "N/A"}`);
  });

  // TEST 9: Publication year extraction
  await runTest("Publication year extraction", async () => {
    const matches = await googleBooksService.search({
      title: "Great Gatsby",
    });

    if (matches.length === 0) {
      throw new Error("No results for year extraction test");
    }

    const book = matches.find(b => b.title.toLowerCase().includes("gatsby"));

    if (!book) {
      throw new Error("Could not find Great Gatsby in results");
    }

    if (!book.publicationYear) {
      throw new Error("Publication year not extracted");
    }

    // Should be around 1925 (allow some range for different editions)
    if (book.publicationYear < 1900 || book.publicationYear > 2025) {
      throw new Error(`Unexpected publication year: ${book.publicationYear}`);
    }

    console.log(`\n   Publication year: ${book.publicationYear}`);
  });

  // TEST 10: Category/genre extraction
  await runTest("Genre/category extraction", async () => {
    const matches = await googleBooksService.search({
      isbn: "0374533555",
    });

    if (matches.length === 0) {
      throw new Error("No results for genre test");
    }

    const book = matches[0];

    if (!book.genres || book.genres.length === 0) {
      console.log(`\n   ⚠️ No categories found (this is OK for some books)`);
    } else {
      console.log(`\n   Categories: ${book.genres.join(", ")}`);
    }
  });

  // Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("GOOGLE BOOKS SERVICE TEST SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach(result => {
    const icon = result.status === "PASS" ? "✅" : "❌";
    console.log(`${icon} ${result.test}: ${result.status} (${result.duration}ms)`);
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Total time: ${totalDuration}ms`);

  if (failed === 0) {
    console.log("\n✅ ALL GOOGLE BOOKS SERVICE TESTS PASSED!");
    process.exit(0);
  } else {
    console.log(`\n❌ ${failed} test(s) failed`);
    process.exit(1);
  }
}

testGoogleBooksService();
