'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Send,
  Users,
  Wallet,
} from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useApiClient } from '@/utils/apiClient';
import { useFinanceApi } from '@/components/ui/finance/finance-api';
import type { FinanceAgentTotals } from '@/components/ui/finance/finance-domain';
import { useLivestockFinanceApi } from '@/features/livestock-finance/api';
import type { LivestockFinanceVetTotals } from '@/features/livestock-finance/domain';
import {
  adjacentYear,
  findCurrentBiWeeklyCycle,
  generateBiWeeklyCyclesForYear,
  PAYMENT_CYCLE_STATUS_LABELS,
  type BiWeeklyCycle,
  type PaymentCycleModule,
  type PaymentCycleStatus,
  type PaymentCycleSummary,
} from '@/features/payment-cycles/biweekly';
import {
  fetchPaymentCycleCatalogue,
  inferCycleStatus,
} from '@/features/payment-cycles/api';

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

function statusBadgeClass(status: PaymentCycleStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'initiated':
      return 'bg-blue-50 text-blue-800 ring-blue-200';
    case 'ready':
      return 'bg-amber-50 text-amber-900 ring-amber-200';
    case 'partial':
      return 'bg-violet-50 text-violet-800 ring-violet-200';
    case 'empty':
      return 'bg-slate-50 text-slate-500 ring-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 ring-slate-200';
  }
}

export interface PaymentCyclesWorkspaceProps {
  module: PaymentCycleModule;
}

type ProducerRow = {
  producerId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  applicationsCount: number;
  totalCommission: number;
  netPremium?: number;
};

function mapMotorRows(rows: FinanceAgentTotals[]): ProducerRow[] {
  return rows.map((a) => ({
    producerId: a.agentId,
    name: a.name,
    email: a.email,
    phoneNumber: a.phoneNumber,
    bankName: a.bankName,
    bankAccountNumber: a.bankAccountNumber,
    applicationsCount: a.applicationsCount,
    totalCommission: a.totalCommission,
  }));
}

function mapLivestockRows(rows: LivestockFinanceVetTotals[]): ProducerRow[] {
  return rows.map((v) => ({
    producerId: v.vetId,
    name: v.name,
    email: v.email,
    phoneNumber: v.phoneNumber,
    bankName: v.bankName,
    bankAccountNumber: v.bankAccountNumber,
    applicationsCount: v.applicationsCount,
    totalCommission: v.veterinaryCommission,
    netPremium: v.netPremium,
  }));
}

