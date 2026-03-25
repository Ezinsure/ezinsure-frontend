'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import type { FinanceApplication } from './finance-domain';
import { useFinanceApi } from './finance-api';
import { Button } from '@/components/ui/button';
import { DocumentViewer } from '@/components/ui/document-viewer';

type FinanceDetailsContext = 'accrual' | 'initiated' | 'paid';

interface FinanceApplicationDetailsModalUIProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  context: FinanceDetailsContext;
  month?: number;
  year?: number;
}

function formatUtcDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export default function FinanceApplicationDetailsModalUI({
  isOpen,
  onClose,
  applicationId,
  context,
  month,
  year,
}: FinanceApplicationDetailsModalUIProps) {
  const api = useFinanceApi();
  const [isLoading, setIsLoading] = useState(false);
  const [app, setApp] = useState<FinanceApplication | null>(null);

  const [viewingDocument, setViewingDocument] = useState<{ name: string; path: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !applicationId) return;
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const data = await api.getApplicationDetails(applicationId, context, month, year);
        if (!cancelled) setApp(data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, context, isOpen, month, year]);

  const docs = useMemo(() => {
    const d = app?.documents ?? {};
    const entries: Array<{ label: string; key: keyof typeof d; path?: string }> = [
      { label: 'Identification', key: 'nationalID', path: d.nationalID },
      { label: 'Yellow Card', key: 'yellowCard', path: d.yellowCard },
      { label: 'Past Insurance', key: 'pastInsuranceCertificate', path: d.pastInsuranceCertificate },
      { label: 'Invoice', key: 'invoice', path: d.invoice },
      { label: 'Insurance Certificate', key: 'insuranceCertificate', path: d.insuranceCertificate },
      { label: 'Contract', key: 'contract', path: d.contract },
      { label: 'Receipt', key: 'receipt', path: d.receipt },
      { label: 'EBM', key: 'ebm', path: d.ebm },
      { label: 'Proof of Payment', key: 'proofOfPayment', path: d.proofOfPayment },
    ];
    return entries.filter((e) => typeof e.path === 'string' && e.path.trim().length > 0);
  }, [app]);

  const title = useMemo(() => {
    const number = app?.applicationNumber ?? '';
    return number ? `Application Verification: ${number}` : 'Application Verification';
  }, [app]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">
                  Context: <span className="font-semibold">{context}</span>
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
                  <p className="text-gray-600">Loading application details…</p>
                </div>
              ) : !app ? (
                <div className="py-10 text-center">
                  <p className="text-gray-600">No application data found.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-100 p-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Client</h4>
                      <p className="text-sm text-gray-600">Full name</p>
                      <p className="font-semibold text-gray-900">{app.client?.fullName ?? '—'}</p>
                      <p className="text-sm text-gray-600 mt-3">Email</p>
                      <p className="font-semibold text-gray-900">{app.client?.email ?? '—'}</p>
                      <p className="text-sm text-gray-600 mt-3">Phone</p>
                      <p className="font-semibold text-gray-900">{app.client?.phoneNumber ?? '—'}</p>
                      <p className="text-sm text-gray-600 mt-3">National ID</p>
                      <p className="font-semibold text-gray-900">{app.client?.nationalID ?? '—'}</p>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Insurance</h4>
                      <p className="text-sm text-gray-600">Category</p>
                      <p className="font-semibold text-gray-900">{app.insuranceCategory ?? '—'}</p>
                      <p className="text-sm text-gray-600 mt-3">Type</p>
                      <p className="font-semibold text-gray-900">{app.insuranceType ?? '—'}</p>
                      <p className="text-sm text-gray-600 mt-3">Duration</p>
                      <p className="font-semibold text-gray-900">{app.insuranceDuration ?? '—'}</p>
                      <p className="text-sm text-gray-600 mt-3">Provider</p>
                      <p className="font-semibold text-gray-900">{app.insuranceProvider ?? '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <div className="rounded-xl border border-gray-100 p-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Vehicle</h4>
                      <p className="text-sm text-gray-600">Plate number</p>
                      <p className="font-semibold text-gray-900">{app.vehicle?.plateNumber ?? '—'}</p>
                      <p className="text-sm text-gray-600 mt-3">Vehicle type</p>
                      <p className="font-semibold text-gray-900">{app.vehicle?.vehicleType ?? '—'}</p>
                      <p className="text-sm text-gray-600 mt-3">Vehicle age</p>
                      <p className="font-semibold text-gray-900">{app.vehicle?.vehicleAge ?? '—'}</p>
                      <p className="text-sm text-gray-600 mt-3">Vehicle use</p>
                      <p className="font-semibold text-gray-900">{app.vehicle?.vehicleUse ?? '—'}</p>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Status & Dates</h4>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-semibold text-gray-900">{app.status ?? '—'}</p>
                      <p className="text-sm text-gray-600 mt-3">Submitted</p>
                      <p className="font-semibold text-gray-900">{formatUtcDate(app.submittedAt)}</p>
                      <p className="text-sm text-gray-600 mt-3">Insurance end</p>
                      <p className="font-semibold text-gray-900">{formatUtcDate(app.insuranceEndAt)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Commission Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-sm text-gray-600">Amount</p>
                        <p className="font-semibold text-gray-900">{Number(app.amount ?? 0).toLocaleString()} RWF</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Company commission</p>
                        <p className="font-semibold text-gray-900">
                          {Number(context === 'initiated' || context === 'paid' ? app.companyCommissionSnapshot ?? 0 : app.companyCommission ?? 0).toLocaleString()} RWF
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Administration fees</p>
                        <p className="font-semibold text-gray-900">
                          {Number(
                            context === 'initiated' || context === 'paid'
                              ? app.administrationFeesSnapshot ?? 0
                              : app.administrationFees ?? 0,
                          ).toLocaleString()} RWF
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-sm text-gray-600">Agent commission</p>
                        <p className="font-semibold text-gray-900">
                          {Number(
                            context === 'initiated' || context === 'paid'
                              ? app.agentCommissionSnapshot ?? 0
                              : app.agentCommission ?? 0,
                          ).toLocaleString()} RWF
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Agent</p>
                        <p className="font-semibold text-gray-900">{app.agentFullName ?? app.agentId ?? '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Documents</h4>
                    {docs.length === 0 ? (
                      <p className="text-sm text-gray-600">No documents included in this payload.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {docs.map((doc) => (
                          <div key={doc.key} className="border border-gray-100 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-800 mb-2">{doc.label}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setViewingDocument({ name: doc.label, path: doc.path! })}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Debug aid for backend contract verification */}
                  <details className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                      Backend payload preview (JSON)
                    </summary>
                    <pre className="text-[11px] text-gray-700 overflow-auto mt-3">
                      {JSON.stringify(app, null, 2)}
                    </pre>
                  </details>
                </>
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

      {viewingDocument && (
        <DocumentViewer
          documentName={viewingDocument.name}
          documentPath={viewingDocument.path}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </>
  );
}

