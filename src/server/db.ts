import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Create database connection
const dbPath = process.env.DATABASE_URL || "file:../../data/biblio.db";
const connectionString = dbPath.replace("file:", "");

// Ensure data directory exists
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
const dbDir = dirname(connectionString);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create SQLite connection
const sqlite = new Database(connectionString);

// Enable foreign keys
sqlite.pragma("foreign_keys = ON");

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Export for direct access if needed
export { sqlite };
