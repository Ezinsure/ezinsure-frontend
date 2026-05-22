'use client';

import {
  LivestockRadioGroup,
  LivestockTextArea,
  LivestockTextField,
} from '@/features/livestock-application/components/form-controls';
import { LivestockItemsTable } from '@/features/livestock-application/components/livestock-items-table';
import { RwandaLocationFields } from '@/features/livestock-application/components/rwanda-location-fields';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import {
  VET_AVAILABILITY_OPTIONS,
  YES_NO_OPTIONS,
} from '@/features/livestock-application/constants';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { computePremiumBreakdownFromForm } from '@/features/livestock-application/utils/premium-calculations';
import type {
  LivestockAnimalRow,
  LivestockApplicationFormValues,
  LivestockApplicationStepId,
} from '@/features/livestock-application/types';

interface ApplicationStepContentProps {
  stepId: LivestockApplicationStepId;
  values: LivestockApplicationFormValues;
  errors: Record<string, string>;
  disabled?: boolean;
  setField: <K extends keyof LivestockApplicationFormValues>(
    key: K,
    value: LivestockApplicationFormValues[K],
  ) => void;
  updateLivestockItem: (id: string, patch: Partial<LivestockAnimalRow>) => void;
  addLivestockItem: () => void;
  removeLivestockItem: (id: string) => void;
  mergeLivestockItems: (items: LivestockAnimalRow[]) => void;
}

