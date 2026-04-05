import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// For ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine database paths
const isVercel = !!process.env.VERCEL_ENV || process.env.NODE_ENV === "production";

// Path to the bundled seed database (read-only in production)
const seedDbPath = join(__dirname, "../../public/biblio.db");

// Path to the writable database
// In production, use /tmp (writable)
// In development, use the public database directly for simplicity
const activeDbPath = isVercel ? "/tmp/biblio.db" : seedDbPath;

console.log("Database config:", { isVercel, seedDbPath, activeDbPath });

// Ensure /tmp exists for production
if (isVercel && !existsSync("/tmp")) {
  mkdirSync("/tmp", { recursive: true });
}

// Flag to ensure we only initialize once
let initialized = false;

// Create SQLite connection (will be replaced after seeding in production)
let sqlite = new Database(activeDbPath);

// Enable foreign keys
sqlite.pragma("foreign_keys = ON");

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Initialize database on first request
export async function ensureInitialized() {
  if (initialized) return;

  try {
    // In production, seed from bundled database if needed
    if (isVercel) {
      const booksCount = sqlite.prepare("SELECT COUNT(*) as count FROM books").get() as { count: number } | undefined;

      // If no books and seed exists, copy seed database
      if (!booksCount || booksCount.count === 0) {
        if (existsSync(seedDbPath)) {
          console.log("Production database empty, seeding from bundled database...");

          // Close existing connection
          sqlite.close();

          // Copy the seed database file to /tmp
          const seedData = readFileSync(seedDbPath);
          writeFileSync(activeDbPath, seedData);

          // Reconnect to the new database
          sqlite = new Database(activeDbPath);
          sqlite.pragma("foreign_keys = ON");

          // Update the drizzle instance with new connection
          Object.assign(db, drizzle(sqlite, { schema }));

          console.log("Database seeded successfully!");
        } else {
          console.warn("Seed database not found at:", seedDbPath);
        }
      }
    }

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

    // Log final book count
    const finalCount = sqlite.prepare("SELECT COUNT(*) as count FROM books").get() as { count: number };
    console.log("Database initialized with", finalCount?.count ?? 0, "books");

    initialized = true;
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Run initialization when module is imported (for server startup)
// In production, this happens on first request
if (isVercel) {
  // Delay initialization until first API request in production
  console.log("Vercel environment - database will initialize on first request");
} else {
  // Initialize immediately in development
  ensureInitialized().catch(console.error);
}

// Export for direct access if needed
export { sqlite };
