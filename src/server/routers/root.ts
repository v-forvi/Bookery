import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { books, settings } from "../schema";
import { eq, desc, like, or } from "drizzle-orm";
import { visionService } from "../services/vision.service";
import { googleBooksService } from "../services/google-books.service";
import { metadataEnrichmentService } from "../services/metadata-enrichment.service";
import { conceptExtractionService } from "../services/concept-extraction.service";

// Import Phase 1 routers
import { conceptsRouter } from "./concepts";
import { graphRouter } from "./graph";

// Import lending feature router
import { loansRouter } from "./loans";

// Books router
export const booksRouter = router({
  // List all books with pagination and filtering
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(5000).default(5000),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        genre: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.db.select().from(books).$dynamic();

      // Search by title or author
      if (input.search) {
        query = query.where(
          or(
            like(books.title, `%${input.search}%`),
            like(books.author, `%${input.search}%`)
          )
        );
      }

      // Order by most recently added
      const results = await query
        .orderBy(desc(books.dateAdded))
        .limit(input.limit)
        .offset(input.offset);

      // Parse genres from JSON string
      return results.map((book) => ({
        ...book,
        genres: book.genres ? JSON.parse(book.genres) : [],
      }));
    }),

  // Get single book by ID
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [book] = await ctx.db
        .select()
        .from(books)
        .where(eq(books.id, input.id))
        .limit(1);

      if (!book) {
        throw new Error("Book not found");
      }

      return {
        ...book,
        genres: book.genres ? JSON.parse(book.genres) : [],
      };
    }),

  // Scan preview: extract book info from photo and enrich with metadata
  scanPreview: publicProcedure
    .input(z.object({ imageData: z.string() }))
    .mutation(async ({ input }) => {
      const result = await visionService.extractSingleBook(input.imageData, true);

      // Use full fallback chain for metadata enrichment
      if (result.title) {
        try {
          const metadata = await metadataEnrichmentService.enrich(
            result.title,
            result.author || undefined,
            'claude' // prefer Claude for AI fallback
          );

          return {
            ...result,
            coverUrl: metadata.coverUrl,
            description: metadata.description,
            genres: metadata.genres,
            pageCount: metadata.pageCount,
            publisher: metadata.publisher,
            publicationYear: metadata.publicationYear,
            source: metadata.source,
          };
        } catch (e) {
          console.warn("Metadata enrichment failed:", e);
        }
      }

      return result;
    }),

  // Add a new book
  add: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        author: z.string().min(1),
        isbn: z.string().optional(),
        isbn13: z.string().optional(),
        coverUrl: z.string().optional(),
        description: z.string().optional(),
        genres: z.array(z.string()).optional(),
        publicationYear: z.number().int().min(-1000).max(2100).optional(),
        pageCount: z.number().int().positive().optional(),
        publisher: z.string().optional(),
        language: z.string().length(2).default("en"),
        source: z.enum(["google_books", "openlibrary", "manual"]),
        externalId: z.string().optional(),
        // Lending feature: ownership fields
        ownership: z.enum(['owned', 'borrowed']).default('owned'),
        borrowedFrom: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ownership, borrowedFrom, genres, ...rest } = input;

      if (ownership === 'borrowed' && !borrowedFrom) {
        throw new Error("borrowedFrom is required when ownership is 'borrowed'");
      }

      const [book] = await ctx.db
        .insert(books)
        .values({
          ...rest,
          genres: genres ? JSON.stringify(genres) : null,
          ownership,
          borrowedFrom: ownership === 'borrowed' ? borrowedFrom : null,
          status: ownership === 'borrowed' ? 'borrowed' : 'available',
        })
        .returning();

      return {
        ...book,
        genres: book.genres ? JSON.parse(book.genres) : [],
      };
    }),

  // Update existing book
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        author: z.string().min(1).optional(),
        isbn: z.string().optional(),
        isbn13: z.string().optional(),
        coverUrl: z.string().url().optional(),
        description: z.string().optional(),
        genres: z.array(z.string()).optional(),
        publicationYear: z.number().int().min(-1000).max(2100).optional(),
        pageCount: z.number().int().positive().optional(),
        publisher: z.string().optional(),
        language: z.string().length(2).optional(),
        source: z.enum(["google_books", "openlibrary", "manual"]).optional(),
        externalId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [book] = await ctx.db
        .update(books)
        .set({
          ...updateData,
          genres: updateData.genres ? JSON.stringify(updateData.genres) : undefined,
          lastModified: new Date().toISOString(),
        })
        .where(eq(books.id, id))
        .returning();

      if (!book) {
        throw new Error("Book not found");
      }

      return {
        ...book,
        genres: book.genres ? JSON.parse(book.genres) : [],
      };
    }),

  // Delete book
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [book] = await ctx.db
        .delete(books)
        .where(eq(books.id, input.id))
        .returning();

      if (!book) {
        throw new Error("Book not found");
      }

      return { success: true, deletedId: book.id };
    }),

  // Export catalog
  export: publicProcedure
    .input(z.object({ format: z.enum(["csv", "json"]) }))
    .query(async ({ ctx, input }) => {
      const allBooks = await ctx.db.select().from(books);

      const booksWithParsedGenres = allBooks.map((book) => ({
        ...book,
        genres: book.genres ? JSON.parse(book.genres) : [],
      }));

      if (input.format === "json") {
        return {
          format: "json",
          data: JSON.stringify(booksWithParsedGenres, null, 2),
          filename: `biblio-export-${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      // CSV format
      const headers = [
        "id",
        "title",
        "author",
        "isbn",
        "isbn13",
        "description",
        "genres",
        "publicationYear",
        "pageCount",
        "publisher",
        "language",
        "source",
        "dateAdded",
      ];

      const rows = booksWithParsedGenres.map((book) => [
        book.id,
        `"${(book.title || "").replace(/"/g, '""')}"`,
        `"${(book.author || "").replace(/"/g, '""')}"`,
        book.isbn || "",
        book.isbn13 || "",
        `"${(book.description || "").replace(/"/g, '""')}"`,
        `"${(book.genres || []).join(";")}"`,
        book.publicationYear || "",
        book.pageCount || "",
        `"${(book.publisher || "").replace(/"/g, '""')}"`,
        book.language || "",
        book.source || "",
        book.dateAdded || "",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return {
        format: "csv",
        data: csv,
        filename: `biblio-export-${new Date().toISOString().split("T")[0]}.csv`,
      };
    }),

  // Import catalog
  import: publicProcedure
    .input(
      z.object({
        format: z.enum(["csv", "json"]),
        data: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let booksToImport: any[] = [];

      if (input.format === "json") {
        booksToImport = JSON.parse(input.data);
      } else {
        // Simple CSV parsing
        const lines = input.data.split("\n");
        const headers = lines[0].split(",");

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
          if (values) {
            const book: any = {};
            headers.forEach((header, index) => {
              let value = values[index] || "";
              value = value.replace(/^"|"$/g, "").replace(/""/g, '"');
              book[header] = value;
            });
            booksToImport.push(book);
          }
        }
      }

      let added = 0;
      let skipped = 0;

      for (const bookData of booksToImport) {
        // Check if book exists (by ISBN or title+author)
        const existing = await ctx.db
          .select()
          .from(books)
          .where(
            or(
              bookData.isbn ? eq(books.isbn, bookData.isbn) : undefined,
              eq(books.title, bookData.title)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        await ctx.db.insert(books).values({
          title: bookData.title,
          author: bookData.author,
          isbn: bookData.isbn,
          isbn13: bookData.isbn13,
          coverUrl: bookData.coverUrl,
          description: bookData.description,
          genres: Array.isArray(bookData.genres)
            ? JSON.stringify(bookData.genres)
            : bookData.genres || null,
          publicationYear: bookData.publicationYear
            ? parseInt(bookData.publicationYear)
            : null,
          pageCount: bookData.pageCount ? parseInt(bookData.pageCount) : null,
          publisher: bookData.publisher,
          language: bookData.language || "en",
          source: bookData.source || "manual",
          externalId: bookData.externalId,
        });

        added++;
      }

      return { added, skipped };
    }),

  // Search Google Books API for external metadata
  searchExternal: publicProcedure
    .input(
      z.object({
        title: z.string().optional(),
        author: z.string().optional(),
        isbn: z.string().optional(),
        maxResults: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ input }) => {
      // At least one search parameter required
      if (!input.title && !input.author && !input.isbn) {
        throw new Error("At least one search parameter (title, author, or isbn) is required");
      }

      const results = await googleBooksService.search({
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        maxResults: input.maxResults,
      });

      return results;
    }),

  // Get a book from Google Books by volume ID
  getExternalById: publicProcedure
    .input(z.object({ volumeId: z.string() }))
    .query(async ({ input }) => {
      const result = await googleBooksService.getById(input.volumeId);
      return result;
    }),

  // Update reading status
  updateStatus: publicProcedure
    .input(z.object({
      bookId: z.number(),
      status: z.enum(["unread", "reading", "paused", "completed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(books)
        .set({
          // @ts-ignore - readingStatus is a Phase 1 column
          readingStatus: input.status,
          lastModified: new Date().toISOString(),
        })
        .where(eq(books.id, input.bookId))
        .returning();

      if (!updated) {
        throw new Error("Book not found");
      }

      return updated;
    }),

  // Add to library with intent
  addToLibrary: publicProcedure
    .input(z.object({
      book: z.object({
        title: z.string(),
        author: z.string(),
        isbn: z.string().optional(),
        coverUrl: z.string().optional(),
        description: z.string().optional(),
        genres: z.array(z.string()).optional(),
        pageCount: z.number().optional(),
        publisher: z.string().optional(),
        publicationYear: z.number().optional(),
      }),
      intent: z.enum(["add", "loaned", "testing"]),
      lenderName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { book, intent, lenderName } = input;

      const data: any = {
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        coverUrl: book.coverUrl,
        description: book.description,
        genres: book.genres ? JSON.stringify(book.genres) : null,
        pageCount: book.pageCount,
        publisher: book.publisher,
        publicationYear: book.publicationYear,
        source: "manual",
        // @ts-ignore - readingStatus is a Phase 1 column
        readingStatus: "unread",
      };

      // @ts-ignore - owner is a Phase 1 column
      if (intent === "loaned" && lenderName) {
        data.owner = lenderName;
      } else {
        data.owner = "me";
      }

      const [inserted] = await ctx.db
        .insert(books)
        .values(data)
        .returning();

      // If not "testing", trigger concept extraction
      if (intent !== "testing") {
        // Queue extraction (fire and forget for now)
        conceptExtractionService.extractFromBook(inserted.id).catch(console.error);
      }

      return inserted;
    }),

  // Batch add books from shelf photo
  batchAddFromShelf: publicProcedure
    .input(z.object({
      imageData: z.string(),
      preferClaude: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Extract books from image
      const extractResult = await visionService.extractFromShelfPhoto(
        input.imageData,
        input.preferClaude
      );

      const added: any[] = [];
      const skipped: any[] = [];
      const errors: any[] = [];

      // Process each extracted book
      for (const extractedBook of extractResult.books) {
        if (!extractedBook.title) {
          errors.push({
            reason: "no_title",
            book: extractedBook,
          });
          continue;
        }

        try {
          // Enrich metadata using full fallback chain:
          // 1. Google Books (free, no key)
          // 2. OpenLibrary (free, no key)
          // 3. AI Web Search (uses configured API keys)
          const metadata = await metadataEnrichmentService.enrich(
            extractedBook.title,
            extractedBook.author || undefined,
            input.preferClaude ? 'claude' : undefined
          );

          // Check if book already exists (by title+author or isbn)
          const existing = await ctx.db
            .select()
            .from(books)
            .where(
              or(
                metadata.isbn ? eq(books.isbn, metadata.isbn) : undefined,
                eq(books.title, metadata.title)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            skipped.push({
              title: metadata.title,
              author: metadata.author,
              reason: "already_exists",
            });
            continue;
          }

          // Prepare book data
          const bookData: any = {
            title: metadata.title,
            author: metadata.author,
            isbn: metadata.isbn,
            coverUrl: metadata.coverUrl,
            description: metadata.description,
            genres: metadata.genres ? JSON.stringify(metadata.genres) : null,
            pageCount: metadata.pageCount,
            publisher: metadata.publisher,
            publicationYear: metadata.publicationYear,
            source: metadata.source === 'vision_only' ? 'manual' : metadata.source,
            // @ts-ignore - readingStatus is a Phase 1 column
            readingStatus: "unread",
            // @ts-ignore - owner is a Phase 1 column
            owner: "me",
          };

          const [inserted] = await ctx.db
            .insert(books)
            .values(bookData)
            .returning();

          added.push({
            ...inserted,
            genres: inserted.genres ? JSON.parse(inserted.genres) : [],
          });
        } catch (error: any) {
          errors.push({
            title: extractedBook.title,
            author: extractedBook.author,
            reason: error.message || "insert_failed",
          });
        }
      }

      return {
        added,
        skipped,
        errors,
        totalExtracted: extractResult.books.length,
        apiUsed: extractResult.apiUsed,
        processingTimeMs: extractResult.processingTimeMs,
      };
    }),
});

// Settings router
export const settingsRouter = router({
  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const [setting] = await ctx.db
        .select()
        .from(settings)
        .where(eq(settings.key, input.key))
        .limit(1);

      return setting?.value || null;
    }),

  set: publicProcedure
    .input(
      z.object({
        key: z.enum([
          "claude_api_key",
          "gemini_api_key",
          "glm_api_key",
          "preferred_vision_api",
          "preferred_concept_api", // NEW: Allow choosing concept extraction API
        ]),
        value: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [setting] = await ctx.db
        .insert(settings)
        .values({
          key: input.key,
          value: input.value,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: input.value,
            lastModified: new Date().toISOString(),
          },
        })
        .returning();

      return setting;
    }),

  delete: publicProcedure
    .input(
      z.object({
        key: z.enum([
          "claude_api_key",
          "gemini_api_key",
          "glm_api_key",
          "preferred_vision_api",
          "preferred_concept_api", // NEW: Allow deleting concept API preference
        ])
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(settings).where(eq(settings.key, input.key));
      return { success: true };
    }),
});

// Vision router
export const visionRouter = router({
  // Extract multiple books from a shelf photo
  extractFromShelf: publicProcedure
    .input(
      z.object({
        imageData: z.string(), // base64 encoded image
        preferClaude: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const result = await visionService.extractFromShelfPhoto(
        input.imageData,
        input.preferClaude
      );
      return result;
    }),

  // Extract a single book from an image
  extractSingleBook: publicProcedure
    .input(
      z.object({
        imageData: z.string(), // base64 encoded image
        preferClaude: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const result = await visionService.extractSingleBook(
        input.imageData,
        input.preferClaude
      );
      return result;
    }),
});

// Root router
export const appRouter = router({
  books: booksRouter,
  settings: settingsRouter,
  vision: visionRouter,
  // Phase 1 routers
  concepts: conceptsRouter,
  graph: graphRouter,
  // Lending feature router
  loans: loansRouter,
});

export type AppRouter = typeof appRouter;
