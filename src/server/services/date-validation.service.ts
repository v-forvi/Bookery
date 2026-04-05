import { z } from "zod";

// Date validation regex: YYYY-MM-DD
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const dateValidationService = {
  /**
   * Validates a date string is in YYYY-MM-DD format
   */
  isValidDateFormat(dateString: string): boolean {
    return DATE_REGEX.test(dateString);
  },

  /**
   * Validates date is not in the future
   * Compares dates at midnight UTC to avoid timezone issues
   */
  isNotInFuture(dateString: string): boolean {
    const inputDate = new Date(dateString + 'T00:00:00.000Z');
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    return inputDate <= todayUtc;
  },

  /**
   * Validates return date is on or after loan date
   */
  isValidReturnDate(loanDate: string, returnDate: string): boolean {
    const loan = new Date(loanDate);
    const ret = new Date(returnDate);
    return ret >= loan;
  },

  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Zod schema for loan date
   */
  loanDateSchema: z.string().regex(DATE_REGEX, {
    message: "Date must be in YYYY-MM-DD format",
  }),

  /**
   * Zod schema for return date
   */
  returnDateSchema: z.string().regex(DATE_REGEX, {
    message: "Date must be in YYYY-MM-DD format",
  }),
};
