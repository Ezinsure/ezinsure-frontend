'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, ChevronLeft, Eye, FileSpreadsheet, Loader2 } from 'lucide-react';
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

export default function FinancePaymentInitiatedView() {
  const router = useRouter();
  const api = useFinanceApi();
  const { showToast } = useToast();

  const [batches, setBatches] = useState<FinanceBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [agents, setAgents] = useState<FinanceAgentTotals[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [agentModalOpenFor, setAgentModalOpenFor] = useState<FinanceAgent | null>(null);
  const [markingBatchId, setMarkingBatchId] = useState<string | null>(null);

  const selectedBatch = useMemo(() => batches.find((b) => b.id === selectedBatchId) ?? null, [batches, selectedBatchId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const data = await api.getInitiatedBatches();
        if (cancelled) return;
        setBatches(data);
        // default select first INITIATED batch, else first batch
        const firstInitiated = data.find((b) => b.status === 'INITIATED');
        setSelectedBatchId((firstInitiated ?? data[0] ?? null)?.id ?? null);
      } catch {
        if (cancelled) return;
        setBatches([]);
        setSelectedBatchId(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBatch) {
      setAgents([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const rows = await api.getInitiatedAgentTotals(selectedBatch.monthYear.month, selectedBatch.monthYear.year);
      if (!cancelled) setAgents(rows);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [api, selectedBatch]);

  const totalBatchAmount = useMemo(() => agents.reduce((s, a) => s + Number(a.totalCommission ?? 0), 0), [agents]);

  const downloadBatchSheet = () => {
    if (!selectedBatch || agents.length === 0) {
      showToast('No agents to export for the selected batch.', 'info');
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

    const rows = agents.map((a) => [
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
    link.download = `finance_batch_${selectedBatch.monthYear.label.replace(' ', '_')}_payouts.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const markBatchAsPaid = async (batch: FinanceBatch) => {
    if (batch.status !== 'INITIATED') return;
    try {
      setMarkingBatchId(batch.id);
      await api.markBatchPaid(batch.id);
      showToast(`Batch marked as paid: ${batch.monthYear.label}`, 'success');
      // refresh
      const data = await api.getInitiatedBatches();
      setBatches(data);
      // keep selection by id
      setSelectedBatchId((prev) => prev ?? data[0]?.id ?? null);
    } catch {
      showToast('Failed to mark batch as paid.', 'error');
    } finally {
      setMarkingBatchId(null);
    }
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
                  disabled={!selectedBatch}
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
              <p className="text-sm text-gray-500">Mark as paid once transfers are confirmed.</p>
            </div>

            <div className="p-3 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                  <p className="text-gray-600">Loading batches…</p>
                </div>
              ) : batches.length === 0 ? (
                <div className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-900">No initiated batches</p>
                  <p className="text-sm text-gray-600 mt-1">Initiate a range from the dashboard.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {batches.map((b) => {
                    const isActive = b.id === selectedBatchId;
                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBatchId(b.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                          isActive
                            ? 'border-indigo-200 bg-indigo-50'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-gray-900">{b.monthYear.label}</div>
                            <div className="text-[11px] text-gray-500">{b.status}</div>
                          </div>
                          <div className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                            b.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {b.status === 'PAID' ? 'Paid' : 'Initiated'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Agent Payout List</h2>
                  <p className="text-sm text-gray-500">
                    {selectedBatch ? `Snapshot for ${selectedBatch.monthYear.label}` : 'Select a batch to view snapshot details.'}
                  </p>
                </div>
                {selectedBatch && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Total</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalBatchAmount)}</div>
                  </div>
                )}
              </div>

              <div className="p-5">
                {selectedBatch && agents.length > 0 ? (
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
                        {agents.map((a) => (
                          <tr key={a.agentId} className="hover:bg-gray-50">
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
                ) : selectedBatch ? (
                  <div className="py-10 text-center">
                    <p className="text-gray-600">No applications in this snapshot.</p>
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-gray-600">Select a batch to view snapshot totals.</p>
                  </div>
                )}
              </div>
            </div>

            {selectedBatch && (
              <div className="flex items-center justify-between gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div>
                  <div className="text-sm text-gray-600">Batch status</div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {selectedBatch.status === 'PAID' ? 'Paid' : 'Payment initiated (snapshot frozen)'}
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
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    onClick={() => markBatchAsPaid(selectedBatch)}
                    disabled={selectedBatch.status !== 'INITIATED' || markingBatchId === selectedBatch.id}
                  >
                    {markingBatchId === selectedBatch.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Mark as paid
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <FinanceApplicationsByAgentModalUI
        isOpen={Boolean(agentModalOpenFor)}
        onClose={() => setAgentModalOpenFor(null)}
        context="initiated"
        agent={agentModalOpenFor}
        month={selectedBatch?.monthYear.month}
        year={selectedBatch?.monthYear.year}
      />
    </MainLayout>
  );
}

