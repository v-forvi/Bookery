import { db } from '../src/server/db';
import { sql } from 'drizzle-orm';

async function main() {
  // Get table info using better-sqlite3
  const tableInfo = await db.all(sql`PRAGMA table_info(books)`);
  console.log('Books table columns:');
  tableInfo.forEach((row: any) => {
    console.log(`- ${row.name} (${row.type})`);
  });

  // Check if reading_status exists
  const hasReadingStatus = tableInfo.some((row: any) => row.name === 'reading_status');
  console.log(`\nreading_status column exists: ${hasReadingStatus}`);

  // Count books
  const countResult = await db.get(sql`SELECT COUNT(*) as count FROM books`);
  console.log(`\nTotal books: ${countResult?.count}`);
}

main().catch(console.error);
