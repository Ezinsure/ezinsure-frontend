'use client';

import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';
import { resolveApplicationTimelineSteps } from '@/features/livestock-application/utils/application-timeline';

interface ApplicationStatusTimelineProps {
  application: LivestockApplicationPackage;
  /** Compact sidebar-style labels */
  compact?: boolean;
  /** Overview page: text labels matching lifecycle status colours */
  variant?: 'badges' | 'text';
}

export function ApplicationStatusTimeline({
  application,
  compact = false,
  variant = compact ? 'text' : 'badges',
}: ApplicationStatusTimelineProps) {
  const steps = resolveApplicationTimelineSteps(application);

  return (
    <ol
      className={`relative space-y-0 border-l-2 border-slate-200 ${
        compact || variant === 'text' ? 'pl-4' : 'pl-6'
      }`}
    >
      {steps.map((step) => {
        const isCompleted = step.state === 'completed';
        const isCurrent = step.state === 'current';

        return (
          <li
            key={step.status}
            className={`relative ${compact || variant === 'text' ? 'pb-3 last:pb-0' : 'pb-6 last:pb-0'}`}
          >
            <span
              className={[
                'absolute top-1.5 flex rounded-full ring-4 ring-white transition-colors',
                compact || variant === 'text' ? '-left-[0.85rem] h-2 w-2' : '-left-[1.6rem] h-3 w-3',
                isCompleted ? 'bg-emerald-500' : '',
                isCurrent ? 'scale-125 bg-blue-600 ring-blue-50' : '',
                !isCompleted && !isCurrent ? 'bg-slate-300' : '',
              ].join(' ')}
              aria-hidden
            />
            <div className={isCurrent ? '' : step.state === 'upcoming' ? 'opacity-55' : ''}>
              {variant === 'text' ? (
                <p
                  className={`text-sm leading-snug ${
                    isCurrent
                      ? 'font-semibold text-blue-700'
                      : isCompleted
                        ? 'font-medium text-slate-800'
                        : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </p>
              ) : (
                <LivestockApplicationStatusBadge status={step.status} />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
