'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FinanceApplication, FinanceAgent, FinanceDateRange } from './finance-domain';
import { useFinanceApi } from './finance-api';
import { Button } from '@/components/ui/button';
import FinanceApplicationDetailsModalUI from './finance-application-details-modal-ui';
import { formatDateUTC } from '@/utils/date-formatter';

type ModalContext = 'accrual' | 'initiated' | 'paid';

enum ApplicationStatus {
  PENDING = 'pending',
  APPLICATION_APPROVED = 'application_approved',
  WAITING_FOR_USER_ACTION = 'waiting_for_user_action',
  INVOICE_SENT = 'invoice_sent',
  REVIEW_PAYMENT = 'review_payment',
  PAYMENT_VERIFIED = 'payment_verified',
  INSURANCE_ISSUED = 'insurance_issued',
  CANCELLED = 'cancelled',
}

interface FinanceApplicationsByAgentModalUIProps {
  isOpen: boolean;
  onClose: () => void;
  context: ModalContext;
  agent: FinanceAgent | null;

  // For accrual: date range. For initiated/paid: month/year.
  range?: FinanceDateRange;
  applicationStatus?: 'PAID' | 'READY_TO_BE_PAID' | 'PAYMENT_INITIATED' | 'ALL';
  lockApplicationStatus?: boolean;
  month?: number;
  year?: number;
}

