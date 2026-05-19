'use client';

import { useMemo, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VetApplicationStatusBadge } from '@/features/vet-portal/vet-application-status-badge';
import type { VeterinaryApplication } from '@/features/vet-portal/types';
import { formatRwf } from '@/features/vet-portal/utils';
import { formatDateUTC } from '@/utils/date-formatter';

interface VetApplicationsTableProps {
  applications: VeterinaryApplication[];
  isLoading?: boolean;
  onViewDetails: (application: VeterinaryApplication) => void;
  itemsPerPageDefault?: number;
  showSearch?: boolean;
}

export function VetApplicationsTable({
  applications,
  isLoading = false,
  onViewDetails,
  itemsPerPageDefault = 10,
  showSearch = true,
}: VetApplicationsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageDefault);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) => {
      const haystack = [
        app.applicationNumber,
        app.policyNumber,
        app.ownerName,
        app.ownerPhone,
        app.chipNumber,
        app.species,
        app.breed,
        app.status,
        app.district,
        app.sector,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [applications, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, itemsPerPage, safePage]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by app #, owner, policy, chip…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-700">No applications found</p>
          <p className="mt-1 text-xs text-slate-500">
            {applications.length === 0
              ? 'Try adjusting the date range or check back after new imports.'
              : 'No rows match your search.'}
          </p>
        </div>
      ) : (
        <>
          <div className="w-full max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[72rem] w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Application
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Animal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Policy
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Commission
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {paged.map((app) => (
                  <tr key={app._id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{app.applicationNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{app.ownerName}</p>
                      <p className="text-xs text-slate-500">{app.ownerPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">
                        {app.species} · {app.breed}
                      </p>
                      <p className="font-mono text-xs text-slate-500">{app.chipNumber}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{app.policyNumber}</td>
                    <td className="px-4 py-3">
                      <VetApplicationStatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatRwf(app.veterinaryCommission)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateUTC(app.submittedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="gap-1 text-[11px] font-medium"
                        onClick={() => onViewDetails(app)}
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden sm:inline">View details</span>
                        <span className="sm:hidden">View</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Rows per page</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>
                {filtered.length === 0
                  ? '0 results'
                  : `${(safePage - 1) * itemsPerPage + 1}–${Math.min(safePage * itemsPerPage, filtered.length)} of ${filtered.length}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-600">
                Page {safePage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
