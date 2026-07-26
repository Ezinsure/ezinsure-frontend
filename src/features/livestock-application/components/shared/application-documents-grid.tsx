'use client';

import { FileText } from 'lucide-react';
import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';

export interface ApplicationDocumentItem {
  label: string;
  path: string;
}

interface ApplicationDocumentsGridProps {
  application: LivestockApplicationPackage;
  onViewDocument: (doc: ApplicationDocumentItem) => void;
}

export function buildApplicationDocuments(
  application: LivestockApplicationPackage,
): ApplicationDocumentItem[] {
  const { paymentProof, subsidyCase, issuedDocuments } = application;
  const docs: ApplicationDocumentItem[] = [];

  if (issuedDocuments?.invoice) {
    docs.push({ label: 'Invoice / quotation', path: issuedDocuments.invoice });
  }
  if (paymentProof.documentUrl) {
    docs.push({ label: 'Payment proof', path: paymentProof.documentUrl });
  }
  if (subsidyCase.generatedDocumentUrl) {
    docs.push({ label: 'Nkunganire template', path: subsidyCase.generatedDocumentUrl });
  }
  if (subsidyCase.uploadedSignedDocumentUrl) {
    docs.push({ label: 'Nkunganire (signed)', path: subsidyCase.uploadedSignedDocumentUrl });
  }
  if (application.sonarwaReview?.correctionDocumentUrl) {
    docs.push({
      label: 'SONARWA correction document',
      path: application.sonarwaReview.correctionDocumentUrl,
    });
  }
  if (issuedDocuments?.insuranceCertificate) {
    docs.push({ label: 'Insurance certificate', path: issuedDocuments.insuranceCertificate });
  }
  if (issuedDocuments?.contract) {
    docs.push({ label: 'Contract', path: issuedDocuments.contract });
  }
  if (issuedDocuments?.receipt) {
    docs.push({ label: 'Receipt', path: issuedDocuments.receipt });
  }
  if (issuedDocuments?.ebm) {
    docs.push({ label: 'EBM', path: issuedDocuments.ebm });
  }

  return docs.filter((d) => Boolean(d.path));
}

export function ApplicationDocumentsGrid({
  application,
  onViewDocument,
}: ApplicationDocumentsGridProps) {
  const docs = buildApplicationDocuments(application);

  if (docs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        No documents available yet. Upload payment proof or wait for policy issuance.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((doc) => (
        <button
          key={doc.label}
          type="button"
          onClick={() => onViewDocument(doc)}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
        >
          <span className="rounded-lg bg-blue-50 p-2">
            <FileText className="h-5 w-5 text-blue-600" />
          </span>
          <span className="text-sm font-semibold text-slate-800">{doc.label}</span>
        </button>
      ))}
    </div>
  );
}
