import {
  hasErrors,
  validateForm,
  validationPatterns,
  type ValidationErrors,
  type ValidationRules,
} from '@/components/ui/form-validation';
import type { FormProfile } from '@/features/livestock-application/domain/form-profiles';
import { isValidPremiumPercentInput } from '@/features/livestock-application/utils/premium';
import type { LivestockApplicationFormValues, LivestockApplicationStepId } from '@/features/livestock-application/types';

export interface LivestockValidationContext {
  lineTableVariant?: FormProfile['lineTableVariant'];
  showOwnerColumns?: boolean;
}

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

function validateLivestockDetails(
  values: LivestockApplicationFormValues,
  context?: LivestockValidationContext,
): ValidationErrors {
  const errors: ValidationErrors = {};
  const isPoultry = context?.lineTableVariant === 'POULTRY_LOT';
  const showOwner = context?.showOwnerColumns;

  if (values.livestockItems.length === 0) {
    errors.livestockItems = isPoultry ? 'Ongeraho nibura lot imwe' : 'Ongeraho nibura itungo rimwe';
    return errors;
  }

  values.livestockItems.forEach((item, index) => {
    const prefix = `livestockItems.${index}`;

    if (showOwner) {
      if (!item.ownerName?.trim()) {
        errors[`${prefix}.ownerName`] = 'Amazina y’umuhinzi arakenewe';
      }
      if (!item.ownerPhone?.trim()) {
        errors[`${prefix}.ownerPhone`] = 'Telefone y’umuhinzi irakenewe';
      } else if (!validationPatterns.phone.test(item.ownerPhone.replace(/\s/g, ''))) {
        errors[`${prefix}.ownerPhone`] = 'Andika telefone neza';
      }
    }

    if (isPoultry) {
      if (!item.chipNumber.trim()) {
        errors[`${prefix}.chipNumber`] = 'Lot No irakenewe';
      }
      if (!item.poultryProductType) {
        errors[`${prefix}.poultryProductType`] = 'Hitamo ubwoko bw’inkoko';
      }
      if (!item.hatcherySource?.trim()) {
        errors[`${prefix}.hatcherySource`] = 'Aho inkoko zavuye birakenewe';
      }
      if (!item.quantity?.trim()) {
        errors[`${prefix}.quantity`] = 'Umubare urakenewe';
      } else if (!validationPatterns.numbers.test(item.quantity.replace(/\s/g, ''))) {
        errors[`${prefix}.quantity`] = 'Andika umubare';
      }
      if (!item.unitValue?.trim()) {
        errors[`${prefix}.unitValue`] = 'Agaciro kimwe kirakenewe';
      } else if (!validationPatterns.numbers.test(item.unitValue.replace(/\s/g, ''))) {
        errors[`${prefix}.unitValue`] = 'Andika umubare';
      }
      return;
    }

    if (!item.animalType.trim()) errors[`${prefix}.animalType`] = 'Ukeneye guhitamo ubwoko';
    if (!item.chipNumber.trim()) errors[`${prefix}.chipNumber`] = 'Eartag irakenewe';
    if (!item.sumAssured.trim()) errors[`${prefix}.sumAssured`] = 'Agaciro irakenewe';
    else if (!validationPatterns.numbers.test(item.sumAssured.replace(/\s/g, ''))) {
      errors[`${prefix}.sumAssured`] = 'Andika umubare';
    }
  });

  return errors;
}

export function validateLivestockApplicationStep(
  stepId: LivestockApplicationStepId,
  values: LivestockApplicationFormValues,
  context?: LivestockValidationContext,
): ValidationErrors {
  const rules = rulesByStep[stepId];
  if (!rules && stepId !== 'livestockDetails') return {};

  const flat = flatValues(values);

  if (stepId === 'insurancePeriod') {
    const errors = validateForm(flat, rules!);
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
    const errors = validateForm(flat, rules!);
    if (!values.isFirstApplication && !values.isRenewal) {
      errors.applicationType = 'Hitamo ubwa mbere cyangwa ukongeresha';
    }
    return errors;
  }

  if (stepId === 'livestockDetails') {
    return validateLivestockDetails(values, context);
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

  return validateForm(flat, rules!);
}

export function validateLivestockApplicationStepHasErrors(
  stepId: LivestockApplicationStepId,
  values: LivestockApplicationFormValues,
  context?: LivestockValidationContext,
): boolean {
  return hasErrors(validateLivestockApplicationStep(stepId, values, context));
}
