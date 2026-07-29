'use client';

import type { ReactNode } from 'react';
import {
  CalendarClock,
  ClipboardList,
  FileText,
  Landmark,
  MapPin,
  Receipt,
  Stethoscope,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import {
  ownerModeLabel,
  poultryProductTypeLabel,
  speciesGroupLabel,
} from '@/features/livestock-application/domain/form-profiles';
import { formatPolicyDate } from '@/features/livestock-application/utils/application-location';
import {
  formatGirinkaDisplay,
  formatOwnerGenderDisplay,
} from '@/features/livestock-application/utils/display-formatters';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { insuranceProviderLabel } from '@/shared/insurance-providers';
import { ApplicationDocumentsGrid } from '@/features/livestock-application/components/shared/application-documents-grid';
import { ApplicationOwnersSection } from '@/features/livestock-application/components/shared/application-owners-section';
import { InsuredLinesSection } from '@/features/livestock-application/components/shared/insured-lines-section';
import { SonarwaReviewSummary } from '@/features/livestock-application/components/shared/sonarwa-review-summary';
import { SubsidyDocumentsNotes } from '@/features/livestock-application/components/shared/subsidy-documents-notes';
import { ApplicationStatusTimeline } from '@/features/livestock-application/components/workflow/application-status-timeline';
import { WorkflowOverviewBanner } from '@/features/livestock-application/components/workflow/workflow-overview-banner';

interface ApplicationReviewDetailsProps {
  application: LivestockApplicationPackage;
  viewRole?: LivestockApplicationViewRole;
  ownerFilterKey: string | null;
  onSelectOwner: (key: string | null) => void;
  onViewDocument: (name: string, path: string) => void;
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-50 p-3">{icon}</div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  const display = value?.trim() ? value : '—';
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium leading-snug text-slate-900">{display}</dd>
    </div>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}

export function ApplicationReviewDetails({
  application,
  viewRole = 'vet',
  ownerFilterKey,
  onSelectOwner,
  onViewDocument,
}: ApplicationReviewDetailsProps) {
  const labels = LIVESTOCK_FORM_LABELS.fields;
  const { totals } = application;
  const isCattle = application.speciesGroup === 'CATTLE';
  const isSingleOwner = application.ownerMode === 'SINGLE_OWNER';
  const owner = application.primaryOwner;
  const ownerGender = application.ownerGender ?? owner?.gender;
  const ownerNationalId = application.nationalId ?? owner?.nationalId;

  return (
    <div className="space-y-6">
      <WorkflowOverviewBanner application={application} viewRole={viewRole} />

      {/* 0 · Cover & premium summary + lifecycle */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-3">
              <Wallet className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Cover & premium</h2>
              <p className="mt-1 text-sm text-slate-600">
                Package cover, premium split (farmer 60% / nkunganire 40%), and policy period.
              </p>
            </div>
          </div>
          <FieldGrid>
            <Field label="Insurance type" value={application.insuranceType} />
            <Field label="Species" value={speciesGroupLabel(application.speciesGroup)} />
            {application.poultryProductType && (
              <Field
                label="Poultry product"
                value={poultryProductTypeLabel(application.poultryProductType)}
              />
            )}
            <Field label="Owner mode" value={ownerModeLabel(application.ownerMode)} />
            <Field label="Provider" value={insuranceProviderLabel(application.insuranceProvider)} />
            <Field
              label={labels.premiumPercentage}
              value={totals.premiumPercentage ? `${totals.premiumPercentage}%` : undefined}
            />
            <Field label={labels.premiumRateAmount} value={formatRwfDisplay(totals.premiumRateAmount)} />
            <Field
              label={labels.farmerContributionAmount}
              value={formatRwfDisplay(totals.farmerContributionAmount)}
            />
            <Field
              label={labels.governmentContribution}
              value={formatRwfDisplay(totals.governmentContribution)}
            />
            <Field label="Sum assured" value={formatRwfDisplay(totals.totalSumAssured)} />
            <Field
              label={labels.veterinaryCommission}
              value={formatRwfDisplay(totals.veterinaryCommission)}
            />
            {viewRole !== 'vet' && <Field label="Veterinarian" value={application.vetName} />}
            {application.insuranceIssuedAt && (
              <Field
                label="Insurance issued"
                value={formatPolicyDate(application.insuranceIssuedAt)}
              />
            )}
            {(viewRole === 'admin' || viewRole === 'super_admin') &&
              application.insuranceIssuedByName && (
                <Field label="Issued by" value={application.insuranceIssuedByName} />
              )}
          </FieldGrid>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Progress</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Application lifecycle</h2>
          <div className="mt-4">
            <ApplicationStatusTimeline application={application} variant="text" />
          </div>
        </section>
      </div>

      {/* 1 · Insurance period & experience */}
      <SectionCard
        icon={<CalendarClock className="h-6 w-6 text-slate-700" />}
        title="Insurance period & experience"
        description="Policy duration and the farmer's livestock experience."
      >
        <FieldGrid>
          <Field label={labels.policyStartDate} value={formatPolicyDate(application.policyStartDate)} />
          <Field label={labels.policyEndDate} value={formatPolicyDate(application.policyEndDate)} />
          <Field label={labels.farmingExperience} value={application.farmingExperience} />
          <Field label={labels.previousIncidents} value={application.previousIncidents} />
          {isCattle && (
            <Field label={labels.girinka} value={formatGirinkaDisplay(application.girinka)} />
          )}
        </FieldGrid>
      </SectionCard>

      {/* 2 · Applicant identity (single owner) */}
      {isSingleOwner && (
        <SectionCard
          icon={<UserRound className="h-6 w-6 text-blue-700" />}
          title="Applicant"
          description="Farmer requesting the insurance cover."
        >
          <FieldGrid>
            <Field label={labels.ownerName} value={owner?.name ?? application.ownerSummary} />
            <Field label={labels.nationalId} value={ownerNationalId} />
            <Field label={labels.ownerPhone} value={owner?.phone} />
            <Field label={labels.ownerGender} value={formatOwnerGenderDisplay(ownerGender)} />
          </FieldGrid>
        </SectionCard>
      )}

      {/* 3 · Applicant address */}
      {application.applicantAddress && (
        <SectionCard
          icon={<MapPin className="h-6 w-6 text-blue-700" />}
          title="Applicant address"
          description="Where the applicant resides."
        >
          <FieldGrid>
            <Field label={labels.applicantProvince} value={application.applicantAddress.province} />
            <Field label={labels.applicantDistrict} value={application.applicantAddress.district} />
            <Field label={labels.applicantSector} value={application.applicantAddress.sector} />
            <Field label={labels.applicantCell} value={application.applicantAddress.cell} />
            <Field label={labels.applicantVillage} value={application.applicantAddress.village} />
          </FieldGrid>
        </SectionCard>
      )}

      {/* 4 · Livestock location */}
      {application.livestockLocation && (
        <SectionCard
          icon={<MapPin className="h-6 w-6 text-teal-700" />}
          title="Livestock location"
          description="Where the insured animals are kept."
        >
          <FieldGrid>
            <Field label={labels.livestockProvince} value={application.livestockLocation.province} />
            <Field label={labels.district} value={application.livestockLocation.district} />
            <Field label={labels.sector} value={application.livestockLocation.sector} />
            <Field label={labels.cell} value={application.livestockLocation.cell} />
            <Field label={labels.village} value={application.livestockLocation.village} />
          </FieldGrid>
        </SectionCard>
      )}

      {/* 5a · Owners (multi-owner) */}
      {!isSingleOwner && (
        <ApplicationOwnersSection
          application={application}
          selectedOwnerKey={ownerFilterKey}
          onSelectOwner={onSelectOwner}
        />
      )}

      {/* 5b · Animals & insured lines */}
      <InsuredLinesSection
        application={application}
        ownerFilterKey={ownerFilterKey}
        linesUnavailableNote="Animal line details are not included in the list response yet. Premiums and location above reflect the submitted package."
      />

      {/* 6 · Veterinary support & health */}
      <SectionCard
        icon={<Stethoscope className="h-6 w-6 text-violet-700" />}
        title="Veterinary support & health"
        description="Access to a veterinarian and known animal diseases."
      >
        <FieldGrid>
          <Field label={labels.hasVeterinarian} value={application.hasVeterinarian} />
          <Field label={labels.veterinarianAvailability} value={application.veterinarianAvailability} />
          <Field label={labels.knownDiseases} value={application.knownDiseases} />
        </FieldGrid>
      </SectionCard>

      {/* 7 · Bank loan */}
      <SectionCard
        icon={<Landmark className="h-6 w-6 text-amber-700" />}
        title="Bank loan"
        description="Financial institution with an interest in the insured livestock."
      >
        <FieldGrid>
          <Field label={labels.hasLoan} value={application.hasLoan} />
          {application.hasLoan === 'Yego' && (
            <>
              <Field
                label={labels.financialInstitutionName}
                value={application.financialInstitutionName}
              />
              <Field label={labels.institutionLocation} value={application.institutionLocation} />
              <Field label={labels.loanAccountNumber} value={application.loanAccountNumber} />
              <Field
                label={labels.loanAmount}
                value={
                  application.loanAmount ? formatRwfDisplay(Number(application.loanAmount)) : undefined
                }
              />
            </>
          )}
        </FieldGrid>
      </SectionCard>

      {/* 8 · Veterinarian verification */}
      <SectionCard
        icon={<ClipboardList className="h-6 w-6 text-slate-700" />}
        title="Agent & veterinarian verification"
        description="Insurance agent code and the certifying veterinarian."
      >
        <FieldGrid>
          <Field label={labels.insuranceAgentCode} value={application.insuranceAgentCode} />
          <Field
            label={labels.veterinarianLicenseNumber}
            value={application.veterinarianLicenseNumber}
          />
          <Field
            label={labels.veterinarianSignatureName}
            value={application.veterinarianSignatureName}
          />
        </FieldGrid>
      </SectionCard>

      {/* 8b · Payment proof (visible to all roles) */}
      {(() => {
        const { paymentProof } = application;
        const hasPaymentInfo =
          paymentProof.status !== 'NOT_REQUIRED' &&
          (Boolean(paymentProof.documentUrl) ||
            Boolean(paymentProof.transactionId) ||
            Boolean(paymentProof.notes?.trim()) ||
            Boolean(application.reasonForPaymentRejection?.trim()) ||
            paymentProof.status !== 'PENDING');

        if (!hasPaymentInfo) return null;

        return (
          <SectionCard
            icon={<Receipt className="h-6 w-6 text-emerald-700" />}
            title="Payment proof"
            description="Farmer payment receipt, transaction reference, and notes."
          >
            <FieldGrid>
              <Field
                label="Expected amount"
                value={formatRwfDisplay(paymentProof.expectedAmount)}
              />
              <Field
                label="Status"
                value={paymentProof.status.replace(/_/g, ' ').toLowerCase()}
              />
              <Field label="Transaction ID" value={paymentProof.transactionId} />
            </FieldGrid>

            {paymentProof.notes?.trim() && (
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {paymentProof.notes.trim()}
                </p>
              </div>
            )}

            {application.reasonForPaymentRejection?.trim() && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700">
                  Rejection reason
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-red-900">
                  {application.reasonForPaymentRejection.trim()}
                </p>
              </div>
            )}

            {paymentProof.documentUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => onViewDocument('Payment proof', paymentProof.documentUrl!)}
              >
                <Receipt className="mr-2 h-4 w-4" />
                View payment proof
              </Button>
            )}
          </SectionCard>
        );
      })()}

      {/* 8c · Nkunganire signed uploads & notes */}
      {application.subsidyDocuments && application.subsidyDocuments.length > 0 && (
        <SectionCard
          icon={<FileText className="h-6 w-6 text-violet-700" />}
          title="Nkunganire uploads"
          description="Signed subsidy documents and upload notes from sector / veterinarian."
        >
          <SubsidyDocumentsNotes
            documents={application.subsidyDocuments}
            onViewDocument={onViewDocument}
          />
        </SectionCard>
      )}

      {/* 8d · SONARWA review outcome (visible to all roles, including vet) */}
      {application.sonarwaReview && (
        <SonarwaReviewSummary
          review={application.sonarwaReview}
          viewRole={viewRole}
          onViewDocument={onViewDocument}
        />
      )}

      {/* 9 · Documents */}
      <SectionCard
        icon={<FileText className="h-6 w-6 text-blue-700" />}
        title="Documents"
        description="Payment proof, nkunganire forms, and issued policy files."
      >
        <ApplicationDocumentsGrid
          application={application}
          onViewDocument={(doc) => onViewDocument(doc.label, doc.path)}
        />
      </SectionCard>
    </div>
  );
}
