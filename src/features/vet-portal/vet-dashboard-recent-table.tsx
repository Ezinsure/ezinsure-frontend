'use client';

import Link from 'next/link';
import { Eye, Loader2 } from 'lucide-react';
import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import { speciesGroupLabel } from '@/features/livestock-application/domain/form-profiles';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import { formatInsuredLineCount } from '@/features/livestock-application/utils/applications-list-filters';
import {
  formatLocationSummary,
  formatPolicyDate,
  formatSubmittedDateTime,
} from '@/features/livestock-application/utils/application-location';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

interface VetDashboardRecentTableProps {
  applications: LivestockApplicationListItem[];
  isLoading: boolean;
  detailBase: string;
  emptyMessage?: string;
}

export function VetDashboardRecentTable({
  applications,
  isLoading,
  detailBase,
  emptyMessage = 'No applications in this date range yet.',
}: VetDashboardRecentTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-14 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-700">No applications found</p>
        <p className="mt-1 text-xs text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[56rem] w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Application
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Owner(s)
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Coverage
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Value & premium
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Commission
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 bg-white">
          {applications.map((app) => {
            const location = app.livestockLocation
              ? formatLocationSummary(app.livestockLocation)
              : '—';

            return (
              <tr key={app._id} className="transition hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{app.applicationNumber}</p>
                  <p className="text-xs text-slate-500">{formatSubmittedDateTime(app.submittedAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{app.ownerSummary || '—'}</p>
                  <p className="text-xs text-slate-500">{formatInsuredLineCount(app.lineCount)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{speciesGroupLabel(app.speciesGroup)}</p>
                  <p className="text-xs text-slate-500">{location}</p>
                  {app.policyStartDate && app.policyEndDate ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatPolicyDate(app.policyStartDate)} – {formatPolicyDate(app.policyEndDate)}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">
                    {formatRwfDisplay(app.totalSumAssured ?? 0)}
                  </p>
                  <p className="text-xs text-emerald-700">
                    Farmer {formatRwfDisplay(app.totals?.farmerContributionAmount ?? 0)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Premium {formatRwfDisplay(app.totals?.premiumRateAmount ?? 0)}
                  </p>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {formatRwfDisplay(app.veterinaryCommission ?? 0)}
                </td>
                <td className="px-4 py-3">
                  <LivestockApplicationStatusBadge status={app.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link
                    href={`${detailBase}?open=${encodeURIComponent(app._id)}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">View details</span>
                    <span className="sm:hidden">View</span>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
