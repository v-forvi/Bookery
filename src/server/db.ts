import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// For ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the database - use public folder directly
// This works for self-hosting and local development
const dbPath = join(__dirname, "../../public/biblio.db");

console.log("Database path:", dbPath);

// Verify database exists
if (!existsSync(dbPath)) {
  console.warn("⚠️  Database file not found:", dbPath);
  console.warn("   Books may not appear until the database is created.");
}

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma("foreign_keys = ON");

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Flag to ensure we only initialize once
let initialized = false;

// Initialize database on first request
export async function ensureInitialized() {
  if (initialized) return;

  try {
    // Ensure patrons table exists
    try {
      sqlite.prepare("SELECT 1 FROM patrons LIMIT 1").get();
    } catch (err) {
      console.log("Creating patrons table...");
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS patrons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER NOT NULL UNIQUE,
          telegram_username TEXT,
          full_name TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          date_registered TEXT NOT NULL,
          is_librarian INTEGER DEFAULT 0 NOT NULL
        )
      `);
    }

    // Log book count
    const booksCount = sqlite.prepare("SELECT COUNT(*) as count FROM books").get() as { count: number } | undefined;
    const patronsCount = sqlite.prepare("SELECT COUNT(*) as count FROM patrons").get() as { count: number } | undefined;
    console.log("📚 Database initialized:", {
      books: booksCount?.count ?? 0,
      patrons: patronsCount?.count ?? 0,
    });

    initialized = true;
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Initialize immediately
ensureInitialized().catch(console.error);

// Export for direct access if needed
export { sqlite };
