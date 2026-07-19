'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { ApplicationDocumentsGrid } from '@/features/livestock-application/components/shared/application-documents-grid';
import { ApplicationFormDetailsSection } from '@/features/livestock-application/components/shared/application-form-details-section';
import { ApplicationOwnersSection } from '@/features/livestock-application/components/shared/application-owners-section';
import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import { InsuredLinesSection } from '@/features/livestock-application/components/shared/insured-lines-section';
import { PaymentProofSection } from '@/features/livestock-application/components/workflow/payment-proof-section';
import { InsuranceIssueSection } from '@/features/livestock-application/components/workflow/insurance-issue-section';
import { SubsidyWorkflowSection } from '@/features/livestock-application/components/workflow/subsidy-workflow-section';
import { SonarwaReviewSection } from '@/features/livestock-application/components/workflow/sonarwa-review-section';
import { CommissionWorkflowSection } from '@/features/livestock-application/components/workflow/commission-workflow-section';
import { WorkflowOverviewBanner } from '@/features/livestock-application/components/workflow/workflow-overview-banner';
import { ApplicationWorkflowNav } from '@/features/livestock-application/components/workflow/application-workflow-nav';
import { ApplicationInfoTabs } from '@/features/livestock-application/components/workflow/application-info-tabs';
import { ApplicationStatusTimeline } from '@/features/livestock-application/components/workflow/application-status-timeline';
import {
  ownerModeLabel,
  poultryProductTypeLabel,
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
import {
  APPLICATION_INFO_ITEMS,
  buildWorkflowStepsNav,
  DEFAULT_DETAIL_SECTION,
  isWorkflowSection,
  type ApplicationDetailSectionId,
} from '@/features/livestock-application/utils/application-detail-sections';
import { WorkflowToastProvider } from '@/features/livestock-application/components/workflow/workflow-toast-context';

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
  const [activeSection, setActiveSection] =
    useState<ApplicationDetailSectionId>(DEFAULT_DETAIL_SECTION);
  const [viewingDocument, setViewingDocument] = useState<{ name: string; path: string } | null>(
    null,
  );
  const [ownerFilterKey, setOwnerFilterKey] = useState<string | null>(null);

  const workflowSteps = useMemo(
    () => buildWorkflowStepsNav(viewRole, application),
    [viewRole, application],
  );
  const applicationInfoItems = APPLICATION_INFO_ITEMS;

  useEffect(() => {
    if (
      isWorkflowSection(activeSection) &&
      !workflowSteps.some((step) => step.id === activeSection)
    ) {
      setActiveSection(DEFAULT_DETAIL_SECTION);
    }
  }, [activeSection, workflowSteps]);
  const { totals } = application;
  const locationLabel = application.livestockLocation
    ? formatLocationFull(application.livestockLocation)
    : null;
  const isPanel = layout === 'panel';

  const metrics: { label: string; value: string }[] = [
    { label: 'Owner(s)', value: application.ownerSummary },
    { label: 'Insurance type', value: application.insuranceType ?? '—' },
    { label: 'Species', value: speciesGroupLabel(application.speciesGroup) },
    ...(application.poultryProductType
      ? [
          {
            label: 'Poultry product',
            value: poultryProductTypeLabel(application.poultryProductType),
          },
        ]
      : []),
    { label: 'Owner mode', value: ownerModeLabel(application.ownerMode) },
    { label: 'Premium rate', value: `${application.totals.premiumPercentage}%` },
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
    ...(viewRole !== 'vet' ? [{ label: 'Veterinarian', value: application.vetName }] : []),
  ];

  const viewDocument = (name: string, path: string) => setViewingDocument({ name, path });

  const sectionContent = (() => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <WorkflowOverviewBanner application={application} viewRole={viewRole} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900">Application summary</h2>
                <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {metrics.map((metric) => (
                    <MetricCard key={metric.label} label={metric.label} value={metric.value} />
                  ))}
                </dl>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Progress
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Application lifecycle</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Track where this package is in the livestock insurance workflow.
                </p>
                <div className="mt-5">
                  <ApplicationStatusTimeline application={application} variant="text" />
                </div>
              </section>
            </div>
          </div>
        );
      case 'documents':
        return (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
            <p className="mt-1 text-sm text-slate-600">
              Payment proof, nkunganire forms, and issued policy documents.
            </p>
            <div className="mt-4 min-w-0">
              <ApplicationDocumentsGrid
                application={application}
                onViewDocument={(doc) => viewDocument(doc.label, doc.path)}
              />
            </div>
          </section>
        );
      case 'application-details':
        return <ApplicationFormDetailsSection application={application} />;
      case 'owners':
        return (
          <ApplicationOwnersSection
            application={application}
            selectedOwnerKey={ownerFilterKey}
            onSelectOwner={setOwnerFilterKey}
          />
        );
      case 'insured-lines':
        return (
          <InsuredLinesSection
            application={application}
            ownerFilterKey={ownerFilterKey}
            linesUnavailableNote="Animal line details are not included in the list response yet. Premiums and location above reflect the submitted package."
          />
        );
      case 'payment-proof':
        return (
          <PaymentProofSection
            application={application}
            viewRole={viewRole}
            onUpdated={onUpdated}
            onViewDocument={viewDocument}
          />
        );
      case 'issue-insurance':
        return (
          <InsuranceIssueSection
            application={application}
            viewRole={viewRole}
            onUpdated={onUpdated}
            onViewDocument={viewDocument}
          />
        );
      case 'subsidy':
        return (
          <SubsidyWorkflowSection
            application={application}
            viewRole={viewRole}
            onUpdated={onUpdated}
            onViewDocument={viewDocument}
          />
        );
      case 'sonarwa':
        return (
          <SonarwaReviewSection
            application={application}
            viewRole={viewRole}
            onUpdated={onUpdated}
            onViewDocument={viewDocument}
          />
        );
      case 'commission':
        return (
          <CommissionWorkflowSection
            application={application}
            viewRole={viewRole}
            onUpdated={onUpdated}
          />
        );
      default:
        return null;
    }
  })();

  const activeLabel =
    [...applicationInfoItems, ...workflowSteps].find((item) => item.id === activeSection)
      ?.label ?? 'Overview';

  const mainContent = (
    <div
      className={
        isPanel
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white'
          : 'min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6 lg:p-8'
      }
    >
      {!isPanel && backHref && (
        <div className="mx-auto mb-4 w-full max-w-7xl">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {backLabel}
          </Link>
        </div>
      )}

      <div className={isPanel ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto flex w-full max-w-7xl flex-col gap-4'}>
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 sm:text-xs">
                Livestock application · {insuranceProviderLabel(application.insuranceProvider)}
              </p>
              <h1 className="mt-1 break-all text-xl font-bold tracking-tight text-slate-900 sm:break-normal sm:text-2xl">
                {application.applicationNumber}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {speciesGroupLabel(application.speciesGroup)} · {ownerModeLabel(application.ownerMode)}
                {application.lineCount > 0
                  ? ` · ${application.lineCount} insured line${application.lineCount !== 1 ? 's' : ''}`
                  : ''}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Submitted {formatSubmittedDateTime(application.submittedAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LivestockApplicationStatusBadge status={application.status} />
              <PaymentStatusBadge status={application.paymentProof.status} />
              <SubsidyStatusBadge status={application.subsidyCase.status} />
            </div>
          </div>
        </header>

        <ApplicationInfoTabs
          items={applicationInfoItems}
          activeSection={activeSection}
          onSelect={setActiveSection}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {workflowSteps.length > 0 && (
            <aside className="hidden w-[17rem] shrink-0 lg:block xl:w-[19rem]">
              <ApplicationWorkflowNav
                steps={workflowSteps}
                activeSection={activeSection}
                application={application}
                onSelect={setActiveSection}
              />
            </aside>
          )}

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            {workflowSteps.length > 0 && (
              <div className="space-y-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
                <div>
                  <label htmlFor="workflow-step-select" className="mb-1 block text-xs font-medium text-slate-500">
                    Workflow step
                  </label>
                  <select
                    id="workflow-step-select"
                    value={isWorkflowSection(activeSection) ? activeSection : ''}
                    onChange={(e) => {
                      const value = e.target.value as ApplicationDetailSectionId;
                      if (value) setActiveSection(value);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800"
                  >
                    <option value="">Select a workflow step…</option>
                    {workflowSteps.map((item) => (
                      <option key={item.id} value={item.id}>
                        Step {item.stepNumber}: {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {isWorkflowSection(activeSection) ? 'Workflow step' : 'Application'}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{activeLabel}</h2>
              </div>
              {sectionContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <WorkflowToastProvider>
      {isPanel ? (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
                className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {mainContent}
        </div>
      ) : (
        mainContent
      )}

      {viewingDocument && (
        <DocumentViewer
          documentName={viewingDocument.name}
          documentPath={viewingDocument.path}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </WorkflowToastProvider>
  );
}
