'use client';

import { ChevronRight, FileText } from 'lucide-react';
import type {
  ApplicationDetailNavItem,
  ApplicationDetailSectionId,
} from '@/features/livestock-application/utils/application-detail-sections';
import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';

interface ApplicationWorkflowNavProps {
  steps: ApplicationDetailNavItem[];
  activeSection: ApplicationDetailSectionId;
  application: LivestockApplicationPackage;
  onSelect: (section: ApplicationDetailSectionId) => void;
  detailsActive?: boolean;
  onSelectDetails?: () => void;
}

function stepStateForSection(
  sectionId: ApplicationDetailSectionId,
  application: LivestockApplicationPackage,
): 'completed' | 'current' | 'upcoming' | null {
  if (sectionId === 'payment-proof') {
    if (application.paymentProof.status === 'VERIFIED') return 'completed';
    if (application.paymentProof.status === 'SUBMITTED') return 'current';
    return 'upcoming';
  }
  if (sectionId === 'issue-insurance') {
    if (application.issuedDocuments?.contract) {
      return 'completed';
    }
    if (application.status === 'PAYMENT_VERIFIED') return 'current';
    return 'upcoming';
  }
  if (sectionId === 'subsidy') {
    if (application.subsidyCase.uploadedSignedDocumentUrl) return 'completed';
    if (application.subsidyCase.generatedDocumentUrl) return 'current';
    return 'upcoming';
  }
  if (sectionId === 'sonarwa') {
    if (application.subsidyCase.status === 'SONARWA_APPROVED') return 'completed';
    if (
      application.subsidyCase.uploadedSignedDocumentUrl ||
      application.status === 'INSURANCE_ISSUED'
    ) {
      return 'current';
    }
    return 'upcoming';
  }
  if (sectionId === 'commission') {
    if (application.status === 'PAID') return 'completed';
    if (
      application.status === 'PENDING_ADMIN_REVIEW' ||
      application.status === 'READY_TO_BE_PAID'
    ) {
      return 'current';
    }
    return 'upcoming';
  }
  return null;
}

export function ApplicationWorkflowNav({
  steps,
  activeSection,
  application,
  onSelect,
  detailsActive = false,
  onSelectDetails,
}: ApplicationWorkflowNavProps) {
  return (
    <nav
      className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-slate-50/80"
      aria-label="Application navigation"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {onSelectDetails && (
          <div className="mb-3">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Review
            </p>
            <button
              type="button"
              onClick={onSelectDetails}
              className={`group flex w-full items-start gap-2 rounded-xl px-2 py-2.5 text-left transition ${
                detailsActive
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                  detailsActive ? 'bg-slate-900 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug">Application details</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 group-hover:text-slate-600">
                  Full submitted form &amp; documents
                </span>
              </span>
              <ChevronRight
                className={`mt-1 h-4 w-4 shrink-0 transition ${
                  detailsActive ? 'text-slate-400' : 'text-transparent group-hover:text-slate-300'
                }`}
              />
            </button>
          </div>
        )}
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Workflow steps
        </p>
        <ul className="space-y-0.5" role="tree">
          {steps.map((item) => {
            const isActive = activeSection === item.id;
            const stepState = stepStateForSection(item.id, application);

            return (
              <li key={item.id} role="treeitem" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`group flex w-full items-start gap-2 rounded-xl px-2 py-2.5 text-left transition ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : stepState === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : stepState === 'current'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {item.stepNumber}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 group-hover:text-slate-600">
                      {item.description}
                    </span>
                  </span>
                  <ChevronRight
                    className={`mt-1 h-4 w-4 shrink-0 transition ${
                      isActive ? 'text-slate-400' : 'text-transparent group-hover:text-slate-300'
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
