/**
 * Google Books Service
 *
 * Integrates with Google Books API for book metadata lookup.
 * Free API with generous quota (1000 requests/day).
 *
 * API Docs: https://developers.google.com/books/docs/v1/reference
 */

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Rate limit error - thrown when Google Books API returns 429
 * Exported so metadata enrichment service can detect and handle gracefully
 */
export class RateLimitError extends Error {
  constructor(message: string = 'Google Books API rate limit exceeded (429)') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Raw industry identifier from Google Books API
 */
export interface GoogleIndustryIdentifier {
  type: 'ISBN_10' | 'ISBN_13' | 'OTHER';
  identifier: string;
}

/**
 * Image links from Google Books API
 */
export interface GoogleImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
}

/**
 * Volume info from Google Books API
 */
export interface GoogleVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: GoogleIndustryIdentifier[];
  readingModes?: { [key: string]: boolean };
  pageCount?: number;
  printType?: string;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  maturityRating?: string;
  allowAnonLogging?: boolean;
  contentVersion?: string;
  panelizationSummary?: { [key: string]: boolean };
  imageLinks?: GoogleImageLinks;
  language?: string;
  previewLink?: string;
  infoLink?: string;
  canonicalVolumeLink?: string;
}

/**
 * Full Google Books Volume response
 */
export interface GoogleBooksVolume {
  kind: string;
  id: string;
  etag: string;
  selfLink: string;
  volumeInfo: GoogleVolumeInfo;
  saleInfo?: any;
  accessInfo?: any;
  searchInfo?: { textSnippet?: string };
}

/**
 * Search options for Google Books API
 */
export interface GoogleBooksSearchOptions {
  title?: string;
  author?: string;
  isbn?: string;
  maxResults?: number; // default: 5
}

/**
 * Processed book result for the app
 */
export interface BookMatch {
  id: string; // Google Books volume ID
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
  previewLink?: string;
  confidence: number; // Calculated based on match quality
}

/**
 * Extract ISBN from industry identifiers
 */
function extractISBN(identifiers?: GoogleIndustryIdentifier[]): {
  isbn?: string;
  isbn13?: string;
} {
  if (!identifiers || identifiers.length === 0) {
    return {};
  }

  let isbn: string | undefined;
  let isbn13: string | undefined;

  for (const id of identifiers) {
    if (id.type === 'ISBN_10') {
      isbn = id.identifier;
    } else if (id.type === 'ISBN_13') {
      isbn13 = id.identifier;
    }
  }

  return { isbn, isbn13 };
}

/**
 * Extract publication year from date string
 */
function extractYear(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;

  // Try to extract 4-digit year
  const yearMatch = dateStr.match(/\b(\d{4})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    // Validate reasonable year range
    if (year >= 1000 && year <= 2100) {
      return year;
    }
  }

  return undefined;
}

/**
 * Calculate confidence score based on match quality
 */
function calculateConfidence(
  volume: GoogleBooksVolume,
  searchOptions: GoogleBooksSearchOptions
): number {
  let confidence = 0.5; // Base confidence

  // ISBN match is very strong
  if (searchOptions.isbn) {
    const { isbn, isbn13 } = extractISBN(volume.volumeInfo.industryIdentifiers);
    if (isbn === searchOptions.isbn || isbn13 === searchOptions.isbn) {
      confidence = 0.98;
    }
  }

  // Title match
  if (searchOptions.title && volume.volumeInfo.title) {
    const searchTitle = searchOptions.title.toLowerCase();
    const volumeTitle = volume.volumeInfo.title.toLowerCase();

    if (volumeTitle === searchTitle) {
      confidence += 0.3;
    } else if (volumeTitle.includes(searchTitle) || searchTitle.includes(volumeTitle)) {
      confidence += 0.15;
    }
  }

  // Author match
  if (searchOptions.author && volume.volumeInfo.authors) {
    const searchAuthor = searchOptions.author.toLowerCase();
    const hasAuthorMatch = volume.volumeInfo.authors.some(a =>
      a.toLowerCase().includes(searchAuthor) || searchAuthor.includes(a.toLowerCase())
    );

    if (hasAuthorMatch) {
      confidence += 0.2;
    }
  }

  // Has complete metadata (good sign)
  if (volume.volumeInfo.description) {
    confidence += 0.05;
  }
  if (volume.volumeInfo.imageLinks?.thumbnail) {
    confidence += 0.05;
  }

  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

/**
 * Main service class for Google Books operations
 */
export class GoogleBooksService {
  /**
   * Search Google Books API
   */
  async search(options: GoogleBooksSearchOptions): Promise<BookMatch[]> {
    const params = new URLSearchParams();
    params.append('printType', 'books');
    params.append('maxResults', String(options.maxResults ?? 5));
    params.append('projection', 'lite'); // Faster, smaller responses

    // Build query
    if (options.isbn) {
      params.append('q', `isbn:${options.isbn}`);
    } else {
      const parts: string[] = [];
      if (options.title) {
        parts.push(`intitle:${options.title}`);
      }
      if (options.author) {
        parts.push(`inauthor:${options.author}`);
      }
      if (parts.length === 0) {
        throw new Error('At least one search parameter (title, author, or isbn) is required');
      }
      params.append('q', parts.join(' '));
    }

    const url = `${GOOGLE_BOOKS_BASE}?${params.toString()}`;
    console.log('[GoogleBooksService] Searching:', url);

    // Add 10 second timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Check for rate limit (429)
      if (response.status === 429) {
        console.warn('[GoogleBooksService] Rate limited (429), falling back to OpenLibrary');
        throw new RateLimitError();
      }
      console.error('[GoogleBooksService] API error:', response.status, response.statusText);
      throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const volumes: GoogleBooksVolume[] = data.items || [];
    console.log('[GoogleBooksService] Found volumes:', volumes.length);

    // Process and map to BookMatch format
    return volumes
      .map(volume => this.processVolume(volume, options))
      .filter((match): match is BookMatch => match !== null);
  }

  /**
   * Get a single book by its Google Books ID
   */
  async getById(volumeId: string): Promise<BookMatch | null> {
    // Add 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${GOOGLE_BOOKS_BASE}/${volumeId}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Check for rate limit (429)
      if (response.status === 429) {
        console.warn('[GoogleBooksService] Rate limited (429), falling back to OpenLibrary');
        throw new RateLimitError();
      }
      throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
    }

    const volume: GoogleBooksVolume = await response.json();
    return this.processVolume(volume, {});
  }

  /**
   * Process a Google Books volume into our BookMatch format
   */
  private processVolume(
    volume: GoogleBooksVolume,
    searchOptions: GoogleBooksSearchOptions
  ): BookMatch | null {
    const info = volume.volumeInfo;

    // Must have at least a title
    if (!info.title) {
      return null;
    }

    const { isbn, isbn13 } = extractISBN(info.industryIdentifiers);

    return {
      id: volume.id,
      title: info.title,
      authors: info.authors || [],
      isbn,
      isbn13,
      coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:'),
      description: info.description,
      genres: info.categories,
      publicationYear: extractYear(info.publishedDate),
      pageCount: info.pageCount,
      publisher: info.publisher,
      language: info.language,
      previewLink: info.previewLink,
      confidence: calculateConfidence(volume, searchOptions),
    };
  }
}

// Singleton instance
export const googleBooksService = new GoogleBooksService();
