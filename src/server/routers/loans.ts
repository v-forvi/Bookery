import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { loans, books } from "../schema";
import { eq, and, desc, like, or, isNull } from "drizzle-orm";
import { dateValidationService } from "../services/date-validation.service";

// Validation schemas
const loanOutInput = z.object({
  bookId: z.number(),
  personName: z.string().min(1, "Person name is required"),
  loanDate: dateValidationService.loanDateSchema,
  notes: z.string().optional(),
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
      const { bookId, personName, loanDate, notes } = input;

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
});
