import type { StageTone } from '../domain';
import { cx } from './cx';
import { CHIP_DOT_CLASSES, CHIP_TONE_CLASSES } from './tones';

interface StatusChipProps {
  label: string;
  tone?: StageTone;
  /** Plain-language explanation shown on hover and to screen readers. */
  description?: string;
  className?: string;
}

/** Small coloured pill for any status. Colour is never the only signal: the label is always shown. */
export function StatusChip({ label, tone = 'slate', description, className }: StatusChipProps) {
  return (
    <span
      title={description}
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        CHIP_TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className={cx('h-1.5 w-1.5 rounded-full', CHIP_DOT_CLASSES[tone])} />
      {label}
    </span>
  );
}
