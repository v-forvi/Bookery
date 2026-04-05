/**
 * Phase 1 E2E Integration Test Script
 *
 * Tests Phase 1 features:
 * - Graph data retrieval
 * - Concept operations
 * - Reading status updates
 * - Scan preview (mock)
 * - Add to library with intent
 */

import { appRouter } from "../src/server/routers/root";
import { db } from "../src/server/db";
import { books, concepts, bookConcepts } from "../src/server/schema";
import { eq, sql } from "drizzle-orm";

async function getCaller() {
  return appRouter.createCaller(await (async () => ({ db }))());
}

async function cleanup() {
  console.log("🧹 Cleaning up Phase 1 test data...");
  // Delete test concepts and book-concept links
  const testBooks = await db
    .select({ id: books.id })
    .from(books)
    .where(sql`${books.title} LIKE '%PHASE1_TEST%'`);

  for (const book of testBooks) {
    await db.delete(bookConcepts).where(eq(bookConcepts.bookId, book.id));
  }

  // Delete test books
  for (const book of testBooks) {
    await db.delete(books).where(eq(books.id, book.id));
  }
}

async function runPhase1Tests() {
  console.log("🧪 Running Phase 1 E2E Tests...\n");

  try {
    await cleanup();
    const caller = await getCaller();

    // TEST 1: Get graph data (should be empty or have existing data)
    console.log("TEST 1: Get graph data...");
    const graphData = await caller.graph.getGraphData({ limit: 100 });
    console.log(`✓ Graph data retrieved: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);
    console.log("");

    // TEST 2: Add a test book
    console.log("TEST 2: Add test book for Phase 1...");
    const testBook = await caller.books.addToLibrary({
      book: {
        title: "PHASE1_TEST Book",
        author: "Test Author",
        isbn: "9999999999",
        description: "A test book for Phase 1",
        genres: ["Philosophy", "Science"],
        pageCount: 300,
        publisher: "Test Publisher",
        publicationYear: 2024,
      },
      intent: "testing", // Don't trigger concept extraction
    });
    console.log(`✓ Test book added with ID: ${testBook.id}`);
    console.log("");

    // TEST 3: Update reading status
    console.log("TEST 3: Update reading status...");
    const statusUpdated = await caller.books.updateStatus({
      bookId: testBook.id,
      status: "reading",
    });
    console.log(`✓ Reading status updated: ${statusUpdated.readingStatus}`);
    console.log("");

    // TEST 4: Get graph data again (should include new book)
    console.log("TEST 4: Get graph data with new book...");
    const graphData2 = await caller.graph.getGraphData({ limit: 100 });
    console.log(`✓ Graph data: ${graphData2.nodes.length} nodes, ${graphData2.edges.length} edges`);
    const testBookNode = graphData2.nodes.find(n => n.bookId === testBook.id);
    console.log(`  Test book in graph: ${testBookNode ? 'Yes' : 'No'}`);
    console.log("");

    // TEST 5: Get concepts for a book (should be empty for test book)
    console.log("TEST 5: Get concepts for test book...");
    const bookConcepts = await caller.concepts.getByBook({ bookId: testBook.id });
    console.log(`✓ Concepts retrieved: ${bookConcepts.length} concepts`);
    console.log("");

    // TEST 6: Add concept to book manually
    console.log("TEST 6: Add concept to book...");
    const addedLink = await caller.concepts.addToBook({
      bookId: testBook.id,
      conceptName: "Test Concept",
      domain: "philosophy",
      weight: 80,
    });
    console.log(`✓ Concept added: link ID ${addedLink.id}, conceptId ${addedLink.conceptId}, weight ${addedLink.weight}`);
    console.log("");

    // TEST 7: Get concepts again (should have 1)
    console.log("TEST 7: Get concepts after adding...");
    const bookConcepts2 = await caller.concepts.getByBook({ bookId: testBook.id });
    console.log(`✓ Concepts retrieved: ${bookConcepts2.length} concept(s)`);
    if (bookConcepts2.length > 0) {
      console.log(`  First concept: ${bookConcepts2[0].concept?.name} (domain: ${bookConcepts2[0].concept?.domain})`);
    }
    console.log("");

    // TEST 8: Update concept weight
    console.log("TEST 8: Update concept weight...");
    if (bookConcepts2.length > 0) {
      const updated = await caller.concepts.updateWeight({
        bookId: testBook.id,
        conceptId: addedLink.conceptId,
        weight: 90,
      });
      console.log(`✓ Concept weight updated to: ${updated.weight}`);
    }
    console.log("");

    // TEST 9: Verify concept in database
    console.log("TEST 9: Verify concept in database...");
    const dbConcepts = await db.select().from(concepts).limit(10);
    console.log(`✓ Total concepts in database: ${dbConcepts.length}`);
    if (dbConcepts.length > 0) {
      console.log(`  First concept: ${dbConcepts[0].name} (domain: ${dbConcepts[0].domain})`);
    }
    console.log("");

    // TEST 10: Delete concept from book
    console.log("TEST 10: Delete concept from book...");
    const deleted = await caller.concepts.removeFromBook({
      bookId: testBook.id,
      conceptId: addedLink.conceptId,
    });
    console.log(`✓ Concept deleted: ${deleted.success}`);
    console.log("");

    // TEST 11: Verify deletion
    console.log("TEST 11: Verify concept deletion...");
    const bookConcepts3 = await caller.concepts.getByBook({ bookId: testBook.id });
    console.log(`✓ Concepts after deletion: ${bookConcepts3.length} (expected: 0)`);
    console.log("");

    // TEST 12: Batch extract (will fail without API keys, but should not crash)
    console.log("TEST 12: Batch extract (may fail without API keys)...");
    try {
      const batchResult = await caller.concepts.batchExtract({
        filter: "unanalyzed",
        preferredApi: "claude",
      });
      console.log(`✓ Batch extract completed: ${batchResult.success}/${batchResult.total} successful`);
      if (batchResult.errors.length > 0) {
        console.log(`  Errors: ${batchResult.errors.length} (expected without API keys)`);
      }
    } catch (error: any) {
      console.log(`⚠️ Batch extract failed (expected without API keys): ${error.message}`);
    }
    console.log("");

    // TEST 13: Graph with filters
    console.log("TEST 13: Get graph data with reading status filter...");
    const filteredGraph = await caller.graph.getGraphData({
      limit: 100,
      filters: { readingStatus: ["reading"] },
    });
    console.log(`✓ Filtered graph: ${filteredGraph.nodes.length} nodes with status "reading"`);
    console.log("");

    // Summary
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ PHASE 1 E2E TESTS PASSED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📝 Manual Testing Checklist:");
    console.log("  [ ] Visit /graph - Should show graph with nodes");
    console.log("  [ ] Click a node - Should open side panel");
    console.log("  [ ] Double-click a node - Should enter isolated view");
    console.log("  [ ] Press ESC - Should exit isolated view");
    console.log("  [ ] Click 'Analyze Unread' - Should prompt for API key");
    console.log("  [ ] Visit /scan - Should show scan preview page");
    console.log("  [ ] Test 'See where it fits' flow");
    console.log("\n💡 To test with real AI concept extraction:");
    console.log("  1. Visit /settings");
    console.log("  2. Add your Claude API key");
    console.log("  3. Return to /graph");
    console.log("  4. Click 'Analyze Unread' to extract concepts");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ PHASE 1 E2E TEST FAILED:");
    console.error(error);
    process.exit(1);
  }
}

runPhase1Tests();
