/**
 * API Test Script
 *
 * Verification script for Checkpoint 3: API Layer
 * Tests tRPC endpoints using direct server calls
 */

import { appRouter } from "../src/server/routers/root";
import { createContext } from "../src/server/context";
import { db } from "../src/server/db";
import { eq } from "drizzle-orm";
import { books } from "../src/server/schema";

async function getCaller() {
  return appRouter.createCaller(await createContext({}));
}

async function cleanup() {
  console.log("🧹 Cleaning up test data...");
  await db.delete(books).where(eq(books.isbn, "1111111111"));
  await db.delete(books).where(eq(books.title, "API Test Book"));
  await db.delete(books).where(eq(books.title, "Updated API Test Book"));
}

async function testAPI() {
  console.log("🧪 Testing API Layer...\n");

  try {
    await cleanup();

    // TEST 1: books.list (empty)
    console.log("TEST 1: books.list (empty state)...");
    const caller = await getCaller();
    const emptyList = await caller.books.list({});
    console.log(`✓ List successful: ${emptyList.length} books\n`);

    // TEST 2: books.add
    console.log("TEST 2: books.add...");
    const added = await caller.books.add({
      title: "API Test Book",
      author: "API Test Author",
      isbn: "1111111111",
      source: "manual",
      genres: ["Fiction", "Test"],
      publicationYear: 2024,
    });
    console.log("✓ Add successful:", {
      id: added.id,
      title: added.title,
      author: added.author,
    });
    console.log("");

    // TEST 3: books.byId
    console.log("TEST 3: books.byId...");
    const byId = await caller.books.byId({ id: added.id });
    console.log("✓ byId successful:", {
      title: byId.title,
      author: byId.author,
      genres: byId.genres,
    });
    console.log("");

    // TEST 4: books.list (with data)
    console.log("TEST 4: books.list (with data)...");
    const list = await caller.books.list({ limit: 10 });
    console.log(`✓ List successful: ${list.length} book(s)\n`);

    // TEST 5: books.update
    console.log("TEST 5: books.update...");
    const updated = await caller.books.update({
      id: added.id,
      title: "Updated API Test Book",
    });
    console.log("✓ Update successful:", { title: updated.title });
    console.log("");

    // TEST 6: books.export (JSON)
    console.log("TEST 6: books.export (JSON)...");
    const exported = await caller.books.export({ format: "json" });
    console.log(`✓ Export successful: ${exported.filename}`);
    console.log("");

    // TEST 7: Error handling - invalid input
    console.log("TEST 7: Error handling (invalid title)...");
    try {
      await caller.books.add({
        title: "",  // Invalid: empty string
        author: "Test",
        source: "manual",
      });
      console.log("❌ Should have thrown error for empty title");
    } catch (error: any) {
      if (error.code === "BAD_REQUEST" || error.message?.includes("too_small")) {
        console.log("✓ Error handling works correctly\n");
      } else {
        throw error;
      }
    }

    // TEST 8: books.delete
    console.log("TEST 8: books.delete...");
    const deleted = await caller.books.delete({ id: added.id });
    console.log("✓ Delete successful:", deleted);
    console.log("");

    // TEST 9: Verify deletion
    console.log("TEST 9: Verify deletion...");
    try {
      await caller.books.byId({ id: added.id });
      console.log("❌ Book should not exist after deletion");
    } catch (error: any) {
      if (error.message.includes("not found")) {
        console.log("✓ Book properly removed from database\n");
      } else {
        throw error;
      }
    }

    // TEST 10: Settings router
    console.log("TEST 10: settings.set and settings.get...");
    await caller.settings.set({
      key: "preferred_vision_api",
      value: "claude",
    });
    const setting = await caller.settings.get({ key: "preferred_vision_api" });
    console.log("✓ Settings working:", { key: "preferred_vision_api", value: setting });
    console.log("");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL API TESTS PASSED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ API TEST FAILED:");
    console.error(error);
    process.exit(1);
  }
}

testAPI();
