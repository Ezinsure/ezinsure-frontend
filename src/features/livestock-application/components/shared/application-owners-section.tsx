'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import {
  aggregateOwnersFromPackage,
  type AggregatedOwner,
} from '@/features/livestock-application/utils/insured-line-display';
import { formatLocationFull } from '@/features/livestock-application/utils/application-location';
import {
  formatOwnerGenderDisplay,
} from '@/features/livestock-application/utils/display-formatters';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

interface ApplicationOwnersSectionProps {
  application: LivestockApplicationPackage;
  selectedOwnerKey?: string | null;
  onSelectOwner?: (ownerKey: string | null) => void;
}

function enrichOwners(application: LivestockApplicationPackage): AggregatedOwner[] {
  const aggregated = aggregateOwnersFromPackage(application);

  if (application.ownerMode === 'SINGLE_OWNER') {
    const owner = application.primaryOwner;
    return [
      {
        key: 'primary',
        name: owner?.name || application.ownerSummary || '—',
        phone: owner?.phone,
        nationalId: application.nationalId ?? owner?.nationalId,
        gender: application.ownerGender ?? owner?.gender,
        address: application.applicantAddress
          ? formatLocationFull(application.applicantAddress)
          : undefined,
        lineCount: application.lineCount || aggregated[0]?.lineCount || 0,
        totalSumAssured:
          aggregated[0]?.totalSumAssured || application.totals.totalSumAssured,
      },
    ];
  }

  const ownersList = application.ownersList ?? [];
  return aggregated.map((owner) => {
    const matched = ownersList.find(
      (entry) =>
        (entry.phone && entry.phone === owner.phone) ||
        (entry.name && entry.name === owner.name),
    );
    const lineNationalId = application.lines.find(
      (line) =>
        (line.owner?.phone && line.owner.phone === owner.phone) ||
        (line.owner?.name && line.owner.name === owner.name),
    )?.owner?.nationalId;
    const lineGender = application.lines.find(
      (line) =>
        (line.owner?.phone && line.owner.phone === owner.phone) ||
        (line.owner?.name && line.owner.name === owner.name),
    )?.owner?.gender;

    return {
      ...owner,
      nationalId: matched?.nationalId ?? lineNationalId ?? owner.nationalId,
      gender: matched?.gender ?? lineGender ?? owner.gender,
    };
  });
}

export function ApplicationOwnersSection({
  application,
  selectedOwnerKey = null,
  onSelectOwner,
}: ApplicationOwnersSectionProps) {
  const owners = useMemo(() => enrichOwners(application), [application]);
  const isMulti = application.ownerMode === 'MULTI_OWNER';
  const labels = LIVESTOCK_FORM_LABELS.fields;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
              ? `${owners.length} owner${owners.length !== 1 ? 's' : ''} · select a row to filter insured animals below`
              : 'Single-owner application — all insured lines belong to this farmer'}
          </p>
        </div>
      </div>

      {!isMulti && owners[0] ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OwnerCard label={labels.ownerName} value={owners[0].name} highlight />
          <OwnerCard label={labels.ownerPhone} value={owners[0].phone} />
          <OwnerCard label={labels.nationalId} value={owners[0].nationalId} />
          <OwnerCard
            label={labels.ownerGender}
            value={formatOwnerGenderDisplay(owners[0].gender)}
          />
          {owners[0].address && (
            <OwnerCard label="Residence" value={owners[0].address} className="sm:col-span-2" />
          )}
          <OwnerCard
            label="Insured lines"
            value={String(owners[0].lineCount)}
          />
          <OwnerCard
            label="Total value"
            value={formatRwfDisplay(owners[0].totalSumAssured)}
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[48rem] w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">{labels.ownerPhone}</th>
                <th className="px-3 py-2">{labels.ownerNationalId}</th>
                <th className="px-3 py-2">{labels.ownerGender}</th>
                <th className="px-3 py-2">Animals / lots</th>
                <th className="px-3 py-2">Total value</th>
                {onSelectOwner && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {owners.map((owner) => (
                <OwnerRow
                  key={owner.key}
                  owner={owner}
                  selected={selectedOwnerKey === owner.key}
                  onSelect={onSelectOwner}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isMulti && selectedOwnerKey && onSelectOwner && (
        <button
          type="button"
          onClick={() => onSelectOwner(null)}
          className="mt-3 cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Clear owner filter · show all {application.lines.length} lines
        </button>
      )}
    </section>
  );
}

function OwnerCard({
  label,
  value,
  highlight,
  className,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-100 px-4 py-3 ${
        highlight ? 'bg-blue-50/50' : 'bg-slate-50/80'
      } ${className ?? ''}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value?.trim() || '—'}</p>
    </div>
  );
}

function OwnerRow({
  owner,
  selected,
  onSelect,
}: {
  owner: AggregatedOwner;
  selected: boolean;
  onSelect?: (key: string | null) => void;
}) {
  return (
    <tr className={selected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}>
      <td className="px-3 py-3 font-medium text-slate-900">{owner.name}</td>
      <td className="px-3 py-3 text-slate-600">{owner.phone || '—'}</td>
      <td className="px-3 py-3 text-slate-600">{owner.nationalId || '—'}</td>
      <td className="px-3 py-3 text-slate-600">
        {formatOwnerGenderDisplay(owner.gender)}
      </td>
      <td className="px-3 py-3 text-slate-700">{owner.lineCount}</td>
      <td className="px-3 py-3 font-medium text-slate-800">
        {formatRwfDisplay(owner.totalSumAssured)}
      </td>
      {onSelect && (
        <td className="px-3 py-3 text-right">
          <button
            type="button"
            onClick={() => onSelect(selected ? null : owner.key)}
            className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            {selected ? 'Showing' : 'Filter lines'}
          </button>
        </td>
      )}
    </tr>
  );
}
