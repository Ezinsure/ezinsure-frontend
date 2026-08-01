'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  DollarSign,
  Eye,
  FileSpreadsheet,
  Filter,
  Loader2,
  Search,
  Send,
  Stethoscope,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { useLivestockFinanceApi } from './api';
import type {
  LivestockFinanceApplicationStatusFilter,
  LivestockFinanceDateRange,
  LivestockFinanceVet,
  LivestockFinanceVetTotals,
} from './domain';
import { downloadVetCommissionMemoExcel } from './export/vet-commission-memo-export';
import VetApplicationsModal from './components/vet-applications-modal';

function formatCurrency(value: number) {
  return `${value.toLocaleString()} RWF`;
}

type SortField =
  | 'name'
  | 'bankName'
  | 'applicationsCount'
  | 'veterinaryCommission'
  | 'netPremium';

export default function LivestockPaymentsView() {
  const router = useRouter();
  const api = useLivestockFinanceApi();
  const { showToast } = useToast();

  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return d.toISOString().slice(0, 10);
  }, [today]);
  const defaultEnd = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const [range, setRange] = useState<LivestockFinanceDateRange>({
    startDate: defaultStart,
    endDate: defaultEnd,
  });
  const [vets, setVets] = useState<LivestockFinanceVetTotals[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [applicationStatus, setApplicationStatus] =
    useState<LivestockFinanceApplicationStatusFilter>('READY_TO_BE_PAID');
  const [financeStats, setFinanceStats] = useState({
    totalCommission: 0,
    totalApplications: 0,
    totalVets: 0,
    totalNetPremium: 0,
  });
  const [selectedVet, setSelectedVet] = useState<LivestockFinanceVet | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('veterinaryCommission');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const statusOptions: { label: string; value: LivestockFinanceApplicationStatusFilter }[] = [
    { label: 'Ready to be paid', value: 'READY_TO_BE_PAID' },
    { label: 'Payment initiated', value: 'PAYMENT_INITIATED' },
    { label: 'Paid', value: 'PAID' },
    { label: 'All applications', value: 'ALL' },
  ];

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const [stats, breakdown] = await Promise.all([
          api.getLivestockFinanceVetStats(range, applicationStatus),
          api.getVetsCommissionBreakdown(range, applicationStatus),
        ]);
        if (!cancelled) {
          setFinanceStats({
            totalCommission: stats.totalCommission,
            totalApplications: stats.totalApplications,
            totalVets: stats.totalVets,
            totalNetPremium: stats.totalNetPremium ?? 0,
          });
          setVets(breakdown);
        }
      } catch {
        if (!cancelled) {
          setVets([]);
          setFinanceStats({ totalCommission: 0, totalApplications: 0, totalVets: 0, totalNetPremium: 0 });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [api, applicationStatus, range]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, applicationStatus, range, itemsPerPage]);

  const filteredVets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return vets;
    return vets.filter((v) => {
      const districts = v.districts.join(' ').toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        (v.email ?? '').toLowerCase().includes(q) ||
        (v.phoneNumber ?? '').toLowerCase().includes(q) ||
        (v.bankName ?? '').toLowerCase().includes(q) ||
        (v.bankAccountNumber ?? '').toLowerCase().includes(q) ||
        districts.includes(q)
      );
    });
  }, [searchTerm, vets]);

  const sortedVets = useMemo(() => {
    const rows = [...filteredVets];
    rows.sort((a, b) => {
      const aVal =
        sortField === 'name' || sortField === 'bankName'
          ? String(a[sortField] ?? '').toLowerCase()
          : Number(a[sortField] ?? 0);
      const bVal =
        sortField === 'name' || sortField === 'bankName'
          ? String(b[sortField] ?? '').toLowerCase()
          : Number(b[sortField] ?? 0);
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filteredVets, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedVets.length / itemsPerPage));
  const pagedVets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedVets.slice(start, start + itemsPerPage);
  }, [currentPage, itemsPerPage, sortedVets]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' || field === 'bankName' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
    );
  };

  const exportMemo = async () => {
    if (!sortedVets.length) {
      showToast('No veterinarians to export for the selected date range.', 'info');
      return;
    }
    setIsExporting(true);
    try {
      await downloadVetCommissionMemoExcel(sortedVets, {
        fromName: 'Finance',
        date: new Date().toISOString().slice(0, 10),
        dateRange: range,
      });
      showToast('Internal memo exported successfully.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.';
      showToast(message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const initiatePayment = async () => {
    setIsInitiatingPayment(true);
    try {
      await api.initiateLivestockPayment(range);
      showToast('Payment initiated. Review payout snapshots in Initiated Payments.', 'success');
      router.push('/finance/livestock/payment-initiated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initiate payment.';
      showToast(message, 'error');
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">
        <div className="relative mt-4 bg-gradient-to-r from-emerald-900 via-teal-800 to-indigo-900 shadow-xl rounded-3xl lg:mt-6">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-8">
            <div className="flex flex-col lg:flex-row justify-between gap-8 lg:items-center">
              <div className="text-white space-y-2">
                <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-200/80">
                  Livestock finance · Vet commissions
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
                  Veterinarian Settlement Explorer
                </h1>
                <p className="text-emerald-100 text-sm max-w-xl">
                  Monitor livestock insurance commissions, review vet payouts (10% vet / 3.5% Solektra),
                  and initiate settlement batches across any date window.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button
                  onClick={exportMemo}
                  variant="outline"
                  size="sm"
                  className="border-white/40 bg-white/5 text-white hover:bg-white/15 gap-2 rounded-xl"
                  disabled={isExporting || vets.length === 0}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">Export internal memo</span>
                </Button>
                <Button
                  onClick={initiatePayment}
                  variant="primary"
                  size="sm"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-2 rounded-xl shadow-lg shadow-cyan-500/40"
                  disabled={isInitiatingPayment}
                >
                  {isInitiatingPayment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span className="text-sm font-semibold">Initiate payment</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Filter className="w-4 h-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">Filters</h2>
            </div>
            <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-500">
              {statusOptions.find((o) => o.value === applicationStatus)?.label ?? applicationStatus}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
              <input
                type="date"
                value={range.startDate}
                max={range.endDate || '2100-01-01'}
                min="2020-01-01"
                onChange={(e) => setRange((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
              <input
                type="date"
                value={range.endDate}
                min={range.startDate || '2020-01-01'}
                max="2100-01-01"
                onChange={(e) => setRange((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Application status</label>
              <select
                value={applicationStatus}
                onChange={(e) =>
                  setApplicationStatus(e.target.value as LivestockFinanceApplicationStatusFilter)
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse"
                >
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-8 w-40 bg-gray-200 rounded mt-3" />
                  <div className="h-3 w-44 bg-gray-100 rounded mt-3" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
                <div className="absolute right-4 -top-4 h-16 w-16 rounded-full bg-emerald-100/70 blur-2xl" />
                <div className="relative flex items-center gap-2 text-gray-600">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <DollarSign className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Total commission (13.5%)</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {formatCurrency(financeStats.totalCommission)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Net premium: {formatCurrency(financeStats.totalNetPremium)}
                </p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
                <div className="relative flex items-center gap-2 text-gray-600">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <Stethoscope className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Veterinarians</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{financeStats.totalVets}</p>
                    <p className="mt-1 text-xs text-gray-500">Eligible in current selection.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Applications</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {financeStats.totalApplications}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Included in vet totals.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Veterinarians & Commissions</h2>
              <p className="text-sm text-gray-500">Click View to verify which applications build each total.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vet, district, bank…"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading veterinarians and commissions…</p>
              </div>
            ) : sortedVets.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-gray-600">No eligible veterinarians for the selected range.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handleSort('name')}
                            className="inline-flex items-center gap-1.5 hover:text-indigo-700"
                          >
                            Veterinarian
                            <SortIcon field="name" />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                          District
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handleSort('bankName')}
                            className="inline-flex items-center gap-1.5 hover:text-indigo-700"
                          >
                            Bank
                            <SortIcon field="bankName" />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handleSort('applicationsCount')}
                            className="ml-auto inline-flex items-center gap-1.5 hover:text-indigo-700"
                          >
                            Apps
                            <SortIcon field="applicationsCount" />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handleSort('netPremium')}
                            className="ml-auto inline-flex items-center gap-1.5 hover:text-indigo-700"
                          >
                            Net premium
                            <SortIcon field="netPremium" />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handleSort('veterinaryCommission')}
                            className="ml-auto inline-flex items-center gap-1.5 hover:text-indigo-700"
                          >
                            Vet (10%)
                            <SortIcon field="veterinaryCommission" />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {pagedVets.map((v) => (
                        <tr key={v.vetId} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{v.name}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{v.districts.join(', ') || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="font-medium">{v.bankName ?? '—'}</div>
                            <div className="text-[11px] text-gray-500">{v.bankAccountNumber ?? '—'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="font-medium">{v.email ?? '—'}</div>
                            <div className="text-[11px] text-gray-500">{v.phoneNumber ?? '—'}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700">
                            {v.applicationsCount}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-800">
                            {formatCurrency(v.netPremium)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {formatCurrency(v.veterinaryCommission)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setSelectedVet(v)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
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
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    >
                      {[5, 10, 20, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <span>
                      Showing {sortedVets.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                      {Math.min(currentPage * itemsPerPage, sortedVets.length)} of {sortedVets.length}
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
        </div>
      </div>

      <VetApplicationsModal
        isOpen={Boolean(selectedVet)}
        onClose={() => setSelectedVet(null)}
        vet={selectedVet}
        range={range}
        applicationStatus={applicationStatus}
      />
    </MainLayout>
  );
}
