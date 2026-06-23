'use client';

import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';
import { resolveApplicationTimelineSteps } from '@/features/livestock-application/utils/application-timeline';

interface ApplicationStatusTimelineProps {
  application: LivestockApplicationPackage;
}

export function ApplicationStatusTimeline({ application }: ApplicationStatusTimelineProps) {
  const steps = resolveApplicationTimelineSteps(application);

  return (
    <ol className="relative space-y-0 border-l-2 border-slate-200 pl-6">
      {steps.map((step) => {
        const isCompleted = step.state === 'completed';
        const isCurrent = step.state === 'current';

        return (
          <li key={step.status} className="relative pb-6 last:pb-0">
            <span
              className={[
                'absolute -left-[1.6rem] top-1 flex h-3 w-3 rounded-full ring-4 ring-white transition-colors',
                isCompleted ? 'bg-emerald-500' : '',
                isCurrent ? 'scale-125 bg-blue-600 ring-blue-50' : '',
                !isCompleted && !isCurrent ? 'bg-slate-300' : '',
              ].join(' ')}
              aria-hidden
            />
            <div className={isCurrent ? '' : step.state === 'upcoming' ? 'opacity-55' : ''}>
              <LivestockApplicationStatusBadge status={step.status} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
