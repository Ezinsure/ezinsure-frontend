'use client';

import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';
import { STATUS_TIMELINE_ORDER } from '@/features/livestock-application/domain/application-status';

interface ApplicationStatusTimelineProps {
  application: LivestockApplicationPackage;
}

export function ApplicationStatusTimeline({ application }: ApplicationStatusTimelineProps) {
  const currentIdx = STATUS_TIMELINE_ORDER.indexOf(application.status);

  return (
    <ol className="relative space-y-0 border-l-2 border-slate-200 pl-6">
      {STATUS_TIMELINE_ORDER.map((status, index) => {
        const done = currentIdx >= index && currentIdx !== -1;
        const active = application.status === status;
        const skipped =
          !application.subsidyCase.required &&
          status.startsWith('SUBSIDY') &&
          status !== 'SUBSIDY_DOC_REQUIRED';

        if (skipped) return null;

        return (
          <li key={status} className="relative pb-6 last:pb-0">
            <span
              className={[
                'absolute -left-[1.6rem] top-0.5 flex h-3 w-3 rounded-full ring-4 ring-white',
                done ? 'bg-emerald-500' : 'bg-slate-300',
                active ? 'scale-125 bg-blue-600' : '',
              ].join(' ')}
            />
            <LivestockApplicationStatusBadge status={status} />
          </li>
        );
      })}
    </ol>
  );
}
