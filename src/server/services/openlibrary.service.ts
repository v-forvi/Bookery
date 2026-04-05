/**
 * OpenLibrary Service
 *
 * Integrates with OpenLibrary API for book metadata lookup.
 * Free and open API, no key required for basic usage.
 *
 * API Docs: https://openlibrary.org/dev/docs/api
 */

const OPENLIBRARY_BASE = 'https://openlibrary.org';

/**
 * OpenLibrary author data
 */
export interface OLAAuthor {
  key: string;
  name: string;
}

/**
 * OpenLibrary work data
 */
export interface OLWork {
  key: string;
  title: string;
  authors?: { author: OLAAuthor }[];
  first_publish_year?: number;
  cover_i?: number; // Cover ID
  cover_edition_key?: string; // Edition key for cover
  subject?: string[];
  isbn?: string[];
}

/**
 * OpenLibrary search response
 */
export interface OLSearchResponse {
  start: number;
  numFound: number;
  docs: OLWork[];
}

/**
 * OpenLibrary edition data (detailed)
 */
export interface OLEdition {
  key: string;
  title: string;
  authors?: { author: OLAAuthor }[];
  publish_date?: string;
  publishers?: string[];
  number_of_pages?: number;
  isbn_10?: string[];
  isbn_13?: string[];
  covers?: number[];
  description?: string | { type: string; value: string };
  subjects?: string[];
  languages?: { key: string }[];
}

/**
 * Processed book result matching our app format
 */
export interface OLBookMatch {
  id: string; // OpenLibrary key
  title: string;
  authors: string[];
  isbn?: string;
  isbn13?: string;
  coverUrl?: string;
  description?: string;
  genres?: string[];
  publicationYear?: number;
  pageCount?: number;
  publisher?: string;
  language?: string;
  confidence: number;
}

/**
 * Extract ISBN from OpenLibrary edition data
 */
function extractISBN(edition: OLEdition): { isbn?: string; isbn13?: string } {
  const isbn = edition.isbn_10?.[0];
  const isbn13 = edition.isbn_13?.[0];
  return { isbn, isbn13 };
}

/**
 * Extract description (can be string or object)
 */
function extractDescription(edition: OLEdition): string | undefined {
  if (!edition.description) return undefined;
  if (typeof edition.description === 'string') return edition.description;
  return edition.description.value;
}

/**
 * Extract year from publish date string
 */
function extractYear(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const yearMatch = dateStr.match(/\b(\d{4})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (year >= 1000 && year <= 2100) return year;
  }
  return undefined;
}

/**
 * Main service class for OpenLibrary operations
 */
export class OpenLibraryService {
  /**
   * Search OpenLibrary by title/author
   */
  async search(options: {
    title?: string;
    author?: string;
    isbn?: string;
    maxResults?: number;
  }): Promise<OLBookMatch[]> {
    const params = new URLSearchParams();
    params.append('limit', String(options.maxResults ?? 5));
    params.append('fields', 'key,title,author_name,first_publish_year,cover_i,subject,isbn,cover_edition_key');

    // Build query
    if (options.isbn) {
      params.append('q', `isbn:${options.isbn}`);
    } else {
      const parts: string[] = [];
      if (options.title) {
        parts.push(`title:${options.title}`);
      }
      if (options.author) {
        parts.push(`author:${options.author}`);
      }
      if (parts.length === 0) {
        return [];
      }
      params.append('q', parts.join(' '));
    }

    const response = await fetch(
      `${OPENLIBRARY_BASE}/search.json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`OpenLibrary API error: ${response.status}`);
    }

    const data: OLSearchResponse = await response.json();
    const docs = data.docs || [];

    // Process search results into matches
    const results: OLBookMatch[] = [];

    for (const doc of docs) {
      // Get detailed edition data for more info
      const editionKey = doc.cover_edition_key || doc.key?.split('/').pop();
      if (!editionKey) continue;

      try {
        const edition = await this.getEdition(`/books/${editionKey}`);
        if (edition) {
          results.push(this.processEdition(edition, options));
        }
      } catch {
        // If we can't get edition details, still include basic info
        results.push({
          id: doc.key,
          title: doc.title,
          authors: doc.authors?.map(a => a.author.name) || [],
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
          genres: doc.subject,
          publicationYear: doc.first_publish_year,
          confidence: this.calculateConfidence(doc, options),
        });
      }
    }

    return results;
  }

  /**
   * Get detailed edition information
   */
  async getEdition(key: string): Promise<OLEdition | null> {
    const response = await fetch(`${OPENLIBRARY_BASE}${key}.json`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  }

  /**
   * Process an edition into our match format
   */
  private processEdition(
    edition: OLEdition,
    searchOptions: { title?: string; author?: string; isbn?: string }
  ): OLBookMatch {
    const { isbn, isbn13 } = extractISBN(edition);
    const coverId = edition.covers?.[0];

    return {
      id: edition.key,
      title: edition.title,
      authors: edition.authors?.map(a => a.author.name) || [],
      isbn,
      isbn13,
      coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined,
      description: extractDescription(edition),
      genres: edition.subjects,
      publicationYear: extractYear(edition.publish_date),
      pageCount: edition.number_of_pages,
      publisher: edition.publishers?.[0],
      language: edition.languages?.[0]?.key?.replace('/languages/', ''),
      confidence: this.calculateConfidenceFromEdition(edition, searchOptions),
    };
  }

  /**
   * Calculate confidence score for search result
   */
  private calculateConfidence(
    doc: OLWork,
    searchOptions: { title?: string; author?: string; isbn?: string }
  ): number {
    let confidence = 0.5;

    if (searchOptions.title && doc.title) {
      const searchTitle = searchOptions.title.toLowerCase();
      const docTitle = doc.title.toLowerCase();
      if (docTitle === searchTitle) {
        confidence += 0.3;
      } else if (docTitle.includes(searchTitle) || searchTitle.includes(docTitle)) {
        confidence += 0.15;
      }
    }

    if (searchOptions.author && doc.authors) {
      const searchAuthor = searchOptions.author.toLowerCase();
      const hasMatch = doc.authors.some(a =>
        a.author.name.toLowerCase().includes(searchAuthor)
      );
      if (hasMatch) confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate confidence from detailed edition
   */
  private calculateConfidenceFromEdition(
    edition: OLEdition,
    searchOptions: { title?: string; author?: string; isbn?: string }
  ): number {
    let confidence = 0.5;

    if (searchOptions.title && edition.title) {
      const searchTitle = searchOptions.title.toLowerCase();
      const editionTitle = edition.title.toLowerCase();
      if (editionTitle === searchTitle) {
        confidence += 0.3;
      } else if (editionTitle.includes(searchTitle)) {
        confidence += 0.15;
      }
    }

    if (searchOptions.author && edition.authors) {
      const searchAuthor = searchOptions.author.toLowerCase();
      const hasMatch = edition.authors.some(a =>
        a.author.name.toLowerCase().includes(searchAuthor)
      );
      if (hasMatch) confidence += 0.2;
    }

    if (searchOptions.isbn) {
      const { isbn, isbn13 } = extractISBN(edition);
      if (isbn === searchOptions.isbn || isbn13 === searchOptions.isbn) {
        confidence = 0.98;
      }
    }

    // Has complete metadata
    if (edition.description) confidence += 0.05;
    if (edition.covers?.[0]) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }
}

// Singleton instance
export const openLibraryService = new OpenLibraryService();
