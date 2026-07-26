'use client';

import type { ReactNode } from 'react';
import {
  Banknote,
  ClipboardCheck,
  MapPin,
  PawPrint,
  Shield,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import type { FormProfile } from '@/features/livestock-application/domain/form-profiles';
import type { LivestockApplicationFormValues } from '@/features/livestock-application/types';
import {
  formatGirinkaDisplay,
  formatOwnerGenderDisplay,
} from '@/features/livestock-application/utils/display-formatters';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { computePremiumBreakdownFromForm } from '@/features/livestock-application/utils/premium-calculations';

interface ApplicationReviewPreviewProps {
  values: LivestockApplicationFormValues;
  formProfile?: FormProfile;
}

function displayValue(value?: string | number | boolean | null): string {
  if (typeof value === 'boolean') return value ? 'Yego' : 'Oya';
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function formatLocation(parts: Array<string | undefined>): string {
  return parts.filter((part) => Boolean(part?.trim())).join(' · ') || '—';
}

function PreviewField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium leading-snug text-slate-900">
        {value?.trim() ? value : '—'}
      </dd>
    </div>
  );
}

function PreviewSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Shield;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--portal-primary-soft)] text-[var(--portal-primary)]">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function ApplicationReviewPreview({
  values,
  formProfile,
}: ApplicationReviewPreviewProps) {
  const labels = LIVESTOCK_FORM_LABELS.fields;
  const premium = computePremiumBreakdownFromForm(values);
  const isPoultry = formProfile?.lineTableVariant === 'POULTRY_LOT';
  const showOwnerProfile = formProfile?.id.startsWith('SINGLE_OWNER') ?? true;
  const totalSumAssured = values.livestockItems.reduce((sum, item) => {
    const amount = Number(String(item.sumAssured ?? '').replace(/,/g, ''));
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const applicationType = values.isRenewal
    ? 'Kongeresha (Renewal)'
    : values.isFirstApplication
      ? 'Ubwishingizi bwa mbere'
      : '—';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
        Suzuma neza amakuru yose mbere yo kohereza ifishi. Niba hari icyo ushaka guhindura, subira
        inyuma ukoresheje buto ya «Subira inyuma».
      </div>

      <PreviewSection title={LIVESTOCK_FORM_LABELS.sections.insurancePeriod} icon={Shield}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PreviewField label={labels.policyStartDate} value={values.policyStartDate} />
          <PreviewField label={labels.policyEndDate} value={values.policyEndDate} />
          <PreviewField label={labels.farmingExperience} value={values.farmingExperience} />
          <PreviewField label={labels.previousIncidents} value={values.previousIncidents} />
          {showOwnerProfile && (
            <PreviewField label="Ubwoko bw’ubusabe" value={applicationType} />
          )}
          {values.girinka && (
            <PreviewField label={labels.girinka} value={formatGirinkaDisplay(values.girinka)} />
          )}
        </dl>
      </PreviewSection>

      {showOwnerProfile && (
        <>
          <PreviewSection title={LIVESTOCK_FORM_LABELS.sections.applicantInfo} icon={UserRound}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PreviewField label={labels.ownerName} value={values.ownerName} />
              <PreviewField label={labels.ownerPhone} value={values.ownerPhone} />
              <PreviewField label={labels.nationalId} value={values.nationalId} />
              <PreviewField
                label={labels.ownerGender}
                value={formatOwnerGenderDisplay(values.ownerGender)}
              />
            </dl>
          </PreviewSection>

          <PreviewSection title={LIVESTOCK_FORM_LABELS.sections.applicantAddress} icon={MapPin}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PreviewField
                label="Aho abarizwa"
                value={formatLocation([
                  values.applicantProvince,
                  values.applicantDistrict,
                  values.applicantSector,
                  values.applicantCell,
                  values.applicantVillage,
                ])}
              />
            </dl>
          </PreviewSection>
        </>
      )}

      <PreviewSection title={LIVESTOCK_FORM_LABELS.sections.livestockLocation} icon={MapPin}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PreviewField
            label="Aho itungo riherereye"
            value={formatLocation([
              values.livestockProvince,
              values.district,
              values.sector,
              values.cell,
              values.village,
            ])}
          />
        </dl>
      </PreviewSection>

      <PreviewSection title={LIVESTOCK_FORM_LABELS.sections.livestockDetails} icon={PawPrint}>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PreviewField
            label="Umubare w’amatungo / lots"
            value={String(values.livestockItems.length)}
          />
          <PreviewField
            label="Agaciro rusange"
            value={formatRwfDisplay(totalSumAssured || undefined)}
          />
          {formProfile?.lockedAnimalType && (
            <PreviewField label="Ubwoko" value={formProfile.lockedAnimalType} />
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">
                  {isPoultry ? labels.lotNumber : labels.chipNumber}
                </th>
                {formProfile?.showOwnerColumns && (
                  <th className="px-3 py-2 font-semibold">{labels.ownerName}</th>
                )}
                {!isPoultry && <th className="px-3 py-2 font-semibold">{labels.animalCategory}</th>}
                {isPoultry && <th className="px-3 py-2 font-semibold">{labels.quantity}</th>}
                <th className="px-3 py-2 font-semibold">
                  {isPoultry ? labels.unitValue : labels.sumAssured}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {values.livestockItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                    Nta matungo yanditswe
                  </td>
                </tr>
              ) : (
                values.livestockItems.map((item, index) => (
                  <tr key={item.id} className="text-slate-800">
                    <td className="px-3 py-2.5 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2.5 font-medium">
                      {displayValue(item.chipNumber)}
                    </td>
                    {formProfile?.showOwnerColumns && (
                      <td className="px-3 py-2.5">{displayValue(item.ownerName)}</td>
                    )}
                    {!isPoultry && (
                      <td className="px-3 py-2.5">{displayValue(item.animalCategory)}</td>
                    )}
                    {isPoultry && (
                      <td className="px-3 py-2.5">{displayValue(item.quantity)}</td>
                    )}
                    <td className="px-3 py-2.5">
                      {formatRwfDisplay(isPoultry ? item.unitValue : item.sumAssured)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PreviewSection>

      <PreviewSection title={LIVESTOCK_FORM_LABELS.sections.veterinarySupport} icon={Stethoscope}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PreviewField label={labels.hasVeterinarian} value={values.hasVeterinarian} />
          <PreviewField
            label={labels.veterinarianAvailability}
            value={values.veterinarianAvailability}
          />
          <PreviewField label={labels.knownDiseases} value={values.knownDiseases} />
        </dl>
      </PreviewSection>

      <PreviewSection title={LIVESTOCK_FORM_LABELS.sections.bankLoan} icon={Banknote}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PreviewField label={labels.hasLoan} value={values.hasLoan} />
          {values.hasLoan === 'Yego' && (
            <>
              <PreviewField
                label={labels.financialInstitutionName}
                value={values.financialInstitutionName}
              />
              <PreviewField
                label={labels.institutionLocation}
                value={values.institutionLocation}
              />
              <PreviewField label={labels.loanAccountNumber} value={values.loanAccountNumber} />
              <PreviewField
                label={labels.loanAmount}
                value={formatRwfDisplay(values.loanAmount)}
              />
            </>
          )}
        </dl>
      </PreviewSection>

      <PreviewSection title={LIVESTOCK_FORM_LABELS.sections.premiumInfo} icon={Banknote}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PreviewField
            label={labels.premiumPercentage}
            value={values.premiumPercentage ? `${values.premiumPercentage}%` : '—'}
          />
          <PreviewField
            label={labels.premiumRateAmount}
            value={formatRwfDisplay(premium.premiumRateAmount)}
          />
          <PreviewField
            label={labels.farmerContributionAmount}
            value={formatRwfDisplay(premium.farmerContributionAmount)}
          />
          <PreviewField
            label={labels.governmentContribution}
            value={formatRwfDisplay(premium.governmentContribution)}
          />
          <PreviewField
            label={labels.companyCommission}
            value={formatRwfDisplay(premium.companyCommission)}
          />
          <PreviewField
            label={labels.veterinaryCommission}
            value={formatRwfDisplay(premium.veterinaryCommission)}
          />
        </dl>
      </PreviewSection>

      <PreviewSection
        title={LIVESTOCK_FORM_LABELS.sections.veterinaryVerification}
        icon={ClipboardCheck}
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PreviewField label={labels.insuranceAgentCode} value={values.insuranceAgentCode} />
          <PreviewField
            label={labels.veterinarianLicenseNumber}
            value={values.veterinarianLicenseNumber}
          />
          <PreviewField
            label={labels.veterinarianSignatureName}
            value={values.veterinarianSignatureName}
          />
        </dl>
      </PreviewSection>
    </div>
  );
}
