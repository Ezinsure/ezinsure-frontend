import type { FieldErrors, MoneyAmount } from './common';
import { isDateOnly, toDateOnly } from './dates';
import type { MismatchReasonCode, MismatchStatus, ResolveMismatchInput } from './mismatches';
import type { MarkPayoutPaidInput } from './payouts';
import type { CreateReceiptInput } from './receipts';

/**
 * Business rules shared by the UI (instant validation), the mock API and the
 * backend documentation. The server must enforce the same rules.
 */

/** Differences up to this many currency units are treated as rounding. */
export const ROUNDING_TOLERANCE: MoneyAmount = 1;

/** A statement outstanding for longer than this is flagged. Configurable later. */
export const OVERDUE_THRESHOLDS = { warningDays: 60, criticalDays: 120 } as const;

export type OverdueLevel = 'ok' | 'warning' | 'critical';

export function overdueLevel(
  ageDays: number | undefined,
  thresholds: { warningDays: number; criticalDays: number } = OVERDUE_THRESHOLDS,
): OverdueLevel {
  if (ageDays === undefined) return 'ok';
  if (ageDays >= thresholds.criticalDays) return 'critical';
  if (ageDays >= thresholds.warningDays) return 'warning';
  return 'ok';
}

export const calcVatAmount = (base: MoneyAmount, vatRate: number): MoneyAmount =>
  Math.round((base || 0) * vatRate);

/** vet + company commission + VAT on that sum: what SONARWA is billed for a line. */
export function calcExpectedAmount(
  vetCommission: MoneyAmount,
  companyCommission: MoneyAmount,
  vatRate: number,
): { subtotal: MoneyAmount; vatAmount: MoneyAmount; expectedAmount: MoneyAmount } {
  const subtotal = Math.round((vetCommission || 0) + (companyCommission || 0));
  const vatAmount = calcVatAmount(subtotal, vatRate);
  return { subtotal, vatAmount, expectedAmount: subtotal + vatAmount };
}

export const isWithinRoundingTolerance = (difference: MoneyAmount): boolean =>
  Math.abs(difference) <= ROUNDING_TOLERANCE;

/**
 * Whether a resolved mismatch's shortfall is absorbed (counted in
 * `writtenOffAmount`) rather than still owed by SONARWA: a write-off, or a
 * difference explained as rounding. `REBILL` and other explanations stay owed.
 */
export const isAbsorbedMismatch = (
  status: MismatchStatus,
  reasonCode?: MismatchReasonCode,
): boolean => status === 'WRITTEN_OFF' || (status === 'EXPLAINED' && reasonCode === 'ROUNDING');

export const hasErrors = (errors: FieldErrors): boolean =>
  Object.keys(errors).length > 0;

const isPositiveWholeAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export function validateResolveMismatch(input: ResolveMismatchInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.reasonCode) errors.reasonCode = 'Choose a reason.';
  if (input.reasonCode === 'OTHER' && !input.note?.trim()) {
    errors.note = 'Add a note explaining the difference.';
  }
  if (input.action === 'WRITE_OFF' && !input.note?.trim()) {
    errors.note = 'A note is required to write off an amount.';
  }
  return errors;
}

export function validateMarkPayoutPaid(
  input: MarkPayoutPaidInput,
  expectedVetIds: readonly string[],
  today: Date = new Date(),
): FieldErrors {
  const errors: FieldErrors = {};
  if (!isDateOnly(input.paidAt)) errors.paidAt = 'Enter a valid date.';
  else if (input.paidAt > toDateOnly(today)) errors.paidAt = 'The paid date cannot be in the future.';

  const byVet = new Map(input.vets.map((v) => [v.vetId, v.paymentReference.trim()]));
  for (const vetId of expectedVetIds) {
    if (!byVet.get(vetId)) errors[`vets.${vetId}`] = 'Enter the payment reference.';
  }
  return errors;
}

export function validateCreateReceipt(
  input: CreateReceiptInput,
  today: Date = new Date(),
): FieldErrors {
  const errors: FieldErrors = {};
  if (!isPositiveWholeAmount(input.amount)) errors.amount = 'Enter the amount received.';
  if (!input.reference.trim()) errors.reference = 'Enter the SONARWA payment reference.';
  if (!isDateOnly(input.receivedAt)) errors.receivedAt = 'Enter a valid date.';
  else if (input.receivedAt > toDateOnly(today)) {
    errors.receivedAt = 'The received date cannot be in the future.';
  }

  if (!input.allocations.length) {
    errors.allocations = 'Choose at least one statement.';
    return errors;
  }
  const ids = input.allocations.map((a) => a.statementId);
  if (new Set(ids).size !== ids.length) {
    errors.allocations = 'Each statement can only appear once.';
  } else if (!input.allocations.every((a) => isPositiveWholeAmount(a.amount))) {
    errors.allocations = 'Each allocation must be greater than zero.';
  } else if (
    isPositiveWholeAmount(input.amount) &&
    sumAmounts(input.allocations.map((a) => a.amount)) !== input.amount
  ) {
    errors.allocations = 'Allocations must add up to the amount received.';
  }
  return errors;
}

export const sumAmounts = (values: readonly MoneyAmount[]): MoneyAmount =>
  values.reduce((sum, value) => sum + value, 0);
