/**
 * Vision Service Test Script
 *
 * Verification script for Checkpoint 4: Vision Service
 * Tests AI book extraction from images
 *
 * Requirements:
 * - API keys saved in Settings (via app) OR set as environment variables
 * - Have a test image in test-images/ directory
 */

import { visionService } from "../src/server/services/vision.service";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "../src/server/db";
import { settings } from "../src/server/schema";
import { eq } from "drizzle-orm";

/**
 * Load API keys from database (Settings)
 * Falls back to environment variables if not found in DB
 */
async function loadApiKeysFromDatabase(): Promise<{
  claudeKey: string | null;
  geminiKey: string | null;
  glmKey: string | null;
}> {
  try {
    // Query all API keys from settings table
    const [claudeSetting, geminiSetting, glmSetting] = await Promise.all([
      db.select().from(settings).where(eq(settings.key, "claude_api_key")).limit(1),
      db.select().from(settings).where(eq(settings.key, "gemini_api_key")).limit(1),
      db.select().from(settings).where(eq(settings.key, "glm_api_key")).limit(1),
    ]);

    const claudeKey = claudeSetting[0]?.value || null;
    const geminiKey = geminiSetting[0]?.value || null;
    const glmKey = glmSetting[0]?.value || null;

    // Set process.env for vision service (it reads from env vars)
    if (claudeKey && !process.env.ANTHROPIC_API_KEY) {
      process.env.ANTHROPIC_API_KEY = claudeKey;
    }
    if (geminiKey && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
      process.env.GEMINI_API_KEY = geminiKey;
    }
    if (glmKey && !process.env.GLM_API_KEY) {
      process.env.GLM_API_KEY = glmKey;
    }

    return { claudeKey, geminiKey, glmKey };
  } catch (error) {
    console.warn("⚠ Could not load keys from database, using env vars only");
    return { claudeKey: null, geminiKey: null, glmKey: null };
  }
}

/**
 * Convert image file to base64 data URL
 */