export default function FinanceApplicationsByAgentModalUI({
  isOpen,
  onClose,
  context,
  agent,
  range,
  applicationStatus = 'READY_TO_BE_PAID',
  lockApplicationStatus = false,
  month,
  year,
}: FinanceApplicationsByAgentModalUIProps) {
  const getStatusBadge = (status?: string) => {
    if (!status) {
      return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Unknown</span>;
    }
    switch (status.toLowerCase()) {
      case ApplicationStatus.PENDING:
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Pending</span>;
      case ApplicationStatus.APPLICATION_APPROVED:
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Application Approved
          </span>
        );
      case ApplicationStatus.WAITING_FOR_USER_ACTION:
        return (
          <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
            Waiting for User Action
          </span>
        );
      case ApplicationStatus.INVOICE_SENT:
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">Invoice Sent</span>;
      case ApplicationStatus.REVIEW_PAYMENT:
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Review Payment</span>;
      case ApplicationStatus.PAYMENT_VERIFIED:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Payment Verified</span>;
      case ApplicationStatus.INSURANCE_ISSUED:
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Insurance Issued</span>;
      case ApplicationStatus.CANCELLED:
        return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">Cancelled</span>;
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            {status.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  const api = useFinanceApi();
  const [isLoading, setIsLoading] = useState(false);
  const [applications, setApplications] = useState<FinanceApplication[]>([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [localRange, setLocalRange] = useState<FinanceDateRange>({
    startDate: range?.startDate ?? '',
    endDate: range?.endDate ?? '',
  });
  const [localStatus, setLocalStatus] = useState<'PAID' | 'READY_TO_BE_PAID' | 'PAYMENT_INITIATED' | 'ALL'>(applicationStatus);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<'applicationNumber' | 'client' | 'submittedAt' | 'status' | 'commission'>(
    'submittedAt',
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [selectedApplication, setSelectedApplication] = useState<FinanceApplication | null>(null);

  const displayTitle = useMemo(() => {
    if (!agent) return 'Agent applications';
    if (context === 'accrual' && localRange.startDate && localRange.endDate) {
      return `${agent.name} • Applications (${localRange.startDate} → ${localRange.endDate})`;
    }
    if ((context === 'initiated' || context === 'paid') && month != null && year != null) {
      return `${agent.name} • ${context === 'paid' ? 'Paid' : 'Initiated'} (${month}/${year})`;
    }
    return `${agent.name} • Applications`;
  }, [agent, context, localRange.endDate, localRange.startDate, month, year]);

  const statusOptions: { label: string; value: 'PAID' | 'READY_TO_BE_PAID' | 'PAYMENT_INITIATED' | 'ALL' }[] = [
    { label: 'Ready to be paid', value: 'READY_TO_BE_PAID' },
    { label: 'Payment initiated', value: 'PAYMENT_INITIATED' },
    { label: 'Paid', value: 'PAID' },
    { label: 'All applications', value: 'ALL' },
  ];

  useEffect(() => {
    if (!isOpen) return;
    setLocalRange({
      startDate: range?.startDate ?? '',
      endDate: range?.endDate ?? '',
    });
    setLocalStatus(applicationStatus);
    setSearchTerm('');
    setCurrentPage(1);
  }, [applicationStatus, isOpen, range?.endDate, range?.startDate]);

  useEffect(() => {
    if (!isOpen || !agent) return;
    if (!localRange.startDate || !localRange.endDate) return;
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        if (context === 'accrual') {
          const response = await api.getApplicationsByAnAgentFinance(agent.agentId, localRange, localStatus);
          if (!cancelled) {
            setApplications(response.data);
            setTotalApplications(response.totalApplications);
            setTotalCommission(response.totalCommission);
          }
        } else if ((context === 'initiated' || context === 'paid') && month != null && year != null) {
          const data = await api.getInitiatedApplicationsByAgent(agent.agentId, month, year);
          if (!cancelled) {
            setApplications(data);
            setTotalApplications(data.length);
            const total = data.reduce((sum, row) => sum + Number(row.agentCommissionSnapshot ?? row.agentCommission ?? 0), 0);
            setTotalCommission(total);
          }
        } else {
          if (!cancelled) {
            setApplications([]);
            setTotalApplications(0);
            setTotalCommission(0);
          }
        }
      } catch {
        if (!cancelled) {
          setApplications([]);
          setTotalApplications(0);
          setTotalCommission(0);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [agent, api, context, isOpen, localRange, localStatus, month, range, year]);

  const filteredApplications = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) => {
      const applicationNumber = String(app.applicationNumber ?? '').toLowerCase();
      const clientName = String(app.client?.fullName ?? '').toLowerCase();
      const clientEmail = String(app.client?.email ?? '').toLowerCase();
      const clientPhone = String(app.client?.phoneNumber ?? '').toLowerCase();
      const insurance = String(app.insuranceCategory ?? '').toLowerCase();
      const status = String(app.status ?? '').toLowerCase();
      return (
        applicationNumber.includes(q) ||
        clientName.includes(q) ||
        clientEmail.includes(q) ||
        clientPhone.includes(q) ||
        insurance.includes(q) ||
        status.includes(q)
      );
    });
  }, [applications, searchTerm]);

  const sortedApplications = useMemo(() => {
    const rows = [...filteredApplications];
    rows.sort((a, b) => {
      const commissionA =
        context === 'initiated' || context === 'paid'
          ? Number(a.agentCommissionSnapshot ?? a.agentCommission ?? 0)
          : Number(a.agentCommission ?? 0);
      const commissionB =
        context === 'initiated' || context === 'paid'
          ? Number(b.agentCommissionSnapshot ?? b.agentCommission ?? 0)
          : Number(b.agentCommission ?? 0);
      const aVal =
        sortField === 'applicationNumber'
          ? String(a.applicationNumber ?? '').toLowerCase()
          : sortField === 'client'
          ? String(a.client?.fullName ?? '').toLowerCase()
          : sortField === 'status'
          ? String(a.status ?? '').toLowerCase()
          : sortField === 'submittedAt'
          ? new Date(a.submittedAt ?? 0).getTime()
          : commissionA;
      const bVal =
        sortField === 'applicationNumber'
          ? String(b.applicationNumber ?? '').toLowerCase()
          : sortField === 'client'
          ? String(b.client?.fullName ?? '').toLowerCase()
          : sortField === 'status'
          ? String(b.status ?? '').toLowerCase()
          : sortField === 'submittedAt'
          ? new Date(b.submittedAt ?? 0).getTime()
          : commissionB;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [context, filteredApplications, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedApplications.length / itemsPerPage));
  const pagedApplications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedApplications.slice(start, start + itemsPerPage);
  }, [currentPage, itemsPerPage, sortedApplications]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, localRange, localStatus]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleSort = (field: 'applicationNumber' | 'client' | 'submittedAt' | 'status' | 'commission') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'submittedAt' || field === 'commission' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: 'applicationNumber' | 'client' | 'submittedAt' | 'status' | 'commission' }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />;
  };

  const avatarInitials = useMemo(() => {
    const parts = (agent?.name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'AG';
    const initials = parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
    return initials || 'AG';
  }, [agent?.name]);

  return (
    <>
      <AnimatePresence>
        {isOpen && agent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[59]"
              onClick={onClose}
            />

            {/* Slide-in drawer */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{
                type: 'spring',
                damping: 30,
                stiffness: 300,
                mass: 0.8,
              }}
              className="fixed inset-y-0 right-0 w-full sm:w-[90%] max-w-[90vw] bg-white shadow-2xl z-[60] overflow-hidden flex flex-col"
            >
              <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 text-white px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold truncate">{displayTitle}</h3>
                      <p className="text-xs text-blue-100 mt-0.5">
                        Applications: <span className="font-semibold">{totalApplications}</span> • Total:{' '}
                        {totalCommission.toLocaleString()} RWF
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
                    aria-label="Close"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Start date</label>
                      <input
                        type="date"
                        value={localRange.startDate}
                        onChange={(e) => setLocalRange((prev) => ({ ...prev, startDate: e.target.value }))}
                        max={localRange.endDate || '2100-01-01'}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">End date</label>
                      <input
                        type="date"
                        value={localRange.endDate}
                        onChange={(e) => setLocalRange((prev) => ({ ...prev, endDate: e.target.value }))}
                        min={localRange.startDate || '2020-01-01'}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Application status</label>
                      <select
                        value={localStatus}
                        onChange={(e) =>
                          setLocalStatus(e.target.value as 'PAID' | 'READY_TO_BE_PAID' | 'PAYMENT_INITIATED' | 'ALL')
                        }
                        disabled={lockApplicationStatus}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Search applications</label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="App #, client, status..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                  </div>
                ) : sortedApplications.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-gray-600">No applications found for this agent in this period.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                              <button type="button" onClick={() => handleSort('applicationNumber')} className="inline-flex items-center gap-1.5">
                                App #
                                <SortIcon field="applicationNumber" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                              <button type="button" onClick={() => handleSort('client')} className="inline-flex items-center gap-1.5">
                                Client
                                <SortIcon field="client" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Insurance</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                              <button type="button" onClick={() => handleSort('submittedAt')} className="inline-flex items-center gap-1.5">
                                Submitted
                                <SortIcon field="submittedAt" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                              <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center gap-1.5">
                                Status
                                <SortIcon field="status" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">
                              <button type="button" onClick={() => handleSort('commission')} className="ml-auto inline-flex items-center gap-1.5">
                                Commission
                                <SortIcon field="commission" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {pagedApplications.map((app) => {
                            const commission =
                              context === 'initiated' || context === 'paid'
                                ? Number(app.agentCommissionSnapshot ?? app.agentCommission ?? 0)
                                : Number(app.agentCommission ?? 0);
                            return (
                              <tr key={app._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-semibold text-gray-900">{app.applicationNumber}</td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-800">{app.client?.fullName ?? '—'}</div>
                                  <div className="text-[11px] text-gray-500">{app.client?.phoneNumber ?? app.client?.email ?? ''}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-800">{app.insuranceCategory ?? '—'}</div>
                                  <div className="text-[11px] text-gray-500">{app.insuranceType ?? ''}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{app.submittedAt ? formatDateUTC(app.submittedAt) : '—'}</td>
                                <td className="px-4 py-3 text-gray-700">{getStatusBadge(app.status)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-900">{commission.toLocaleString()} RWF</td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end">
                                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedApplication(app)}>
                                      <Eye className="h-4 w-4" />
                                      <span className="hidden sm:inline">View details</span>
                                      <span className="sm:hidden">View</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
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
                          Showing {sortedApplications.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                          {Math.min(currentPage * itemsPerPage, sortedApplications.length)} of {sortedApplications.length}
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
                )}
              </div>

              <div className="p-5 border-t border-gray-100 bg-white flex justify-end">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FinanceApplicationDetailsModalUI
        isOpen={Boolean(selectedApplication)}
        onClose={() => setSelectedApplication(null)}
        applicationId={selectedApplication?._id ?? ''}
        context={context}
        month={context === 'accrual' ? undefined : month}
        year={context === 'accrual' ? undefined : year}
        applicationData={selectedApplication}
      />
    </>
  );
}