export default function PaymentCyclesWorkspace({ module }: PaymentCyclesWorkspaceProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { apiFetch } = useApiClient();
  const {
    getFinanceAgentStats,
    getAgentsCommissionBreakdown,
    initiatePaymentForRange,
    markAsPaidForRange,
  } = useFinanceApi();
  const {
    getLivestockFinanceVetStats,
    getVetsCommissionBreakdown,
    initiateLivestockPayment,
    markLivestockAsPaid,
  } = useLivestockFinanceApi();

  const isMotor = module === 'motor';
  const producerLabel = isMotor ? 'Agents' : 'Veterinarians';
  const commissionLabel = isMotor ? 'Agent commission' : 'Vet commission';
  const accent = isMotor
    ? {
        hero: 'from-blue-900 via-blue-800 to-indigo-900',
        eyebrow: 'text-blue-200/80',
        body: 'text-blue-100',
        chip: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/40',
        selected: 'border-indigo-500 bg-indigo-50/80',
      }
    : {
        hero: 'from-emerald-900 via-teal-800 to-indigo-900',
        eyebrow: 'text-emerald-200/80',
        body: 'text-emerald-100',
        chip: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/40',
        selected: 'border-emerald-500 bg-emerald-50/80',
      };

  const currentCycle = useMemo(() => findCurrentBiWeeklyCycle(), []);
  const [year, setYear] = useState(currentCycle.year);
  const [cycles, setCycles] = useState<PaymentCycleSummary[]>([]);
  const [selectedId, setSelectedId] = useState(currentCycle.id);
  const [isCatalogueLoading, setIsCatalogueLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [producers, setProducers] = useState<ProducerRow[]>([]);
  const [detailStatus, setDetailStatus] = useState<PaymentCycleStatus>('open');
  const [detailStats, setDetailStats] = useState({
    totalCommission: 0,
    totalApplications: 0,
    producerCount: 0,
    readyCount: 0,
    initiatedCount: 0,
    paidCount: 0,
  });

  const selectedCycle: BiWeeklyCycle | null = useMemo(() => {
    const fromList = cycles.find((c) => c.id === selectedId);
    if (fromList) return fromList;
    return generateBiWeeklyCyclesForYear(year).find((c) => c.id === selectedId) ?? null;
  }, [cycles, selectedId, year]);

  const range = useMemo(
    () =>
      selectedCycle
        ? { startDate: selectedCycle.startDate, endDate: selectedCycle.endDate }
        : null,
    [selectedCycle],
  );

  const loadCatalogue = useCallback(async () => {
    setIsCatalogueLoading(true);
    try {
      const catalogue = await fetchPaymentCycleCatalogue(apiFetch, module, year);
      setCycles(catalogue);
      setSelectedId((prev) => {
        if (catalogue.some((c) => c.id === prev)) return prev;
        const current = catalogue.find((c) => c.isCurrent);
        return current?.id ?? catalogue[catalogue.length - 1]?.id ?? prev;
      });
    } finally {
      setIsCatalogueLoading(false);
    }
  }, [apiFetch, module, year]);

  useEffect(() => {
    void loadCatalogue();
  }, [loadCatalogue]);

  const loadCycleDetail = useCallback(async () => {
    if (!range || !selectedId) return;
    setIsDetailLoading(true);
    try {
      if (isMotor) {
        const [readyStats, initiatedStats, paidStats, readyRows] = await Promise.all([
          getFinanceAgentStats(range, 'READY_TO_BE_PAID'),
          getFinanceAgentStats(range, 'PAYMENT_INITIATED'),
          getFinanceAgentStats(range, 'PAID'),
          getAgentsCommissionBreakdown(range, 'READY_TO_BE_PAID'),
        ]);
        const readyCount = Number(readyStats.totalApplications ?? 0);
        const initiatedCount = Number(initiatedStats.totalApplications ?? 0);
        const paidCount = Number(paidStats.totalApplications ?? 0);
        const totalApplications = readyCount + initiatedCount + paidCount;
        const status = inferCycleStatus({
          totalApplications,
          readyCount,
          initiatedCount,
          paidCount,
        });
        const totalCommission =
          Number(readyStats.totalCommission ?? 0) + Number(initiatedStats.totalCommission ?? 0);
        const producerCount = Number(readyStats.totalAgents ?? 0);
        setDetailStatus(status);
        setDetailStats({
          totalCommission,
          totalApplications,
          producerCount,
          readyCount,
          initiatedCount,
          paidCount,
        });
        setProducers(mapMotorRows(readyRows));
        setCycles((prev) =>
          prev.map((c) =>
            c.id === selectedId
              ? { ...c, status, totalCommission, totalApplications, producerCount }
              : c,
          ),
        );
      } else {
        const [readyStats, initiatedStats, paidStats, readyRows] = await Promise.all([
          getLivestockFinanceVetStats(range, 'READY_TO_BE_PAID'),
          getLivestockFinanceVetStats(range, 'PAYMENT_INITIATED'),
          getLivestockFinanceVetStats(range, 'PAID'),
          getVetsCommissionBreakdown(range, 'READY_TO_BE_PAID'),
        ]);
        const readyCount = Number(readyStats.totalApplications ?? 0);
        const initiatedCount = Number(initiatedStats.totalApplications ?? 0);
        const paidCount = Number(paidStats.totalApplications ?? 0);
        const totalApplications = readyCount + initiatedCount + paidCount;
        const status = inferCycleStatus({
          totalApplications,
          readyCount,
          initiatedCount,
          paidCount,
        });
        const totalCommission =
          Number(readyStats.totalCommission ?? 0) + Number(initiatedStats.totalCommission ?? 0);
        const producerCount = Number(readyStats.totalVets ?? 0);
        setDetailStatus(status);
        setDetailStats({
          totalCommission,
          totalApplications,
          producerCount,
          readyCount,
          initiatedCount,
          paidCount,
        });
        setProducers(mapLivestockRows(readyRows));
        setCycles((prev) =>
          prev.map((c) =>
            c.id === selectedId
              ? { ...c, status, totalCommission, totalApplications, producerCount }
              : c,
          ),
        );
      }
    } catch {
      setProducers([]);
      setDetailStatus('open');
      setDetailStats({
        totalCommission: 0,
        totalApplications: 0,
        producerCount: 0,
        readyCount: 0,
        initiatedCount: 0,
        paidCount: 0,
      });
      showToast('Could not load cycle commissions for this period.', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  }, [
    getAgentsCommissionBreakdown,
    getFinanceAgentStats,
    getLivestockFinanceVetStats,
    getVetsCommissionBreakdown,
    isMotor,
    range,
    selectedId,
    showToast,
  ]);

  useEffect(() => {
    void loadCycleDetail();
  }, [loadCycleDetail]);

  const initiatePayment = async () => {
    if (!range) return;
    if (detailStats.readyCount <= 0) {
      showToast('No ready-to-pay commissions in this cycle.', 'info');
      return;
    }
    setIsInitiating(true);
    try {
      if (isMotor) {
        await initiatePaymentForRange(range);
        showToast('Payment initiated for this bi-weekly cycle.', 'success');
        router.push('/finance/motor/payment-initiated');
      } else {
        await initiateLivestockPayment(range);
        showToast('Payment initiated for this bi-weekly cycle.', 'success');
        router.push('/finance/livestock/payment-initiated');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initiate payment.';
      showToast(message, 'error');
    } finally {
      setIsInitiating(false);
    }
  };

  const markAsPaid = async () => {
    if (!range) return;
    setIsMarkingPaid(true);
    try {
      if (isMotor) {
        await markAsPaidForRange(range);
      } else {
        await markLivestockAsPaid(range);
      }
      showToast('Cycle marked as paid.', 'success');
      await loadCycleDetail();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as paid.';
      showToast(message, 'error');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const downloadSheet = () => {
    if (!selectedCycle || !producers.length) {
      showToast('No producers to export for this cycle.', 'info');
      return;
    }
    const headers = isMotor
      ? [
          'Agent Name',
          'Email',
          'Phone Number',
          'Bank Name',
          'Account Number',
          'Applications Count',
          'Commission To Receive (RWF)',
        ]
      : [
          'Veterinarian Name',
          'Email',
          'Phone Number',
          'Bank Name',
          'Account Number',
          'Applications Count',
          'Net Premium (RWF)',
          'Vet Commission (RWF)',
        ];
    const rows = producers.map((p) =>
      isMotor
        ? [
            p.name,
            p.email ?? '',
            p.phoneNumber ?? '',
            p.bankName ?? '',
            p.bankAccountNumber ?? '',
            String(p.applicationsCount ?? 0),
            String(p.totalCommission ?? 0),
          ]
        : [
            p.name,
            p.email ?? '',
            p.phoneNumber ?? '',
            p.bankName ?? '',
            p.bankAccountNumber ?? '',
            String(p.applicationsCount ?? 0),
            String(p.netPremium ?? 0),
            String(p.totalCommission ?? 0),
          ],
    );
    const csv = toCsv([headers, ...rows]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${module}_payment_cycle_${selectedCycle.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const goYear = (delta: number) => {
    setYear((y) => adjacentYear(y, delta));
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">
        <div className={`relative mt-4 bg-gradient-to-r ${accent.hero} shadow-xl rounded-3xl lg:mt-6`}>
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-8">
            <div className="flex flex-col lg:flex-row justify-between gap-8 lg:items-center">
              <div className="text-white space-y-2">
                <p className={`text-[11px] uppercase tracking-[0.25em] ${accent.eyebrow}`}>
                  {isMotor ? 'Motor finance' : 'Livestock finance'} · Bi-weekly cycles
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
                  Commission Payment Cycles
                </h1>
                <p className={`${accent.body} text-sm max-w-xl`}>
                  Fourteen-day payout periods with auto-calculated date ranges. Select a cycle to
                  review commissions, initiate settlement, or mark the batch paid.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button
                  onClick={downloadSheet}
                  variant="outline"
                  size="sm"
                  className="border-white/40 bg-white/5 text-white hover:bg-white/15 gap-2 rounded-xl"
                  disabled={!producers.length}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="text-sm font-medium">Download cycle sheet</span>
                </Button>
                <Button
                  onClick={initiatePayment}
                  variant="primary"
                  size="sm"
                  className={`${accent.chip} gap-2 rounded-xl shadow-lg`}
                  disabled={isInitiating || detailStats.readyCount <= 0}
                >
                  {isInitiating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="text-sm font-semibold">Initiate cycle payment</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => goYear(-1)}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[7rem] text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Year</p>
              <p className="text-lg font-semibold text-slate-900">{year}</p>
            </div>
            <button
              type="button"
              onClick={() => goYear(1)}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {selectedCycle ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              <span>
                Cycle {selectedCycle.index}: <span className="font-medium text-slate-900">{selectedCycle.label}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                {selectedCycle.startDate} → {selectedCycle.endDate}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(detailStatus)}`}
              >
                {PAYMENT_CYCLE_STATUS_LABELS[detailStatus]}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-6">
          <aside className="xl:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Bi-weekly periods</p>
                  <p className="text-xs text-slate-500">14-day fortnights in {year}</p>
                </div>
                {isCatalogueLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
              </div>
              <div className="max-h-[32rem] overflow-y-auto divide-y divide-slate-100">
                {cycles.map((cycle) => {
                  const active = cycle.id === selectedId;
                  return (
                    <button
                      key={cycle.id}
                      type="button"
                      onClick={() => setSelectedId(cycle.id)}
                      className={`w-full text-left px-4 py-3 transition ${
                        active ? accent.selected : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Cycle {cycle.index}
                            {cycle.isCurrent ? (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-indigo-600">
                                Current
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{cycle.label}</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {cycle.startDate} – {cycle.endDate}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${statusBadgeClass(cycle.status)}`}
                        >
                          {PAYMENT_CYCLE_STATUS_LABELS[cycle.status]}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {!isCatalogueLoading && cycles.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">No cycles for this year.</p>
                ) : null}
              </div>
            </div>
          </aside>

          <section className="xl:col-span-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide">
                  <Wallet className="h-3.5 w-3.5" />
                  Ready / initiated
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatCurrency(detailStats.totalCommission)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Applications
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {detailStats.totalApplications}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {detailStats.readyCount} ready · {detailStats.initiatedCount} initiated ·{' '}
                  {detailStats.paidCount} paid
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide">
                  <Users className="h-3.5 w-3.5" />
                  {producerLabel}
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {detailStats.producerCount || producers.length}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Ready to pay — {producerLabel.toLowerCase()}
                  </p>
                  <p className="text-xs text-slate-500">
                    Uses existing initiate / mark-paid APIs with this cycle&apos;s dates.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl"
                    onClick={() =>
                      router.push(
                        isMotor
                          ? '/finance/motor/payment-initiated'
                          : '/finance/livestock/payment-initiated',
                      )
                    }
                  >
                    View initiated
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl"
                    disabled={isMarkingPaid || detailStats.initiatedCount <= 0}
                    onClick={markAsPaid}
                  >
                    {isMarkingPaid ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Mark cycle paid
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {isDetailLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading cycle commissions…
                  </div>
                ) : producers.length === 0 ? (
                  <p className="px-4 py-16 text-center text-sm text-slate-500">
                    No ready-to-pay commissions in this cycle.
                  </p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">{isMotor ? 'Agent' : 'Veterinarian'}</th>
                        <th className="px-4 py-3 font-medium">Bank</th>
                        <th className="px-4 py-3 font-medium text-right">Apps</th>
                        {!isMotor ? (
                          <th className="px-4 py-3 font-medium text-right">Net premium</th>
                        ) : null}
                        <th className="px-4 py-3 font-medium text-right">{commissionLabel}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {producers.map((p) => (
                        <tr key={p.producerId || p.name} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.email || p.phoneNumber || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <p>{p.bankName || '—'}</p>
                            <p className="text-xs text-slate-400">{p.bankAccountNumber || ''}</p>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                            {p.applicationsCount}
                          </td>
                          {!isMotor ? (
                            <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                              {formatCurrency(p.netPremium ?? 0)}
                            </td>
                          ) : null}
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                            {formatCurrency(p.totalCommission)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
