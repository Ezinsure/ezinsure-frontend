'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Eye,
  FileText,
  Loader2,
  Search,
  Wallet,
  X,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import type {
  LivestockApplicationListItem,
  LivestockApplicationStatus,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import {
  ownerModeLabel,
  speciesGroupLabel,
} from '@/features/livestock-application/domain/form-profiles';
import { formatSubmittedDateTime } from '@/features/livestock-application/utils/application-location';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import { LivestockApplicationDetailPanel } from '@/features/livestock-application/components/livestock-application-detail-panel';
import { useLivestockApplicationDetail } from '@/features/livestock-application/hooks/use-livestock-applications';
import type { VetPerformanceRow } from '@/features/livestock-application/hooks/use-vet-analytics';
import { createLivestockApplicationsRepositoryForScope } from '@/features/livestock-application/api/livestock-applications.repository';
import { LivestockApiError } from '@/features/livestock-application/api/http';
import { useApiClient } from '@/utils/apiClient';
import { APPLICATION_STATUS_LABELS } from '@/features/livestock-application/domain/application-status';

interface VetApplicationsDrawerProps {
  isOpen: boolean;
  vet: VetPerformanceRow | null;
  viewRole: LivestockApplicationViewRole;
  startDate: string;
  endDate: string;
  periodLabel?: string;
  onClose: () => void;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-white/40 bg-white/10 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
        <span className={tone}>{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-base font-bold text-white">{value}</p>
    </div>
  );
}

function toErrorMessage(err: unknown): string {
  if (err instanceof LivestockApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Failed to load veterinarian applications.';
}

export function VetApplicationsDrawer({
  isOpen,
  vet,
  viewRole,
  startDate,
  endDate,
  periodLabel,
  onClose,
}: VetApplicationsDrawerProps) {
  const { apiFetch } = useApiClient();
  const repository = useMemo(
    () => createLivestockApplicationsRepositoryForScope(apiFetch, 'vet'),
    [apiFetch],
  );

  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LivestockApplicationStatus>('all');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [applications, setApplications] = useState<LivestockApplicationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    application,
    isLoading: isDetailLoading,
    error: detailError,
    reload,
  } = useLivestockApplicationDetail(selectedAppId, { scope: 'all' });

  const loadApplications = useCallback(async () => {
    if (!vet?.vetId) {
      setApplications([]);
      setError(
        'This veterinarian has no ID on file, so applications cannot be loaded. Refresh analytics and try again.',
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const collected: LivestockApplicationListItem[] = [];
      for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
        const res = await repository.list({
          agentId: vet.vetId,
          startDate,
          endDate,
          pageNumber,
          pageSize: PAGE_SIZE,
          scope: 'vet',
        });
        collected.push(...res.data);
        if (res.data.length === 0 || pageNumber >= res.meta.totalPages) break;
      }
      setApplications(
        collected.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        ),
      );
    } catch (err) {
      setError(toErrorMessage(err));
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [repository, vet, startDate, endDate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setStatusFilter('all');
      setSelectedAppId(null);
      setApplications([]);
      setError(null);
      return;
    }
    void loadApplications();
  }, [isOpen, loadApplications]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(applications.map((item) => item.status))).sort();
    return statuses;
  }, [applications]);

  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        item.applicationNumber,
        item.ownerSummary,
        speciesGroupLabel(item.speciesGroup),
        APPLICATION_STATUS_LABELS[item.status] ?? item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [applications, search, statusFilter]);

  if (!mounted) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && vet && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-[2px]"
              aria-label="Close veterinarian applications"
              onClick={onClose}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 34, stiffness: 340, mass: 0.9 }}
              className="fixed inset-0 z-[151] flex flex-col overflow-hidden bg-slate-50 shadow-2xl sm:inset-auto sm:bottom-0 sm:right-0 sm:top-0 sm:w-full sm:max-w-[min(100%,44rem)] lg:max-w-[min(100%,56rem)]"
              role="dialog"
              aria-modal="true"
              aria-label={`${vet.vetName} applications`}
            >
              <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 px-5 py-5 sm:px-6">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                      Veterinarian performance{periodLabel ? ` · ${periodLabel}` : ''}
                    </p>
                    <h2 className="mt-1 truncate text-xl font-bold text-white sm:text-2xl">
                      {vet.vetName}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <MiniStat
                    icon={<FileText className="h-3.5 w-3.5" />}
                    label="Applications"
                    value={vet.totalApplications.toLocaleString()}
                    tone="text-sky-200"
                  />
                  <MiniStat
                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    label="Insured value"
                    value={formatRwfDisplay(vet.totalInsuranceAmount)}
                    tone="text-emerald-200"
                  />
                  <MiniStat
                    icon={<Wallet className="h-3.5 w-3.5" />}
                    label="Commission"
                    value={formatRwfDisplay(vet.totalCommission)}
                    tone="text-amber-200"
                  />
                  <MiniStat
                    icon={<Layers className="h-3.5 w-3.5" />}
                    label="Avg / app"
                    value={formatRwfDisplay(Math.round(vet.averageCommission))}
                    tone="text-rose-200"
                  />
                </div>
              </div>

              <div className="shrink-0 space-y-3 border-b border-slate-200 bg-white px-5 py-3 sm:px-6">
                <div className="flex h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search application number, owner, species…"
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as 'all' | LivestockApplicationStatus)
                    }
                    className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All statuses</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {APPLICATION_STATUS_LABELS[status] ?? status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                {isLoading ? (
                  <div className="flex min-h-[240px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : error ? (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                    <FileText className="h-10 w-10 text-slate-300" />
                    <p className="text-sm text-slate-500">
                      {applications.length === 0
                        ? 'No applications for this veterinarian in the selected period.'
                        : 'No applications match your filters.'}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {filteredApps.map((item) => (
                      <ApplicationCard
                        key={item._id}
                        item={item}
                        onViewDetails={() => setSelectedAppId(item._id)}
                      />
                    ))}
                  </ul>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-500 sm:px-6">
                Showing {filteredApps.length} of {applications.length} application
                {applications.length === 1 ? '' : 's'}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LivestockApplicationDetailPanel
        isOpen={Boolean(selectedAppId)}
        application={application}
        isLoading={isDetailLoading}
        error={detailError}
        viewRole={viewRole}
        onClose={() => setSelectedAppId(null)}
        onUpdated={() => void reload()}
      />
    </>,
    document.body,
  );
}

function ApplicationCard({
  item,
  onViewDetails,
}: {
  item: LivestockApplicationListItem;
  onViewDetails: () => void;
}) {
  const insuredValue = Number(item.totalSumAssured ?? item.totals?.premiumRateAmount ?? 0);
  return (
    <li className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-blue-700">{item.applicationNumber}</p>
            <LivestockApplicationStatusBadge status={item.status} />
          </div>
          <p className="mt-1 truncate text-sm font-medium text-slate-800">{item.ownerSummary}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {speciesGroupLabel(item.speciesGroup)} · {ownerModeLabel(item.ownerMode)} ·{' '}
            {item.lineCount} line{item.lineCount === 1 ? '' : 's'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Submitted {formatSubmittedDateTime(item.submittedAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={onViewDetails}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          <Eye className="h-3.5 w-3.5" />
          View details
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Insured value
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">
            {formatRwfDisplay(insuredValue)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Vet commission
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-emerald-700">
            {formatRwfDisplay(item.veterinaryCommission ?? 0)}
          </dd>
        </div>
      </dl>
    </li>
  );
}
