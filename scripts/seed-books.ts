// scripts/seed-books.ts

import { db } from "../src/server/db";
import { books } from "../src/server/schema";
import { sql, eq } from "drizzle-orm";

const sampleBooks = [
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    isbn: "0374533555",
    description: "A major text on the psychology of judgment and decision-making.",
    genres: JSON.stringify(["Psychology", "Nonfiction", "Science"]),
    pageCount: 499,
    publisher: "Farrar, Straus and Giroux",
    publicationYear: 2011,
    source: "manual" as const,
  },
  {
    title: "The Art of War",
    author: "Sun Tzu",
    isbn: "1599869772",
    description: "Ancient Chinese military treatise on strategy and tactics.",
    genres: JSON.stringify(["Philosophy", "Military", "History"]),
    pageCount: 273,
    publisher: "Classic Edition",
    publicationYear: -500,
    source: "manual" as const,
  },
  {
    title: "Consciousness Explained",
    author: "Daniel Dennett",
    isbn: "0316180661",
    description: "A comprehensive theory of consciousness and the mind.",
    genres: JSON.stringify(["Philosophy", "Cognitive Science", "Psychology"]),
    pageCount: 511,
    publisher: "Little, Brown and Company",
    publicationYear: 1991,
    source: "manual" as const,
  },
  {
    title: "The Selfish Gene",
    author: "Richard Dawkins",
    isbn: "0199291151",
    description: "A book on evolution from the gene-centered view of life.",
    genres: JSON.stringify(["Science", "Biology", "Evolution"]),
    pageCount: 360,
    publisher: "Oxford University Press",
    publicationYear: 1976,
    source: "manual" as const,
  },
  {
    title: "Meditations",
    author: "Marcus Aurelius",
    isbn: "0140449337",
    description: "Personal writings of the Roman Emperor on Stoic philosophy.",
    genres: JSON.stringify(["Philosophy", "Classics", "Stoicism"]),
    pageCount: 254,
    publisher: "Penguin Classics",
    publicationYear: 180,
    source: "manual" as const,
  },
  {
    title: "Gödel, Escher, Bach",
    author: "Douglas Hofstadter",
    isbn: "0465026567",
    description: "A metaphorical fugue on minds and machines in the spirit of Lewis Carroll.",
    genres: JSON.stringify(["Science", "Cognitive Science", "Philosophy"]),
    pageCount: 777,
    publisher: "Basic Books",
    publicationYear: 1979,
    source: "manual" as const,
  },
  {
    title: "The Origin of Consciousness in the Breakdown of the Bicameral Mind",
    author: "Julian Jaynes",
    isbn: "0618057072",
    description: "A controversial theory on the evolution of human consciousness.",
    genres: JSON.stringify(["Psychology", "Anthropology", "Philosophy"]),
    pageCount: 467,
    publisher: "Mariner Books",
    publicationYear: 1976,
    source: "manual" as const,
  },
  {
    title: "Determined",
    author: "Robert Sapolsky",
    isbn: "059308694X",
    description: "A science-based exploration of free will and determinism.",
    genres: JSON.stringify(["Science", "Neuroscience", "Philosophy"]),
    pageCount: 528,
    publisher: "Penguin Press",
    publicationYear: 2023,
    source: "manual" as const,
  },
  {
    title: "The Extended Phenotype",
    author: "Richard Dawkins",
    isbn: "0192880519",
    description: "The long reach of the gene as the unit of selection.",
    genres: JSON.stringify(["Science", "Biology", "Evolution"]),
    pageCount: 320,
    publisher: "Oxford University Press",
    publicationYear: 1982,
    source: "manual" as const,
  },
  {
    title: "Nicomachean Ethics",
    author: "Aristotle",
    isbn: "0140449363",
    description: "Aristotle's seminal work on virtue and character.",
    genres: JSON.stringify(["Philosophy", "Classics", "Ethics"]),
    pageCount: 400,
    publisher: "Penguin Classics",
    publicationYear: -350,
    source: "manual" as const,
  },
];

async function seedBooks() {
  console.log("🌱 Seeding books...");

  try {
    for (const book of sampleBooks) {
      // Check if book already exists
      const [existing] = await db
        .select()
        .from(books)
        .where(sql`isbn = ${book.isbn}`)
        .limit(1);

      if (existing) {
        console.log(`⊙ Skipping "${book.title}" (already exists)`);
        continue;
      }

      await db.insert(books).values(book);
      console.log(`✓ Added "${book.title}"`);
    }

    console.log(`\n✅ Seeding complete! Added ${sampleBooks.length} books.`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run the seed function
seedBooks();
