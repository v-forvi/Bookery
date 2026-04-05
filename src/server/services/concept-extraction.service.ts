// src/server/services/concept-extraction.service.ts

import { db } from "@/server/db";
import { books, concepts, bookConcepts, settings } from "@/server/schema";
import { eq, and, sql } from "drizzle-orm";
import { normalizeConceptName } from "@/lib/graph-utils";

export interface ExtractedConcept {
  name: string;
  domain: string;
  weight: number; // 0-100
}

export interface ExtractionResult {
  concepts: ExtractedConcept[];
  apiUsed: "claude" | "gemini" | "glm";
  processingTimeMs: number;
}

export interface BatchExtractResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    bookId: number;
    title: string;
    error: string;
  }>;
}

/**
 * Get API key from database settings with fallback to environment variable.
 * This matches the pattern used in vision.service.ts for consistency.
 */
async function getApiKey(
  settingKey: "claude_api_key" | "gemini_api_key" | "glm_api_key",
  envKey: string
): Promise<string | null> {
  // Try database first
  const [setting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, settingKey))
    .limit(1);

  if (setting?.value) {
    return setting.value;
  }

  // Fallback to environment variable
  return process.env[envKey] || null;
}

/**
 * Build the prompt for concept extraction
 */
function buildExtractionPrompt(book: {
  title: string;
  author: string;
  description: string | null;
  genres: string | null;
}): string {
  const genres = book.genres ? JSON.parse(book.genres).join(", ") : "Unknown";
  const description = book.description || "No description available.";

  return `Extract 5-10 core concepts from this book. For each concept provide:
  - name: the concept (e.g., 'free will', 'consciousness', 'decision-making')
  - domain: the academic field (e.g., 'philosophy', 'psychology', 'biology')
  - weight: 0-100 based on how central this concept is to the book

Book: ${book.title}
Author: ${book.author}
Description: ${description}
Genres: ${genres}

Respond only as a JSON array. Example format:
[
  {"name": "consciousness", "domain": "philosophy", "weight": 90},
  {"name": "free will", "domain": "philosophy", "weight": 75}
]`;
}

/**
 * Extract concepts using Claude API
 */
async function extractWithClaude(prompt: string): Promise<ExtractedConcept[]> {
  const apiKey = await getApiKey("claude_api_key", "ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("Claude API key not found in settings or environment");
  }

  const anthropic = require("@anthropic-ai/sdk");
  const client = new anthropic.Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0].text;
  return parseConceptsResponse(content);
}

/**
 * Extract concepts using Gemini API
 */
async function extractWithGemini(prompt: string): Promise<ExtractedConcept[]> {
  const apiKey = await getApiKey("gemini_api_key", "GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Gemini API key not found in settings or environment");
  }

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(prompt);
  const response = await result.response.text();
  return parseConceptsResponse(response);
}

/**
 * Extract concepts using GLM API
 */
