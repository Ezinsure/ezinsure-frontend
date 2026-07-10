'use client';

import { Loader2 } from 'lucide-react';
import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import {
  ApplicationsListRowActions,
  type ApplicationsListRowActionHandlers,
} from '@/features/livestock-application/components/applications-list/applications-list-row-actions';
import { speciesGroupLabel } from '@/features/livestock-application/domain/form-profiles';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import {
  formatInsuredLineCount,
} from '@/features/livestock-application/utils/applications-list-filters';
import {
  formatLocationSummary,
  formatPolicyDate,
  formatSubmittedDateTime,
} from '@/features/livestock-application/utils/application-location';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

interface ApplicationsListTableProps {
  applications: LivestockApplicationListItem[];
  isLoading: boolean;
  isVet: boolean;
  emptyMessage: string;
  rowActions: ApplicationsListRowActionHandlers;
}

export function ApplicationsListTable({
  applications,
  isLoading,
  isVet,
  emptyMessage,
  rowActions,
}: ApplicationsListTableProps) {
  const colSpan = isVet ? 6 : 7;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[48rem] w-full text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Application</th>
            {!isVet && <th className="px-4 py-3">Veterinarian</th>}
            <th className="px-4 py-3">Owner(s)</th>
            <th className="px-4 py-3">Coverage</th>
            <th className="px-4 py-3">Value & premium</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-12 text-center text-slate-500">
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              </td>
            </tr>
          ) : applications.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-12 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            applications.map((app) => (
              <tr key={app._id} className="hover:bg-slate-50/80">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{app.applicationNumber}</p>
                  <p className="text-xs text-slate-500">{formatSubmittedDateTime(app.submittedAt)}</p>
                </td>
                {!isVet && (
                  <td className="px-4 py-4 text-slate-700">{app.vetName ?? '—'}</td>
                )}
                <td className="px-4 py-4">
                  <OwnerCell app={app} />
                </td>
                <td className="px-4 py-4">
                  <CoverageCell app={app} />
                </td>
                <td className="px-4 py-4">
                  <ValueCell app={app} />
                </td>
                <td className="px-4 py-4">
                  <LivestockApplicationStatusBadge status={app.status} />
                </td>
                <td className="px-4 py-4 text-right">
                  <ApplicationsListRowActions app={app} handlers={rowActions} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function OwnerCell({ app }: { app: LivestockApplicationListItem }) {
  return (
    <div>
      <p className="font-medium text-slate-900">{app.ownerSummary || '—'}</p>
      <p className="text-xs text-slate-500">{formatInsuredLineCount(app.lineCount)}</p>
    </div>
  );
}

function CoverageCell({ app }: { app: LivestockApplicationListItem }) {
  const location = app.livestockLocation;
  const locationLabel = location ? formatLocationSummary(location) : '—';

  return (
    <div>
      <p className="font-medium text-slate-900">{speciesGroupLabel(app.speciesGroup)}</p>
      <p className="text-xs text-slate-500">{locationLabel}</p>
      {app.policyStartDate && app.policyEndDate && (
        <p className="mt-0.5 text-xs text-slate-500">
          {formatPolicyDate(app.policyStartDate)} – {formatPolicyDate(app.policyEndDate)}
        </p>
      )}
    </div>
  );
}

function ValueCell({ app }: { app: LivestockApplicationListItem }) {
  return (
    <div>
      <p className="font-semibold text-slate-900">
        {formatRwfDisplay(app.totalSumAssured ?? 0)}
      </p>
      <p className="text-xs text-emerald-700">
        Farmer {formatRwfDisplay(app.totals.farmerContributionAmount)}
      </p>
      <p className="text-xs text-slate-500">
        Premium {formatRwfDisplay(app.totals.premiumRateAmount)}
      </p>
    </div>
  );
}
