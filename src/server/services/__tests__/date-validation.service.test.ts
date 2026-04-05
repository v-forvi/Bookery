import { describe, it, expect } from 'vitest';
import { dateValidationService } from '../date-validation.service';

describe('dateValidationService', () => {
  it('validates date format', () => {
    expect(dateValidationService.isValidDateFormat('2026-04-05')).toBe(true);
    expect(dateValidationService.isValidDateFormat('04/05/2026')).toBe(false);
    expect(dateValidationService.isValidDateFormat('2026-04-05T00:00:00')).toBe(false);
  });

  it('checks date is not in future', () => {
    const pastDate = '2020-01-01';
    const today = dateValidationService.getTodayDate();
    expect(dateValidationService.isNotInFuture(pastDate)).toBe(true);
    expect(dateValidationService.isNotInFuture(today)).toBe(true);
  });

  it('validates return date is after loan date', () => {
    expect(dateValidationService.isValidReturnDate('2026-01-01', '2026-01-02')).toBe(true);
    expect(dateValidationService.isValidReturnDate('2026-01-02', '2026-01-01')).toBe(false);
  });
});
