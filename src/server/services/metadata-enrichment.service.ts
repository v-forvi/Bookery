/**
 * Metadata Enrichment Service
 *
 * Orchestrates fallback chain for fetching book metadata:
 * 1. Google Books API (fast, no key, large database)
 * 2. OpenLibrary API (free, no key, open data)
 * 3. AI Web Search (uses configured API keys, smartest but slowest)
 */

import { googleBooksService, BookMatch, RateLimitError } from "./google-books.service";
import { openLibraryService, OLBookMatch } from "./openlibrary.service";
import { aiMetadataService, AIMetadataMatch } from "./ai-metadata.service";

/**
 * Unified metadata result matching our database schema
 */
export interface EnrichedMetadata {
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  description?: string;
  genres?: string[];
  publicationYear?: number;
  pageCount?: number;
  publisher?: string;
  source: 'google_books' | 'openlibrary' | 'ai_search' | 'vision_only';
  confidence: number;
}

/**
 * Convert Google Books match to enriched metadata
 */
function fromGoogleBooks(match: BookMatch): EnrichedMetadata {
  return {
    title: match.title,
    author: match.authors[0] || 'Unknown Author',
    isbn: match.isbn || match.isbn13,
    coverUrl: match.coverUrl,
    description: match.description,
    genres: match.genres,
    publicationYear: match.publicationYear,
    pageCount: match.pageCount,
    publisher: match.publisher,
    source: 'google_books',
    confidence: match.confidence,
  };
}

/**
 * Convert OpenLibrary match to enriched metadata
 */
function fromOpenLibrary(match: OLBookMatch): EnrichedMetadata {
  return {
    title: match.title,
    author: match.authors[0] || 'Unknown Author',
    isbn: match.isbn || match.isbn13,
    coverUrl: match.coverUrl,
    description: match.description,
    genres: match.genres,
    publicationYear: match.publicationYear,
    pageCount: match.pageCount,
    publisher: match.publisher,
    source: 'openlibrary',
    confidence: match.confidence,
  };
}

/**
 * Convert AI search match to enriched metadata
 */
function fromAI(match: AIMetadataMatch): EnrichedMetadata {
  return {
    title: match.title,
    author: match.author || 'Unknown Author',
    isbn: match.isbn,
    coverUrl: match.coverUrl,
    description: match.description,
    genres: match.genres,
    publicationYear: match.publicationYear,
    pageCount: match.pageCount,
    publisher: match.publisher,
    source: 'ai_search',
    confidence: match.confidence,
  };
}

/**
 * Metadata Enrichment Service
 */
export class MetadataEnrichmentService {
  /**
   * Enrich book metadata with full fallback chain
   *
   * @param title - Book title from vision extraction
   * @param author - Optional author from vision extraction
   * @param preferredApi - Preferred AI API for fallback search
   * @returns Enriched metadata or minimal data if all sources fail
   */
  async enrich(
    title: string,
    author?: string,
    preferredApi?: 'claude' | 'gemini' | 'glm'
  ): Promise<EnrichedMetadata> {
    // Minimal fallback if everything fails
    const minimalData: EnrichedMetadata = {
      title,
      author: author || 'Unknown Author',
      source: 'vision_only',
      confidence: 0.3,
    };

    if (!title) {
      return minimalData;
    }

    // 1. Try Google Books (fastest, no API key)
    try {
      const googleResults = await googleBooksService.search({
        title,
        author,
        maxResults: 1,
      });

      if (googleResults.length > 0 && googleResults[0].confidence > 0.6) {
        return fromGoogleBooks(googleResults[0]);
      }
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.warn('[MetadataEnrichment] Google Books rate limited, using OpenLibrary fallback');
      } else {
        console.warn('[MetadataEnrichment] Google Books lookup failed:', error);
      }
      // Fall through to OpenLibrary
    }

    // 2. Try OpenLibrary (free, no API key)
    try {
      const olResults = await openLibraryService.search({
        title,
        author,
        maxResults: 1,
      });

      if (olResults.length > 0 && olResults[0].confidence > 0.5) {
        return fromOpenLibrary(olResults[0]);
      }
    } catch (error) {
      console.warn('OpenLibrary lookup failed:', error);
    }

    // 3. Try AI Web Search (slowest but smartest)
    try {
      const aiResult = await aiMetadataService.search(title, author, preferredApi);

      if (aiResult && aiResult.confidence > 0.4) {
        return fromAI(aiResult);
      }
    } catch (error) {
      console.warn('AI metadata search failed:', error);
    }

    // All sources failed, return minimal data from vision
    return minimalData;
  }

  /**
   * Batch enrich multiple books (for shelf import)
   *
   * Processes books in parallel with rate limiting consideration
   */
  async enrichBatch(
    books: Array<{ title: string; author?: string }>,
    preferredApi?: 'claude' | 'gemini' | 'glm'
  ): Promise<EnrichedMetadata[]> {
    // Process in batches to avoid overwhelming APIs
    const batchSize = 5;
    const results: EnrichedMetadata[] = [];

    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(book =>
          this.enrich(book.title, book.author, preferredApi)
        )
      );
      results.push(...batchResults);

      // Small delay between batches to be respectful to free APIs
      if (i + batchSize < books.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }
}

// Singleton instance
export const metadataEnrichmentService = new MetadataEnrichmentService();
