import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Create database connection
// On Vercel/serverless, use /tmp for writable storage
// Default to /tmp/biblio.db for production (Vercel), or use local path for development
const isVercel = process.env.VERCEL_ENV || process.env.NODE_ENV === "production";
const defaultDbPath = isVercel ? "file:/tmp/biblio.db" : "file:../../data/biblio.db";
const dbPath = process.env.DATABASE_URL || defaultDbPath;
const connectionString = dbPath.replace("file:", "");

// Ensure data directory exists
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const dbDir = dirname(connectionString);

// For Vercel/serverless, use /tmp if the path doesn't exist
const writableDir = existsSync(dbDir) ? dbDir : "/tmp";

if (!existsSync(writableDir)) {
  mkdirSync(writableDir, { recursive: true });
}

// Use the writable directory for the database
const finalDbPath = existsSync(dbDir) ? connectionString : `file:/tmp/biblio.db`;

// Create SQLite connection
const sqlite = new Database(finalDbPath);

// Enable foreign keys
sqlite.pragma("foreign_keys = ON");

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Initialize database schema on startup
// This ensures tables exist on Vercel deployments
async function initializeDatabase() {
  // Check if patrons table exists by trying to query it
  try {
    await sqlite.prepare("SELECT 1 FROM patrons LIMIT 1").get();
  } catch (err) {
    // Table doesn't exist, create it
    console.log("Patrons table not found, creating schema...");

    // Create patrons table
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

    console.log("Patrons table created");
  }
}

// Run initialization
initializeDatabase().catch(console.error);

// Export for direct access if needed
export { sqlite };
