'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { ApiContractPanel } from '@/features/livestock-application/components/shared/api-contract-panel';
import { ApplicationDocumentsGrid } from '@/features/livestock-application/components/shared/application-documents-grid';
import { ApplicationOwnersSection } from '@/features/livestock-application/components/shared/application-owners-section';
import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import { InsuredLinesSection } from '@/features/livestock-application/components/shared/insured-lines-section';
import { ApplicationStatusTimeline } from '@/features/livestock-application/components/workflow/application-status-timeline';
import { PaymentProofSection } from '@/features/livestock-application/components/workflow/payment-proof-section';
import { SubsidyWorkflowSection } from '@/features/livestock-application/components/workflow/subsidy-workflow-section';
import {
  ownerModeLabel,
  speciesGroupLabel,
} from '@/features/livestock-application/domain/form-profiles';
import type { LivestockApplicationViewRole } from '@/features/livestock-application/domain/application-types';
import { useLivestockApplicationDetail } from '@/features/livestock-application/hooks/use-livestock-applications';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { insuranceProviderLabel } from '@/shared/insurance-providers';

export interface LivestockApplicationDetailPageProps {
  applicationId: string;
  viewRole?: LivestockApplicationViewRole;
  backHref?: string;
  backLabel?: string;
}

function resolveBackHref(role: LivestockApplicationViewRole): string {
  if (role === 'admin') return '/admin/livestock/applications';
  if (role === 'super_admin') return '/super_admin/livestock/applications';
  return '/vet/livestock/applications';
}

export default function LivestockApplicationDetailPage({
  applicationId,
  viewRole = 'vet',
  backHref,
  backLabel = 'All applications',
}: LivestockApplicationDetailPageProps) {
  const { application, isLoading, error, reload } = useLivestockApplicationDetail(applicationId);
  const [viewingDocument, setViewingDocument] = useState<{ name: string; path: string } | null>(
    null,
  );
  const [ownerFilterKey, setOwnerFilterKey] = useState<string | null>(null);

  const handleViewDocument = (name: string, path: string) => {
    setViewingDocument({ name, path });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error ?? 'Not found'}</p>
        <Link
          href={backHref ?? resolveBackHref(viewRole)}
          className="mt-4 inline-block text-blue-600"
        >
          {backLabel}
        </Link>
      </div>
    );
  }

  const { totals } = application;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link
          href={backHref ?? resolveBackHref(viewRole)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Livestock application · {insuranceProviderLabel(application.insuranceProvider)}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {application.applicationNumber}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {speciesGroupLabel(application.speciesGroup)} ·{' '}
                {ownerModeLabel(application.ownerMode)} · {application.lineCount} insured line
                {application.lineCount !== 1 ? 's' : ''}
              </p>
              {viewRole !== 'vet' && (
                <p className="mt-1 text-xs text-slate-500">
                  Veterinarian: {application.vetName} · Submitted{' '}
                  {new Date(application.submittedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <LivestockApplicationStatusBadge status={application.status} />
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Owner(s)', application.ownerSummary],
              ['Premium 100%', formatRwfDisplay(totals.premiumRateAmount)],
              ['Farmer 60%', formatRwfDisplay(totals.farmerContributionAmount)],
              ['Nkunganire 40%', formatRwfDisplay(totals.governmentContribution)],
              ['Vet commission', formatRwfDisplay(totals.veterinaryCommission)],
              ['Policy period', `${application.policyStartDate} → ${application.policyEndDate}`],
              ['Provider', insuranceProviderLabel(application.insuranceProvider)],
              ['Veterinarian', application.vetName],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
          <p className="mt-1 text-sm text-slate-600">
            Payment proof, nkunganire forms, and issued policy documents.
          </p>
          <div className="mt-4">
            <ApplicationDocumentsGrid
              application={application}
              onViewDocument={(doc) => handleViewDocument(doc.label, doc.path)}
            />
          </div>
        </section>

        <ApplicationOwnersSection
          application={application}
          selectedOwnerKey={ownerFilterKey}
          onSelectOwner={setOwnerFilterKey}
        />

        <InsuredLinesSection application={application} ownerFilterKey={ownerFilterKey} />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <PaymentProofSection
              application={application}
              viewRole={viewRole}
              onUpdated={reload}
              onViewDocument={handleViewDocument}
            />
            <SubsidyWorkflowSection
              application={application}
              viewRole={viewRole}
              onUpdated={reload}
              onViewDocument={handleViewDocument}
            />
          </div>
          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Progress</h2>
            <div className="mt-4">
              <ApplicationStatusTimeline application={application} />
            </div>
          </aside>
        </div>

        <ApiContractPanel contractKey="getApplication" defaultOpen />
      </div>

      {viewingDocument && (
        <DocumentViewer
          documentName={viewingDocument.name}
          documentPath={viewingDocument.path}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
