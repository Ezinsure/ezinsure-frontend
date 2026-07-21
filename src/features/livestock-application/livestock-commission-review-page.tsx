'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import { LivestockApplicationsPagination } from '@/features/livestock-application/components/shared/livestock-applications-pagination';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import type { LivestockApplicationViewRole } from '@/features/livestock-application/domain/application-types';
import {
  ownerModeLabel,
  speciesGroupLabel,
} from '@/features/livestock-application/domain/form-profiles';
import { useLivestockCommissionReview } from '@/features/livestock-application/hooks/use-livestock-commission-review';
import { formatLocationSummary } from '@/features/livestock-application/utils/application-location';
import { formatSubmittedDateTime } from '@/features/livestock-application/utils/application-location';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

type SortField =
  | 'applicationNumber'
  | 'ownerSummary'
  | 'vetName'
  | 'speciesGroup'
  | 'submittedAt'
  | 'veterinaryCommission';

type SortDirection = 'asc' | 'desc';

function detailHref(role: LivestockApplicationViewRole, applicationId: string): string {
  if (role === 'finance') return `/finance/livestock/applications/${applicationId}`;
  if (role === 'super_admin') return `/super_admin/livestock/applications/${applicationId}`;
  return `/admin/livestock/applications/${applicationId}`;
}

function pageCopy(role: LivestockApplicationViewRole) {
  if (role === 'finance') {
    return {
      title: 'Livestock admin review',
      subtitle:
        'Review veterinary commissions and mark approved applications as ready to be paid.',
    };
  }
  if (role === 'super_admin') {
    return {
      title: 'Livestock admin review',
      subtitle: 'Oversee pending veterinary commission approvals across livestock applications.',
    };
  }
  return {
    title: 'Livestock admin review',
    subtitle:
      'Applications awaiting admin review after SONARWA approval. Mark each one ready to be paid when amounts are verified.',
  };
}

export interface LivestockCommissionReviewPageProps {
  viewRole: LivestockApplicationViewRole;
}

