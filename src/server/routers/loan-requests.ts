/**
 * Loan Requests Router
 *
 * tRPC procedures for managing borrow/return requests from patrons.
 * Part of the no-scan borrowing model.
 */

import { z } from "zod";
import { router } from "../trpc";
import { telegramAuthProcedure, telegramRegisteredProcedure, librarianProcedure } from "../procedures";
import { loanRequestsService } from "../services/loan-requests.service";
import { loans } from "../schema";
import { eq, and, isNull } from "drizzle-orm";

// Validation schemas
const createRequestInput = z.object({
  bookId: z.number(),
  requestType: z.enum(['borrow', 'return']),
  notes: z.string().optional(),
});

const updateRequestInput = z.object({
  requestId: z.number(),
  notes: z.string().optional(),
});

export const loanRequestsRouter = router({
  // Get all pending requests (librarian only)
  getPending: librarianProcedure.query(async ({ ctx }) => {
    return await loanRequestsService.getPendingRequests();
  }),

  // Get requests for current patron
  getMyRequests: telegramRegisteredProcedure.query(async ({ ctx }) => {
    const patronId = ctx.patron!.id;
    return await loanRequestsService.getByPatronId(patronId);
  }),

  // Get active loans for current patron
  getMyActiveLoans: telegramRegisteredProcedure.query(async ({ ctx }) => {
    const patron = ctx.patron!;
    return await loanRequestsService.getActiveLoansForPatron(patron.fullName);
  }),

  // Create a borrow request
  requestBorrow: telegramRegisteredProcedure
    .input(createRequestInput)
    .mutation(async ({ ctx, input }) => {
      const patronId = ctx.patron!.id;

      // Check if patron already has a pending request for this book
      const hasPending = await loanRequestsService.hasPendingRequest(patronId, input.bookId);
      if (hasPending) {
        throw new Error("You already have a pending request for this book");
      }

      // Check if book is available
      const activeLoans = await ctx.db
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.bookId, input.bookId),
            eq(loans.loanType, 'out'),
            isNull(loans.returnDate)
          )
        )
        .limit(1)
        .then(rows => rows[0]);

      if (activeLoans) {
        throw new Error("This book is currently on loan to someone else");
      }

      // Create a loan record first (placeholder until confirmed)
      const [newLoan] = await ctx.db
        .insert(loans)
        .values({
          bookId: input.bookId,
          loanType: 'out',
          personName: ctx.patron!.fullName,
          personNameNormalized: ctx.patron!.fullName.toLowerCase().trim(),
          loanDate: new Date().toISOString().split('T')[0], // Today's date
        })
        .returning();

      // Create the request
      const request = await loanRequestsService.create({
        loanId: newLoan.id,
        requestType: 'borrow',
        initiatedBy: 'patron',
        initiatorId: patronId,
        notes: input.notes,
      });

      return { request, loan: newLoan };
    }),

  // Create a return request
  requestReturn: telegramRegisteredProcedure
    .input(updateRequestInput)
    .mutation(async ({ ctx, input }) => {
      const patron = ctx.patron!;

      // Find active loan for this patron and book
      // For return, we need to find the loan by book and patron name
      // The input should include the bookId to identify which loan to return
      // Actually, let's modify the input for return requests

      throw new Error("Return requests should reference a specific loan - use requestReturnByLoanId instead");
    }),

  // Request return for a specific loan (by loan ID)
  requestReturnByLoanId: telegramRegisteredProcedure
    .input(z.object({
      loanId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const patronId = ctx.patron!.id;

      // Verify this loan belongs to this patron (person_name matches)
      const loan = await ctx.db
        .select()
        .from(loans)
        .where(eq(loans.id, input.loanId))
        .limit(1)
        .then(rows => rows[0]);

      if (!loan) {
        throw new Error("Loan not found");
      }

      if (loan.personNameNormalized !== ctx.patron!.fullName.toLowerCase().trim()) {
        throw new Error("This loan is not associated with your account");
      }

      // Check if already has pending return request
      const existingRequests = await loanRequestsService.getByPatronId(patronId);
      const hasPendingReturn = existingRequests.some(
        r => r.request.loanId === input.loanId &&
             r.request.requestType === 'return' &&
             r.request.status === 'pending'
      );

      if (hasPendingReturn) {
        throw new Error("You already have a pending return request for this book");
      }

      // Create the return request
      const request = await loanRequestsService.create({
        loanId: input.loanId,
        requestType: 'return',
        initiatedBy: 'patron',
        initiatorId: patronId,
        notes: input.notes,
      });

      return { request, loan };
    }),

  // Confirm a request (librarian only)
  confirm: librarianProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const librarianId = ctx.patron!.id;

      // Get request details
      const requestDetails = await loanRequestsService.getById(input.requestId);
      if (!requestDetails) {
        throw new Error("Request not found");
      }

      if (requestDetails.request.status !== 'pending') {
        throw new Error("Request is not pending");
      }

      // Confirm the request
      const confirmed = await loanRequestsService.confirm(input.requestId, librarianId);

      // If it's a borrow request, the book status should already be set when loan was created
      // If it's a return request, we need to update the loan return date and book status
      if (requestDetails.request.requestType === 'return' && requestDetails.loan) {
        const returnDate = new Date().toISOString().split('T')[0];
        await ctx.db
          .update(loans)
          .set({
            returnDate,
            returnNotes: `Returned via request #${input.requestId}`,
          })
          .where(eq(loans.id, requestDetails.loan.id));

        // Update book status back to available
        const { books } = await import("../schema");
        await ctx.db
          .update(books)
          .set({ status: 'available' })
          .where(eq(books.id, requestDetails.loan.bookId));
      }

      return confirmed;
    }),

  // Reject a request (librarian only)
  reject: librarianProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const requestDetails = await loanRequestsService.getById(input.requestId);
      if (!requestDetails) {
        throw new Error("Request not found");
      }

      if (requestDetails.request.status !== 'pending') {
        throw new Error("Request is not pending");
      }

      // Reject the request
      const rejected = await loanRequestsService.reject(input.requestId);

      // If it was a borrow request, we should delete the placeholder loan
      if (requestDetails.request.requestType === 'borrow' && requestDetails.loan) {
        await ctx.db
          .delete(loans)
          .where(eq(loans.id, requestDetails.loan.id));
      }

      return rejected;
    }),

  // Cancel own request (patron only)
  cancel: telegramRegisteredProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const patronId = ctx.patron!.id;

      // Get request details
      const requestDetails = await loanRequestsService.getById(input.requestId);
      if (!requestDetails) {
        throw new Error("Request not found");
      }

      // Verify patron owns this request
      if (requestDetails.request.initiatorId !== patronId) {
        throw new Error("You can only cancel your own requests");
      }

      if (requestDetails.request.status !== 'pending') {
        throw new Error("Can only cancel pending requests");
      }

      // Cancel the request
      const cancelled = await loanRequestsService.cancel(input.requestId);

      // If it was a borrow request, delete the placeholder loan
      if (requestDetails.request.requestType === 'borrow' && requestDetails.loan) {
        await ctx.db
          .delete(loans)
          .where(eq(loans.id, requestDetails.loan.id));
      }

      return cancelled;
    }),
});
