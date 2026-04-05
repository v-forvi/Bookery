import { db } from '../src/server/db';
import { books } from '../src/server/schema';

async function main() {
  const allBooks = await db.select().from(books);
  console.log('Books in DB:', allBooks.length);
  allBooks.forEach(b => console.log('-', b.id, b.title, 'by', b.author));
}

main().catch(console.error);
