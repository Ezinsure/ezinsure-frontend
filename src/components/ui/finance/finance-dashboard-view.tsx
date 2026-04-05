'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  FileSpreadsheet,
  Send,
  Search,
  Users,
  DollarSign,
  Loader2,
  Eye,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { useFinanceApi } from './finance-api';
import type { FinanceAgent, FinanceAgentTotals, FinanceDateRange } from './finance-domain';
import FinanceApplicationsByAgentModalUI from './finance-applications-by-agent-modal-ui';

function formatCurrency(value: number) {
  return `${value.toLocaleString()} RWF`;
}

function toCsv(rows: string[][]) {
  // Minimal CSV writer compatible with Excel
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const v = cell ?? '';
          const needsQuotes = /[",\n]/.test(v);
          const escaped = v.replace(/"/g, '""');
          return needsQuotes ? `"${escaped}"` : escaped;
        })
        .join(','),
    )
    .join('\n');
}

export default function FinanceDashboardView() {
  const router = useRouter();
  const api = useFinanceApi();
  const { getFinanceAgentStats, getAgentsCommissionBreakdown, initiatePaymentForRange } = api;
  const { showToast } = useToast();

  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return d.toISOString().slice(0, 10);
  }, [today]);
  const defaultEnd = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const [range, setRange] = useState<FinanceDateRange>({
    startDate: defaultStart,
    endDate: defaultEnd,
  });

  const [agents, setAgents] = useState<FinanceAgentTotals[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [applicationStatus, setApplicationStatus] = useState<'PAID' | 'READY_TO_BE_PAID' | 'PAYMENT_INITIATED' | 'ALL'>(
    'READY_TO_BE_PAID',
  );
  const [financeStats, setFinanceStats] = useState({
    totalCommission: 0,
    totalApplications: 0,
    totalAgents: 0,
  });

  const [selectedAgent, setSelectedAgent] = useState<FinanceAgent | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<'name' | 'bankName' | 'applicationsCount' | 'totalCommission'>('totalCommission');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const statusOptions: { label: string; value: 'PAID' | 'READY_TO_BE_PAID' | 'PAYMENT_INITIATED' | 'ALL' }[] = [
    { label: 'Ready to be paid', value: 'READY_TO_BE_PAID' },
    { label: 'Paid', value: 'PAID' },
    { label: 'All applications', value: 'ALL' },
  ];

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const financeAgentStatsResponse = await getFinanceAgentStats(range, applicationStatus);
        if (!cancelled) {
          setFinanceStats({
            totalCommission: Number(financeAgentStatsResponse?.totalCommission ?? 0),
            totalApplications: Number(financeAgentStatsResponse?.totalApplications ?? 0),
            totalAgents: Number(financeAgentStatsResponse?.totalAgents ?? 0),
          });
        }

        const totals = await getAgentsCommissionBreakdown(range, applicationStatus);
        if (!cancelled) setAgents(totals);
      } catch {
        if (!cancelled) {
          setAgents([]);
          setFinanceStats({ totalCommission: 0, totalApplications: 0, totalAgents: 0 });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [applicationStatus, getAgentsCommissionBreakdown, getFinanceAgentStats, range]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, applicationStatus, range, itemsPerPage]);

  const filteredAgents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => {
      const name = String(a.name ?? '').toLowerCase();
      const email = String(a.email ?? '').toLowerCase();
      const agentId = String(a.agentId ?? '').toLowerCase();
      const phoneNumber = String(a.phoneNumber ?? '').toLowerCase();
      const bankName = String(a.bankName ?? '').toLowerCase();
      const bankAccountNumber = String(a.bankAccountNumber ?? '').toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        agentId.includes(q) ||
        phoneNumber.includes(q) ||
        bankName.includes(q) ||
        bankAccountNumber.includes(q)
      );
    });
  }, [agents, searchTerm]);

  const sortedAgents = useMemo(() => {
    const rows = [...filteredAgents];
    rows.sort((a, b) => {
      const aVal =
        sortField === 'totalCommission' || sortField === 'applicationsCount'
          ? Number(a[sortField] ?? 0)
          : String(a[sortField] ?? '').toLowerCase();
      const bVal =
        sortField === 'totalCommission' || sortField === 'applicationsCount'
          ? Number(b[sortField] ?? 0)
          : String(b[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filteredAgents, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedAgents.length / itemsPerPage));
  const pagedAgents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAgents.slice(start, start + itemsPerPage);
  }, [currentPage, itemsPerPage, sortedAgents]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleSort = (field: 'name' | 'bankName' | 'applicationsCount' | 'totalCommission') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' || field === 'bankName' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: 'name' | 'bankName' | 'applicationsCount' | 'totalCommission' }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
    );
  };

  const downloadPayoutSheet = () => {
    if (!agents.length) {
      showToast('No agents to export for the selected date range.', 'info');
      return;
    }

    const headers = [
      'Agent Name',
      'Email',
      'Phone Number',
      'Bank Name',
      'Account Number',
      'Applications Count',
      'Commission To Receive (RWF)',
    ];

    const rows = filteredAgents.map((a) => [
      a.name,
      a.email ?? '',
      a.phoneNumber ?? '',
      a.bankName ?? '',
      a.bankAccountNumber ?? '',
      String(a.applicationsCount ?? 0),
      String(a.totalCommission ?? 0),
    ]);

    const csv = toCsv([headers, ...rows]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance_payout_sheet_${range.startDate}_to_${range.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const initiatePayment = async () => {
    setIsInitiatingPayment(true);
    try {
      await initiatePaymentForRange(range);
      showToast('Payment initiated. Review your payout snapshots in Payment Initiated.', 'success');
      router.push('/finance/payment-initiated');
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
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]" />

        <div className="relative mt-10 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl rounded-3xl">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-8">
            <div className="flex flex-col lg:flex-row justify-between gap-8 lg:items-center">
              <div className="text-white space-y-2">
                <p className="text-[11px] uppercase tracking-[0.25em] text-blue-200/80">Finance dashboard</p>
                <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">Finance Settlement Explorer</h1>
                <p className="text-blue-100 text-sm max-w-xl">
                  Monitor settlement performance, review agent commissions, and confidently initiate payouts across any
                  date window.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button
                  onClick={downloadPayoutSheet}
                  variant="outline"
                  size="sm"
                  className="border-white/40 bg-white/5 text-white hover:bg-white/15 gap-2 rounded-xl"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="text-sm font-medium">Download payout sheet</span>
                </Button>
                <Button
                  onClick={initiatePayment}
                  variant="primary"
                  size="sm"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 gap-2 rounded-xl shadow-lg shadow-cyan-500/40"
                  disabled={isInitiatingPayment}
                >
                  {isInitiatingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
              {applicationStatus === 'ALL'
                ? 'All applications'
                : applicationStatus === 'PAID'
                ? 'Paid only'
                : 'Ready to be paid'}
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
                    setApplicationStatus(e.target.value as 'PAID' | 'READY_TO_BE_PAID' | 'PAYMENT_INITIATED' | 'ALL')
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-8 w-40 bg-gray-200 rounded mt-3" />
                <div className="h-3 w-44 bg-gray-100 rounded mt-3" />
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse">
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="h-8 w-12 bg-gray-200 rounded mt-3" />
                <div className="h-3 w-36 bg-gray-100 rounded mt-3" />
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-8 w-12 bg-gray-200 rounded mt-3" />
                <div className="h-3 w-32 bg-gray-100 rounded mt-3" />
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
                <div className="absolute right-4 -top-4 h-16 w-16 rounded-full bg-emerald-100/70 blur-2xl" />
                <div className="relative flex items-center justify-between gap-2 text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <DollarSign className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Total commission</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">
                        {formatCurrency(financeStats.totalCommission)}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">Across selected period and status filter.</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-10 w-24 bg-indigo-50 rounded-bl-full" />
                <div className="relative flex items-center gap-2 text-gray-600">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Users className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Agents</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{financeStats.totalAgents}</p>
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
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{financeStats.totalApplications}</p>
                    <p className="mt-1 text-xs text-gray-500">Included in agent totals.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Agents & Total Commission</h2>
              <p className="text-sm text-gray-500">Click View to verify which applications build the total.</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search agent name, email, phone..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading agents and commission…</p>
              </div>
            ) : sortedAgents.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-gray-600">No eligible agents for the selected range.</p>
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
                            Agent
                            <SortIcon field="name" />
                          </button>
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
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handleSort('applicationsCount')}
                            className="ml-auto inline-flex items-center gap-1.5 hover:text-indigo-700"
                          >
                            Applications
                            <SortIcon field="applicationsCount" />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handleSort('totalCommission')}
                            className="ml-auto inline-flex items-center gap-1.5 hover:text-indigo-700"
                          >
                            Commission
                            <SortIcon field="totalCommission" />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {pagedAgents.map((a) => (
                        <tr key={a.agentId} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{a.name}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="font-medium">{a.bankName ?? '—'}</div>
                            <div className="text-[11px] text-gray-500">{a.bankAccountNumber ?? '—'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="font-medium">{a.email ?? '—'}</div>
                            <div className="text-[11px] text-gray-500">{a.phoneNumber ?? '—'}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700">{a.applicationsCount}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(a.totalCommission)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end">
                              <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedAgent(a)}>
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">View details</span>
                                <span className="sm:hidden">View</span>
                              </Button>
                            </div>
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
                      Showing {sortedAgents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                      {Math.min(currentPage * itemsPerPage, sortedAgents.length)} of {sortedAgents.length}
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

      <FinanceApplicationsByAgentModalUI
        isOpen={Boolean(selectedAgent)}
        onClose={() => setSelectedAgent(null)}
        context="accrual"
        agent={selectedAgent}
        range={range}
        applicationStatus={applicationStatus}
      />
    </MainLayout>
  );
}