export default function LivestockCommissionReviewPage({
  viewRole,
}: LivestockCommissionReviewPageProps) {
  const { showToast, ToastContainer } = useToast();
  const copy = pageCopy(viewRole);
  const {
    items,
    count,
    totalVeterinaryCommission,
    isLoading,
    error,
    reload,
    approveOne,
    approveMany,
    isApproving,
  } = useLivestockCommissionReview();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVet, setSelectedVet] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<SortField>('submittedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [selectedApp, setSelectedApp] = useState<LivestockApplicationListItem | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  const vetOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.vetName?.trim()) {
        map.set(item.vetName.trim(), item.vetName.trim());
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const haystack = [
        item.applicationNumber,
        item.ownerSummary,
        item.vetName,
        speciesGroupLabel(item.speciesGroup),
        formatLocationSummary(item.livestockLocation ?? { district: '', sector: '', cell: '', village: '' }),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);
      const matchesVet = selectedVet === 'all' || item.vetName === selectedVet;

      const submittedAt = new Date(item.submittedAt);
      const matchesStart = !startDate || submittedAt >= new Date(`${startDate}T00:00:00`);
      const matchesEnd = !endDate || submittedAt <= new Date(`${endDate}T23:59:59`);

      return matchesSearch && matchesVet && matchesStart && matchesEnd;
    });

    filtered.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'applicationNumber':
          aVal = a.applicationNumber.toLowerCase();
          bVal = b.applicationNumber.toLowerCase();
          break;
        case 'ownerSummary':
          aVal = a.ownerSummary.toLowerCase();
          bVal = b.ownerSummary.toLowerCase();
          break;
        case 'vetName':
          aVal = (a.vetName ?? '').toLowerCase();
          bVal = (b.vetName ?? '').toLowerCase();
          break;
        case 'speciesGroup':
          aVal = a.speciesGroup;
          bVal = b.speciesGroup;
          break;
        case 'submittedAt':
          aVal = new Date(a.submittedAt).getTime();
          bVal = new Date(b.submittedAt).getTime();
          break;
        case 'veterinaryCommission':
          aVal = a.veterinaryCommission ?? 0;
          bVal = b.veterinaryCommission ?? 0;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [items, searchQuery, selectedVet, startDate, endDate, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  const filteredCommissionTotal = filteredItems.reduce(
    (sum, item) => sum + (item.veterinaryCommission ?? 0),
    0,
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection(field === 'submittedAt' ? 'desc' : 'asc');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const handleApproveSelected = async () => {
    if (!selectedApp) return;
    try {
      await approveOne(selectedApp._id, {
        notes: approvalNotes.trim() || undefined,
      });
      showToast('Application marked as ready to be paid.', 'success');
      setSelectedApp(null);
      setApprovalNotes('');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to mark application as ready to be paid.',
        'error',
      );
    }
  };

  const handleApproveAllFiltered = async () => {
    if (filteredItems.length === 0) return;
    try {
      const { successful, failed } = await approveMany(filteredItems.map((item) => item._id));
      if (successful > 0) {
        showToast(
          `${successful} application${successful > 1 ? 's' : ''} marked as ready to be paid${
            failed > 0 ? `, ${failed} failed` : ''
          }.`,
          failed > 0 ? 'info' : 'success',
        );
      } else {
        showToast('Failed to mark applications as ready to be paid. Please try again.', 'error');
      }
      setSelectedApp(null);
      setApprovalNotes('');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to mark applications as ready to be paid.',
        'error',
      );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ToastContainer />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{copy.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{copy.subtitle}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void reload()} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh queue
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-orange-100 p-3">
              <Wallet className="h-6 w-6 text-orange-800" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Pending veterinary commission</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {formatRwfDisplay(
                  filteredItems.length > 0 ? filteredCommissionTotal : totalVeterinaryCommission,
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {filteredItems.length > 0 && filteredItems.length !== items.length
                  ? 'Total for filtered applications'
                  : 'Total for the pending review queue'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Applications in queue</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{count}</p>
          <p className="mt-1 text-xs text-slate-500">Status: Pending admin review</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-end">
          <div className="w-full lg:max-w-[40%] lg:flex-shrink-0">
            <span className="mb-1 block text-xs font-medium text-slate-500">Search</span>
            <div className="flex h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <input
                type="search"
                name="commissionReviewSearch"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search application, owner, veterinarian, location…"
                className="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm leading-normal text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[60%] lg:flex-1">
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">Veterinarian</span>
              <select
                value={selectedVet}
                onChange={(event) => {
                  setSelectedVet(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="all">All veterinarians</option>
                {vetOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">From</span>
              <input
                type="date"
                name="commissionReviewStartDate"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </label>
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">To</span>
              <input
                type="date"
                name="commissionReviewEndDate"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Showing{' '}
            <span className="font-semibold text-slate-900">{filteredItems.length}</span>{' '}
            application{filteredItems.length === 1 ? '' : 's'} after filters
          </p>
          <Button
            type="button"
            disabled={filteredItems.length === 0 || isApproving || isLoading}
            onClick={() => void handleApproveAllFiltered()}
          >
            {isApproving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve all filtered
          </Button>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-600">
            {items.length === 0
              ? 'No livestock applications are waiting for admin review.'
              : 'No applications match your filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[64rem] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {(
                    [
                      ['Application', 'applicationNumber'],
                      ['Owner(s)', 'ownerSummary'],
                      ['Veterinarian', 'vetName'],
                      ['Species', 'speciesGroup'],
                      ['Submitted', 'submittedAt'],
                      ['Vet commission', 'veterinaryCommission'],
                    ] as const
                  ).map(([label, field]) => (
                    <th key={field} className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleSort(field)}
                        className="inline-flex cursor-pointer items-center gap-1.5 font-semibold"
                      >
                        {label}
                        <SortIcon field={field} />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-blue-700">{item.applicationNumber}</td>
                    <td className="px-4 py-3 text-slate-800">
                      <p>{item.ownerSummary}</p>
                      <p className="text-xs text-slate-500">{ownerModeLabel(item.ownerMode)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.vetName || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {speciesGroupLabel(item.speciesGroup)}
                      <p className="text-xs text-slate-500">
                        {item.lineCount} line{item.lineCount === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatSubmittedDateTime(item.submittedAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatRwfDisplay(item.veterinaryCommission ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <LivestockApplicationStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={detailHref(viewRole, item._id)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Link>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isApproving}
                          onClick={() => {
                            setSelectedApp(item);
                            setApprovalNotes('');
                          }}
                        >
                          Mark ready
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-4 py-4">
          <LivestockApplicationsPagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
            disabled={isLoading}
          />
        </div>
      </div>

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
            role="dialog"
            aria-labelledby="approve-commission-title"
          >
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 id="approve-commission-title" className="text-lg font-semibold text-slate-900">
                Mark as ready to be paid
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {selectedApp.applicationNumber} · {selectedApp.ownerSummary}
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-[10px] font-semibold uppercase text-slate-400">Vet commission</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {formatRwfDisplay(selectedApp.veterinaryCommission ?? 0)}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-[10px] font-semibold uppercase text-slate-400">Veterinarian</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{selectedApp.vetName || '—'}</dd>
                </div>
              </dl>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">
                  Notes <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(event) => setApprovalNotes(event.target.value)}
                  disabled={isApproving}
                  placeholder="Finance review notes sent to the API as notes…"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={isApproving}
                onClick={() => {
                  setSelectedApp(null);
                  setApprovalNotes('');
                }}
              >
                Cancel
              </Button>
              <Button type="button" disabled={isApproving} onClick={() => void handleApproveSelected()}>
                {isApproving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Mark as ready to be paid
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
