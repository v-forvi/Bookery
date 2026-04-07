/**
 * Loan Requests Service
 *
 * Manages borrow/return requests from patrons.
 * Handles the no-scan borrowing model where patrons request
 * and librarians confirm.
 */

import { eq, and, desc } from "drizzle-orm";
import type { LoanRequest, NewLoanRequest } from "../schema";
import { loanRequests, loans, books } from "../schema";
import { db } from "../db";

export type RequestType = 'borrow' | 'return';
export type RequestStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';
export type InitiatorType = 'patron' | 'librarian';

export interface CreateRequestInput {
  loanId: number;
  requestType: RequestType;
  initiatedBy: InitiatorType;
  initiatorId: number; // patron_id
  notes?: string;
}

export interface UpdateRequestInput {
  status: RequestStatus;
  confirmedBy?: number; // librarian_id when confirming
}

/**
 * Loan Requests Service
 */
export class LoanRequestsService {
  /**
   * Create a new loan request
   */
  async create(input: CreateRequestInput): Promise<LoanRequest> {
    const now = new Date().toISOString();

    const [newRequest] = await db
      .insert(loanRequests)
      .values({
        loanId: input.loanId,
        requestType: input.requestType,
        initiatedBy: input.initiatedBy,
        initiatorId: input.initiatorId,
        status: 'pending',
        requestedAt: now,
        notes: input.notes,
      })
      .returning();

    return newRequest;
  }

  /**
   * Get a request by ID with related loan and book info
   */
  async getById(id: number) {
    const request = await db
      .select()
      .from(loanRequests)
      .where(eq(loanRequests.id, id))
      .limit(1)
      .then(rows => rows[0]);

    if (!request) {
      return null;
    }

    // Get related loan
    const loan = await db
      .select()
      .from(loans)
      .where(eq(loans.id, request.loanId))
      .limit(1)
      .then(rows => rows[0]);

    // Get related book
    let book = null;
    if (loan) {
      book = await db
        .select()
        .from(books)
        .where(eq(books.id, loan.bookId))
        .limit(1)
        .then(rows => rows[0]);
    }

    return { request, loan, book };
  }

  /**
   * Get all pending requests (for librarian queue)
   */
  async getPendingRequests() {
    const requests = await db
      .select()
      .from(loanRequests)
      .where(eq(loanRequests.status, 'pending'))
      .orderBy(desc(loanRequests.requestedAt));

    // Enrich with loan and book info
    const enriched = await Promise.all(
      requests.map(async (request) => {
        const loan = await db
          .select()
          .from(loans)
          .where(eq(loans.id, request.loanId))
          .limit(1)
          .then(rows => rows[0]);

        let book = null;
        if (loan) {
          book = await db
            .select()
            .from(books)
            .where(eq(books.id, loan.bookId))
            .limit(1)
            .then(rows => rows[0]);
        }

        return { request, loan, book };
      })
    );

    return enriched;
  }

  /**
   * Get requests for a specific patron
   */
  async getByPatronId(patronId: number) {
    const requests = await db
      .select()
      .from(loanRequests)
      .where(eq(loanRequests.initiatorId, patronId))
      .orderBy(desc(loanRequests.requestedAt));

    // Enrich with loan and book info
    const enriched = await Promise.all(
      requests.map(async (request) => {
        const loan = await db
          .select()
          .from(loans)
          .where(eq(loans.id, request.loanId))
          .limit(1)
          .then(rows => rows[0]);

        let book = null;
        if (loan) {
          book = await db
            .select()
            .from(books)
            .where(eq(books.id, loan.bookId))
            .limit(1)
            .then(rows => rows[0]);
        }

        return { request, loan, book };
      })
    );

    return enriched;
  }

  /**
   * Get active loans for a patron (person_name matches patron full_name)
   */
  async getActiveLoansForPatron(patronFullName: string) {
    const normalizedName = patronFullName.toLowerCase().trim();

    const loansOut = await db
      .select({
        loan: loans,
        book: books,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(
        and(
          eq(loans.loanType, 'out'),
          eq(loans.personNameNormalized, normalizedName)
        )
      )
      .orderBy(desc(loans.createdAt));

    return loansOut;
  }

  /**
   * Confirm a request (librarian action)
   */
  async confirm(id: number, librarianId: number): Promise<LoanRequest> {
    const now = new Date().toISOString();

    const [updated] = await db
      .update(loanRequests)
      .set({
        status: 'confirmed',
        confirmedAt: now,
        confirmedBy: librarianId,
      })
      .where(eq(loanRequests.id, id))
      .returning();

    return updated;
  }

  /**
   * Reject a request (librarian action)
   */
  async reject(id: number): Promise<LoanRequest> {
    const [updated] = await db
      .update(loanRequests)
      .set({ status: 'rejected' })
      .where(eq(loanRequests.id, id))
      .returning();

    return updated;
  }

  /**
   * Cancel a request (patron action)
   */
  async cancel(id: number): Promise<LoanRequest> {
    const [updated] = await db
      .update(loanRequests)
      .set({ status: 'cancelled' })
      .where(eq(loanRequests.id, id))
      .returning();

    return updated;
  }

  /**
   * Check if patron has pending request for a specific book
   */
  async hasPendingRequest(patronId: number, bookId: number): Promise<boolean> {
    const request = await db
      .select({ id: loanRequests.id })
      .from(loanRequests)
      .innerJoin(loans, eq(loanRequests.loanId, loans.id))
      .where(
        and(
          eq(loanRequests.initiatorId, patronId),
          eq(loans.bookId, bookId),
          eq(loanRequests.status, 'pending')
        )
      )
      .limit(1)
      .then(rows => rows[0]);

    return !!request;
  }
}

// Singleton instance
export const loanRequestsService = new LoanRequestsService();