export function ApplicationStepContent({
  stepId,
  values,
  errors,
  disabled,
  setField,
  updateLivestockItem,
  addLivestockItem,
  removeLivestockItem,
  mergeLivestockItems,
}: ApplicationStepContentProps) {
  const title = LIVESTOCK_FORM_LABELS.sections[stepId];

  switch (stepId) {
    case 'insurancePeriod':
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LivestockTextField
              fieldName="policyStartDate"
              type="date"
              value={values.policyStartDate}
              onChange={(v) => setField('policyStartDate', v)}
              error={errors.policyStartDate}
              required
              disabled={disabled}
            />
            <LivestockTextField
              fieldName="policyEndDate"
              type="date"
              value={values.policyEndDate}
              onChange={(v) => setField('policyEndDate', v)}
              error={errors.policyEndDate}
              required
              disabled={disabled}
            />
            <LivestockTextField
              fieldName="farmingExperience"
              value={values.farmingExperience}
              onChange={(v) => setField('farmingExperience', v)}
              disabled={disabled}
            />
          </div>
          <LivestockTextArea
            fieldName="previousIncidents"
            value={values.previousIncidents}
            onChange={(v) => setField('previousIncidents', v)}
            disabled={disabled}
          />
        </section>
      );

    case 'applicantInfo':
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <LivestockTextField
            fieldName="ownerName"
            value={values.ownerName}
            onChange={(v) => setField('ownerName', v)}
            error={errors.ownerName}
            required
            disabled={disabled}
          />
          <div className="flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.isFirstApplication}
                disabled={disabled}
                onChange={(e) => {
                  setField('isFirstApplication', e.target.checked);
                  if (e.target.checked) setField('isRenewal', false);
                }}
                className="h-4 w-4 rounded border-slate-300"
              />
              {LIVESTOCK_FORM_LABELS.fields.isFirstApplication}
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.isRenewal}
                disabled={disabled}
                onChange={(e) => {
                  setField('isRenewal', e.target.checked);
                  if (e.target.checked) setField('isFirstApplication', false);
                }}
                className="h-4 w-4 rounded border-slate-300"
              />
              {LIVESTOCK_FORM_LABELS.fields.isRenewal}
            </label>
          </div>
          {errors.applicationType && (
            <p className="text-xs text-red-600">{errors.applicationType}</p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LivestockTextField
              fieldName="nationalId"
              value={values.nationalId}
              onChange={(v) => setField('nationalId', v)}
              error={errors.nationalId}
              required
              disabled={disabled}
            />
            <LivestockTextField
              fieldName="ownerPhone"
              value={values.ownerPhone}
              onChange={(v) => setField('ownerPhone', v)}
              error={errors.ownerPhone}
              required
              disabled={disabled}
            />
          </div>
        </section>
      );

    case 'applicantAddress':
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <RwandaLocationFields
            prefix="applicant"
            province={values.applicantProvince}
            district={values.applicantDistrict}
            sector={values.applicantSector}
            cell={values.applicantCell}
            village={values.applicantVillage}
            onProvinceChange={(v) => setField('applicantProvince', v)}
            onDistrictChange={(v) => setField('applicantDistrict', v)}
            onSectorChange={(v) => setField('applicantSector', v)}
            onCellChange={(v) => setField('applicantCell', v)}
            onVillageChange={(v) => setField('applicantVillage', v)}
            errors={errors}
            disabled={disabled}
          />
        </section>
      );

    case 'livestockLocation':
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <RwandaLocationFields
            prefix="livestock"
            province={values.livestockProvince}
            district={values.district}
            sector={values.sector}
            cell={values.cell}
            village={values.village}
            onProvinceChange={(v) => setField('livestockProvince', v)}
            onDistrictChange={(v) => setField('district', v)}
            onSectorChange={(v) => setField('sector', v)}
            onCellChange={(v) => setField('cell', v)}
            onVillageChange={(v) => setField('village', v)}
            errors={errors}
            disabled={disabled}
          />
        </section>
      );

    case 'livestockDetails':
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <LivestockItemsTable
            items={values.livestockItems}
            errors={errors}
            disabled={disabled}
            onUpdate={updateLivestockItem}
            onAdd={addLivestockItem}
            onRemove={removeLivestockItem}
            onMergeImported={mergeLivestockItems}
          />
        </section>
      );

    case 'veterinarySupport':
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <LivestockRadioGroup
            fieldName="hasVeterinarian"
            value={values.hasVeterinarian}
            onChange={(v) => setField('hasVeterinarian', v)}
            options={YES_NO_OPTIONS}
            error={errors.hasVeterinarian}
            required
            disabled={disabled}
          />
          <LivestockRadioGroup
            fieldName="veterinarianAvailability"
            value={values.veterinarianAvailability}
            onChange={(v) => setField('veterinarianAvailability', v)}
            options={VET_AVAILABILITY_OPTIONS}
            error={errors.veterinarianAvailability}
            required
            disabled={disabled}
          />
        </section>
      );

    case 'diseaseInfo':
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <LivestockTextArea
            fieldName="knownDiseases"
            value={values.knownDiseases}
            onChange={(v) => setField('knownDiseases', v)}
            disabled={disabled}
            rows={5}
          />
        </section>
      );

    case 'bankLoan':
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <LivestockRadioGroup
            fieldName="hasLoan"
            value={values.hasLoan}
            onChange={(v) => setField('hasLoan', v)}
            options={YES_NO_OPTIONS}
            error={errors.hasLoan}
            required
            disabled={disabled}
          />
          {values.hasLoan === 'Yego' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <LivestockTextField
                fieldName="financialInstitutionName"
                value={values.financialInstitutionName}
                onChange={(v) => setField('financialInstitutionName', v)}
                error={errors.financialInstitutionName}
                required
                disabled={disabled}
              />
              <LivestockTextField
                fieldName="institutionLocation"
                value={values.institutionLocation}
                onChange={(v) => setField('institutionLocation', v)}
                disabled={disabled}
              />
              <LivestockTextField
                fieldName="loanAccountNumber"
                value={values.loanAccountNumber}
                onChange={(v) => setField('loanAccountNumber', v)}
                disabled={disabled}
              />
              <LivestockTextField
                fieldName="loanAmount"
                type="number"
                value={values.loanAmount}
                onChange={(v) => setField('loanAmount', v)}
                error={errors.loanAmount}
                required
                disabled={disabled}
              />
            </div>
          )}
        </section>
      );

    case 'premiumInfo':
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            {LIVESTOCK_FORM_LABELS.premiumAutoHint}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LivestockTextField
              fieldName="premiumPercentage"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={values.premiumPercentage}
              onChange={(v) => setField('premiumPercentage', v)}
              error={errors.premiumPercentage}
              disabled={disabled}
            />
            <LivestockTextField
              fieldName="premiumRateAmount"
              type="number"
              value={values.premiumRateAmount}
              onChange={(v) => setField('premiumRateAmount', v)}
              disabled={disabled}
            />
            <LivestockTextField
              fieldName="farmerContributionAmount"
              type="number"
              value={values.farmerContributionAmount}
              onChange={(v) => setField('farmerContributionAmount', v)}
              error={errors.farmerContributionAmount}
              disabled
            />
            <LivestockTextField
              fieldName="governmentContribution"
              type="number"
              value={values.governmentContribution}
              onChange={(v) => setField('governmentContribution', v)}
              error={errors.governmentContribution}
              disabled
            />
            <LivestockTextField
              fieldName="companyCommission"
              type="number"
              value={values.companyCommission}
              onChange={(v) => setField('companyCommission', v)}
              disabled
            />
            <LivestockTextField
              fieldName="veterinaryCommission"
              type="number"
              value={values.veterinaryCommission}
              onChange={(v) => setField('veterinaryCommission', v)}
              disabled
            />
          </div>
        </section>
      );

    case 'veterinaryVerification':
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <LivestockTextField
            fieldName="insuranceAgentCode"
            value={values.insuranceAgentCode}
            onChange={(v) => setField('insuranceAgentCode', v)}
            disabled={disabled}
          />
          <LivestockTextField
            fieldName="veterinarianLicenseNumber"
            value={values.veterinarianLicenseNumber}
            onChange={(v) => setField('veterinarianLicenseNumber', v)}
            error={errors.veterinarianLicenseNumber}
            required
            disabled={disabled}
          />
          <LivestockTextField
            fieldName="veterinarianSignatureName"
            value={values.veterinarianSignatureName}
            onChange={(v) => setField('veterinarianSignatureName', v)}
            error={errors.veterinarianSignatureName}
            required
            disabled={disabled}
          />
        </section>
      );

    case 'review': {
      const premium = computePremiumBreakdownFromForm(values);
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">
            Suzuma amakuru mbere yo kohereza. API ntirakora — kohereza bizerekana payload mu
            console.
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
            <p>
              <span className="text-slate-500">Usaba:</span>{' '}
              <strong>{values.ownerName || '—'}</strong>
            </p>
            <p>
              <span className="text-slate-500">Telefone:</span> {values.ownerPhone || '—'}
            </p>
            <p>
              <span className="text-slate-500">Igihe:</span> {values.policyStartDate || '—'} →{' '}
              {values.policyEndDate || '—'}
            </p>
            <p>
              <span className="text-slate-500">Aho itungo riherereye:</span>{' '}
              {[values.district, values.sector, values.cell, values.village]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
            <p>
              <span className="text-slate-500">Amatungo:</span> {values.livestockItems.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <h3 className="mb-3 font-semibold text-slate-900">Ubwishingizi n’amakomisiyo</h3>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">{LIVESTOCK_FORM_LABELS.fields.premiumPercentage}</dt>
                <dd className="font-medium text-slate-900">
                  {values.premiumPercentage ? `${values.premiumPercentage}%` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{LIVESTOCK_FORM_LABELS.fields.premiumRateAmount}</dt>
                <dd className="font-medium text-slate-900">
                  {formatRwfDisplay(premium.premiumRateAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">
                  {LIVESTOCK_FORM_LABELS.fields.farmerContributionAmount}
                </dt>
                <dd className="font-medium text-slate-900">
                  {formatRwfDisplay(premium.farmerContributionAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">
                  {LIVESTOCK_FORM_LABELS.fields.governmentContribution}
                </dt>
                <dd className="font-medium text-slate-900">
                  {formatRwfDisplay(premium.governmentContribution)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{LIVESTOCK_FORM_LABELS.fields.companyCommission}</dt>
                <dd className="font-medium text-slate-900">
                  {formatRwfDisplay(premium.companyCommission)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">
                  {LIVESTOCK_FORM_LABELS.fields.veterinaryCommission}
                </dt>
                <dd className="font-medium text-slate-900">
                  {formatRwfDisplay(premium.veterinaryCommission)}
                </dd>
              </div>
            </dl>
          </div>

          <pre className="max-h-64 overflow-auto rounded-lg bg-white p-3 text-xs text-slate-700 ring-1 ring-slate-200">
            {JSON.stringify(
              {
                ...values,
                ...premium,
                premiumRateAmount: Number(premium.premiumRateAmount) || 0,
                farmerContributionAmount: Number(premium.farmerContributionAmount) || 0,
                governmentContribution: Number(premium.governmentContribution) || 0,
                companyCommission: Number(premium.companyCommission) || 0,
                veterinaryCommission: Number(premium.veterinaryCommission) || 0,
              },
              null,
              2,
            )}
          </pre>
        </section>
      );
    }

    default:
      return null;
  }
}
