import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { loans, books } from "../schema";
import { eq, and, desc, like, or, isNull, isNotNull, sql } from "drizzle-orm";
import { dateValidationService } from "../services/date-validation.service";

// Validation schemas
const loanOutInput = z.object({
  bookId: z.number(),
  personName: z.string().min(1, "Person name is required"),
  loanDate: dateValidationService.loanDateSchema,
  notes: z.string().optional(),
  borrowerId: z.number().optional(), // Patron ID (for Mini App loans)
});

const returnLoanInput = z.object({
  bookId: z.number(),
  returnDate: dateValidationService.returnDateSchema,
  returnNotes: z.string().optional(),
});

export const loansRouter = router({
  // Loan out a book to someone
  loanOut: publicProcedure
    .input(loanOutInput)
    .mutation(async ({ ctx, input }) => {
      const { bookId, personName, loanDate, notes, borrowerId } = input;

      // Validate date is not in future
      if (!dateValidationService.isNotInFuture(loanDate)) {
        throw new Error("Loan date cannot be in the future");
      }

      // Check book exists
      const book = await ctx.db.select().from(books).where(eq(books.id, bookId)).get();
      if (!book) {
        throw new Error("Book not found");
      }

      // Check book is owned (not borrowed)
      if (book.ownership === 'borrowed') {
        throw new Error("Cannot loan out a borrowed book");
      }

      // Check book is not already on loan
      const existingLoan = await ctx.db
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.bookId, bookId),
            eq(loans.loanType, 'out'),
            isNull(loans.returnDate)
          )
        )
        .orderBy(desc(loans.createdAt))
        .limit(1)
        .then(rows => rows[0]);

      if (existingLoan) {
        throw new Error(`Book is already on loan to ${existingLoan.personName}`);
      }

      // Normalize person name
      const personNameNormalized = personName.toLowerCase().trim();

      // Create loan record
      const [newLoan] = await ctx.db
        .insert(loans)
        .values({
          bookId,
          loanType: 'out',
          personName,
          personNameNormalized,
          borrowerId,
          loanDate,
          notes,
        })
        .returning();

      // Update book status
      await ctx.db
        .update(books)
        .set({ status: 'on_loan' })
        .where(eq(books.id, bookId));

      return {
        loan: newLoan,
        book: { ...book, status: 'on_loan' as const },
      };
    }),

  // Return a loaned book
  returnLoan: publicProcedure
    .input(returnLoanInput)
    .mutation(async ({ ctx, input }) => {
      const { bookId, returnDate, returnNotes } = input;

      // Validate date is not in future
      if (!dateValidationService.isNotInFuture(returnDate)) {
        throw new Error("Return date cannot be in the future");
      }

      // Find active loan for this book
      const activeLoan = await ctx.db
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.bookId, bookId),
            eq(loans.loanType, 'out'),
            isNull(loans.returnDate)
          )
        )
        .orderBy(desc(loans.createdAt))
        .limit(1)
        .then(rows => rows[0]);

      if (!activeLoan) {
        const book = await ctx.db.select().from(books).where(eq(books.id, bookId)).get();
        if (!book) {
          throw new Error("Book not found");
        }
        throw new Error("No active loan found for this book");
      }

      // Validate return date is on or after loan date
      if (!dateValidationService.isValidReturnDate(activeLoan.loanDate, returnDate)) {
        throw new Error("Return date cannot be before loan date");
      }

      // Update loan record
      const [updatedLoan] = await ctx.db
        .update(loans)
        .set({
          returnDate,
          returnNotes
        })
        .where(eq(loans.id, activeLoan.id))
        .returning();

      // Update book status back to available
      await ctx.db
        .update(books)
        .set({ status: 'available' })
        .where(eq(books.id, bookId));

      const book = await ctx.db.select().from(books).where(eq(books.id, bookId)).get();

      return {
        loan: updatedLoan,
        book,
      };
    }),

  // Add a borrowed book to library
  borrowIn: publicProcedure
    .input(z.object({
      bookData: z.object({
        title: z.string(),
        author: z.string(),
        isbn: z.string().optional(),
        coverUrl: z.string().optional(),
        description: z.string().optional(),
        genres: z.array(z.string()).optional(),
      }),
      borrowedFrom: z.string().min(1, "Owner name is required"),
      dateBorrowed: dateValidationService.loanDateSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { bookData, borrowedFrom, dateBorrowed } = input;

      // Validate date is not in future
      if (!dateValidationService.isNotInFuture(dateBorrowed)) {
        throw new Error("Borrowed date cannot be in the future");
      }

      // Create book record
      const [newBook] = await ctx.db
        .insert(books)
        .values({
          title: bookData.title,
          author: bookData.author,
          isbn: bookData.isbn,
          coverUrl: bookData.coverUrl,
          description: bookData.description,
          genres: bookData.genres ? JSON.stringify(bookData.genres) : null,
          ownership: 'borrowed',
          status: 'borrowed',
          borrowedFrom,
          source: 'manual',
          dateAdded: sql`CURRENT_TIMESTAMP`,
        })
        .returning();

      // Create loan record (type 'in')
      await ctx.db.insert(loans).values({
        bookId: newBook.id,
        loanType: 'in',
        personName: borrowedFrom,
        personNameNormalized: borrowedFrom.toLowerCase().trim(),
        loanDate: dateBorrowed,
      });

      return {
        book: newBook,
      };
    }),

  // Get active loan for a book (returns null if no active loan)
  getActiveLoanForBook: publicProcedure
    .input(z.object({
      bookId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { bookId } = input;

      const activeLoan = await ctx.db
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.bookId, bookId),
            eq(loans.loanType, 'out'),
            isNull(loans.returnDate)
          )
        )
        .orderBy(desc(loans.createdAt))
        .limit(1)
        .then(rows => rows[0]);

      return activeLoan ?? null;
    }),

  // Get loan history for a book
  getHistory: publicProcedure
    .input(z.object({
      bookId: z.number(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { bookId, limit, offset } = input;

      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(loans)
        .where(eq(loans.bookId, bookId));

      const loanHistory = await ctx.db
        .select()
        .from(loans)
        .where(eq(loans.bookId, bookId))
        .orderBy(desc(loans.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        loans: loanHistory,
        total: count,
      };
    }),

  // Get all active loans
  getActive: publicProcedure
    .query(async ({ ctx }) => {
      const loansOut = await ctx.db
        .select({
          loan: loans,
          book: books,
        })
        .from(loans)
        .innerJoin(books, eq(loans.bookId, books.id))
        .where(
          and(
            eq(loans.loanType, 'out'),
            isNull(loans.returnDate)
          )
        )
        .orderBy(desc(loans.createdAt));

      const loansIn = await ctx.db
        .select({
          loan: loans,
          book: books,
        })
        .from(loans)
        .innerJoin(books, eq(loans.bookId, books.id))
        .where(
          and(
            eq(loans.loanType, 'in'),
            isNull(loans.returnDate)
          )
        )
        .orderBy(desc(loans.createdAt));

      return {
        loansOut,
        loansIn,
        total: loansOut.length + loansIn.length,
      };
    }),

  // Get archived borrowed books
  getArchive: publicProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { limit, offset } = input;

      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(books)
        .where(
          and(
            eq(books.ownership, 'borrowed'),
            isNotNull(books.archivedAt)
          )
        );

      const archivedBooks = await ctx.db
        .select()
        .from(books)
        .where(
          and(
            eq(books.ownership, 'borrowed'),
            isNotNull(books.archivedAt)
          )
        )
        .orderBy(desc(books.archivedAt))
        .limit(limit)
        .offset(offset);

      return {
        books: archivedBooks.map(book => ({
          ...book,
          genres: book.genres ? JSON.parse(book.genres) : [],
        })),
        total: count,
      };
    }),

  // Search books by title or author
  searchBook: publicProcedure
    .input(z.object({
      query: z.string().min(2, "Search query must be at least 2 characters"),
    }))
    .query(async ({ ctx, input }) => {
      const { query } = input;

      const results = await ctx.db
        .select()
        .from(books)
        .where(
          and(
            or(
              like(books.title, `%${query}%`),
              like(books.author, `%${query}%`)
            ),
            isNull(books.archivedAt)
          )
        )
        .orderBy(desc(books.dateAdded))
        .limit(20);

      return results.map(book => ({
        ...book,
        genres: book.genres ? JSON.parse(book.genres) : [],
      }));
    }),
});
