/** Canonical month options sent to the API (e.g. "6 Months"). */
export const INSURANCE_MONTH_DURATION_VALUES = [
  '1 Month',
  '2 Months',
  '3 Months',
  '6 Months',
  '9 Months',
  '11 Months',
  '12 Months',
] as const;

export type InsuranceMonthDuration = (typeof INSURANCE_MONTH_DURATION_VALUES)[number];

/** Legacy apply forms stored month count as "1".."12" only. */
const LEGACY_MONTH_NUM_TO_LABEL: Record<string, InsuranceMonthDuration> = {
  '1': '1 Month',
  '2': '2 Months',
  '3': '3 Months',
  '6': '6 Months',
  '9': '9 Months',
  '11': '11 Months',
  '12': '12 Months',
};

export function formatDaysDuration(n: number): string {
  if (!Number.isFinite(n) || n < 1) return '';
  return n === 1 ? '1 Day' : `${n} Days`;
}

export type ParsedInsuranceDuration = {
  unit: 'months' | 'days';
  /** Value for the months `<select>` when unit is months */
  monthsValue: InsuranceMonthDuration;
  /** Raw day count string when unit is days (may be empty if user has not entered yet) */
  daysValue: string;
};

/**
 * Parse stored/API duration into UI state.
 * Empty string means "days mode, no count yet" (incomplete).
 */
export function parseInsuranceDuration(raw: string | undefined | null): ParsedInsuranceDuration {
  const s = (raw ?? '').trim();

  if (!s) {
    return {
      unit: 'days',
      monthsValue: '12 Months',
      daysValue: '',
    };
  }

  const dayMatch = s.match(/^(\d+)\s*days?$/i);
  if (dayMatch) {
    const n = dayMatch[1].replace(/^0+(?=\d)/, '') || dayMatch[1];
    return {
      unit: 'days',
      monthsValue: '12 Months',
      daysValue: n,
    };
  }

  const moMatch = s.match(/^(\d+)\s*months?$/i);
  if (moMatch) {
    const n = moMatch[1];
    const label = (n === '1' ? '1 Month' : `${n} Months`) as InsuranceMonthDuration;
    if ((INSURANCE_MONTH_DURATION_VALUES as readonly string[]).includes(label)) {
      return { unit: 'months', monthsValue: label, daysValue: '' };
    }
  }

  if ((INSURANCE_MONTH_DURATION_VALUES as readonly string[]).includes(s)) {
    return { unit: 'months', monthsValue: s as InsuranceMonthDuration, daysValue: '' };
  }

  if (/^\d+$/.test(s) && LEGACY_MONTH_NUM_TO_LABEL[s]) {
    return {
      unit: 'months',
      monthsValue: LEGACY_MONTH_NUM_TO_LABEL[s],
      daysValue: '',
    };
  }

  return { unit: 'months', monthsValue: '12 Months', daysValue: '' };
}

/** Normalize to API payload ("6 Months", "14 Days"). */
export function normalizeInsuranceDurationPayload(raw: string): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  const parsed = parseInsuranceDuration(s);
  if (parsed.unit === 'days') {
    const n = parseInt(parsed.daysValue, 10);
    if (Number.isFinite(n) && n >= 1) return formatDaysDuration(n);
    return '';
  }
  return parsed.monthsValue;
}

export function validateInsuranceDuration(
  value: string,
  options?: { minDays?: number; maxDays?: number },
): string | null {
  const minD = options?.minDays ?? 1;
  const maxD = options?.maxDays ?? 366;
  const v = (value ?? '').trim();
  if (!v) return 'Insurance duration is required';

  const dayMatch = v.match(/^(\d+)\s*days?$/i);
  if (dayMatch) {
    const n = parseInt(dayMatch[1], 10);
    if (!Number.isFinite(n) || n < minD) {
      return minD === 1
        ? 'Enter at least 1 day'
        : `Enter at least ${minD} days`;
    }
    if (n > maxD) return `Maximum ${maxD} days`;
    return null;
  }

  if ((INSURANCE_MONTH_DURATION_VALUES as readonly string[]).includes(v)) return null;

  const moMatch = v.match(/^(\d+)\s*months?$/i);
  if (moMatch) {
    const n = moMatch[1];
    const label = n === '1' ? '1 Month' : `${n} Months`;
    if ((INSURANCE_MONTH_DURATION_VALUES as readonly string[]).includes(label)) return null;
  }

  if (/^\d+$/.test(v) && LEGACY_MONTH_NUM_TO_LABEL[v]) return null;

  return 'Choose a valid duration';
}
