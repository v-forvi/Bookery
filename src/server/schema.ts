import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================
// PRE-PHASE 1 DATA MODEL
// ============================================

// Books: The foundation
export const books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn").unique(),
  isbn13: text("isbn13").unique(),
  coverUrl: text("cover_url"),
  description: text("description"),
  genres: text("genres"), // JSON array string for SQLite
  publicationYear: integer("publication_year"),
  pageCount: integer("page_count"),
  publisher: text("publisher"),
  language: text("language").default("en"),
  source: text("source").notNull(), // 'google_books', 'openlibrary', 'manual'
  externalId: text("external_id"),
  dateAdded: text("date_added").default(sql`CURRENT_TIMESTAMP`),
  lastModified: text("last_modified").default(sql`CURRENT_TIMESTAMP`),
  // === PHASE 1 COLUMNS ===
  readingStatus: text("reading_status").default("unread"), // 'unread' | 'reading' | 'paused' | 'completed'
  owner: text("owner").default("me"), // 'me' or person's name for borrowed books
  lastAnalyzed: text("last_analyzed"), // Timestamp of last concept extraction (NULL = never analyzed)
});

// Settings: Store user API keys and preferences
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  lastModified: text("last_modified").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================
// PHASE 1 DATA MODEL
// ============================================

// Concepts: Extracted themes/topics
export const concepts = sqliteTable("concepts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  domain: text("domain"), // 'psychology', 'philosophy', 'biology', etc.
  description: text("description"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Book Concepts: Junction table with weights
export const bookConcepts = sqliteTable("book_concepts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id")
    .references(() => books.id, { onDelete: "cascade" })
    .notNull(),
  conceptId: integer("concept_id")
    .references(() => concepts.id, { onDelete: "cascade" })
    .notNull(),
  weight: integer("weight").notNull().default(50), // 0-100, confidence/relevance
  extractedAt: text("extracted_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relationships: Book-to-book connections (for future blending)
export const relationships = sqliteTable("relationships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookAId: integer("book_a_id")
    .references(() => books.id, { onDelete: "cascade" })
    .notNull(),
  bookBId: integer("book_b_id")
    .references(() => books.id, { onDelete: "cascade" })
    .notNull(),
  genericSpace: text("generic_space"), // The shared question/theme
  confidence: integer("confidence").default(50), // 0-100, blend strength
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================
// LENDING FEATURE DATA MODEL
// ============================================

// Loans: Track books loaned out and borrowed
export const loans = sqliteTable("loans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id")
    .references(() => books.id, { onDelete: "cascade" })
    .notNull(),
  loanType: text("loan_type").notNull(), // 'out' (loaned to others) or 'in' (borrowed from others)
  personName: text("person_name").notNull(), // Who borrowed the book (out) or who owns it (in)
  personNameNormalized: text("person_name_normalized").notNull(), // Lowercase for search
  loanDate: text("loan_date").notNull(), // YYYY-MM-DD format
  returnDate: text("return_date"), // YYYY-MM-DD format, NULL if not yet returned
  notes: text("notes"), // Optional notes about the loan
  returnNotes: text("return_notes"), // Notes when returning (condition, etc.)
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================
// TYPES
// ============================================

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

// Phase 1 Types
export type Concept = typeof concepts.$inferSelect;
export type NewConcept = typeof concepts.$inferInsert;
export type BookConcept = typeof bookConcepts.$inferSelect;
export type NewBookConcept = typeof bookConcepts.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;

// Lending Feature Types
export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;
