'use client';

import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { workflowPhaseLabel } from '@/features/livestock-application/utils/workflow-rules';
import { resolveSubsidyEligibility } from '@/features/livestock-application/utils/subsidy-eligibility';
import { showAllLivestockWorkflowActions } from '@/features/livestock-application/utils/workflow-demo-mode';

interface WorkflowOverviewBannerProps {
  application: LivestockApplicationPackage;
  viewRole?: LivestockApplicationViewRole;
}

export function WorkflowOverviewBanner({
  application,
  viewRole = 'vet',
}: WorkflowOverviewBannerProps) {
  const phase = workflowPhaseLabel(application);
  const subsidy = resolveSubsidyEligibility(application);

  if (application.status === 'PAID' || application.status === 'CANCELLED' || application.status === 'REJECTED') {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-900 px-5 py-4 text-white shadow-sm sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Current workflow phase
          </p>
          <p className="mt-1 text-lg font-semibold">{phase}</p>
          <p className="mt-1 text-sm text-slate-300">
            {showAllLivestockWorkflowActions()
              ? 'Demo mode — all workflow actions are visible. Status updates are saved locally until APIs are connected.'
              : viewRole === 'vet'
                ? 'Follow the steps below in order. Each section unlocks after the previous step is complete.'
                : 'Use the workflow sections below to advance this application.'}
          </p>
        </div>
        <div className="rounded-xl bg-white/10 px-4 py-3 text-sm">
          <p className="font-medium text-slate-200">Nkunganire (sector)</p>
          <p className="mt-0.5 text-white">
            {subsidy.required ? 'Required for this application' : 'Not required — Tekana eligible'}
          </p>
        </div>
      </div>
    </section>
  );
}
