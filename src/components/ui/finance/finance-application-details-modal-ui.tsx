'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import type { FinanceApplication } from './finance-domain';
import { useFinanceApi } from './finance-api';
import { Button } from '@/components/ui/button';
import { DocumentViewer } from '@/components/ui/document-viewer';

type FinanceDetailsContext = 'accrual' | 'initiated' | 'paid';

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

interface FinanceApplicationDetailsModalUIProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  context: FinanceDetailsContext;
  month?: number;
  year?: number;
  applicationData?: FinanceApplication | null;
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
  applicationData,
}: FinanceApplicationDetailsModalUIProps) {
  const getStatusBadge = (status?: string) => {
    if (!status) {
      return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">Unknown</span>;
    }
    switch (status.toLowerCase()) {
      case ApplicationStatus.PENDING:
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">Pending</span>;
      case ApplicationStatus.APPLICATION_APPROVED:
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
            Application Approved
          </span>
        );
      case ApplicationStatus.WAITING_FOR_USER_ACTION:
        return (
          <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
            Waiting for User Action
          </span>
        );
      case ApplicationStatus.INVOICE_SENT:
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">Invoice Sent</span>;
      case ApplicationStatus.REVIEW_PAYMENT:
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">Review Payment</span>;
      case ApplicationStatus.PAYMENT_VERIFIED:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">Payment Verified</span>;
      case ApplicationStatus.INSURANCE_ISSUED:
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">Insurance Issued</span>;
      case ApplicationStatus.CANCELLED:
        return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">Cancelled</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">{status.replace(/_/g, ' ')}</span>;
    }
  };
  const api = useFinanceApi();
  const [isLoading, setIsLoading] = useState(false);
  const [app, setApp] = useState<FinanceApplication | null>(null);

  const [viewingDocument, setViewingDocument] = useState<{ name: string; path: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !applicationId) return;
    if (applicationData) {
      setApp(applicationData);
      setIsLoading(false);
      return;
    }
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
  }, [applicationData, applicationId, context, isOpen, month, year]);

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
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-gray-600">
                  Context: <span className="font-semibold">{context}</span>
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Close">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                  <p className="text-gray-600">Loading application details…</p>
                </div>
              ) : !app ? (
                <div className="py-10 text-center">
                  <p className="text-gray-600">No application data found.</p>
                </div>
              ) : (
                <>
                  <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Application ID</p>
                        <p className="font-semibold">#{app.applicationNumber || 'N/A'}</p>
                      </div>
                      <div>{getStatusBadge(app.status)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-semibold">{app.client?.fullName || app.agentFullName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-semibold">{app.client?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-semibold">{app.client?.phoneNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date of Birth</p>
                        <p className="font-semibold">
                          {((app.client as Record<string, unknown> | undefined)?.dateOfBirth as string | undefined)
                            ? new Date((app.client as Record<string, unknown>).dateOfBirth as string).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-semibold">{app.client?.address || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500">Insurance Category</p>
                        <p className="font-semibold">{app.insuranceCategory || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Insurance Type</p>
                        <p className="font-semibold">{app.insuranceType || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="font-semibold">{app.insuranceDuration || 'N/A'}</p>
                      </div>
                      {app.insuranceEndAt && (
                        <div>
                          <p className="text-sm text-gray-500">Insurance End Date</p>
                          <p className="font-semibold">{formatUtcDate(app.insuranceEndAt)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-semibold">{Number(app.amount ?? 0).toLocaleString()} RWF</p>
                      </div>
                      {app.insuranceProvider && (
                        <div>
                          <p className="text-sm text-gray-500">Insurance Provider</p>
                          <p className="font-semibold">{app.insuranceProvider}</p>
                        </div>
                      )}
                    </div>

                    {(app.insuranceCategory === 'Car Insurance' || app.insuranceCategory === 'MotorBike Insurance') && (
                      <div>
                        {(app.vehicle?.vehicleType || app.vehicle?.vehicleAge || app.vehicle?.vehicleUse || app.vehicle?.plateNumber) && (
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-500">Vehicle Type</p>
                              <p className="font-semibold">{app.vehicle?.vehicleType || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Vehicle Year</p>
                              <p className="font-semibold">{app.vehicle?.vehicleAge || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Vehicle Use</p>
                              <p className="font-semibold">{app.vehicle?.vehicleUse || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Plate Number</p>
                              <p className="font-semibold">{app.vehicle?.plateNumber || 'N/A'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4 mt-6">
                    <h4 className="font-medium mb-2">Documents</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {docs.map((doc) => (
                        <button
                          key={doc.key}
                          className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                          onClick={() => setViewingDocument({ name: doc.label, path: doc.path! })}
                          type="button"
                        >
                          <p className="text-sm font-medium">{doc.label}</p>
                          <p className="text-xs text-gray-500">View Document</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="text" onClick={onClose}>
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