async function extractWithGLM(prompt: string): Promise<ExtractedConcept[]> {
  const apiKey = await getApiKey("glm_api_key", "GLM_API_KEY");
  if (!apiKey) {
    throw new Error("GLM API key not found in settings or environment");
  }

  const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "glm-4.5v",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`GLM API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return parseConceptsResponse(content);
}

/**
 * Parse LLM response into concepts
 */
function parseConceptsResponse(content: string): ExtractedConcept[] {
  // Try to extract JSON from response
  let jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("No JSON array found in response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!Array.isArray(parsed)) {
    throw new Error("Response is not an array");
  }

  // Validate and normalize
  return parsed
    .filter((item: any) => item.name && item.domain && typeof item.weight === "number")
    .map((item: any) => ({
      name: normalizeConceptName(item.name),
      domain: item.domain.toLowerCase().trim(),
      weight: Math.max(0, Math.min(100, item.weight)), // Clamp to 0-100
    }));
}

/**
 * Concept Extraction Service
 */
export class ConceptExtractionService {
  /**
   * Extract concepts from a single book
   */
  async extractFromBook(
    bookId: number,
    preferredApi?: "claude" | "gemini" | "glm"
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    // Fetch book
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!book) {
      throw new Error(`Book ${bookId} not found`);
    }

    const prompt = buildExtractionPrompt(book);
    let concepts: ExtractedConcept[] = [];
    let apiUsed: "claude" | "gemini" | "glm" = "claude";

    // Try preferred API first, then fallback
    const apisToTry: Array<"claude" | "gemini" | "glm"> = preferredApi
      ? [preferredApi, "claude", "gemini", "glm"].filter((a, i, arr) =>
          a === preferredApi ? true : arr.indexOf(preferredApi) < i
        ) as Array<"claude" | "gemini" | "glm">
      : ["claude", "gemini", "glm"];

    for (const api of apisToTry) {
      try {
        // Check if API key is available (from DB or env)
        const hasKey = await this.checkApiKeyAvailable(api);
        if (!hasKey) {
          continue;
        }

        if (api === "claude") {
          concepts = await extractWithClaude(prompt);
          apiUsed = "claude";
          break;
        } else if (api === "gemini") {
          concepts = await extractWithGemini(prompt);
          apiUsed = "gemini";
          break;
        } else if (api === "glm") {
          concepts = await extractWithGLM(prompt);
          apiUsed = "glm";
          break;
        }
      } catch (error) {
        console.error(`${api} extraction failed:`, error);
        continue;
      }
    }

    if (concepts.length === 0) {
      throw new Error("All extraction APIs failed. Please add API keys in Settings.");
    }

    // Store concepts
    await this.storeConcepts(bookId, concepts);

    // Update book's last_analyzed timestamp
    await db
      .update(books)
      .set({
        // @ts-ignore - lastAnalyzed is a Phase 1 column
        lastAnalyzed: new Date().toISOString()
      })
      .where(eq(books.id, bookId));

    return {
      concepts,
      apiUsed,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Check if an API key is available (from DB settings or env var)
   */
  private async checkApiKeyAvailable(api: "claude" | "gemini" | "glm"): Promise<boolean> {
    const keyMap = {
      claude: ["claude_api_key", "ANTHROPIC_API_KEY"],
      gemini: ["gemini_api_key", "GEMINI_API_KEY"],
      glm: ["glm_api_key", "GLM_API_KEY"],
    };
    const [settingKey, envKey] = keyMap[api];
    const key = await getApiKey(settingKey as any, envKey);
    return key !== null;
  }

  /**
   * Store extracted concepts in database
   */
  private async storeConcepts(bookId: number, extractedConcepts: ExtractedConcept[]): Promise<void> {
    for (const concept of extractedConcepts) {
      // Find or create concept
      const [existingConcept] = await db
        .select()
        .from(concepts)
        .where(eq(concepts.name, concept.name))
        .limit(1);

      let conceptId: number;

      if (existingConcept) {
        conceptId = existingConcept.id;
        // Update domain if different
        if (existingConcept.domain !== concept.domain) {
          await db
            .update(concepts)
            .set({ domain: concept.domain })
            .where(eq(concepts.id, conceptId));
        }
      } else {
        const [inserted] = await db
          .insert(concepts)
          .values({
            name: concept.name,
            domain: concept.domain,
          })
          .returning();
        conceptId = inserted.id;
      }

      // Check if book-concept link already exists
      const [existingLink] = await db
        .select()
        .from(bookConcepts)
        .where(and(
          eq(bookConcepts.bookId, bookId),
          eq(bookConcepts.conceptId, conceptId)
        ))
        .limit(1);

      if (existingLink) {
        // Update weight
        await db
          .update(bookConcepts)
          .set({ weight: concept.weight })
          .where(eq(bookConcepts.id, existingLink.id));
      } else {
        // Create new link
        await db.insert(bookConcepts).values({
          bookId,
          conceptId,
          weight: concept.weight,
        });
      }
    }
  }

  /**
   * Batch extract concepts from multiple books
   */
  async batchExtract(
    bookIds: number[],
    filter?: "all" | "unread" | "unanalyzed",
    preferredApi?: "claude" | "gemini" | "glm"
  ): Promise<BatchExtractResult> {
    let booksToProcess = bookIds;

    // If filter is specified, get books matching the filter
    if (filter && filter !== "all") {
      let query = db.select().from(books).$dynamic();

      // @ts-ignore - readingStatus and lastAnalyzed are Phase 1 columns
      if (filter === "unread") {
        // @ts-ignore
        query = query.where(eq(books.readingStatus, "unread"));
      } else if (filter === "unanalyzed") {
        // @ts-ignore
        query = query.where(sql`last_analyzed IS NULL`);
      }

      const allBooks = await query;
      booksToProcess = allBooks.map(b => b.id);
    }

    const result: BatchExtractResult = {
      total: booksToProcess.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const bookId of booksToProcess) {
      try {
        const [book] = await db
          .select()
          .from(books)
          .where(eq(books.id, bookId))
          .limit(1);

        if (!book) {
          result.errors.push({
            bookId,
            title: "Unknown",
            error: "Book not found",
          });
          result.failed++;
          continue;
        }

        await this.extractFromBook(bookId, preferredApi);
        result.success++;
      } catch (error) {
        result.errors.push({
          bookId,
          title: "Unknown",
          error: error instanceof Error ? error.message : String(error),
        });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Get concepts for a book
   */
  async getConceptsForBook(bookId: number) {
    const results = await db
      .select({
        conceptId: bookConcepts.conceptId,
        name: concepts.name,
        domain: concepts.domain,
        description: concepts.description,
        weight: bookConcepts.weight,
        extractedAt: bookConcepts.extractedAt,
      })
      .from(bookConcepts)
      .innerJoin(concepts, eq(bookConcepts.conceptId, concepts.id))
      .where(eq(bookConcepts.bookId, bookId));

    return results.map(r => ({
      id: r.conceptId,
      name: r.name,
      domain: r.domain,
      description: r.description,
      weight: r.weight,
      extractedAt: r.extractedAt,
    }));
  }
}

export const conceptExtractionService = new ConceptExtractionService();
