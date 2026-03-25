'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/ui/main-layout';
import { useToast } from '@/components/ui/toast';
import type { FinanceAgent, FinanceAgentTotals, FinanceBatch } from './finance-domain';
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

export default function FinanceHistoryView() {
  const api = useFinanceApi();
  const { showToast } = useToast();

  const [batches, setBatches] = useState<FinanceBatch[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const [isLoading, setIsLoading] = useState(true);

  const paidBatches = useMemo(() => batches.filter((b) => b.status === 'PAID' && b.monthYear.year === year), [batches, year]);

  const [agentsByBatchKey, setAgentsByBatchKey] = useState<Record<string, FinanceAgentTotals[]>>({});

  const [agentsModalBatch, setAgentsModalBatch] = useState<FinanceBatch | null>(null);
  const [agentModalAgent, setAgentModalAgent] = useState<FinanceAgent | null>(null);

  const batchKey = (b: FinanceBatch) => `${b.monthYear.year}-${b.monthYear.month}`;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const data = await api.getInitiatedBatches();
        if (cancelled) return;
        setBatches(data);
      } catch {
        if (cancelled) return;
        setBatches([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    const loadAgentTotalsForPaidBatches = async () => {
      if (!paidBatches.length) {
        setAgentsByBatchKey({});
        return;
      }
      const entries = await Promise.all(
        paidBatches.map(async (b) => {
          const rows = await api.getInitiatedAgentTotals(b.monthYear.month, b.monthYear.year);
          return [batchKey(b), rows] as const;
        }),
      );
      if (cancelled) return;
      const next: Record<string, FinanceAgentTotals[]> = {};
      for (const [k, v] of entries) next[k] = v;
      setAgentsByBatchKey(next);
    };
    loadAgentTotalsForPaidBatches();
    return () => {
      cancelled = true;
    };
  }, [api, paidBatches]);

  const years = useMemo(() => {
    const ys = Array.from(new Set(batches.map((b) => b.monthYear.year))).sort((a, b) => b - a);
    return ys.length ? ys : [new Date().getFullYear()];
  }, [batches]);

  const downloadBatchSheet = (batch: FinanceBatch) => {
    const rows = agentsByBatchKey[batchKey(batch)] ?? [];
    if (!rows.length) {
      showToast('No agent totals to export for this batch.', 'info');
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

    const csvRows = rows.map((a) => [
      a.name,
      a.email ?? '',
      a.phoneNumber ?? '',
      a.bankName ?? '',
      a.bankAccountNumber ?? '',
      String(a.applicationsCount ?? 0),
      String(a.totalCommission ?? 0),
    ]);

    const csv = toCsv([headers, ...csvRows]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance_paid_${batch.monthYear.label.replace(' ', '_')}_payouts.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]" />

        <div className="mt-10 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl rounded-2xl text-white">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-1">Payment History</h1>
                <p className="text-blue-100 text-sm">Paid snapshots by month. Drill into agents and applications for verification.</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="px-3 py-2 border border-white/30 bg-white/10 text-white rounded-xl text-sm"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Paid Batches</h2>
              <p className="text-sm text-gray-500">Select a month to view agents and application lines.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600">Loading history…</p>
            </div>
          ) : paidBatches.length === 0 ? (
            <div className="py-16 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">No paid batches for {year}</p>
              <p className="text-sm text-gray-600 mt-1">When finance marks a batch as paid, it appears here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto p-5">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Agents</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Total Paid</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paidBatches
                    .slice()
                    .sort((a, b) => (a.monthYear.month - b.monthYear.month))
                    .map((b) => {
                      const agentRows = agentsByBatchKey[batchKey(b)] ?? [];
                      const total = agentRows.reduce((s, a) => s + Number(a.totalCommission ?? 0), 0);
                      return (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900">{b.monthYear.label}</td>
                          <td className="px-4 py-3 text-gray-700">{agentRows.length}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(total)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setAgentsModalBatch(b)}
                              >
                                <Eye className="h-4 w-4" />
                                View agents
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => downloadBatchSheet(b)}
                              >
                                <Download className="h-4 w-4" />
                                Export
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <FinanceApplicationsByAgentModalUI
        isOpen={Boolean(agentModalAgent && agentsModalBatch)}
        onClose={() => setAgentModalAgent(null)}
        context="paid"
        agent={agentModalAgent}
        month={agentsModalBatch?.monthYear.month}
        year={agentsModalBatch?.monthYear.year}
      />

      {/* Agents modal */}
      {agentsModalBatch && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Agents • {agentsModalBatch.monthYear.label}</h3>
                <p className="text-sm text-gray-600">Click View to verify applications that built the snapshot total.</p>
              </div>
              <button onClick={() => setAgentsModalBatch(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {(() => {
                const agentRows = agentsByBatchKey[batchKey(agentsModalBatch)] ?? [];
                if (!agentRows.length) {
                  return <p className="text-sm text-gray-600">No agents found.</p>;
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {agentRows.map((a) => (
                          <tr key={a.agentId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">{a.name}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <div className="font-medium">{a.bankName ?? '—'}</div>
                              <div className="text-[11px] text-gray-500">{a.bankAccountNumber ?? '—'}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(a.totalCommission)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() =>
                                    setAgentModalAgent({
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
                );
              })()}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end">
              <Button variant="outline" onClick={() => setAgentsModalBatch(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

