'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import FinanceApplicationDetailsModal from './finance-application-details-modal';
import { formatDateUTC } from '@/utils/date-formatter';

type AgentRow = {
  agentId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
};

// Subset of fields used by this modal. Backend may return more fields.
export type PaymentInitiatedApplication = {
  _id: string;
  applicationNumber: string;
  insuranceCategory: string;
  status: string;
  submittedAt?: string;
  insuranceType?: string;
  insuranceDuration?: string;
  amount?: number;
  agentCommission?: number;
  client?: {
    fullName?: string;
    phoneNumber?: string;
    email?: string;
  };
  agent?: {
    _id?: string;
    fullName?: string;
    phoneNumber?: string;
  } | null;
};

interface FinanceAgentApplicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  apiBaseUrl: string;
  agent: AgentRow | null;
  month: string;
  year: number;
  /** Temporary fallback for UI testing before the backend endpoints exist. */
  fallbackApplications: PaymentInitiatedApplication[];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function resolveMonthNumber(month: string | number): number | null {
  if (typeof month === 'number') {
    return month >= 1 && month <= 12 ? month : null;
  }
  const parsed = parseInt(month, 10);
  if (!Number.isNaN(parsed)) return parsed >= 1 && parsed <= 12 ? parsed : null;
  const index = MONTH_NAMES.findIndex((item) => item.toLowerCase() === month.toLowerCase());
  return index === -1 ? null : index + 1;
}

export default function FinanceAgentApplicationsModal({
  isOpen,
  onClose,
  token,
  apiBaseUrl,
  agent,
  month,
  year,
  fallbackApplications,
}: FinanceAgentApplicationsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [applications, setApplications] = useState<PaymentInitiatedApplication[]>([]);

  const [detailsApplicationId, setDetailsApplicationId] = useState<string | null>(null);
  const [detailsFallback, setDetailsFallback] = useState<PaymentInitiatedApplication | null>(null);

  const monthNumber = useMemo(() => resolveMonthNumber(month), [month]);

  const activeAgentId = agent?.agentId ?? '';

  useEffect(() => {
    if (!isOpen || !agent || !token || !apiBaseUrl) return;

    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        // New endpoint (to be implemented on backend):
        // GET /getPaymentInitiatedApplicationsByAgent?agentId=...&month=...&year=...
        const url = new URL(`${apiBaseUrl}/getPaymentInitiatedApplicationsByAgent`);
        url.searchParams.set('agentId', agent.agentId);
        if (monthNumber) url.searchParams.set('month', String(monthNumber));
        url.searchParams.set('year', String(year));

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch initiated apps by agent');

        const json = await res.json();
        const mapped = (json.data || json.applications || []) as PaymentInitiatedApplication[];
        if (!cancelled) setApplications(mapped);
      } catch {
        // UI fallback until backend endpoint is ready.
        // TODO (backend-ready): remove this fallback branch.
        if (cancelled) return;
        if (!monthNumber) {
          setApplications([]);
          return;
        }

        const filtered = fallbackApplications.filter((a) => {
          const submittedAt = a.submittedAt ? new Date(a.submittedAt) : null;
          if (!submittedAt || Number.isNaN(submittedAt.getTime())) return false;
          const appYear = submittedAt.getUTCFullYear();
          const appMonth = submittedAt.getUTCMonth() + 1;
          const matchesMonthYear = appYear === year && appMonth === monthNumber;
          const matchesAgent =
            (a.agent?._id && a.agent?._id === activeAgentId) ||
            // sometimes backend uses another id shape in payloads
            // @ts-expect-error Temporary: fallbackApplications typing differs in agent id shape.
            (a.agentId && a.agentId === activeAgentId);
          return matchesMonthYear && matchesAgent;
        });

        const sorted = [...filtered].sort(
          (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime(),
        );

        setApplications(sorted);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, activeAgentId, agent, fallbackApplications, isOpen, monthNumber, token, year]);

  const totalCommission = useMemo(
    () => applications.reduce((sum, a) => sum + (a.agentCommission ?? 0), 0),
    [applications],
  );

  const closeDetails = () => {
    setDetailsApplicationId(null);
    setDetailsFallback(null);
  };

  return (
    <>
      {isOpen && agent && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Agent payout verification</h3>
                <p className="text-sm text-gray-600">
                  {agent.name} ({agent.email || '—'}) • {month} {year}
                </p>
                <p className="text-sm text-gray-800 font-semibold">
                  Total commission (snapshot): {totalCommission.toLocaleString()} RWF
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Close">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                  <p className="text-gray-600">Loading applications…</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">No applications found for this agent in this snapshot.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">App #</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Insurance</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {applications.map((app) => (
                        <tr key={app._id}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{app.applicationNumber}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-700 font-medium">{app.client?.fullName || '—'}</div>
                            <div className="text-[11px] text-gray-500">{app.client?.email || app.client?.phoneNumber || ''}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-700 font-medium">{app.insuranceCategory}</div>
                            <div className="text-[11px] text-gray-500">{app.insuranceType || ''}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              {app.status || 'PAYMENT_INITIATED'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {(app.agentCommission ?? 0).toLocaleString()} RWF
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatDateUTC(app.submittedAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setDetailsApplicationId(app._id);
                                setDetailsFallback(app);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <FinanceApplicationDetailsModal
        isOpen={Boolean(detailsApplicationId)}
        onClose={closeDetails}
        token={token}
        apiBaseUrl={apiBaseUrl}
        applicationId={detailsApplicationId || ''}
        fallbackApplication={detailsFallback}
      />
    </>
  );
}

