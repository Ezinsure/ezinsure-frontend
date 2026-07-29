'use client';

import type { ReactNode } from 'react';
import { ClipboardList } from 'lucide-react';
import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import {
  ownerModeLabel,
  poultryProductTypeLabel,
  speciesGroupLabel,
} from '@/features/livestock-application/domain/form-profiles';
import {
  formatLocationFull,
  formatPolicyDate,
} from '@/features/livestock-application/utils/application-location';
import {
  formatGirinkaDisplay,
  formatOwnerGenderDisplay,
} from '@/features/livestock-application/utils/display-formatters';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

interface ApplicationFormDetailsSectionProps {
  application: LivestockApplicationPackage;
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  const display = value?.trim() ? value : '—';
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium leading-snug text-slate-900">{display}</dd>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function ApplicationFormDetailsSection({ application }: ApplicationFormDetailsSectionProps) {
  const labels = LIVESTOCK_FORM_LABELS.fields;
  const isCattle = application.speciesGroup === 'CATTLE';
  const isSingleOwner = application.ownerMode === 'SINGLE_OWNER';
  const owner = application.primaryOwner;
  const ownerGender = application.ownerGender ?? owner?.gender;
  const ownerNationalId = application.nationalId ?? owner?.nationalId;
  const applicantAddress = application.applicantAddress;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-violet-50 p-3">
          <ClipboardList className="h-6 w-6 text-violet-700" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Application details</h2>
          <p className="mt-1 text-sm text-slate-600">
            Full form data submitted with this livestock insurance package.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-8">
        <DetailBlock title="Package & policy">
          <DetailField label="Application number" value={application.applicationNumber} />
          <DetailField label="Insurance type" value={application.insuranceType} />
          <DetailField label="Species" value={speciesGroupLabel(application.speciesGroup)} />
          {application.poultryProductType && (
            <DetailField
              label="Poultry product"
              value={poultryProductTypeLabel(application.poultryProductType)}
            />
          )}
          <DetailField label="Owner mode" value={ownerModeLabel(application.ownerMode)} />
          <DetailField
            label={labels.premiumPercentage}
            value={
              application.totals.premiumPercentage
                ? `${application.totals.premiumPercentage}%`
                : undefined
            }
          />
          <DetailField
            label="Policy start"
            value={formatPolicyDate(application.policyStartDate)}
          />
          <DetailField
            label="Policy end"
            value={formatPolicyDate(application.policyEndDate)}
          />
        </DetailBlock>

        <DetailBlock title="Policy & experience">
          <DetailField label={labels.farmingExperience} value={application.farmingExperience} />
          <DetailField
            label="Previous incidents"
            value={application.previousIncidents}
          />
          {isCattle && (
            <DetailField
              label={labels.girinka}
              value={formatGirinkaDisplay(application.girinka)}
            />
          )}
        </DetailBlock>

        {isSingleOwner && (
          <DetailBlock title="Owner profile">
            <DetailField label={labels.ownerName} value={owner?.name ?? application.ownerSummary} />
            <DetailField label={labels.ownerPhone} value={owner?.phone} />
            <DetailField label={labels.nationalId} value={ownerNationalId} />
            <DetailField
              label={labels.ownerGender}
              value={formatOwnerGenderDisplay(ownerGender)}
            />
            {applicantAddress && (
              <DetailField
                label="Owner residence"
                value={formatLocationFull(applicantAddress)}
              />
            )}
          </DetailBlock>
        )}

        {application.livestockLocation && (
          <DetailBlock title="Farm location">
            <DetailField
              label="Livestock site"
              value={formatLocationFull(application.livestockLocation)}
            />
          </DetailBlock>
        )}

        <DetailBlock title="Veterinary support">
          <DetailField label={labels.hasVeterinarian} value={application.hasVeterinarian} />
          <DetailField
            label={labels.veterinarianAvailability}
            value={application.veterinarianAvailability}
          />
          <DetailField label={labels.knownDiseases} value={application.knownDiseases} />
        </DetailBlock>

        <DetailBlock title="Bank loan">
          <DetailField label={labels.hasLoan} value={application.hasLoan} />
          {application.hasLoan === 'Yego' && (
            <>
              <DetailField
                label={labels.financialInstitutionName}
                value={application.financialInstitutionName}
              />
              <DetailField
                label={labels.institutionLocation}
                value={application.institutionLocation}
              />
              <DetailField
                label={labels.loanAccountNumber}
                value={application.loanAccountNumber}
              />
              <DetailField
                label={labels.loanAmount}
                value={
                  application.loanAmount
                    ? formatRwfDisplay(Number(application.loanAmount))
                    : undefined
                }
              />
            </>
          )}
        </DetailBlock>

        <DetailBlock title="Veterinarian verification">
          <DetailField
            label={labels.insuranceAgentCode}
            value={application.insuranceAgentCode}
          />
          <DetailField
            label={labels.veterinarianLicenseNumber}
            value={application.veterinarianLicenseNumber}
          />
          <DetailField
            label={labels.veterinarianSignatureName}
            value={application.veterinarianSignatureName}
          />
        </DetailBlock>
      </div>
    </section>
  );
}
