'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import { ApplicationReviewDetails } from '@/features/livestock-application/components/shared/application-review-details';
import { PaymentProofSection } from '@/features/livestock-application/components/workflow/payment-proof-section';
import { InsuranceIssueSection } from '@/features/livestock-application/components/workflow/insurance-issue-section';
import { SubsidyWorkflowSection } from '@/features/livestock-application/components/workflow/subsidy-workflow-section';
import { SonarwaReviewSection } from '@/features/livestock-application/components/workflow/sonarwa-review-section';
import { CommissionWorkflowSection } from '@/features/livestock-application/components/workflow/commission-workflow-section';
import { ApplicationWorkflowNav } from '@/features/livestock-application/components/workflow/application-workflow-nav';
import {
  ownerModeLabel,
  speciesGroupLabel,
} from '@/features/livestock-application/domain/form-profiles';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { formatSubmittedDateTime } from '@/features/livestock-application/utils/application-location';
import { insuranceProviderLabel } from '@/shared/insurance-providers';
import {
  buildWorkflowStepsNav,
  DEFAULT_DETAIL_SECTION,
  isWorkflowSection,
  isWorkflowStepInteractive,
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
  const isPanel = layout === 'panel';
  const onWorkflowStep = isWorkflowSection(activeSection);
  const stepInteractive = isWorkflowStepInteractive(activeSection, viewRole);

  useEffect(() => {
    if (onWorkflowStep && !workflowSteps.some((step) => step.id === activeSection)) {
      setActiveSection(DEFAULT_DETAIL_SECTION);
    }
  }, [activeSection, onWorkflowStep, workflowSteps]);

  const viewDocument = (name: string, path: string) => setViewingDocument({ name, path });

  const workflowSectionContent = (() => {
    const readOnlyBanner = !stepInteractive ? (
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        This step is part of the full application process. Your role can view it, but actions are
        available only to the assigned role.
      </div>
    ) : null;

    switch (activeSection) {
      case 'payment-proof':
        return (
          <>
            {readOnlyBanner}
            <PaymentProofSection
              application={application}
              viewRole={viewRole}
              onUpdated={onUpdated}
              onViewDocument={viewDocument}
            />
          </>
        );
      case 'issue-insurance':
        return (
          <>
            {readOnlyBanner}
            <InsuranceIssueSection
              application={application}
              viewRole={viewRole}
              onUpdated={onUpdated}
              onViewDocument={viewDocument}
            />
          </>
        );
      case 'subsidy':
        return (
          <>
            {readOnlyBanner}
            <SubsidyWorkflowSection
              application={application}
              viewRole={viewRole}
              onUpdated={onUpdated}
              onViewDocument={viewDocument}
            />
          </>
        );
      case 'sonarwa':
        return (
          <>
            {readOnlyBanner}
            <SonarwaReviewSection
              application={application}
              viewRole={viewRole}
              onUpdated={onUpdated}
              onViewDocument={viewDocument}
            />
          </>
        );
      case 'commission':
        return (
          <>
            {readOnlyBanner}
            <CommissionWorkflowSection
              application={application}
              viewRole={viewRole}
              onUpdated={onUpdated}
            />
          </>
        );
      default:
        return null;
    }
  })();

  const sectionContent = onWorkflowStep ? (
    workflowSectionContent
  ) : (
    <ApplicationReviewDetails
      application={application}
      viewRole={viewRole}
      ownerFilterKey={ownerFilterKey}
      onSelectOwner={setOwnerFilterKey}
      onViewDocument={viewDocument}
    />
  );

  const activeLabel = onWorkflowStep
    ? (workflowSteps.find((item) => item.id === activeSection)?.label ?? 'Workflow step')
    : 'Application details';

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
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {workflowSteps.length > 0 && (
            <aside className="hidden w-[17rem] shrink-0 lg:block xl:w-[19rem]">
              <ApplicationWorkflowNav
                steps={workflowSteps}
                activeSection={activeSection}
                application={application}
                detailsActive={!onWorkflowStep}
                onSelectDetails={() => setActiveSection(DEFAULT_DETAIL_SECTION)}
                onSelect={setActiveSection}
              />
            </aside>
          )}

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            {workflowSteps.length > 0 && (
              <div className="space-y-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
                <div>
                  <label htmlFor="workflow-step-select" className="mb-1 block text-xs font-medium text-slate-500">
                    Jump to
                  </label>
                  <select
                    id="workflow-step-select"
                    value={onWorkflowStep ? activeSection : DEFAULT_DETAIL_SECTION}
                    onChange={(e) => {
                      setActiveSection(e.target.value as ApplicationDetailSectionId);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800"
                  >
                    <option value={DEFAULT_DETAIL_SECTION}>Application details</option>
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
                  {onWorkflowStep ? 'Workflow step' : 'Application'}
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
