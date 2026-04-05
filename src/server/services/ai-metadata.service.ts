/**
 * AI Metadata Service
 *
 * Uses AI models (Claude/Gemini/GLM) with web search capability
 * to fetch book metadata as a fallback when traditional APIs fail.
 *
 * This service uses the same API keys configured for vision features.
 */

import { db } from "../db";
import { settings } from "../schema";
import { eq } from "drizzle-orm";

export interface AIMetadataMatch {
  title: string;
  author?: string;
  isbn?: string;
  coverUrl?: string;
  description?: string;
  genres?: string[];
  publicationYear?: number;
  pageCount?: number;
  publisher?: string;
  confidence: number;
  source: 'claude' | 'gemini' | 'glm';
}

/**
 * Get API key from database or environment
 */
async function getApiKey(
  settingKey: "claude_api_key" | "gemini_api_key" | "glm_api_key",
  envKey: string
): Promise<string | null> {
  const [setting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, settingKey))
    .limit(1);

  if (setting?.value) return setting.value;
  return process.env[envKey] || null;
}

/**
 * Prompt for AI to search and return book metadata
 */
const METADATA_SEARCH_PROMPT = (title: string, author?: string) => `You are searching for book metadata.

Search for information about this book:
${author ? `Title: "${title}" by ${author}` : `Title: "${title}"`}

TASK: Use web search to find accurate metadata about this book.

RETURN FORMAT (JSON only, no markdown):
{
  "title": "exact book title",
  "author": "author name",
  "isbn": "ISBN-13 if found",
  "description": "brief book description",
  "genres": ["genre1", "genre2"],
  "publicationYear": 2024,
  "pageCount": 300,
  "publisher": "publisher name",
  "coverUrl": "URL to cover image if found"
}

RULES:
- Use web search to verify accuracy
- Return null for any field you cannot confidently determine
- isbn should be ISBN-13 format only
- genres should be an array of 2-4 main genres
- If the book is not found, return all null values
`;

/**
 * AI Metadata Service
 */
export class AIMetadataService {
  /**
   * Use Claude with web search to find book metadata
   */
  private async searchWithClaude(
    title: string,
    author?: string
  ): Promise<AIMetadataMatch | null> {
    const apiKey = await getApiKey("claude_api_key", "ANTHROPIC_API_KEY");
    if (!apiKey) return null;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          tools: [
            {
              name: 'web_search',
              description: 'Search the web for information',
              input_schema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search query'
                  }
                },
                required: ['query']
              }
            }
          ],
          tool_choice: { type: 'auto', disable_parallel_tool_use: true },
          messages: [
            {
              role: 'user',
              content: METADATA_SEARCH_PROMPT(title, author)
            }
          ]
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();

      // Extract the final text response (after tool use)
      let content = data.content?.[0]?.text || '';
      // Handle content blocks that might be an array
      if (Array.isArray(data.content)) {
        const textBlock = data.content.find((c: any) => c.type === 'text');
        content = textBlock?.text || content;
      }

      return this.parseAIResponse(content, 'claude');
    } catch {
      return null;
    }
  }

  /**
   * Use Gemini with Google Search to find book metadata
   */
  private async searchWithGemini(
    title: string,
    author?: string
  ): Promise<AIMetadataMatch | null> {
    const apiKey = await getApiKey("gemini_api_key", "GEMINI_API_KEY");
    if (!apiKey) return null;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: METADATA_SEARCH_PROMPT(title, author) }]
            }],
            tools: [{
              googleSearch: {}
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            }
          })
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return this.parseAIResponse(content, 'gemini');
    } catch {
      return null;
    }
  }

  /**
   * Use GLM (if it supports search) or just knowledge
   */
  private async searchWithGLM(
    title: string,
    author?: string
  ): Promise<AIMetadataMatch | null> {
    const apiKey = await getApiKey("glm_api_key", "GLM_API_KEY");
    if (!apiKey) return null;

    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'glm-4.5v',
          messages: [
            {
              role: 'user',
              content: METADATA_SEARCH_PROMPT(title, author) +
                "\n\nNote: You are an AI with knowledge cutoff. Search online if you can, otherwise use your training data."
            }
          ],
          temperature: 0.1,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return this.parseAIResponse(content, 'glm');
    } catch {
      return null;
    }
  }

  /**
   * Parse AI response into structured metadata
   */
  private parseAIResponse(content: string, source: 'claude' | 'gemini' | 'glm'): AIMetadataMatch | null {
    // Extract JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                     content.match(/\{[\s\S]*?\}/);

    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      // If AI couldn't find the book, return null
      if (!parsed.title && !parsed.author) {
        return null;
      }

      return {
        title: parsed.title || '',
        author: parsed.author,
        isbn: parsed.isbn,
        coverUrl: parsed.coverUrl,
        description: parsed.description,
        genres: parsed.genres,
        publicationYear: parsed.publicationYear,
        pageCount: parsed.pageCount,
        publisher: parsed.publisher,
        confidence: 0.7, // AI search has moderate confidence
        source,
      };
    } catch {
      return null;
    }
  }

  /**
   * Main method: Try all available AI sources with search
   */
  async search(
    title: string,
    author?: string,
    preferredApi?: 'claude' | 'gemini' | 'glm'
  ): Promise<AIMetadataMatch | null> {
    // Check available keys
    const hasClaudeKey = !!(await getApiKey("claude_api_key", "ANTHROPIC_API_KEY"));
    const hasGeminiKey = !!(await getApiKey("gemini_api_key", "GEMINI_API_KEY"));
    const hasGlmKey = !!(await getApiKey("glm_api_key", "GLM_API_KEY"));

    // Build priority list
    let attempts: Array<() => Promise<AIMetadataMatch | null>> = [];

    if (preferredApi === 'claude' && hasClaudeKey) {
      attempts.push(() => this.searchWithClaude(title, author));
    }
    if (preferredApi === 'gemini' && hasGeminiKey) {
      attempts.push(() => this.searchWithGemini(title, author));
    }
    if (preferredApi === 'glm' && hasGlmKey) {
      attempts.push(() => this.searchWithGLM(title, author));
    }

    // Add defaults if no specific preference
    if (hasClaudeKey && preferredApi !== 'glm') {
      attempts.push(() => this.searchWithClaude(title, author));
    }
    if (hasGeminiKey) {
      attempts.push(() => this.searchWithGemini(title, author));
    }
    if (hasGlmKey) {
      attempts.push(() => this.searchWithGLM(title, author));
    }

    // Remove duplicates
    attempts = Array.from(
      new Map(attempts.map(fn => [fn.toString(), fn])).values()
    );

    // Try each source
    for (const attempt of attempts) {
      try {
        const result = await attempt();
        if (result && result.title) {
          return result;
        }
      } catch {
        continue;
      }
    }

    return null;
  }
}

// Singleton instance
export const aiMetadataService = new AIMetadataService();
