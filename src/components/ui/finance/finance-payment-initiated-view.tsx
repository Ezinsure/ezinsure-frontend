'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, Eye, FileSpreadsheet, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/ui/main-layout';
import { useToast } from '@/components/ui/toast';
import type { FinanceAgent, FinanceAgentTotals, FinanceDateRange } from './finance-domain';
import { useFinanceApi } from './finance-api';
import FinanceApplicationsByAgentModalUI from './finance-applications-by-agent-modal-ui';

function formatCurrency(value: number) {
  return `${value.toLocaleString()} RWF`;
}

function toCsv(rows: string[][]) {
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

export default function FinancePaymentInitiatedView() {
  const router = useRouter();
  const api = useFinanceApi();
  const { showToast } = useToast();

  const [agents, setAgents] = useState<FinanceAgentTotals[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [agentModalOpenFor, setAgentModalOpenFor] = useState<FinanceAgent | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<'name' | 'bankName' | 'applicationsCount' | 'totalCommission'>('totalCommission');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const availableYears = useMemo(() => Array.from({ length: 6 }, (_, idx) => currentYear - idx), [currentYear]);
  const monthNames = useMemo(
    () => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    [],
  );
  const selectedMonthLabel = useMemo(() => monthNames[selectedMonth - 1], [monthNames, selectedMonth]);
  const selectedRange = useMemo<FinanceDateRange>(() => {
    const start = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
    const end = new Date(Date.UTC(selectedYear, selectedMonth, 0));
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const rows = await api.getAgentsCommissionBreakdown(selectedRange, 'PAYMENT_INITIATED');
        if (!cancelled) setAgents(rows);
      } catch {
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [api, selectedRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMonth, selectedYear, itemsPerPage]);

  useEffect(() => {
    if (selectedYear === currentYear && selectedMonth > currentMonth) {
      setSelectedMonth(currentMonth);
    }
  }, [currentMonth, currentYear, selectedMonth, selectedYear]);

  const totalBatchAmount = useMemo(() => agents.reduce((s, a) => s + Number(a.totalCommission ?? 0), 0), [agents]);
  const hasInitiatedRows = useMemo(() => agents.some((a) => Number(a.applicationsCount ?? 0) > 0), [agents]);

  const filteredAgents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => {
      const name = String(a.name ?? '').toLowerCase();
      const email = String(a.email ?? '').toLowerCase();
      const phone = String(a.phoneNumber ?? '').toLowerCase();
      const bank = String(a.bankName ?? '').toLowerCase();
      const account = String(a.bankAccountNumber ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || bank.includes(q) || account.includes(q);
    });
  }, [agents, searchTerm]);

  const sortedAgents = useMemo(() => {
    const rows = [...filteredAgents];
    rows.sort((a, b) => {
      const aVal =
        sortField === 'applicationsCount' || sortField === 'totalCommission'
          ? Number(a[sortField] ?? 0)
          : String(a[sortField] ?? '').toLowerCase();
      const bVal =
        sortField === 'applicationsCount' || sortField === 'totalCommission'
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

  const downloadBatchSheet = () => {
    if (agents.length === 0) {
      showToast('No agents to export for the selected month.', 'info');
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

    const rows = sortedAgents.map((a) => [
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
    link.download = `finance_batch_${selectedMonthLabel}_${selectedYear}_payouts.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]" />

        <div className="mt-10 bg-gradient-to-r from-indigo-900 via-blue-900 to-blue-700 text-white rounded-2xl shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-1">Payment Initiated Payout Console</h1>
                <p className="text-indigo-100 text-sm">
                  Download bank-ready sheets and verify which applications build each agent total. Snapshot values are frozen.
                </p>
              </div>

              <div className="flex gap-2 flex-col sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10 gap-2"
                  onClick={downloadBatchSheet}
                  disabled={agents.length === 0}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Download Sheet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10 gap-2"
                  onClick={() => router.push('/finance/dashboard')}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Explorer
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Monthly Batches</h2>
              <p className="text-sm text-gray-500">Select a month to load payout list for {currentYear}.</p>
            </div>

            <div className="p-4">
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {monthNames.map((month, idx) => {
                  const monthNumber = idx + 1;
                  const isActive = monthNumber === selectedMonth;
                  const isFutureMonth = selectedYear === currentYear && monthNumber > currentMonth;
                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => setSelectedMonth(monthNumber)}
                      disabled={isFutureMonth}
                      className={`h-16 rounded-xl border text-sm font-semibold transition ${
                        isActive
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/40'
                      } ${isFutureMonth ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Agent Payout List</h2>
                  <p className="text-sm text-gray-500">
                    {`Ready-to-be-paid applications for ${selectedMonthLabel} ${selectedYear}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Total</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalBatchAmount)}</div>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4 relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search agent, bank, contact..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {isLoading ? (
                  <div className="py-10 flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                    <p className="text-gray-600">Loading agents…</p>
                  </div>
                ) : sortedAgents.length > 0 ? (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                              <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center gap-1.5">
                                Agent
                                <SortIcon field="name" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                              <button type="button" onClick={() => handleSort('bankName')} className="inline-flex items-center gap-1.5">
                                Bank
                                <SortIcon field="bankName" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                              <button type="button" onClick={() => handleSort('applicationsCount')} className="ml-auto inline-flex items-center gap-1.5">
                                Applications
                                <SortIcon field="applicationsCount" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                              <button type="button" onClick={() => handleSort('totalCommission')} className="ml-auto inline-flex items-center gap-1.5">
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
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-800">{a.bankName ?? '—'}</div>
                                <div className="text-[11px] text-gray-500">{a.bankAccountNumber ?? '—'}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-800">{a.email ?? '—'}</div>
                                <div className="text-[11px] text-gray-500">{a.phoneNumber ?? '—'}</div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-700">{a.applicationsCount}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(a.totalCommission)}</td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() =>
                                      setAgentModalOpenFor({
                                        agentId: a.agentId,
                                        name: a.name,
                                        email: a.email,
                                        phoneNumber: a.phoneNumber,
                                        bankName: a.bankName,
                                        bankAccountNumber: a.bankAccountNumber,
                                      })
                                    }
                                  >
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
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
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
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-gray-600">
                      No payment was initiated for any applications in {selectedMonthLabel} {selectedYear}.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div>
                  <div className="text-sm text-gray-600">Month status</div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {hasInitiatedRows ? 'Payment initiated (awaiting payment)' : 'No initiated payout'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadBatchSheet}
                    disabled={agents.length === 0}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>
          </div>
        </div>
      </div>

      <FinanceApplicationsByAgentModalUI
        isOpen={Boolean(agentModalOpenFor)}
        onClose={() => setAgentModalOpenFor(null)}
        context="accrual"
        agent={agentModalOpenFor}
        range={selectedRange}
        applicationStatus="PAYMENT_INITIATED"
        lockApplicationStatus
      />
    </MainLayout>
  );
}

