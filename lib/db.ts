import Dexie, { Table } from 'dexie';
import type { Book } from '@/types';

export class BiblioDatabase extends Dexie {
  books!: Table<Book>;

  constructor() {
    super('BiblioDB');
    this.version(1).stores({
      books: '++id, title, author, isbn, genres, source, dateAdded, lastModified'
    });
  }
}

export const db = new BiblioDatabase();

// Book operations
export const bookOps = {
  async addBook(book: Omit<Book, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    const newBook: Book = {
      ...book,
      id,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    await db.books.add(newBook);
    return id;
  },

  async getBooks(): Promise<Book[]> {
    return await db.books.toArray();
  },

  async getBook(id: string): Promise<Book | undefined> {
    return await db.books.get(id);
  },

  async updateBook(id: string, updates: Partial<Omit<Book, 'id'>>): Promise<void> {
    await db.books.update(id, {
      ...updates,
      lastModified: new Date().toISOString()
    });
  },

  async deleteBook(id: string): Promise<void> {
    await db.books.delete(id);
  },

  async searchBooks(query: string): Promise<Book[]> {
    const lowerQuery = query.toLowerCase();
    return await db.books
      .filter(book =>
        book.title.toLowerCase().includes(lowerQuery) ||
        book.author.toLowerCase().includes(lowerQuery)
      )
      .toArray();
  },

  async exportToJSON(): Promise<string> {
    const books = await db.books.toArray();
    return JSON.stringify(books, null, 2);
  },

  async importFromJSON(json: string): Promise<number> {
    const books = JSON.parse(json) as Book[];
    await db.books.bulkAdd(books);
    return books.length;
  },

  async findDuplicates(book: Book): Promise<Book[]> {
    const books = await db.books.toArray();
    const titleLower = book.title.toLowerCase();
    const authorLower = book.author.toLowerCase();

    return books.filter(existing => {
      const existingTitleLower = existing.title.toLowerCase();
      const existingAuthorLower = existing.author.toLowerCase();

      // Simple fuzzy match - Levenshtein distance < 3
      const titleDistance = levenshteinDistance(existingTitleLower, titleLower);
      const authorDistance = levenshteinDistance(existingAuthorLower, authorLower);

      return titleDistance < 3 && authorDistance < 3;
    });
  }
};

// Simple Levenshtein distance implementation
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  let i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  let j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
