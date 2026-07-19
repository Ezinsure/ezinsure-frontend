'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Calendar,
  Download,
  FileText,
  Loader2,
  Search,
  Stethoscope,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { LivestockApplicationsPagination } from '@/features/livestock-application/components/shared/livestock-applications-pagination';
import { VetApplicationsDrawer } from '@/features/livestock-application/components/analytics/vet-applications-drawer';
import type { LivestockApplicationViewRole } from '@/features/livestock-application/domain/application-types';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import {
  useVetAnalytics,
  type VetPerformanceRow,
} from '@/features/livestock-application/hooks/use-vet-analytics';

function getFirstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

type SortField =
  | 'vetName'
  | 'totalApplications'
  | 'totalInsuranceAmount'
  | 'totalCommission'
  | 'averageCommission';
type SortDirection = 'asc' | 'desc';

const CHART_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export interface VetAnalyticsPageProps {
  viewRole: LivestockApplicationViewRole;
}

export default function VetAnalyticsPage({ viewRole }: VetAnalyticsPageProps) {
  const { showToast, ToastContainer } = useToast();
  const { vetRows, summary, isLoading, error, load } = useVetAnalytics();

  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalCommission');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedVet, setSelectedVet] = useState<VetPerformanceRow | null>(null);

  useEffect(() => {
    void load(startDate, endDate);
  }, [load, startDate, endDate]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rows = query
      ? vetRows.filter((row) => row.vetName.toLowerCase().includes(query))
      : [...vetRows];

    rows.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortField === 'vetName') {
        aVal = a.vetName.toLowerCase();
        bVal = b.vetName.toLowerCase();
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [vetRows, searchQuery, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  const chartData = useMemo(
    () =>
      filteredRows.slice(0, 6).map((row) => ({
        name: row.vetName.length > 14 ? `${row.vetName.slice(0, 14)}…` : row.vetName,
        commission: row.totalCommission,
        applications: row.totalApplications,
      })),
    [filteredRows],
  );

  const handleSort = useCallback((field: SortField) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return prevField;
      }
      setSortDirection(field === 'vetName' ? 'asc' : 'desc');
      return field;
    });
    setCurrentPage(1);
  }, []);

  const handleExportCsv = useCallback(() => {
    if (filteredRows.length === 0) {
      showToast('No veterinarians to export for the current filters.', 'error');
      return;
    }
    const headers = [
      'Veterinarian',
      'Applications',
      'Total insured value (RWF)',
      'Total commission (RWF)',
      'Average commission (RWF)',
    ];
    const rows = filteredRows.map((row) => [
      row.vetName,
      String(row.totalApplications),
      String(Math.round(row.totalInsuranceAmount)),
      String(Math.round(row.totalCommission)),
      String(Math.round(row.averageCommission)),
    ]);
    const csv = [headers, ...rows]
      .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vet-analytics-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Veterinary analytics exported to CSV.', 'success');
  }, [filteredRows, startDate, endDate, showToast]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
    );
  };

  const periodLabel = `${startDate} → ${endDate}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ToastContainer />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-600/10 p-3">
            <Stethoscope className="h-6 w-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Veterinary analytics</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Performance summary per veterinarian for the selected period — insured value written and
              commissions earned. Open a veterinarian to review each application one by one.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleExportCsv}
          disabled={isLoading || filteredRows.length === 0}
          className="shrink-0"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Date range */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-medium text-slate-700">Date range</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2">
            <span className="w-14 text-xs font-medium text-slate-600">From</span>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setCurrentPage(1);
              }}
              className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-14 text-xs font-medium text-slate-600">To</span>
            <input
              type="date"
              value={endDate}
              max={getTodayDate()}
              onChange={(event) => {
                setEndDate(event.target.value);
                setCurrentPage(1);
              }}
              className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          label="Veterinarians"
          value={summary.totalVets.toLocaleString()}
          hint="Active in period"
          accent="from-blue-50 to-indigo-50 border-blue-100"
          isLoading={isLoading}
        />
        <SummaryCard
          icon={<FileText className="h-5 w-5 text-indigo-600" />}
          label="Applications"
          value={summary.totalApplications.toLocaleString()}
          hint="Total submitted"
          accent="from-indigo-50 to-purple-50 border-indigo-100"
          isLoading={isLoading}
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          label="Insured value"
          value={formatRwfDisplay(summary.totalInsuranceAmount)}
          hint="Sum assured written"
          accent="from-emerald-50 to-teal-50 border-emerald-100"
          isLoading={isLoading}
        />
        <SummaryCard
          icon={<Wallet className="h-5 w-5 text-amber-600" />}
          label="Total commission"
          value={formatRwfDisplay(summary.totalCommission)}
          hint="Vet commission earned"
          accent="from-amber-50 to-orange-50 border-amber-100"
          isLoading={isLoading}
        />
        <SummaryCard
          icon={<Activity className="h-5 w-5 text-rose-600" />}
          label="Avg / application"
          value={formatRwfDisplay(Math.round(summary.averageCommission))}
          hint="Commission per app"
          accent="from-rose-50 to-pink-50 border-rose-100"
          isLoading={isLoading}
        />
      </div>

      {/* Top vets chart */}
      {!isLoading && chartData.length > 0 && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Top veterinarians by commission
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                angle={-25}
                textAnchor="end"
                height={60}
                interval={0}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}K`}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) =>
                  name === 'commission'
                    ? [formatRwfDisplay(value), 'Commission']
                    : [value, 'Applications']
                }
              />
              <Bar dataKey="commission" name="commission" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search veterinarian by name…"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Stethoscope className="h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">
              No veterinary activity found for the selected period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[56rem] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-12">#</th>
                  {(
                    [
                      ['Veterinarian', 'vetName'],
                      ['Applications', 'totalApplications'],
                      ['Insured value', 'totalInsuranceAmount'],
                      ['Total commission', 'totalCommission'],
                      ['Avg / app', 'averageCommission'],
                    ] as const
                  ).map(([label, field]) => (
                    <th key={field} className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleSort(field)}
                        className="inline-flex cursor-pointer items-center gap-1.5 font-semibold"
                      >
                        {label}
                        <SortIcon field={field} />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row, index) => {
                  const rank = (safePage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr key={row.vetKey} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                            rank <= 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.vetName}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.totalApplications}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatRwfDisplay(row.totalInsuranceAmount)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        {formatRwfDisplay(row.totalCommission)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatRwfDisplay(Math.round(row.averageCommission))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVet(row)}
                          className="hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          View more
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-4 py-4">
          <LivestockApplicationsPagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredRows.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
            disabled={isLoading}
          />
        </div>
      </div>

      <VetApplicationsDrawer
        isOpen={Boolean(selectedVet)}
        vet={selectedVet}
        viewRole={viewRole}
        periodLabel={periodLabel}
        onClose={() => setSelectedVet(null)}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  accent,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: string;
  isLoading: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${accent}`}
    >
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/40" />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            {label}
          </p>
          {isLoading ? (
            <span className="inline-block h-5 w-16 animate-pulse rounded bg-white/70" />
          ) : (
            <p className="truncate text-lg font-bold text-slate-900">{value}</p>
          )}
          <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/70">
          {icon}
        </div>
      </div>
    </div>
  );
}
