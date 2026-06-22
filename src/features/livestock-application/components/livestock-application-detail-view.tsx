'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { DocumentViewer } from '@/components/ui/document-viewer';
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
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import {
  PaymentStatusBadge,
  SubsidyStatusBadge,
} from '@/features/livestock-application/components/shared/workflow-status-badges';
import {
  formatLocationFull,
  formatPolicyDate,
  formatSubmittedDateTime,
} from '@/features/livestock-application/utils/application-location';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { insuranceProviderLabel } from '@/shared/insurance-providers';

export interface LivestockApplicationDetailViewProps {
  application: LivestockApplicationPackage;
  viewRole?: LivestockApplicationViewRole;
  layout?: 'page' | 'panel';
  backHref?: string;
  backLabel?: string;
  onClose?: () => void;
  onUpdated?: () => void;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3 sm:p-4">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-snug text-slate-900">
        {value}
      </dd>
    </div>
  );
}

export function LivestockApplicationDetailView({
  application,
  viewRole = 'vet',
  layout = 'page',
  backHref,
  backLabel = 'All applications',
  onClose,
  onUpdated,
}: LivestockApplicationDetailViewProps) {
  const [viewingDocument, setViewingDocument] = useState<{ name: string; path: string } | null>(
    null,
  );
  const [ownerFilterKey, setOwnerFilterKey] = useState<string | null>(null);

  const { totals } = application;
  const locationLabel = application.livestockLocation
    ? formatLocationFull(application.livestockLocation)
    : null;

  const isPanel = layout === 'panel';

  const metrics: { label: string; value: string }[] = [
    { label: 'Owner(s)', value: application.ownerSummary },
    { label: 'Sum assured', value: formatRwfDisplay(totals.totalSumAssured) },
    { label: 'Premium 100%', value: formatRwfDisplay(totals.premiumRateAmount) },
    { label: 'Farmer 60%', value: formatRwfDisplay(totals.farmerContributionAmount) },
    { label: 'Nkunganire 40%', value: formatRwfDisplay(totals.governmentContribution) },
    { label: 'Vet commission', value: formatRwfDisplay(totals.veterinaryCommission) },
    {
      label: 'Policy period',
      value: `${formatPolicyDate(application.policyStartDate)} → ${formatPolicyDate(application.policyEndDate)}`,
    },
    { label: 'Provider', value: insuranceProviderLabel(application.insuranceProvider) },
    ...(locationLabel ? [{ label: 'Farm location', value: locationLabel }] : []),
    ...(viewRole !== 'vet'
      ? [{ label: 'Veterinarian', value: application.vetName }]
      : []),
  ];

  const scrollBody = (
    <div
      className={
        isPanel
          ? 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-slate-50 to-white'
          : 'min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6 lg:p-8'
      }
    >
      <div
        className={
          isPanel
            ? 'mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6 lg:px-8'
            : 'mx-auto max-w-6xl space-y-8'
        }
      >
        {!isPanel && backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {backLabel}
          </Link>
        )}

        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 sm:text-xs">
                Livestock application · {insuranceProviderLabel(application.insuranceProvider)}
              </p>
              <h1 className="mt-1 break-all text-xl font-bold tracking-tight text-slate-900 sm:break-normal sm:text-2xl lg:text-3xl">
                {application.applicationNumber}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {speciesGroupLabel(application.speciesGroup)} ·{' '}
                {ownerModeLabel(application.ownerMode)}
                {application.insuranceType ? ` · ${application.insuranceType}` : ''}
                {application.lineCount > 0
                  ? ` · ${application.lineCount} insured line${application.lineCount !== 1 ? 's' : ''}`
                  : ''}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Submitted {formatSubmittedDateTime(application.submittedAt)}
                {viewRole !== 'vet' && application.vetName
                  ? ` · Veterinarian: ${application.vetName}`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <LivestockApplicationStatusBadge status={application.status} />
              <PaymentStatusBadge status={application.paymentProof.status} />
              <SubsidyStatusBadge status={application.subsidyCase.status} />
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </dl>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Documents</h2>
          <p className="mt-1 text-sm text-slate-600">
            Payment proof, nkunganire forms, and issued policy documents.
          </p>
          <div className="mt-4 min-w-0">
            <ApplicationDocumentsGrid
              application={application}
              onViewDocument={(doc) => setViewingDocument({ name: doc.label, path: doc.path })}
            />
          </div>
        </section>

        <ApplicationOwnersSection
          application={application}
          selectedOwnerKey={ownerFilterKey}
          onSelectOwner={setOwnerFilterKey}
        />

        <InsuredLinesSection
          application={application}
          ownerFilterKey={ownerFilterKey}
          linesUnavailableNote="Animal line details are not included in the list response yet. Premiums and location above reflect the submitted package."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="space-y-6 lg:col-span-2 lg:space-y-8">
            <PaymentProofSection
              application={application}
              viewRole={viewRole}
              onUpdated={onUpdated}
              onViewDocument={(name, path) => setViewingDocument({ name, path })}
            />
            <SubsidyWorkflowSection
              application={application}
              viewRole={viewRole}
              onUpdated={onUpdated}
              onViewDocument={(name, path) => setViewingDocument({ name, path })}
            />
          </div>
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold text-slate-900">Progress</h2>
            <div className="mt-4">
              <ApplicationStatusTimeline application={application} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isPanel ? (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{backLabel}</span>
                <span className="sm:hidden">Back</span>
              </button>
            )}
            <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-slate-800 sm:text-left">
              {application.applicationNumber}
            </p>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {scrollBody}
        </div>
      ) : (
        scrollBody
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
