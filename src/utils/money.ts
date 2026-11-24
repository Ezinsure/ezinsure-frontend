import { FINANCE_CURRENCY } from '@/config/finance';

const MONEY_LOCALE = 'en-RW';
const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    let fractionDigits = 0;
    try {
      fractionDigits =
        new Intl.NumberFormat(MONEY_LOCALE, {
          style: 'currency',
          currency,
        }).resolvedOptions().maximumFractionDigits ?? 0;
    } catch {
      // Unknown currency code: fall back to whole units.
    }
    formatter = new Intl.NumberFormat(MONEY_LOCALE, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(currency, formatter);
  }
  return formatter;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n =
    typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(/\s/g, '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export type FormatMoneyOptions = {
  currency?: string;
  /** Returned when the value is empty or not a number. */
  fallback?: string;
};

/**
 * Single money formatter for the whole app, e.g. `1,250,000 RWF`.
 * Fraction digits follow the currency (RWF has none), so it stays correct if
 * another currency is introduced.
 */
export function formatMoney(
  value: string | number | null | undefined,
  { currency = FINANCE_CURRENCY, fallback = '—' }: FormatMoneyOptions = {},
): string {
  const n = toNumber(value);
  if (n === null) return fallback;
  return `${formatterFor(currency).format(n)} ${currency}`;
}
