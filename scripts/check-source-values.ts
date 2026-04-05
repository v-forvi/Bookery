import { db } from '../src/server/db';
import { books } from '../src/server/schema';
import { sql } from 'drizzle-orm';

async function main() {
  // Check unique source values
  const result = await db.all(sql`SELECT DISTINCT source, COUNT(*) as count FROM books GROUP BY source`);
  console.log('Source values in database:');
  result.forEach((row: any) => {
    console.log(`- "${row.source}": ${row.count} books`);
  });

  // Check for any NULL sources
  const nullSources = await db.get(sql`SELECT COUNT(*) as count FROM books WHERE source IS NULL`);
  console.log(`\nNULL sources: ${nullSources?.count}`);

  // Try to fetch one book to see the structure
  const oneBook = await db.select().from(books).limit(1);
  console.log('\nSample book structure:', JSON.stringify(oneBook[0], null, 2));
}

main().catch(console.error);
