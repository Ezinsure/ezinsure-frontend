'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, FileSpreadsheet, Send, Search, Users, DollarSign, Loader2, Eye } from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedAgent, setSelectedAgent] = useState<FinanceAgent | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const totals = await api.getAccrualAgentTotals(range);
        if (!cancelled) setAgents(totals);
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
  }, [api, range]);

  const filteredAgents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => {
      return (
        a.name.toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q) ||
        a.agentId.toLowerCase().includes(q) ||
        (a.phoneNumber ?? '').toLowerCase().includes(q)
      );
    });
  }, [agents, searchTerm]);

  const totals = useMemo(() => {
    const totalCommission = agents.reduce((s, a) => s + Number(a.totalCommission ?? 0), 0);
    const totalAgents = agents.length;
    const totalApplications = agents.reduce((s, a) => s + Number(a.applicationsCount ?? 0), 0);
    return { totalCommission, totalAgents, totalApplications };
  }, [agents]);

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
    try {
      await api.initiatePaymentForRange(range);
      showToast('Payment initiated. Review your payout snapshots in Payment Initiated.', 'success');
      router.push('/finance/payment-initiated');
    } catch {
      showToast('Failed to initiate payment.', 'error');
    }
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]" />

        <div className="relative mt-10 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl rounded-2xl">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
            <div className="flex flex-col lg:flex-row justify-between gap-4">
              <div className="text-white">
                <h1 className="text-3xl sm:text-4xl font-bold mb-1">Finance Settlement Explorer</h1>
                <p className="text-blue-100 text-sm">Review agent commissions, verify applications, and initiate bank payouts.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
                <Button
                  onClick={downloadPayoutSheet}
                  variant="outline"
                  size="sm"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10 gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Download Payout Sheet
                </Button>
                <Button
                  onClick={initiatePayment}
                  variant="primary"
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Initiate Payment
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DateRangePicker
            startDate={range.startDate}
            endDate={range.endDate}
            onStartDateChange={(d) => setRange((prev) => ({ ...prev, startDate: d }))}
            onEndDateChange={(d) => setRange((prev) => ({ ...prev, endDate: d }))}
            minStartDate={'2020-01-01'}
            maxEndDate={'2100-01-01'}
            className="lg:col-span-1"
          />

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="w-4 h-4" />
                Total Commission
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totals.totalCommission)}</div>
              <div className="text-sm text-gray-500 mt-1">Across selected date range</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                Agents
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{totals.totalAgents}</div>
              <div className="text-sm text-gray-500 mt-1">Eligible to receive</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                Applications
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{totals.totalApplications}</div>
              <div className="text-sm text-gray-500 mt-1">In agent totals</div>
            </div>
          </div>
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
            ) : filteredAgents.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-gray-600">No eligible agents for the selected range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredAgents.map((a) => (
                      <tr key={a.agentId} className="hover:bg-gray-50">
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
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(a.totalCommission)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setSelectedAgent(a)}
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
      />
    </MainLayout>
  );
}

