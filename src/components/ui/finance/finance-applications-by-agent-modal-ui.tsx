'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FinanceApplication, FinanceAgent, FinanceDateRange } from './finance-domain';
import { useFinanceApi } from './finance-api';
import { Button } from '@/components/ui/button';
import FinanceApplicationDetailsModalUI from './finance-application-details-modal-ui';

type ModalContext = 'accrual' | 'initiated' | 'paid';

interface FinanceApplicationsByAgentModalUIProps {
  isOpen: boolean;
  onClose: () => void;
  context: ModalContext;
  agent: FinanceAgent | null;

  // For accrual: date range. For initiated/paid: month/year.
  range?: FinanceDateRange;
  month?: number;
  year?: number;
}

export default function FinanceApplicationsByAgentModalUI({
  isOpen,
  onClose,
  context,
  agent,
  range,
  month,
  year,
}: FinanceApplicationsByAgentModalUIProps) {
  const api = useFinanceApi();
  const [isLoading, setIsLoading] = useState(false);
  const [applications, setApplications] = useState<FinanceApplication[]>([]);

  const [detailsAppId, setDetailsAppId] = useState<string | null>(null);

  const displayTitle = useMemo(() => {
    if (!agent) return 'Agent applications';
    if (context === 'accrual' && range) return `${agent.name} • Accruals (${range.startDate} → ${range.endDate})`;
    if ((context === 'initiated' || context === 'paid') && month != null && year != null) {
      return `${agent.name} • ${context === 'paid' ? 'Paid' : 'Initiated'} (${month}/${year})`;
    }
    return `${agent.name} • Applications`;
  }, [agent, context, month, range, year]);

  useEffect(() => {
    if (!isOpen || !agent) return;
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        if (context === 'accrual' && range) {
          const data = await api.getAccrualApplicationsByAgent(agent.agentId, range);
          if (!cancelled) setApplications(data);
        } else if ((context === 'initiated' || context === 'paid') && month != null && year != null) {
          const data = await api.getInitiatedApplicationsByAgent(agent.agentId, month, year);
          if (!cancelled) setApplications(data);
        } else {
          if (!cancelled) setApplications([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.agentId, context, isOpen, month, range, year]);

  const total = useMemo(() => {
    return applications.reduce((sum, a) => {
      const v =
        context === 'initiated' || context === 'paid'
          ? Number(a.agentCommissionSnapshot ?? 0)
          : Number(a.agentCommission ?? 0);
      return sum + v;
    }, 0);
  }, [applications, context]);

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
                        Applications in this total: <span className="font-semibold">{applications.length}</span> • Total:{' '}
                        {total.toLocaleString()} RWF
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
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                    <p className="text-gray-600">Loading applications…</p>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-gray-600">No applications found for this agent in this period.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">App #</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Client</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Insurance</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {applications.map((app) => {
                          const submittedAt = app.submittedAt ? new Date(app.submittedAt) : null;
                          const commission =
                            context === 'initiated' || context === 'paid'
                              ? Number(app.agentCommissionSnapshot ?? 0)
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
                              <td className="px-4 py-3 text-gray-600">{submittedAt ? submittedAt.toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">{commission.toLocaleString()} RWF</td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => setDetailsAppId(app._id)}
                                  >
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
        isOpen={Boolean(detailsAppId)}
        onClose={() => setDetailsAppId(null)}
        applicationId={detailsAppId ?? ''}
        context={context}
        month={context === 'accrual' ? undefined : month}
        year={context === 'accrual' ? undefined : year}
      />
    </>
  );
}