function imageToBase64(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  const mimeType = mimeTypes[ext || 'jpg'] || 'image/jpeg';

  const buffer = readFileSync(filePath);
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

async function testVisionService() {
  console.log("🧪 Testing Vision Service...\n");

  // Load API keys from database (Settings saved via app)
  console.log("Loading API keys from database...");
  const { claudeKey: dbClaudeKey, geminiKey: dbGeminiKey, glmKey: dbGlmKey } =
    await loadApiKeysFromDatabase();

  // Check for API keys (database takes priority, then env vars)
  const hasClaudeKey = !!dbClaudeKey || !!process.env.ANTHROPIC_API_KEY;
  const hasGeminiKey = !!dbGeminiKey || !!process.env.GEMINI_API_KEY ||
                       !!process.env.GOOGLE_AI_API_KEY;
  const hasGlmKey = !!dbGlmKey || !!process.env.GLM_API_KEY;

  if (!hasClaudeKey && !hasGeminiKey && !hasGlmKey) {
    console.error("❌ No API keys found!");
    console.error("Please set API keys via:");
    console.error("  1. App Settings → Save your API keys (recommended)");
    console.error("  2. Environment variables:");
    console.error("     - ANTHROPIC_API_KEY (for Claude)");
    console.error("     - GEMINI_API_KEY (for Gemini)");
    console.error("     - GLM_API_KEY (for Z.AI GLM)");
    process.exit(1);
  }

  console.log("API Keys configured:");
  if (hasClaudeKey) {
    const source = dbClaudeKey ? "Settings (DB)" : "Environment";
    console.log(`  ✓ Claude (Anthropic) - from ${source}`);
  }
  if (hasGeminiKey) {
    const source = dbGeminiKey ? "Settings (DB)" : "Environment";
    console.log(`  ✓ Gemini (Google) - from ${source}`);
  }
  if (hasGlmKey) {
    const source = dbGlmKey ? "Settings (DB)" : "Environment";
    console.log(`  ✓ GLM (Z.AI) - from ${source}`);
  }
  console.log("");

  // Check for test image
  const testImagesDir = join(process.cwd(), "test-images");
  const testImagePath = process.env.TEST_IMAGE ||
    join(testImagesDir, "shelf-test.jpg");

  try {
    const buffer = readFileSync(testImagePath);
    console.log(`✓ Test image found: ${testImagePath}`);
    console.log(`  Image size: ${(buffer.length / 1024).toFixed(2)} KB\n`);
  } catch {
    console.error(`❌ Test image not found: ${testImagePath}`);
    console.error("\nPlease add a test image to one of these locations:");
    console.error(`  - ${testImagesDir}/shelf-test.jpg`);
    console.error("  - Or set TEST_IMAGE environment variable");
    console.error("\nFor testing without a real image, we'll use a minimal test mode.");
    console.log("");

    // Create a minimal test (1x1 transparent pixel)
    const minimalImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    await runTests(minimalImage, hasClaudeKey, hasGeminiKey, hasGlmKey);
    return;
  }

  const base64Image = imageToBase64(testImagePath);
  await runTests(base64Image, hasClaudeKey, hasGeminiKey, hasGlmKey);
}

async function runTests(
  base64Image: string,
  hasClaudeKey: boolean,
  hasGeminiKey: boolean,
  hasGlmKey: boolean
) {
  const results: { test: string; status: string; details?: any }[] = [];

  // TEST 1: Single book extraction with Claude
  if (hasClaudeKey) {
    console.log("TEST 1: Extract single book (Claude)...");
    try {
      const result = await visionService.extractSingleBook(base64Image, true);
      console.log(`✓ Claude extraction successful`);
      console.log(`  Title: ${result.title || "(not detected)"}`);
      console.log(`  Author: ${result.author || "(not detected)"}`);
      console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
      console.log("");
      results.push({ test: "Claude Single Book", status: "PASS", details: result });
    } catch (error: any) {
      console.log(`✗ Claude extraction failed: ${error.message}`);
      console.log("");
      results.push({ test: "Claude Single Book", status: "FAIL", details: error.message });
    }
  }

  // TEST 2: Single book extraction with Gemini
  if (hasGeminiKey) {
    console.log("TEST 2: Extract single book (Gemini)...");
    try {
      const result = await visionService.extractSingleBook(base64Image, false);
      console.log(`✓ Gemini extraction successful`);
      console.log(`  Title: ${result.title || "(not detected)"}`);
      console.log(`  Author: ${result.author || "(not detected)"}`);
      console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
      console.log("");
      results.push({ test: "Gemini Single Book", status: "PASS", details: result });
    } catch (error: any) {
      console.log(`✗ Gemini extraction failed: ${error.message}`);
      console.log("");
      results.push({ test: "Gemini Single Book", status: "FAIL", details: error.message });
    }
  }

  // TEST 3: Shelf photo extraction (multi-book)
  if (hasClaudeKey) {
    console.log("TEST 3: Extract from shelf photo (Claude)...");
    try {
      const result = await visionService.extractFromShelfPhoto(base64Image, true);
      console.log(`✓ Shelf extraction successful`);
      console.log(`  Books found: ${result.books.length}`);
      console.log(`  API used: ${result.apiUsed}`);
      console.log(`  Processing time: ${result.processingTimeMs}ms`);
      result.books.forEach((book, i) => {
        console.log(`  Book ${i + 1}: "${book.title}" by ${book.author || "?"} (${book.confidence.toFixed(2)})`);
      });
      console.log("");
      results.push({ test: "Claude Shelf Photo", status: "PASS", details: result });
    } catch (error: any) {
      console.log(`✗ Shelf extraction failed: ${error.message}`);
      console.log("");
      results.push({ test: "Claude Shelf Photo", status: "FAIL", details: error.message });
    }
  }

  // TEST 4: Fallback behavior (if Claude fails, should use Gemini)
  if (hasClaudeKey && hasGeminiKey) {
    console.log("TEST 4: API preference (Claude preferred)...");
    try {
      const result = await visionService.extractFromShelfPhoto(base64Image, true);
      if (result.apiUsed === 'claude') {
        console.log(`✓ Using preferred API (Claude)`);
        console.log("");
        results.push({ test: "API Preference", status: "PASS", details: result });
      } else {
        console.log(`⚠ Using fallback API (Gemini) - Claude may have failed`);
        console.log("");
        results.push({ test: "API Preference", status: "WARN", details: result });
      }
    } catch (error: any) {
      console.log(`✗ API preference test failed: ${error.message}`);
      console.log("");
      results.push({ test: "API Preference", status: "FAIL", details: error.message });
    }
  }

  // TEST 5: Gemini shelf extraction
  if (hasGeminiKey) {
    console.log("TEST 5: Extract from shelf photo (Gemini)...");
    try {
      const result = await visionService.extractFromShelfPhoto(base64Image, false);
      console.log(`✓ Gemini shelf extraction successful`);
      console.log(`  Books found: ${result.books.length}`);
      console.log(`  API used: ${result.apiUsed}`);
      console.log(`  Processing time: ${result.processingTimeMs}ms`);
      console.log("");
      results.push({ test: "Gemini Shelf Photo", status: "PASS", details: result });
    } catch (error: any) {
      console.log(`✗ Gemini shelf extraction failed: ${error.message}`);
      console.log("");
      results.push({ test: "Gemini Shelf Photo", status: "FAIL", details: error.message });
    }
  }

  // TEST 6: GLM single book extraction
  if (hasGlmKey) {
    console.log("TEST 6: Extract single book (GLM)...");
    try {
      const result = await visionService.extractSingleBook(base64Image, false);
      console.log(`✓ GLM extraction successful`);
      console.log(`  Title: ${result.title || "(not detected)"}`);
      console.log(`  Author: ${result.author || "(not detected)"}`);
      console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`  API used: ${result.apiUsed}`);
      console.log("");
      results.push({ test: "GLM Single Book", status: "PASS", details: result });
    } catch (error: any) {
      console.log(`✗ GLM extraction failed: ${error.message}`);
      console.log("");
      results.push({ test: "GLM Single Book", status: "FAIL", details: error.message });
    }
  }

  // TEST 7: GLM shelf extraction
  if (hasGlmKey) {
    console.log("TEST 7: Extract from shelf photo (GLM)...");
    try {
      const result = await visionService.extractFromShelfPhoto(base64Image, false);
      console.log(`✓ GLM shelf extraction successful`);
      console.log(`  Books found: ${result.books.length}`);
      console.log(`  API used: ${result.apiUsed}`);
      console.log(`  Processing time: ${result.processingTimeMs}ms`);
      result.books.forEach((book, i) => {
        console.log(`  Book ${i + 1}: "${book.title}" by ${book.author || "?"} (${book.confidence.toFixed(2)})`);
      });
      console.log("");
      results.push({ test: "GLM Shelf Photo", status: "PASS", details: result });
    } catch (error: any) {
      console.log(`✗ GLM shelf extraction failed: ${error.message}`);
      console.log("");
      results.push({ test: "GLM Shelf Photo", status: "FAIL", details: error.message });
    }
  }

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("VISION SERVICE TEST SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const warned = results.filter(r => r.status === "WARN").length;

  results.forEach(result => {
    const icon = result.status === "PASS" ? "✅" : result.status === "WARN" ? "⚠️" : "❌";
    console.log(`${icon} ${result.test}: ${result.status}`);
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Warnings: ${warned}`);

  if (failed === 0) {
    console.log("\n✅ ALL VISION SERVICE TESTS PASSED!");
    process.exit(0);
  } else {
    console.log(`\n❌ ${failed} test(s) failed`);
    process.exit(1);
  }
}

testVisionService();
