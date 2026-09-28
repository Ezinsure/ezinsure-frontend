import { addCalendarDays, formatLocalIsoDate, isoDateOnly } from '@/features/renewals/date-utils';

export type RenewalListBucket = 'upcoming' | 'eligible';

export function startOfTodayIso(): string {
  return formatLocalIsoDate(new Date());
}

export function addDaysFromToday(days: number): string {
  return addCalendarDays(startOfTodayIso(), days);
}

export function yesterdayIso(): string {
  return addCalendarDays(startOfTodayIso(), -1);
}

export function normalizePlateNumber(value: string | undefined | null): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim();
}

export function isPolicyExpired(policyEndDate: string | undefined | null, today = startOfTodayIso()): boolean {
  const end = isoDateOnly(policyEndDate);
  return Boolean(end) && end < today;
}

export function isPolicyUpcoming(policyEndDate: string | undefined | null, today = startOfTodayIso()): boolean {
  const end = isoDateOnly(policyEndDate);
  return Boolean(end) && end >= today;
}

export function parseBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }
  return undefined;
}

export function classifyRenewalBucket(
  policyEndDate: string | undefined | null,
  today = startOfTodayIso(),
): RenewalListBucket | null {
  if (isPolicyExpired(policyEndDate, today)) return 'eligible';
  if (isPolicyUpcoming(policyEndDate, today)) return 'upcoming';
  return null;
}

export interface MotorPlateRenewalGate {
  expired: boolean;
  hasActiveCoverForPlate: boolean;
}

export function canRenewMotorApplication(gate: MotorPlateRenewalGate): boolean {
  return gate.expired && !gate.hasActiveCoverForPlate;
}

export function motorPlateBlockedReason(plateNumber?: string): string {
  const plate = plateNumber?.trim();
  return plate
    ? `Plate ${plate} already has an active insurance policy. Renewal is only allowed after that cover expires.`
    : 'This vehicle already has an active insurance policy. Renewal is only allowed after that cover expires.';
}

export function stillActivePolicyReason(policyEndDate?: string): string {
  const end = isoDateOnly(policyEndDate) || 'the current end date';
  return `This policy is still active until ${end}. Renewal is only available after it expires.`;
}
