/**
 * Bi-weekly (14-day) commission payment cycles.
 *
 * Cycles are calendar fortnights within a year:
 * - Period length: 14 days
 * - Cycle 1 of year Y starts on 1 January Y
 * - Last cycle of the year may be shorter and ends on 31 December
 */

export type PaymentCycleModule = 'motor' | 'livestock';

export type PaymentCycleStatus =
  | 'open'
  | 'ready'
  | 'initiated'
  | 'paid'
  | 'partial'
  | 'empty';

export interface BiWeeklyCycle {
  /** Stable id: `${year}-W${index}` (1-based index within year). */
  id: string;
  year: number;
  /** 1-based fortnight index within the year. */
  index: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
  /** True when today falls inside [startDate, endDate]. */
  isCurrent: boolean;
  /** Inclusive day count (usually 14; last cycle of year may be shorter). */
  dayCount: number;
}

export interface PaymentCycleSummary extends BiWeeklyCycle {
  status: PaymentCycleStatus;
  totalCommission: number;
  totalApplications: number;
  producerCount: number;
  /** Optional backend cycle record id when persisted. */
  backendCycleId?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toIsoDateLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function formatCycleLabel(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = start.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endFmt = end.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: sameMonth ? undefined : 'short',
    year: 'numeric',
  });
  return `${startFmt} – ${endFmt}`;
}

/** Generate all bi-weekly cycles for a calendar year. */
export function generateBiWeeklyCyclesForYear(
  year: number,
  today: Date = new Date(),
): BiWeeklyCycle[] {
  const cycles: BiWeeklyCycle[] = [];
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const todayStart = startOfLocalDay(today);

  let cursor = yearStart;
  let index = 1;

  while (cursor.getTime() <= yearEnd.getTime()) {
    const periodEnd = addDays(cursor, 13);
    const end = periodEnd.getTime() > yearEnd.getTime() ? yearEnd : periodEnd;
    const startDate = toIsoDateLocal(cursor);
    const endDate = toIsoDateLocal(end);
    const dayCount =
      Math.round((end.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const isCurrent =
      todayStart.getTime() >= cursor.getTime() && todayStart.getTime() <= end.getTime();

    cycles.push({
      id: `${year}-W${String(index).padStart(2, '0')}`,
      year,
      index,
      startDate,
      endDate,
      label: formatCycleLabel(cursor, end),
      isCurrent,
      dayCount,
    });

    cursor = addDays(end, 1);
    index += 1;
  }

  return cycles;
}

export function findCurrentBiWeeklyCycle(
  today: Date = new Date(),
): BiWeeklyCycle {
  const year = today.getFullYear();
  const cycles = generateBiWeeklyCyclesForYear(year, today);
  return cycles.find((c) => c.isCurrent) ?? cycles[cycles.length - 1];
}

export function findBiWeeklyCycleById(
  cycleId: string,
  today: Date = new Date(),
): BiWeeklyCycle | null {
  const year = Number(cycleId.split('-W')[0]);
  if (!Number.isFinite(year)) return null;
  return generateBiWeeklyCyclesForYear(year, today).find((c) => c.id === cycleId) ?? null;
}

export function adjacentYear(year: number, delta: number): number {
  return year + delta;
}

export const PAYMENT_CYCLE_STATUS_LABELS: Record<PaymentCycleStatus, string> = {
  open: 'Open',
  ready: 'Ready to pay',
  initiated: 'Payment initiated',
  paid: 'Paid',
  partial: 'Partial',
  empty: 'No commissions',
};
