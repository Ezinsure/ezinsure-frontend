'use client';

import type { LivestockApplicationStatus } from '@/features/livestock-application/domain/application-types';
import {
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
} from '@/features/livestock-application/domain/application-status';

interface LivestockApplicationStatusBadgeProps {
  status: LivestockApplicationStatus | string;
  className?: string;
}

export function LivestockApplicationStatusBadge({
  status,
  className = '',
}: LivestockApplicationStatusBadgeProps) {
  const key = status as LivestockApplicationStatus;
  const colors = APPLICATION_STATUS_COLORS[key] ?? APPLICATION_STATUS_COLORS.DRAFT;
  const label = APPLICATION_STATUS_LABELS[key] ?? status;

  return (
    <span
      className={`inline-flex w-max max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring} ${className}`}
    >
      {label}
    </span>
  );
}
