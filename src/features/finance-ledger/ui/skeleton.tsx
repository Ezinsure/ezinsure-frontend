import { cx } from './cx';

/** Grey pulsing placeholder block. Size it with `className`. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx('block animate-pulse rounded bg-slate-200/80', className)} />;
}
