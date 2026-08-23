'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  createProspect,
  deleteProspect,
  fetchProspects,
  updateProspect,
} from '@/features/prospects/api';
import { ProspectFormModal } from '@/features/prospects/prospect-form-modal';
import {
  addDaysFromToday,
  expiryRelativeLabel,
  formatIsoDateOnly,
  startOfTodayIso,
} from '@/features/prospects/date-utils';
import {
  PROSPECT_SMS_STATUS_LABELS,
  PROSPECT_SMS_STATUS_OPTIONS,
  type CreateProspectPayload,
  type Prospect,
  type ProspectSmsReminderStatus,
} from '@/features/prospects/types';
import { toLocalRwandaPhone } from '@/features/livestock-application/utils/phone';
import { useApiClient } from '@/utils/apiClient';

const PAGE_SIZE_OPTIONS = [10, 15, 25] as const;

export interface ProspectsWorkspacePageProps {
  title?: string;
  subtitle?: string;
  /** Admin / finance / super-admin: agent filter + assignment. */
  enableStaffFilters?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

function smsBadgeClass(status: ProspectSmsReminderStatus): string {
  switch (status) {
    case 'sent':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'failed':
      return 'bg-red-50 text-red-800 ring-red-200';
    case 'scheduled':
      return 'bg-blue-50 text-blue-800 ring-blue-200';
    case 'pending':
      return 'bg-amber-50 text-amber-900 ring-amber-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

function SmsStatusIcon({ status }: { status: ProspectSmsReminderStatus }) {
  if (status === 'sent') return <BellRing className="h-3.5 w-3.5" />;
  if (status === 'failed') return <BellOff className="h-3.5 w-3.5" />;
  return <Bell className="h-3.5 w-3.5" />;
}

export function ProspectsWorkspacePage({
  title = 'Prospects',
  subtitle = 'Track motorists insured with other providers. When cover nears expiry, an SMS reminds the agent to follow up.',
  enableStaffFilters = false,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: ProspectsWorkspacePageProps) {
  const { apiFetch } = useApiClient();
  const { showToast, ToastContainer } = useToast();

  const [items, setItems] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [smsFilter, setSmsFilter] = useState<ProspectSmsReminderStatus | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState('');
  const [bucket, setBucket] = useState<'upcoming' | 'expired' | 'all'>('upcoming');
  const [range, setRange] = useState({
    startDate: startOfTodayIso(),
    endDate: addDaysFromToday(90),
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchProspects(apiFetch, {
        startDate: range.startDate || undefined,
        endDate: range.endDate || undefined,
        search: search.trim() || undefined,
        smsReminderStatus: smsFilter,
        agentId: enableStaffFilters && agentFilter ? agentFilter : undefined,
        bucket,
      });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prospects.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    agentFilter,
    apiFetch,
    bucket,
    enableStaffFilters,
    range.endDate,
    range.startDate,
    search,
    smsFilter,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const agentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.agent?._id) map.set(item.agent._id, item.agent.fullName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (smsFilter !== 'all' && item.smsReminderStatus !== smsFilter) return false;
      if (enableStaffFilters && agentFilter && item.agent?._id !== agentFilter) return false;
      if (bucket === 'upcoming' && (item.daysUntilExpiry ?? 0) < 0) return false;
      if (bucket === 'expired' && (item.daysUntilExpiry ?? 0) >= 0) return false;
      if (q) {
        const hay = [
          item.fullName,
          item.phoneNumber,
          item.currentInsurer,
          item.insuranceCategory,
          item.agent?.fullName,
          item.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [agentFilter, bucket, enableStaffFilters, items, search, smsFilter]);

  const stats = useMemo(() => {
    const upcoming = items.filter((i) => (i.daysUntilExpiry ?? 0) >= 0);
    const soon = upcoming.filter((i) => (i.daysUntilExpiry ?? 999) <= 30);
    const smsPending = items.filter(
      (i) => i.smsReminderStatus === 'pending' || i.smsReminderStatus === 'scheduled',
    );
    const smsSent = items.filter((i) => i.smsReminderStatus === 'sent');
    return {
      total: items.length,
      soon: soon.length,
      smsPending: smsPending.length,
      smsSent: smsSent.length,
    };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, smsFilter, agentFilter, bucket, range.startDate, range.endDate, pageSize]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    smsFilter !== 'all' ||
    Boolean(agentFilter) ||
    bucket !== 'upcoming';

  const openCreate = () => {
    setModalMode('create');
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (prospect: Prospect) => {
    setModalMode('edit');
    setEditing(prospect);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: CreateProspectPayload) => {
    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await createProspect(apiFetch, payload);
        showToast('Prospect added. You will be reminded near expiry.', 'success');
      } else if (editing) {
        await updateProspect(apiFetch, editing._id, payload);
        showToast('Prospect updated.', 'success');
      }
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save prospect.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (prospect: Prospect) => {
    const label = prospect.fullName || toLocalRwandaPhone(prospect.phoneNumber);
    if (!window.confirm(`Remove prospect ${label}? This cannot be undone.`)) return;
    setDeletingId(prospect._id);
    try {
      await deleteProspect(apiFetch, prospect._id);
      showToast('Prospect removed.', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete prospect.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);
  const colCount = enableStaffFilters ? 7 : 6;

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <ToastContainer />
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Lead conversion
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void load()} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
                {canCreate && (
                  <Button type="button" onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add prospect
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Total prospects" value={stats.total} icon={UserPlus} />
              <StatCard label="Expiring in 30 days" value={stats.soon} icon={Calendar} />
              <StatCard label="SMS pending" value={stats.smsPending} icon={Bell} />
              <StatCard label="SMS sent" value={stats.smsSent} icon={BellRing} />
            </div>

            <div className="mt-5 inline-flex w-full max-w-md rounded-xl border border-slate-200 bg-slate-100/80 p-1">
              {(
                [
                  { id: 'upcoming', label: 'Upcoming expiry' },
                  { id: 'expired', label: 'Already expired' },
                  { id: 'all', label: 'All' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBucket(tab.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    bucket === tab.id
                      ? 'bg-white text-[var(--main-blue)] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setSmsFilter('all');
                      setAgentFilter('');
                      setBucket('upcoming');
                      setRange({
                        startDate: startOfTodayIso(),
                        endDate: addDaysFromToday(90),
                      });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-medium text-slate-600">
                  Expiring from
                  <input
                    type="date"
                    value={range.startDate}
                    onChange={(e) => setRange((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  To
                  <input
                    type="date"
                    value={range.endDate}
                    onChange={(e) => setRange((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  SMS status
                  <select
                    value={smsFilter}
                    onChange={(e) =>
                      setSmsFilter(e.target.value as ProspectSmsReminderStatus | 'all')
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {PROSPECT_SMS_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                {enableStaffFilters ? (
                  <label className="text-xs font-medium text-slate-600">
                    Agent
                    <select
                      value={agentFilter}
                      onChange={(e) => setAgentFilter(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">All agents</option>
                      {agentOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="relative text-xs font-medium text-slate-600">
                    Search
                    <Search className="pointer-events-none absolute left-3 top-[2.05rem] h-4 w-4 text-slate-400" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Name, phone, insurer…"
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                )}
              </div>
              {enableStaffFilters && (
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, phone, insurer, agent…"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}
            </div>
          </header>

          {error && (
            <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{error}</p>
                <p className="mt-1 text-xs text-amber-800/90">
                  If the prospects API is not live yet, the backend can follow the Phase 3 contract
                  in <code className="rounded bg-amber-100 px-1">PHASE_3_PROSPECTS_BACKEND.md</code>.
                </p>
              </div>
            </div>
          )}

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Prospect list</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Automated SMS goes to the agent who owns the prospect when cover approaches expiry.
                </p>
              </div>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">{filtered.length}</span> result
                {filtered.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-5">Prospect</th>
                    <th className="whitespace-nowrap px-4 py-3">Phone</th>
                    <th className="whitespace-nowrap px-4 py-3">Expiry</th>
                    <th className="whitespace-nowrap px-4 py-3">Insurer / category</th>
                    {enableStaffFilters && (
                      <th className="whitespace-nowrap px-4 py-3">Agent</th>
                    )}
                    <th className="whitespace-nowrap px-4 py-3">SMS reminder</th>
                    <th className="sticky right-0 z-20 min-w-[8rem] bg-slate-50 px-4 py-3 text-right shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={`sk-${index}`} className="animate-pulse">
                        {Array.from({ length: colCount }).map((__, cell) => (
                          <td key={cell} className="px-4 py-4">
                            <div className="h-4 w-24 rounded bg-slate-100" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  {!isLoading &&
                    paged.map((item) => (
                      <tr key={item._id} className="group hover:bg-slate-50/90">
                        <td className="px-4 py-3.5 sm:px-5">
                          <p className="font-medium text-slate-900">
                            {item.fullName?.trim() || 'Unnamed prospect'}
                          </p>
                          {item.notes ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.notes}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {toLocalRwandaPhone(item.phoneNumber)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatIsoDateOnly(item.insuranceExpiryDate) || '—'}
                          </span>
                          {item.daysUntilExpiry != null && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {expiryRelativeLabel(item.daysUntilExpiry)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          <p>{item.currentInsurer || '—'}</p>
                          {item.insuranceCategory ? (
                            <p className="mt-0.5 text-xs text-slate-500">{item.insuranceCategory}</p>
                          ) : null}
                        </td>
                        {enableStaffFilters && (
                          <td className="px-4 py-3.5 text-slate-700">
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound className="h-3.5 w-3.5 text-slate-400" />
                              {item.agent?.fullName ?? '—'}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${smsBadgeClass(item.smsReminderStatus)}`}
                            title={item.smsFailureReason}
                          >
                            <SmsStatusIcon status={item.smsReminderStatus} />
                            {PROSPECT_SMS_STATUS_LABELS[item.smsReminderStatus]}
                          </span>
                          {item.lastSmsSentAt ? (
                            <p className="mt-1 text-[11px] text-slate-400">
                              Last sent {formatIsoDateOnly(item.lastSmsSentAt)}
                            </p>
                          ) : null}
                        </td>
                        <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.28)] group-hover:bg-slate-50">
                          <div className="inline-flex items-center gap-1.5">
                            {canEdit && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(item)}
                              >
                                Edit
                              </Button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                title="Delete prospect"
                                disabled={deletingId === item._id}
                                onClick={() => void handleDelete(item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                              >
                                {deletingId === item._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={colCount} className="px-4 py-16 text-center">
                        <UserPlus className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-3 font-medium text-slate-800">No prospects yet</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Add a phone number and insurance expiry to start acquisition follow-up.
                        </p>
                        {canCreate && (
                          <Button type="button" className="mt-4" onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add first prospect
                          </Button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <label className="inline-flex items-center gap-2">
                    <span>Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) =>
                        setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <span>per page</span>
                  </label>
                  <p>
                    Showing <span className="font-semibold text-slate-900">{from}</span>–
                    <span className="font-semibold text-slate-900">{to}</span> of{' '}
                    <span className="font-semibold text-slate-900">{filtered.length}</span>
                  </p>
                </div>
                <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
                  <PageBtn disabled={safePage <= 1} onClick={() => setPage(1)} className="rounded-l-lg">
                    <ChevronsLeft className="h-4 w-4" />
                  </PageBtn>
                  <PageBtn disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </PageBtn>
                  <span className="inline-flex items-center border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    {safePage} / {totalPages}
                  </span>
                  <PageBtn
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </PageBtn>
                  <PageBtn
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(totalPages)}
                    className="rounded-r-lg"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </PageBtn>
                </nav>
              </div>
            )}
          </section>

          <aside className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">How prospects work</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <InfoCard
                title="Capture the lead"
                body="Store the motorist’s phone and current policy expiry. Optional name, insurer, and category help prioritise follow-up."
              />
              <InfoCard
                title="Automated SMS"
                body="When cover is approaching expiry, the system texts the agent who added the prospect so they can convert the lead."
              />
              <InfoCard
                title="Alongside renewals"
                body="Prospects are for clients on other insurers. Use Renewals for existing Ezinsure policies."
              />
            </div>
          </aside>
        </div>
      </div>

      <ProspectFormModal
        open={modalOpen}
        mode={modalMode}
        initial={editing}
        isSubmitting={isSaving}
        showAgentAssignment={enableStaffFilters}
        agentOptions={agentOptions}
        onClose={() => {
          if (!isSaving) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        onSubmit={handleSubmit}
      />
    </MainLayout>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof UserPlus;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{value.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function PageBtn({
  disabled,
  onClick,
  children,
  className = '',
}: {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex items-center border border-slate-200 bg-white px-2.5 py-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
