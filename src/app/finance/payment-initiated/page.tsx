"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { Search, RefreshCw, Download, Calendar, AlertCircle, Users, DollarSign, Loader2 } from 'lucide-react';

interface PaymentInitiatedApplication {
  _id: string;
  applicationNumber: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration?: string;
  status: string;
  submittedAt?: string;
  amount?: number;
  agentCommission?: number;
  companyCommission?: number;
  agentCommissionPaymentStatus?: string;
  agent?: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
  } | null;
  client?: {
    fullName: string;
    email: string;
    phoneNumber: string;
  } | null;
}

interface PaymentInitiatedSummary {
  month: string;
  year: number;
  totalAmount: number;
  agentsPaid: number;
  isPaid: boolean;
}

interface PaymentInitiatedAgent {
  _id: string;
  agentId: string;
  name: string;
  email?: string;
  bankName?: string;
  bankAccountNumber?: string;
  phoneNumber?: string;
  totalCommission: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatCurrency = (value: number) => `${value.toLocaleString()} RWF`;

const resolveMonthNumber = (month: string | number): number | null => {
  if (typeof month === 'number') {
    return month >= 1 && month <= 12 ? month : null;
  }

  const parsed = parseInt(month, 10);
  if (!Number.isNaN(parsed)) {
    return parsed >= 1 && parsed <= 12 ? parsed : null;
  }

  const index = MONTH_NAMES.findIndex(
    (item) => item.toLowerCase() === month.toLowerCase()
  );
  return index === -1 ? null : index + 1;
};

const PaymentInitiatedPage = () => {
  const { token } = useAuth();
  const { showToast, ToastContainer } = useToast();

  const [applications, setApplications] = useState<PaymentInitiatedApplication[]>([]);
  const [summaries, setSummaries] = useState<PaymentInitiatedSummary[]>([]);
  const [agents, setAgents] = useState<PaymentInitiatedAgent[]>([]);
  const [agentsMonthLabel, setAgentsMonthLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [markingAsPaid, setMarkingAsPaid] = useState<{ month: string; year: number } | null>(null);

  const itemsPerPage = 10;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  const fetchPaymentInitiatedData = useCallback(async () => {
    if (!API_BASE || !token) return;
    setIsRefreshing(true);

    try {
      const [applicationsRes, summariesRes, agentsRes] = await Promise.all([
        fetch(`${API_BASE}/getAllApplicationsPaymentInitiated`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE}/getAllCommissionSummariesPaymentInitiated`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE}/getAllAgentsMonthlyCommissionsPaymentInitiated`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!applicationsRes.ok) {
        const error = await applicationsRes.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch applications in payment initiated status');
      }

      if (!summariesRes.ok) {
        const error = await summariesRes.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch payment initiated summaries');
      }

      if (!agentsRes.ok) {
        const error = await agentsRes.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch agent commission data');
      }

      const applicationsData = await applicationsRes.json();
      const summariesData = await summariesRes.json();
      const agentsData = await agentsRes.json();

      setApplications(applicationsData.data || []);
      setSummaries(summariesData.results || []);
      setAgents(agentsData.data || []);
      setAgentsMonthLabel(agentsData.month || '');
    } catch (error) {
      console.error('Error fetching payment initiated data:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to load payment initiated data.',
        'error'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [API_BASE, token]);

  useEffect(() => {
    setIsLoading(true);
    fetchPaymentInitiatedData();
  }, [fetchPaymentInitiatedData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBatchFilter]);

  const totalAgentCommission = useMemo(
    () =>
      applications.reduce(
        (sum, app) => sum + (app.agentCommission ?? 0),
        0
      ),
    [applications]
  );

  const pendingBatches = useMemo(
    () => summaries.filter((summary) => !summary.isPaid).length,
    [summaries]
  );

  const latestBatchLabel = useMemo(() => {
    if (!summaries.length) return 'No batches';
    const sorted = [...summaries].sort((a, b) => {
      const aMonth = resolveMonthNumber(a.month) ?? 1;
      const bMonth = resolveMonthNumber(b.month) ?? 1;
      const aDate = new Date(a.year, aMonth - 1).getTime();
      const bDate = new Date(b.year, bMonth - 1).getTime();
      return bDate - aDate;
    });
    const [latest] = sorted;
    return `${latest.month} ${latest.year}`;
  }, [summaries]);

  const batchFilterOptions = useMemo(
    () =>
      ['all', ...summaries.map((summary) => `${summary.month}|${summary.year}`)],
    [summaries]
  );

  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    return applications.filter((application) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          application.applicationNumber,
          application.agent?.fullName,
          application.client?.fullName,
          application.agentCommissionPaymentStatus,
          application.status,
        ]
          .filter(Boolean)
          .some((field) => (field as string).toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) return false;

      if (selectedBatchFilter === 'all') return true;

      const [monthLabel, yearValue] = selectedBatchFilter.split('|');
      const filterMonth = resolveMonthNumber(monthLabel);
      const filterYear = parseInt(yearValue, 10);

      if (!filterMonth || Number.isNaN(filterYear) || !application.submittedAt) {
        return true;
      }

      const submittedDate = new Date(application.submittedAt);
      return (
        submittedDate.getFullYear() === filterYear &&
        submittedDate.getMonth() + 1 === filterMonth
      );
    });
  }, [applications, searchTerm, selectedBatchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / itemsPerPage));

  const paginatedApplications = useMemo(
    () =>
      filteredApplications.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredApplications, currentPage]
  );

  const handleDownloadBatch = (month: string, year: number) => {
    const monthNumber = resolveMonthNumber(month);
    if (!monthNumber) {
      showToast('Unable to detect month for this batch. Please contact support.', 'error');
      return;
    }

    const normalizedMonth = month.trim().toLowerCase();
    const hasDedicatedAgentSheet =
      agentsMonthLabel &&
      agentsMonthLabel.trim().toLowerCase() === normalizedMonth &&
      agents.length > 0;

    type AgentRow = {
      agentId: string;
      name: string;
      phone?: string;
      email?: string;
      bankName?: string;
      bankAccountNumber?: string;
      totalCommission: number;
    };

    let agentRows: AgentRow[] = [];

    if (hasDedicatedAgentSheet) {
      agentRows = agents.map((agent) => ({
        agentId: agent.agentId,
        name: agent.name,
        phone: agent.phoneNumber,
        email: agent.email,
        bankName: agent.bankName,
        bankAccountNumber: agent.bankAccountNumber,
        totalCommission: agent.totalCommission,
      }));
    } else {
      const matchingApplications = applications.filter((application) => {
        if (!application.submittedAt) return false;
        const date = new Date(application.submittedAt);
        return (
          date.getFullYear() === year &&
          date.getMonth() + 1 === monthNumber
        );
      });

      if (!matchingApplications.length) {
        showToast('No agents found for this batch.', 'info');
        return;
      }

      const aggregated = new Map<string, AgentRow>();
      matchingApplications.forEach((application) => {
        const key =
          application.agent?._id ||
          application.agent?.fullName ||
          application.applicationNumber;

        if (!aggregated.has(key)) {
          aggregated.set(key, {
            agentId: application.agent?._id || '',
            name: application.agent?.fullName || 'Unknown agent',
            phone: application.agent?.phoneNumber,
            email: application.agent?.email,
            bankName: '',
            bankAccountNumber: '',
            totalCommission: 0,
          });
        }

        const bucket = aggregated.get(key)!;
        bucket.totalCommission += application.agentCommission ?? 0;
      });

      agentRows = Array.from(aggregated.values());
    }

    const headers = [
      'Agent ID',
      'Agent Name',
      'Phone',
      'Email',
      'Bank Name',
      'Account Number',
      'Commission',
    ];

    const csvContent = [
      headers.join(','),
      ...agentRows.map((agent) => [
        agent.agentId,
        `"${agent.name}"`,
        agent.phone || '',
        agent.email || '',
        agent.bankName || '',
        agent.bankAccountNumber || '',
        agent.totalCommission,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${month}_${year}_agent_payouts.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const markBatchAsPaid = async (month: string, year: number) => {
    if (!API_BASE || !token) return;

    const monthNumber = resolveMonthNumber(month);
    if (!monthNumber) {
      showToast('Invalid month value received for this batch.', 'error');
      return;
    }

    setMarkingAsPaid({ month, year });
    try {
      const response = await fetch(
        `${API_BASE}/markAsPaid?month=${monthNumber}&year=${year}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to mark batch as paid');
      }

      const result = await response.json();
      showToast(result.message || `Successfully marked ${month} ${year} as paid.`, 'success');
      await fetchPaymentInitiatedData();
    } catch (error) {
      console.error('Error marking batch as paid:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to mark batch as paid.',
        'error'
      );
    } finally {
      setMarkingAsPaid(null);
    }
  };

  const statsCards = [
    {
      label: 'Total Agent Commission (Initiated)',
      value: formatCurrency(totalAgentCommission),
      icon: DollarSign,
      accent: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Applications in Queue',
      value: applications.length.toString(),
      icon: Users,
      accent: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Pending Batches',
      value: pendingBatches.toString(),
      icon: AlertCircle,
      accent: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Latest Batch',
      value: latestBatchLabel,
      icon: Calendar,
      accent: 'text-indigo-600 bg-indigo-50',
    },
  ];

  const isEmptyState = !applications.length && !summaries.length && !agents.length;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-blue-700 text-white rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <p className="uppercase text-xs tracking-widest text-indigo-200 mb-2">
                Finance Workspace
              </p>
              <h1 className="text-3xl font-bold mb-3">Payment Initiated Queue</h1>
              <p className="text-indigo-100 max-w-2xl text-sm">
                Review every application that is currently in payment initiated status. Use this workspace to export the official payout sheet and mark historical batches as paid once transfers are confirmed.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                onClick={fetchPaymentInitiatedData}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/30 bg-white/10 text-white text-sm font-semibold backdrop-blur hover:bg-white/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isRefreshing ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Refreshing
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Refresh data
                  </>
                )}
              </button>
              <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-indigo-100 font-medium">
                Use the navbar to switch between current accruals and this payout console.
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-gray-600 text-sm">Fetching payment initiated data...</p>
          </div>
        ) : isEmptyState ? (
          <div className="bg-white rounded-2xl shadow-md border border-dashed border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No payment initiated batches</h2>
            <p className="text-gray-600 text-sm max-w-lg mx-auto">
              Once you initiate payments from the finance dashboard, every related application will appear in this workspace for tracking, exporting, and final sign-off.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-start gap-4"
                >
                  <div className={`p-3 rounded-xl ${card.accent}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Monthly Batches</h2>
                    <p className="text-sm text-gray-500">
                      Track every month currently in payment initiated status.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Month</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Total amount</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Agents</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {summaries.map((summary) => (
                        <tr key={`${summary.year}-${summary.month}`}>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {summary.month} {summary.year}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{formatCurrency(summary.totalAmount)}</td>
                          <td className="px-4 py-3 text-gray-700">{summary.agentsPaid}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                summary.isPaid
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  summary.isPaid ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                              {summary.isPaid ? 'Paid' : 'Payment initiated'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDownloadBatch(summary.month, summary.year)}
                                className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-[11px] cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </button>
                              <button
                                onClick={() => markBatchAsPaid(summary.month, summary.year)}
                                disabled={summary.isPaid || (markingAsPaid?.month === summary.month && markingAsPaid?.year === summary.year)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                                  summary.isPaid
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60'
                                }`}
                              >
                                {markingAsPaid?.month === summary.month && markingAsPaid?.year === summary.year ? (
                                  <>
                                    <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                                    Processing
                                  </>
                                ) : (
                                  'Mark as paid'
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Agent payout list</h2>
                    <p className="text-sm text-gray-500">
                      {agentsMonthLabel
                        ? `Prepared for ${agentsMonthLabel}`
                        : 'Pending payout sheet'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    <Users className="w-3.5 h-3.5" />
                    {agents.length} agents
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Account</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {agents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-gray-500">
                            No agents in payment initiated status.
                          </td>
                        </tr>
                      ) : (
                        agents.map((agent) => (
                          <tr key={agent._id}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900">{agent.name}</p>
                              <p className="text-[11px] text-gray-500">{agent.email || '—'}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{agent.bankName || '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{agent.bankAccountNumber || '—'}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {formatCurrency(agent.totalCommission)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Applications in payment initiated</h2>
                  <p className="text-sm text-gray-500">
                    Full visibility of every application that was pushed to payment initiated.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search application number, agent, client..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={selectedBatchFilter}
                    onChange={(event) => setSelectedBatchFilter(event.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {batchFilterOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === 'all' ? 'All months' : option.replace('|', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Application #</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {paginatedApplications.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No applications match your search.
                        </td>
                      </tr>
                    ) : (
                      paginatedApplications.map((application) => (
                        <tr key={application._id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{application.applicationNumber}</p>
                            <p className="text-[11px] text-gray-500">{application.insuranceCategory}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{application.client?.fullName || '—'}</p>
                            <p className="text-[11px] text-gray-500">{application.client?.phoneNumber || application.client?.email || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{application.agent?.fullName || '—'}</p>
                            <p className="text-[11px] text-gray-500">{application.agent?.phoneNumber || application.agent?.email || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{formatCurrency(application.agentCommission ?? 0)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              {application.agentCommissionPaymentStatus || 'PAYMENT_INITIATED'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {application.submittedAt
                              ? new Date(application.submittedAt).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 gap-4">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, filteredApplications.length)} of {filteredApplications.length} applications
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 disabled:opacity-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <ToastContainer />
    </MainLayout>
  );
};

export default PaymentInitiatedPage;

