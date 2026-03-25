'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentViewer } from '@/components/ui/document-viewer';

// Keep this type loose so the UI can render as backend fields evolve.
type PaymentInitiatedApplicationDetails = Record<string, unknown>;

interface FinanceApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  apiBaseUrl: string;
  applicationId: string;
  fallbackApplication?: Record<string, unknown> | null;
}

function formatUtcDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function renderText(value: unknown) {
  if (typeof value === 'string') return value.trim().length ? value : '—';
  if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString();
  return '—';
}

export default function FinanceApplicationDetailsModal({
  isOpen,
  onClose,
  token,
  apiBaseUrl,
  applicationId,
  fallbackApplication,
}: FinanceApplicationDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [details, setDetails] = useState<PaymentInitiatedApplicationDetails | null>(null);

  const [viewingDocument, setViewingDocument] = useState<{ name: string; path: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !applicationId || !token || !apiBaseUrl) return;

    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        // New endpoint (to be implemented on backend):
        // GET /getPaymentInitiatedApplicationDetails?id=APPLICATION_ID
        const url = new URL(`${apiBaseUrl}/getPaymentInitiatedApplicationDetails`);
        url.searchParams.set('id', applicationId);

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch initiated application details');

        const json = await res.json();
        const payload = json.data ?? json.application ?? json;
        if (!cancelled) setDetails(payload);
      } catch {
        // UI fallback until backend endpoint is ready.
        if (cancelled) return;
        setDetails(fallbackApplication ?? null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, applicationId, fallbackApplication, isOpen, token]);

  const detailsObj = (details ?? null) as PaymentInitiatedApplicationDetails | null;
  const fallbackObj = (fallbackApplication ?? null) as Record<string, unknown> | null;
  const clientFrom = (obj: Record<string, unknown> | null) => {
    const raw = obj?.['client'];
    if (typeof raw !== 'object' || raw == null) return undefined;
    return raw as Record<string, unknown>;
  };

  const detailsClient = clientFrom(detailsObj);
  const fallbackClient = clientFrom(fallbackObj);

  const clientFullName =
    (detailsClient?.['fullName'] as unknown) ??
    detailsObj?.['fullName'] ??
    fallbackClient?.['fullName'] ??
    fallbackObj?.['fullName'];
  const clientEmail =
    detailsClient?.['email'] ?? detailsObj?.['email'] ?? fallbackClient?.['email'] ?? fallbackObj?.['email'];
  const clientPhone =
    detailsClient?.['phoneNumber'] ??
    detailsObj?.['phoneNumber'] ??
    fallbackClient?.['phoneNumber'] ??
    fallbackObj?.['phoneNumber'];
  const clientNationalId =
    detailsClient?.['nationalID'] ??
    detailsObj?.['nationalID'] ??
    fallbackClient?.['nationalID'] ??
    fallbackObj?.['nationalID'];

  const docs = useMemo(() => {
    // Expected backend response (same spirit as admin view):
    // - identification documents: nationalID/yellowCard/pastInsuranceCertificate (or urls)
    // - insurance docs: invoice/insuranceCertificate/contract/receipt/ebm
    // - payment docs: proofOfPayment/transactionId
    const d = (details ?? fallbackApplication ?? {}) as Record<string, unknown>;
    const clientRaw = d['client'];
    const client =
      typeof clientRaw === 'object' && clientRaw != null ? (clientRaw as Record<string, unknown>) : undefined;
    const candidates: Array<{ key: string; label: string; path: unknown }> = [
      { key: 'nationalID', label: 'Identification Document', path: client?.['nationalID'] ?? d['nationalID'] },
      {
        key: 'yellowCard',
        label: 'Yellow Card',
        path: d['yellowCard'] ?? d['yellowCardUrl'] ?? client?.['yellowCard'],
      },
      {
        key: 'pastInsuranceCertificate',
        label: 'Past Insurance Certificate',
        path: d['pastInsuranceCertificate'] ?? d['pastInsuranceCertificateUrl'] ?? client?.['pastInsuranceCertificate'],
      },
      { key: 'invoice', label: 'Invoice', path: d['invoice'] ?? d['invoiceUrl'] },
      { key: 'insuranceCertificate', label: 'Insurance Certificate', path: d['insuranceCertificate'] ?? d['insuranceCertificateUrl'] },
      { key: 'contract', label: 'Contract', path: d['contract'] ?? d['contractUrl'] },
      { key: 'receipt', label: 'Receipt', path: d['receipt'] ?? d['receiptUrl'] },
      { key: 'ebm', label: 'EBM', path: d['ebm'] ?? d['ebmUrl'] },
      { key: 'proofOfPayment', label: 'Proof of Payment', path: d['proofOfPayment'] ?? d['proofOfPaymentUrl'] },
    ];

    return candidates
      .filter((c) => typeof c.path === 'string' && c.path.trim().length > 0)
      .map((c) => ({ label: c.label, path: String(c.path) }));
  }, [details, fallbackApplication]);

  const title = useMemo(() => {
    const d = (details ?? fallbackApplication ?? {}) as Record<string, unknown>;
    const number = d['applicationNumber'];
    return typeof number === 'string' && number.trim() ? `Application #${number}` : 'Application details';
  }, [details, fallbackApplication]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">Snapshot verification (payment initiated)</p>
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
                  <p className="text-gray-600">Loading full details…</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-100 p-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Client</h4>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-semibold text-gray-900">
                        {typeof clientFullName === 'string' && clientFullName.trim() ? clientFullName : '—'}
                      </p>
                      <p className="text-sm text-gray-600 mt-3">Email</p>
                      <p className="text-sm font-medium text-gray-900">
                        {typeof clientEmail === 'string' && clientEmail.trim() ? clientEmail : '—'}
                      </p>
                      <p className="text-sm text-gray-600 mt-3">Phone</p>
                      <p className="text-sm font-medium text-gray-900">
                        {typeof clientPhone === 'string' && clientPhone.trim() ? clientPhone : '—'}
                      </p>
                      <p className="text-sm text-gray-600 mt-3">National ID</p>
                      <p className="text-sm font-medium text-gray-900">
                        {typeof clientNationalId === 'string' && clientNationalId.trim() ? clientNationalId : '—'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Insurance</h4>
                      <p className="text-sm text-gray-600">Category</p>
                      <p className="font-semibold text-gray-900">
                        {renderText(details?.['insuranceCategory'] ?? fallbackApplication?.['insuranceCategory'])}
                      </p>
                      <p className="text-sm text-gray-600 mt-3">Type</p>
                      <p className="text-sm font-medium text-gray-900">
                        {renderText(details?.['insuranceType'] ?? fallbackApplication?.['insuranceType'])}
                      </p>
                      <p className="text-sm text-gray-600 mt-3">Duration</p>
                      <p className="text-sm font-medium text-gray-900">
                        {renderText(details?.['insuranceDuration'] ?? fallbackApplication?.['insuranceDuration'])}
                      </p>
                      <p className="text-sm text-gray-600 mt-3">Provider</p>
                      <p className="text-sm font-medium text-gray-900">
                        {renderText(details?.['insuranceProvider'] ?? fallbackApplication?.['insuranceProvider'])}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <div className="rounded-xl border border-gray-100 p-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Commissions</h4>
                      <p className="text-sm text-gray-600">Amount (RWF)</p>
                      <p className="font-semibold text-gray-900">
                        {Number(details?.amount ?? fallbackApplication?.amount ?? 0).toLocaleString()} RWF
                      </p>
                      <p className="text-sm text-gray-600 mt-3">Agent Commission (snapshot)</p>
                      <p className="font-semibold text-gray-900">
                        {Number(details?.agentCommission ?? fallbackApplication?.agentCommission ?? 0).toLocaleString()} RWF
                      </p>
                      <p className="text-sm text-gray-600 mt-3">Company Commission</p>
                      <p className="text-sm font-medium text-gray-900">
                        {Number(details?.companyCommission ?? fallbackApplication?.companyCommission ?? 0).toLocaleString()} RWF
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Status & Dates</h4>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-semibold text-gray-900">{renderText(details?.['status'] ?? fallbackApplication?.['status'])}</p>
                      <p className="text-sm text-gray-600 mt-3">Submitted</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatUtcDate(
                          (details?.['submittedAt'] as string | undefined) ?? (fallbackApplication?.['submittedAt'] as string | undefined),
                        )}
                      </p>
                      {details?.['insuranceEndAt'] ? (
                        <>
                          <p className="text-sm text-gray-600 mt-3">Insurance End</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatUtcDate(details?.['insuranceEndAt'] as string | undefined)}
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-100 p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Documents</h4>
                    {docs.length === 0 ? (
                      <p className="text-sm text-gray-600">No documents available for this application payload.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {docs.map((doc) => (
                          <div key={doc.path} className="border border-gray-100 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-800 mb-2">{doc.label}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setViewingDocument({ name: doc.label, path: doc.path })}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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

