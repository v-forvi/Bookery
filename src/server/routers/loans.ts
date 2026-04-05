import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { loans, books } from "../schema";
import { eq, and, desc, like, or } from "drizzle-orm";
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
  // Router will be populated in following tasks
});
