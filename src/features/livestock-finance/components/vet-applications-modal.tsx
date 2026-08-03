'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateUTC } from '@/utils/date-formatter';
import { useLivestockFinanceApi } from '../api';
import type {
  LivestockFinanceApplication,
  LivestockFinanceApplicationStatusFilter,
  LivestockFinanceDateRange,
  LivestockFinanceVet,
} from '../domain';

function formatCurrency(value: number) {
  return `${value.toLocaleString()} RWF`;
}

interface VetApplicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vet: LivestockFinanceVet | null;
  range: LivestockFinanceDateRange;
  applicationStatus?: LivestockFinanceApplicationStatusFilter;
}

export default function VetApplicationsModal({
  isOpen,
  onClose,
  vet,
  range,
  applicationStatus = 'READY_TO_BE_PAID',
}: VetApplicationsModalProps) {
  const { getApplicationsByVetFinance } = useLivestockFinanceApi();
  const [isLoading, setIsLoading] = useState(false);
  const [applications, setApplications] = useState<LivestockFinanceApplication[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<
    'applicationNumber' | 'clientName' | 'netPremium' | 'veterinaryCommission' | 'submittedAt'
  >('submittedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!isOpen || !vet) return;
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const result = await getApplicationsByVetFinance(vet.vetId, range, applicationStatus);
        if (!cancelled) {
          setApplications(result.data);
          setTotalCommission(result.totalCommission);
        }
      } catch {
        if (!cancelled) {
          setApplications([]);
          setTotalCommission(0);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [applicationStatus, getApplicationsByVetFinance, isOpen, range, vet]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setCurrentPage(1);
    }
  }, [isOpen, vet?.vetId]);

  const filteredApps = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((a) => {
      const hay = [a.applicationNumber, a.clientName, a.district, a.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [applications, searchTerm]);

  const sortedApps = useMemo(() => {
    const rows = [...filteredApps];
    rows.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortField === 'netPremium' || sortField === 'veterinaryCommission') {
        aVal = Number(a[sortField] ?? 0);
        bVal = Number(b[sortField] ?? 0);
      } else if (sortField === 'submittedAt') {
        aVal = new Date(a.submittedAt ?? 0).getTime();
        bVal = new Date(b.submittedAt ?? 0).getTime();
      } else {
        aVal = String(a[sortField] ?? '').toLowerCase();
        bVal = String(b[sortField] ?? '').toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filteredApps, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedApps.length / itemsPerPage));
  const pagedApps = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedApps.slice(start, start + itemsPerPage);
  }, [currentPage, itemsPerPage, sortedApps]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleSort = (
    field: 'applicationNumber' | 'clientName' | 'netPremium' | 'veterinaryCommission',
  ) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'applicationNumber' || field === 'clientName' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({
    field,
  }: {
    field: 'applicationNumber' | 'clientName' | 'netPremium' | 'veterinaryCommission';
  }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
    );
  };

  if (!isOpen || !vet) return null;

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{vet.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Applications · {range.startDate} to {range.endDate} · Total vet commission{' '}
              {formatCurrency(totalCommission)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          <div className="mb-4 relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search application, client, district…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
              <p className="text-gray-600">Loading applications…</p>
            </div>
          ) : sortedApps.length === 0 ? (
            <p className="text-sm text-gray-600 py-6 text-center">No applications for this selection.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('applicationNumber')}
                          className="inline-flex items-center gap-1.5"
                        >
                          Application
                          <SortIcon field="applicationNumber" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('clientName')}
                          className="inline-flex items-center gap-1.5"
                        >
                          Client
                          <SortIcon field="clientName" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                        District
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('netPremium')}
                          className="ml-auto inline-flex items-center gap-1.5"
                        >
                          Net premium
                          <SortIcon field="netPremium" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => handleSort('veterinaryCommission')}
                          className="ml-auto inline-flex items-center gap-1.5"
                        >
                          Vet (10%)
                          <SortIcon field="veterinaryCommission" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                        Solektra (3.5%)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {pagedApps.map((app) => (
                      <tr key={app._id} className="hover:bg-indigo-50/40">
                        <td className="px-4 py-3 font-semibold text-gray-900">{app.applicationNumber}</td>
                        <td className="px-4 py-3 text-gray-700">{app.clientName ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{app.district ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {app.submittedAt ? formatDateUTC(app.submittedAt) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                          {formatCurrency(app.netPremium ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(app.veterinaryCommission ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatCurrency(app.solektraCommission ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>Items per page</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                  >
                    {[5, 10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span>
                    Showing {sortedApps.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–
                    {Math.min(currentPage * itemsPerPage, sortedApps.length)} of {sortedApps.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
