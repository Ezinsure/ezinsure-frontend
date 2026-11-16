import { formatMoney } from '@/utils/money';
import { cx } from './cx';

interface MoneyCellProps {
  value: number | null | undefined;
  currency?: string;
  /** Show a leading `+` for positive values (for differences). */
  signed?: boolean;
  /** Colour negatives red and positives green (for differences). */
  tinted?: boolean;
  /** Render zero as a dash so empty columns stay quiet. */
  dashForZero?: boolean;
  className?: string;
}

/** Right-aligned, fixed-width digits so amounts in a column line up. */
export function MoneyCell({
  value,
  currency,
  signed = false,
  tinted = false,
  dashForZero = false,
  className,
}: MoneyCellProps) {
  if (value === null || value === undefined || (dashForZero && value === 0)) {
    return <span className={cx('block text-right text-slate-400', className)}>—</span>;
  }
  const text = formatMoney(value, { currency });
  const display = signed && value > 0 ? `+${text}` : text;
  return (
    <span
      className={cx(
        'block whitespace-nowrap text-right tabular-nums',
        tinted && value < 0 && 'text-rose-700',
        tinted && value > 0 && 'text-emerald-700',
        className,
      )}
    >
      {display}
    </span>
  );
}
