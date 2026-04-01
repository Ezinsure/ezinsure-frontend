'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/ui/main-layout';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import type { PaidHistoryAgentRow, PaidHistoryMonthBlock } from './finance-domain';
import { useFinanceApi } from './finance-api';
import AgentDetailModal from '@/components/ui/admin/agent-detail-modal';

function formatCurrency(value: number) {
  return `${value.toLocaleString()} RWF`;
}

function isoEndOfMonth(year: number, monthIndex1to12: number): string {
  const d = new Date(year, monthIndex1to12, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MIN_HISTORY_YEAR = 2000;

export default function FinanceHistoryView() {
  const { getPaidBatchesByYear } = useFinanceApi();
  const { showToast } = useToast();
  const { token } = useAuth();

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const yearOptions = useMemo(() => {
    const out: number[] = [];
    for (let y = currentYear; y >= MIN_HISTORY_YEAR; y -= 1) out.push(y);
    return out;
  }, [currentYear]);

  const [year, setYear] = useState<number>(currentYear);
  const [months, setMonths] = useState<PaidHistoryMonthBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [agentsModalMonth, setAgentsModalMonth] = useState<PaidHistoryMonthBlock | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<'name' | 'email' | 'bankName' | 'totalPaid'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [agentDetail, setAgentDetail] = useState<{
    agentId: string;
    name: string;
    email: string;
    monthIndex: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const data = await getPaidBatchesByYear(year);
        if (!cancelled) setMonths(data);
      } catch (err) {
        if (!cancelled) {
          setMonths([]);
          const message = err instanceof Error ? err.message : 'Failed to load payment history.';
          showToast(message, 'error');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [getPaidBatchesByYear, showToast, year]);

  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(1);
    setSortField('name');
    setSortDirection('asc');
  }, [agentsModalMonth]);

  const handleSort = useCallback(
    (field: 'name' | 'email' | 'bankName' | 'totalPaid') => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection(field === 'totalPaid' ? 'desc' : 'asc');
      }
      setCurrentPage(1);
    },
    [sortField],
  );

  const SortIcon = ({ field }: { field: 'name' | 'email' | 'bankName' | 'totalPaid' }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
    );
  };

  const modalAgentsFilteredSorted = useMemo(() => {
    if (!agentsModalMonth) return [];
    const q = searchTerm.trim().toLowerCase();
    let rows = agentsModalMonth.agents;
    if (q) {
      rows = rows.filter((a) => {
        const hay = [a.name, a.email, a.phoneNumber, a.bankName, a.bankAccountNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const copy = [...rows];
    copy.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortField === 'totalPaid') {
        aVal = Number(a.totalPaid ?? 0);
        bVal = Number(b.totalPaid ?? 0);
      } else {
        aVal = String(a[sortField] ?? '').toLowerCase();
        bVal = String(b[sortField] ?? '').toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [agentsModalMonth, searchTerm, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(modalAgentsFilteredSorted.length / itemsPerPage));
  const pagedModalAgents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return modalAgentsFilteredSorted.slice(start, start + itemsPerPage);
  }, [currentPage, itemsPerPage, modalAgentsFilteredSorted]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openAgentDashboard = (row: PaidHistoryAgentRow, monthIndex: number) => {
    if (!row.agentId) {
      showToast('Missing agent id for this record.', 'error');
      return;
    }
    setAgentDetail({
      agentId: row.agentId,
      name: row.name || 'Agent',
      email: row.email || '',
      monthIndex,
    });
  };

  const closeAgentsModal = () => {
    setAgentsModalMonth(null);
    setAgentDetail(null);
  };

  const monthShort = (full: string) => full.slice(0, 3);

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]" />

        <div className="mt-10 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl rounded-2xl text-white">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-1">Payment History</h1>
                <p className="text-blue-100 text-sm">
                  Paid commission totals by month. Open a month to see agents, then open an agent for full profile and analytics.
                </p>
              </div>
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-[11px] uppercase tracking-wide text-blue-200/90 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="px-3 py-2.5 border border-white/30 bg-white/10 text-white rounded-xl text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y} className="text-gray-900">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Paid totals by month</h2>
            <p className="text-sm text-gray-500 mt-1">Twelve months for {year}. Data from the finance paid-batches API.</p>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600">Loading {year}…</p>
            </div>
          ) : (
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {months.map((block) => {
                  const agentCount = block.agents.length;
                  const hasActivity = agentCount > 0 || block.totalMonthPaid > 0;
                  return (
                    <div
                      key={block.monthName}
                      className={`rounded-2xl border p-4 flex flex-col gap-3 min-h-[140px] ${
                        hasActivity ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600/90">
                            {monthShort(block.monthName)}
                          </div>
                          <div className="text-base font-bold text-gray-900 leading-tight">{block.monthName}</div>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="text-gray-600">
                          <span className="font-medium text-gray-900">{agentCount}</span> agent{agentCount === 1 ? '' : 's'}
                        </div>
                        <div className="font-semibold text-gray-900">{formatCurrency(block.totalMonthPaid)}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-auto w-full gap-2"
                        onClick={() => setAgentsModalMonth(block)}
                      >
                        <Eye className="h-4 w-4" />
                        View details
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agents for selected month — sortable, paginated */}
      {agentsModalMonth && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Agents paid • {agentsModalMonth.monthName} {year}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Total {formatCurrency(agentsModalMonth.totalMonthPaid)} · {agentsModalMonth.agents.length} agent
                  {agentsModalMonth.agents.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAgentsModal}
                className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                aria-label="Close"
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search name, email, bank, phone…"
                  className="w-full sm:max-w-xs px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {modalAgentsFilteredSorted.length === 0 ? (
                <p className="text-sm text-gray-600 py-6 text-center">No agents match this filter for this month.</p>
              ) : (
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
                            <button type="button" onClick={() => handleSort('email')} className="inline-flex items-center gap-1.5">
                              Email
                              <SortIcon field="email" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                            <button type="button" onClick={() => handleSort('bankName')} className="inline-flex items-center gap-1.5">
                              Bank
                              <SortIcon field="bankName" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                            <button
                              type="button"
                              onClick={() => handleSort('totalPaid')}
                              className="ml-auto inline-flex items-center gap-1.5"
                            >
                              Total paid
                              <SortIcon field="totalPaid" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {pagedModalAgents.map((a, idx) => (
                          <tr
                            key={a.agentId || `agent-${(currentPage - 1) * itemsPerPage + idx}`}
                            className="hover:bg-indigo-50/40"
                          >
                            <td className="px-4 py-3 font-semibold text-gray-900">{a.name || '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{a.email || '—'}</td>
                            <td className="px-4 py-3 text-gray-700">
                              <div className="font-medium">{a.bankName ?? '—'}</div>
                              <div className="text-[11px] text-gray-500">{a.bankAccountNumber ?? '—'}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(a.totalPaid)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => openAgentDashboard(a, agentsModalMonth.monthIndex)}
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
                        Showing {modalAgentsFilteredSorted.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–
                        {Math.min(currentPage * itemsPerPage, modalAgentsFilteredSorted.length)} of{' '}
                        {modalAgentsFilteredSorted.length}
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
              <Button variant="outline" onClick={closeAgentsModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {agentDetail && (
        <AgentDetailModal
          isOpen
          onClose={() => setAgentDetail(null)}
          agentId={agentDetail.agentId}
          agentName={agentDetail.name}
          agentEmail={agentDetail.email}
          token={token ?? ''}
          initialStartDate={`${year}-${String(agentDetail.monthIndex).padStart(2, '0')}-01`}
          initialEndDate={isoEndOfMonth(year, agentDetail.monthIndex)}
        />
      )}
    </MainLayout>
  );
}
