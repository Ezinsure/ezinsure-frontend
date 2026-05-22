import {
  hasErrors,
  validateForm,
  validationPatterns,
  type ValidationErrors,
  type ValidationRules,
} from '@/components/ui/form-validation';
import { isValidPremiumPercentInput } from '@/features/livestock-application/utils/premium';
import type { LivestockApplicationFormValues, LivestockApplicationStepId } from '@/features/livestock-application/types';

function flatValues(values: LivestockApplicationFormValues): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(values)) {
    if (key === 'livestockItems' || key === 'isFirstApplication' || key === 'isRenewal') continue;
    out[key] = val == null ? '' : String(val);
  }
  return out;
}

const rulesByStep: Partial<Record<LivestockApplicationStepId, ValidationRules>> = {
  insurancePeriod: {
    policyStartDate: { required: true },
    policyEndDate: { required: true },
  },
  applicantInfo: {
    ownerName: { required: true, minLength: 2 },
    nationalId: { required: true, minLength: 5 },
    ownerPhone: { required: true, pattern: validationPatterns.phone },
  },
  applicantAddress: {
    applicantDistrict: { required: true },
    applicantSector: { required: true },
    applicantCell: { required: true },
    applicantVillage: { required: true },
  },
  livestockLocation: {
    district: { required: true },
    sector: { required: true },
    cell: { required: true },
    village: { required: true },
  },
  veterinarySupport: {
    hasVeterinarian: { required: true },
    veterinarianAvailability: { required: true },
  },
  bankLoan: {
    hasLoan: { required: true },
  },
  premiumInfo: {
    premiumPercentage: {
      validate: (v) => isValidPremiumPercentInput(v) || 'Andika % n’ukoresha umubare (urugero: 5.5, si 5.55)',
    },
    farmerContributionAmount: {
      validate: (v) => !v || validationPatterns.numbers.test(v.replace(/\s/g, '')) || 'Andika umubare',
    },
    governmentContribution: {
      validate: (v) => !v || validationPatterns.numbers.test(v.replace(/\s/g, '')) || 'Andika umubare',
    },
  },
  veterinaryVerification: {
    veterinarianLicenseNumber: { required: true },
    veterinarianSignatureName: { required: true },
  },
};

export function validateLivestockApplicationStep(
  stepId: LivestockApplicationStepId,
  values: LivestockApplicationFormValues,
): ValidationErrors {
  const rules = rulesByStep[stepId];
  if (!rules) return {};

  const flat = flatValues(values);

  if (stepId === 'insurancePeriod') {
    const errors = validateForm(flat, rules);
    if (
      flat.policyStartDate &&
      flat.policyEndDate &&
      flat.policyEndDate < flat.policyStartDate
    ) {
      errors.policyEndDate = 'Itariki ya nyuma igomba kuba nyuma y’itariki yo gutangira';
    }
    return errors;
  }

  if (stepId === 'applicantInfo') {
    const errors = validateForm(flat, rules);
    if (!values.isFirstApplication && !values.isRenewal) {
      errors.applicationType = 'Hitamo ubwa mbere cyangwa ukongeresha';
    }
    return errors;
  }

  if (stepId === 'livestockDetails') {
    const errors: ValidationErrors = {};
    if (values.livestockItems.length === 0) {
      errors.livestockItems = 'Ongeraho nibura itungo rimwe';
      return errors;
    }
    values.livestockItems.forEach((item, index) => {
      if (!item.animalType.trim()) errors[`livestockItems.${index}.animalType`] = 'Ukeneye guhitamo ubwoko';
      if (!item.chipNumber.trim()) errors[`livestockItems.${index}.chipNumber`] = 'Eartag irakenewe';
      if (!item.sumAssured.trim()) errors[`livestockItems.${index}.sumAssured`] = 'Agaciro irakenewe';
      else if (!validationPatterns.numbers.test(item.sumAssured.replace(/\s/g, ''))) {
        errors[`livestockItems.${index}.sumAssured`] = 'Andika umubare';
      }
    });
    return errors;
  }

  if (stepId === 'bankLoan' && values.hasLoan === 'Yego') {
    return validateForm(flat, {
      ...rules,
      financialInstitutionName: { required: true },
      loanAmount: {
        required: true,
        validate: (v) => validationPatterns.numbers.test(v.replace(/\s/g, '')) || 'Andika umubare',
      },
    });
  }

  return validateForm(flat, rules);
}

export function validateLivestockApplicationStepHasErrors(
  stepId: LivestockApplicationStepId,
  values: LivestockApplicationFormValues,
): boolean {
  return hasErrors(validateLivestockApplicationStep(stepId, values));
}
