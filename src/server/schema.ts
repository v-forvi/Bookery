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

  // === LENDING FEATURE COLUMNS ===
  ownership: text("ownership").default("owned"), // 'owned' | 'borrowed'
  status: text("status").default("available"), // 'available' | 'on_loan' | 'borrowed'
  borrowedFrom: text("borrowed_from"), // Who owns this book (if borrowed)
  archivedAt: text("archived_at"), // Soft-delete for returned borrowed books
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

// Patrons: Telegram Mini App users
export const patrons = sqliteTable("patrons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramId: integer("telegram_id").notNull().unique(),
  telegramUsername: text("telegram_username"),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  dateRegistered: text("date_registered").notNull(),
  isLibrarian: integer("is_librarian", { mode: "boolean" }).notNull().default(false),
});

// Loans: Track books loaned out and borrowed
export const loans = sqliteTable("loans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id")
    .references(() => books.id, { onDelete: "cascade" })
    .notNull(),
  loanType: text("loan_type").notNull(), // 'out' (loaned to others) or 'in' (borrowed from others)
  personName: text("person_name").notNull(), // Who borrowed the book (out) or who owns it (in)
  personNameNormalized: text("person_name_normalized").notNull(), // Lowercase for search
  borrowerId: integer("borrower_id").references(() => patrons.id, { onDelete: "set null" }), // Patron who borrowed (for Mini App)
  loanDate: text("loan_date").notNull(), // YYYY-MM-DD format
  returnDate: text("return_date"), // YYYY-MM-DD format, NULL if not yet returned
  notes: text("notes"), // Optional notes about the loan
  returnNotes: text("return_notes"), // Notes when returning (condition, etc.)
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Loan Requests: Track borrow/return requests from patrons
export const loanRequests = sqliteTable("loan_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id").references(() => loans.id, { onDelete: "cascade" }).notNull(),
  requestType: text("request_type").notNull(), // 'borrow' or 'return'
  initiatedBy: text("initiated_by").notNull(), // 'patron' or 'librarian'
  initiatorId: integer("initiator_id").references(() => patrons.id, { onDelete: "set null" }), // patron_id
  status: text("status").default("pending"), // 'pending', 'confirmed', 'rejected', 'cancelled'
  requestedAt: text("requested_at").notNull(),
  confirmedAt: text("confirmed_at"),
  confirmedBy: integer("confirmed_by").references(() => patrons.id, { onDelete: "set null" }), // librarian_id
  notes: text("notes"),
});

// Notifications: In-app notifications for patrons
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patronId: integer("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // 'borrow_confirmed', 'return_confirmed', 'loan_reminder', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // Optional link to relevant page
  read: integer("read", { mode: "boolean" }).default(false).notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
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
export type LoanRequest = typeof loanRequests.$inferSelect;
export type NewLoanRequest = typeof loanRequests.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// Telegram Mini App Types
export type Patron = typeof patrons.$inferSelect;
export type NewPatron = typeof patrons.$inferInsert;
