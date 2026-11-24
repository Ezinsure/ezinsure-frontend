import { formatMoney } from '@/utils/money';

/** Kept for existing call sites; delegates to the shared money formatter. */
export function formatRwfDisplay(value: string | number | undefined): string {
  return formatMoney(value);
}
