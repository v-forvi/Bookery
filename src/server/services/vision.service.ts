/**
 * Vision Service
 *
 * Handles AI-powered book extraction from images using Claude, Gemini, or GLM Vision API.
 */

import { db } from "../db";
import { settings } from "../schema";
import { eq } from "drizzle-orm";

export interface ExtractedBook {
  title: string | null;
  author: string | null;
  confidence: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface VisionExtractionResult {
  books: ExtractedBook[];
  apiUsed: 'claude' | 'gemini' | 'glm';
  processingTimeMs: number;
}

const VISION_PROMPT = `You are analyzing a bookshelf photo to extract book information.

TASK: Extract ALL visible book spines and return a structured JSON array.

For EACH book you can identify:
1. Extract the title (full title if visible, partial if truncated)
2. Extract the author name if visible on spine
3. Assign a confidence score (0.0-1.0) based on:
   - Image clarity and focus
   - Text completeness
   - Your certainty in the reading

IMPORTANT RULES:
- If text is cut off, include what's visible with "..." at the end
- If author is not visible, set author to null
- Minimum confidence for inclusion: 0.3 (when in doubt, include it)
- Ignore books that are completely obscured or facing away
- Include position data (bounding box as percentage of image)

RETURN FORMAT (JSON only, no markdown):
{
  "books": [
    {
      "title": "string or null",
      "author": "string or null",
      "confidence": 0.0-1.0,
      "bbox": {
        "x": 0-100,
        "y": 0-100,
        "width": 0-100,
        "height": 0-100
      }
    }
  ]
}`;

const SINGLE_BOOK_PROMPT = `You are analyzing a photo of a single book cover or spine.

TASK: Extract the book information.

Extract:
1. Title - the full title of the book
2. Author - the author name if visible
3. Confidence - your certainty (0.0-1.0)

RETURN FORMAT (JSON only, no markdown):
{
  "title": "string or null",
  "author": "string or null",
  "confidence": 0.0-1.0
}`;

/**
 * Helper to get API key from database settings or environment
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
 * Main service class for vision operations
 */
export class VisionService {
  /**
   * Call Claude Vision API to extract books from image
   */
  private async callClaudeVision(
    base64Image: string,
    isSingle: boolean = false
  ): Promise<ExtractedBook[]> {
    const apiKey = await getApiKey("claude_api_key", "ANTHROPIC_API_KEY");

    if (!apiKey) {
      throw new Error("Claude API key not configured. Please set it in Settings.");
    }

    // Extract MIME type from data URL
    const mimeMatch = base64Image.match(/^data:(image\/[a-z]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: isSingle ? SINGLE_BOOK_PROMPT : VISION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                     content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from Claude response");
    }

    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    if (isSingle) {
      return [{
        title: parsed.title || null,
        author: parsed.author || null,
        confidence: parsed.confidence || 0.5,
      }];
    }

    return parsed.books || [];
  }

  /**
   * Call Gemini Vision API to extract books from image
   */
  private async callGeminiVision(
    base64Image: string,
    isSingle: boolean = false
  ): Promise<ExtractedBook[]> {
    const apiKey = await getApiKey("gemini_api_key", "GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("Gemini API key not configured. Please set it in Settings.");
    }

    // Extract base64 data
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data,
                  },
                },
                {
                  text: isSingle ? SINGLE_BOOK_PROMPT : VISION_PROMPT,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                     content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from Gemini response");
    }

    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    if (isSingle) {
      return [{
        title: parsed.title || null,
        author: parsed.author || null,
        confidence: parsed.confidence || 0.5,
      }];
    }

    return parsed.books || [];
  }

  /**
   * Call Z.AI GLM Vision API to extract books from image
   */
  private async callGLMVision(
    base64Image: string,
    isSingle: boolean = false
  ): Promise<ExtractedBook[]> {
    const apiKey = await getApiKey("glm_api_key", "GLM_API_KEY");

    if (!apiKey) {
      throw new Error("GLM API key not configured. Please set it in Settings.");
    }

    // GLM accepts data URL directly
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
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: base64Image,
                },
              },
              {
                type: 'text',
                text: isSingle ? SINGLE_BOOK_PROMPT : VISION_PROMPT,
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        top_p: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GLM API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Handle GLM response format
    if (data.error) {
      throw new Error(`GLM API error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                     content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from GLM response");
    }

    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    if (isSingle) {
      return [{
        title: parsed.title || null,
        author: parsed.author || null,
        confidence: parsed.confidence || 0.5,
      }];
    }

    return parsed.books || [];
  }

  /**
   * Helper to try vision APIs in order with fallback
   */
  private async tryVisionApis(
    base64Image: string,
    isSingle: boolean,
    preferredApi?: 'claude' | 'gemini' | 'glm'
  ): Promise<{ books: ExtractedBook[]; apiUsed: 'claude' | 'gemini' | 'glm' }> {
    // Check database and env vars for available keys
    const hasClaudeKey = !!(await getApiKey("claude_api_key", "ANTHROPIC_API_KEY"));
    const hasGeminiKey = !!(await getApiKey("gemini_api_key", "GEMINI_API_KEY"));
    const hasGlmKey = !!(await getApiKey("glm_api_key", "GLM_API_KEY"));

    // Build priority list based on preference and available keys
    let apis: ('claude' | 'gemini' | 'glm')[] = [];

    if (preferredApi && preferredApi !== 'claude') {
      apis = [preferredApi];
    }

    // Always try Claude first if key available (unless GLM specifically preferred)
    if (hasClaudeKey && preferredApi !== 'glm') apis.push('claude');
    if (hasGeminiKey) apis.push('gemini');
    if (hasGlmKey) apis.push('glm');

    // Remove duplicates
    apis = [...new Set(apis)];

    if (apis.length === 0) {
      throw new Error('No API keys configured. Please add an API key in Settings.');
    }

    // Try each API in order
    for (const api of apis) {
      try {
        let books: ExtractedBook[];
        switch (api) {
          case 'claude':
            books = await this.callClaudeVision(base64Image, isSingle);
            break;
          case 'gemini':
            books = await this.callGeminiVision(base64Image, isSingle);
            break;
          case 'glm':
            books = await this.callGLMVision(base64Image, isSingle);
            break;
        }
        return { books, apiUsed: api };
      } catch (error: any) {
        console.error(`${api} vision API failed:`, error?.message || error);
        // Try next API
        continue;
      }
    }

    throw new Error('All vision APIs failed. Please check your API keys in Settings.');
  }

  /**
   * Extract multiple books from a shelf photo
   */
  async extractFromShelfPhoto(
    base64Image: string,
    preferClaude: boolean = true
  ): Promise<VisionExtractionResult> {
    const startTime = Date.now();

    const { books, apiUsed } = await this.tryVisionApis(
      base64Image,
      false,
      preferClaude ? 'claude' : undefined
    );

    // Filter by minimum confidence
    const filteredBooks = books.filter(b => b.confidence >= 0.3);

    return {
      books: filteredBooks,
      apiUsed,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Extract a single book from an image
   */
  async extractSingleBook(
    base64Image: string,
    preferClaude: boolean = true
  ): Promise<ExtractedBook & { apiUsed: 'claude' | 'gemini' | 'glm'; processingTimeMs: number }> {
    const startTime = Date.now();

    const { books, apiUsed } = await this.tryVisionApis(
      base64Image,
      true,
      preferClaude ? 'claude' : undefined
    );

    return {
      ...books[0],
      apiUsed,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// Singleton instance
export const visionService = new VisionService();
