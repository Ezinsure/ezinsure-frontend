'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';
import {
  aggregateOwnersFromLines,
  type AggregatedOwner,
} from '@/features/livestock-application/utils/insured-line-display';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

interface ApplicationOwnersSectionProps {
  application: LivestockApplicationPackage;
  selectedOwnerKey?: string | null;
  onSelectOwner?: (ownerKey: string | null) => void;
}

export function ApplicationOwnersSection({
  application,
  selectedOwnerKey = null,
  onSelectOwner,
}: ApplicationOwnersSectionProps) {
  const owners = useMemo(() => {
    const aggregated = aggregateOwnersFromLines(
      application.lines,
      application.ownerMode,
      application.ownerSummary,
    );

    if (aggregated.length > 0) {
      if (
        aggregated.length === 1 &&
        aggregated[0].lineCount === 0 &&
        application.totals.totalSumAssured > 0
      ) {
        return [{ ...aggregated[0], totalSumAssured: application.totals.totalSumAssured }];
      }
      return aggregated;
    }

    if (application.ownerMode === 'MULTI_OWNER') {
      return [
        {
          key: 'multi',
          name: application.ownerSummary || 'Multiple owners',
          lineCount: application.lineCount,
          totalSumAssured: application.totals.totalSumAssured,
        },
      ];
    }

    return aggregated;
  }, [application.lines, application.ownerMode, application.ownerSummary, application.lineCount, application.totals.totalSumAssured]);

  const isMulti = application.ownerMode === 'MULTI_OWNER';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-3">
          <Users className="h-6 w-6 text-blue-700" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">
            {isMulti ? 'Owners in this application' : 'Primary owner'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isMulti
              ? `${owners.length} owner${owners.length !== 1 ? 's' : ''} · click a row to filter animals below`
              : 'Single-owner application — all insured lines belong to this farmer'}
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[32rem] w-full text-sm">
          <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Owner</th>
              {isMulti && <th className="px-3 py-2">Phone</th>}
              <th className="px-3 py-2">{isMulti ? 'Animals / lots' : 'Insured lines'}</th>
              <th className="px-3 py-2">Total value</th>
              {isMulti && onSelectOwner && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {owners.map((owner) => (
              <OwnerRow
                key={owner.key}
                owner={owner}
                isMulti={isMulti}
                selected={selectedOwnerKey === owner.key}
                onSelect={onSelectOwner}
              />
            ))}
          </tbody>
        </table>
      </div>

      {isMulti && selectedOwnerKey && onSelectOwner && (
        <button
          type="button"
          onClick={() => onSelectOwner(null)}
          className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Clear owner filter · show all {application.lines.length} lines
        </button>
      )}
    </section>
  );
}

function OwnerRow({
  owner,
  isMulti,
  selected,
  onSelect,
}: {
  owner: AggregatedOwner;
  isMulti: boolean;
  selected: boolean;
  onSelect?: (key: string | null) => void;
}) {
  return (
    <tr className={selected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}>
      <td className="px-3 py-3 font-medium text-slate-900">{owner.name}</td>
      {isMulti && <td className="px-3 py-3 text-slate-600">{owner.phone || '—'}</td>}
      <td className="px-3 py-3 text-slate-700">{owner.lineCount}</td>
      <td className="px-3 py-3 font-medium text-slate-800">
        {formatRwfDisplay(owner.totalSumAssured)}
      </td>
      {isMulti && onSelect && (
        <td className="px-3 py-3 text-right">
          <button
            type="button"
            onClick={() => onSelect(selected ? null : owner.key)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            {selected ? 'Showing' : 'Filter lines'}
          </button>
        </td>
      )}
    </tr>
  );
}
