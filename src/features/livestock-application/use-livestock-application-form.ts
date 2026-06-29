'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LIVESTOCK_APPLICATION_DRAFT_KEY } from '@/features/livestock-application/constants';
import {
  createEmptyLivestockItem,
  createInitialLivestockApplicationValues,
  mergeImportedLivestockItems,
} from '@/features/livestock-application/initial-state';
import type {
  LivestockApplicationFormMode,
  LivestockApplicationFormValues,
  LivestockAnimalRow,
  LivestockApplicationStepId,
} from '@/features/livestock-application/types';
import type { CreateLivestockApplicationPayload } from '@/features/livestock-application/domain/application-types';
import type {
  ApplicationIntakeSelection,
  FormProfile,
} from '@/features/livestock-application/domain/form-profiles';
import { speciesGroupToAnimalType } from '@/features/livestock-application/domain/form-profiles';
import { computePremiumBreakdownFromForm } from '@/features/livestock-application/utils/premium-calculations';
import { computePoultryLotAmounts } from '@/features/livestock-application/utils/poultry-calculations';
import { suggestPremiumPercentage } from '@/features/livestock-application/utils/premium';
import {
  validateLivestockApplicationStep,
  validateLivestockApplicationStepHasErrors,
} from '@/features/livestock-application/validation';

function withPremiumAmounts(
  values: LivestockApplicationFormValues,
  useManualTotal = false,
): LivestockApplicationFormValues {
  return { ...values, ...computePremiumBreakdownFromForm(values, { useManualTotal }) };
}

function withLockedAnimalType(
  items: LivestockAnimalRow[],
  animalType: string,
): LivestockAnimalRow[] {
  return items.map((item) => ({ ...item, animalType }));
}

export function useLivestockApplicationForm(
  initialValues?: Partial<LivestockApplicationFormValues>,
  mode: LivestockApplicationFormMode = 'create',
  formProfile?: FormProfile,
  intake?: ApplicationIntakeSelection,
) {
  const stepIds = formProfile?.stepIds ?? [];
  const [values, setValues] = useState<LivestockApplicationFormValues>(() => ({
    ...createInitialLivestockApplicationValues(),
    ...initialValues,
  }));
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const lastAutoPremiumRef = useRef('');
  const lockedAnimalType = intake?.speciesGroup
    ? speciesGroupToAnimalType(intake.speciesGroup)
    : formProfile?.lockedAnimalType;

  useEffect(() => {
    if (!lockedAnimalType) return;
    setValues((prev) => {
      const needsSync = prev.livestockItems.some((item) => item.animalType !== lockedAnimalType);
      if (!needsSync) return prev;
      return {
        ...prev,
        livestockItems: withLockedAnimalType(prev.livestockItems, lockedAnimalType),
      };
    });
  }, [lockedAnimalType]);

  const isReadOnly = mode === 'readonly' || mode === 'review';
  const isReview = mode === 'review';

  const setField = useCallback(
    <K extends keyof LivestockApplicationFormValues>(
      key: K,
      value: LivestockApplicationFormValues[K],
    ) => {
      setValues((prev) => {
        let next = { ...prev, [key]: value };
        if (key === 'premiumPercentage') {
          lastAutoPremiumRef.current = String(value);
          next = withPremiumAmounts(next);
        } else if (key === 'premiumRateAmount') {
          next = withPremiumAmounts(next, true);
        }
        return next;
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    },
    [],
  );

  const updateLivestockItem = useCallback(
    (id: string, patch: Partial<LivestockAnimalRow>) => {
      const patchWithoutType: Partial<LivestockAnimalRow> = { ...patch };
      if (lockedAnimalType) delete patchWithoutType.animalType;

      setValues((prev) => {
        let livestockItems = prev.livestockItems.map((item) =>
          item.id === id ? { ...item, ...patchWithoutType } : item,
        );
        if (lockedAnimalType) {
          livestockItems = withLockedAnimalType(livestockItems, lockedAnimalType);
        }
        let next = { ...prev, livestockItems };
        if (
          patch.sumAssured !== undefined ||
          patch.quantity !== undefined ||
          patch.unitValue !== undefined
        ) {
          const suggested = suggestPremiumPercentage(livestockItems);
          if (
            suggested &&
            (!prev.premiumPercentage.trim() ||
              prev.premiumPercentage === lastAutoPremiumRef.current)
          ) {
            lastAutoPremiumRef.current = suggested;
            next = { ...next, premiumPercentage: suggested };
          }
          next = withPremiumAmounts(next);
        }
        return next;
      });
    },
    [lockedAnimalType],
  );

  const addLivestockItem = useCallback(() => {
    setValues((prev) => {
      const empty = createEmptyLivestockItem();
      if (lockedAnimalType) empty.animalType = lockedAnimalType;
      return { ...prev, livestockItems: [...prev.livestockItems, empty] };
    });
  }, [lockedAnimalType]);

  const removeLivestockItem = useCallback((id: string) => {
    setValues((prev) => {
      const livestockItems =
        prev.livestockItems.length <= 1
          ? prev.livestockItems
          : prev.livestockItems.filter((item) => item.id !== id);
      let next = { ...prev, livestockItems };
      if (
        !prev.premiumPercentage.trim() ||
        prev.premiumPercentage === lastAutoPremiumRef.current
      ) {
        const suggested = suggestPremiumPercentage(livestockItems);
        if (suggested) {
          lastAutoPremiumRef.current = suggested;
          next = { ...next, premiumPercentage: suggested };
        }
      }
      return withPremiumAmounts(next);
    });
  }, []);

  const mergeLivestockItems = useCallback((imported: LivestockAnimalRow[]) => {
    setValues((prev) => {
      const normalized = lockedAnimalType
        ? imported.map((row) => ({ ...row, animalType: lockedAnimalType }))
        : imported;
      const livestockItems = mergeImportedLivestockItems(prev.livestockItems, normalized);
      let next = { ...prev, livestockItems };
      const suggested = suggestPremiumPercentage(livestockItems);
      if (
        suggested &&
        (!prev.premiumPercentage.trim() ||
          prev.premiumPercentage === lastAutoPremiumRef.current)
      ) {
        lastAutoPremiumRef.current = suggested;
        next = { ...next, premiumPercentage: suggested };
      }
      return withPremiumAmounts(next);
    });
  }, [lockedAnimalType]);

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(
        LIVESTOCK_APPLICATION_DRAFT_KEY,
        JSON.stringify({ values, stepIndex, savedAt: new Date().toISOString() }),
      );
      setSubmitMessage('Draft yabitswe mu buryo bwa lokale.');
    } catch {
      setSubmitMessage('Ntibyashobotse kubika draft.');
    }
  }, [stepIndex, values]);

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(LIVESTOCK_APPLICATION_DRAFT_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as {
        values: LivestockApplicationFormValues;
        stepIndex?: number;
      };
      const loadedValues = lockedAnimalType
        ? {
            ...parsed.values,
            livestockItems: withLockedAnimalType(parsed.values.livestockItems, lockedAnimalType),
          }
        : parsed.values;
      setValues({
        ...loadedValues,
        ...(intake?.girinka ? { girinka: intake.girinka } : {}),
      });
      if (typeof parsed.stepIndex === 'number') setStepIndex(parsed.stepIndex);
      setSubmitMessage('Draft yavanywe.');
      return true;
    } catch {
      return false;
    }
  }, [intake?.girinka, lockedAnimalType]);

  const validationContext = useMemo(
    () =>
      formProfile
        ? {
            lineTableVariant: formProfile.lineTableVariant,
            showOwnerColumns: formProfile.showOwnerColumns,
            lockedAnimalType: formProfile.lockedAnimalType,
          }
        : undefined,
    [formProfile],
  );

  const validateCurrentStep = useCallback(
    (stepId: LivestockApplicationStepId) => {
      const stepErrors = validateLivestockApplicationStep(stepId, values, validationContext);
      setErrors(stepErrors);
      return !validateLivestockApplicationStepHasErrors(stepId, values, validationContext);
    },
    [validationContext, values],
  );

  const validateAllSteps = useCallback(() => {
    for (let i = 0; i < stepIds.length; i++) {
      const stepId = stepIds[i];
      const stepErrors = validateLivestockApplicationStep(stepId, values, validationContext);
      if (validateLivestockApplicationStepHasErrors(stepId, values, validationContext)) {
        setErrors(stepErrors);
        setStepIndex(i);
        return false;
      }
    }
    if (intake?.speciesGroup === 'CATTLE' && !values.girinka) {
      setErrors({ girinka: 'Hitamo niba iri muri Girinka' });
      return false;
    }
    setErrors({});
    return true;
  }, [intake?.speciesGroup, stepIds, validationContext, values]);

  const onEnterPremiumStep = useCallback(() => {
    setValues((prev) => {
      let next = prev;
      const suggested = suggestPremiumPercentage(prev.livestockItems);
      if (
        suggested &&
        (!prev.premiumPercentage.trim() ||
          prev.premiumPercentage === lastAutoPremiumRef.current)
      ) {
        lastAutoPremiumRef.current = suggested;
        next = { ...next, premiumPercentage: suggested };
      }
      return withPremiumAmounts(next);
    });
  }, []);

  const prepareSubmitPayload = useMemo((): CreateLivestockApplicationPayload => {
    const amounts = withPremiumAmounts(values);
    const toNumber = (v: string) => {
      const n = parseFloat(String(v).replace(/\s/g, '').replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    const isMulti = intake?.ownerMode === 'MULTI_OWNER';
    const isPoultry = formProfile?.lineTableVariant === 'POULTRY_LOT';
    const isCattle = (intake?.speciesGroup ?? 'CATTLE') === 'CATTLE';

    return {
      speciesGroup: intake?.speciesGroup ?? 'CATTLE',
      ownerMode: intake?.ownerMode ?? 'SINGLE_OWNER',
      poultryProductType: values.livestockItems[0]?.poultryProductType || undefined,
      insuranceType: values.isRenewal ? 'Renewal' : values.isFirstApplication ? 'New' : '',
      policyStartDate: values.policyStartDate,
      policyEndDate: values.policyEndDate,
      ...(isCattle && values.girinka ? { girinka: values.girinka } : {}),
      ...(values.farmingExperience.trim()
        ? { farmingExperience: values.farmingExperience.trim() }
        : {}),
      ...(values.previousIncidents.trim()
        ? { previousIncidents: values.previousIncidents.trim() }
        : {}),
      veterinarySupport: {
        hasVeterinarian: values.hasVeterinarian.trim(),
        veterinarianAvailability: values.veterinarianAvailability.trim(),
      },
      diseaseInfo: {
        knownDiseases: values.knownDiseases.trim(),
      },
      bankLoan: {
        hasLoan: values.hasLoan.trim(),
        ...(values.financialInstitutionName.trim()
          ? { financialInstitutionName: values.financialInstitutionName.trim() }
          : {}),
        ...(values.institutionLocation.trim()
          ? { institutionLocation: values.institutionLocation.trim() }
          : {}),
        ...(values.loanAccountNumber.trim()
          ? { loanAccountNumber: values.loanAccountNumber.trim() }
          : {}),
        ...(values.loanAmount.trim() ? { loanAmount: values.loanAmount.trim() } : {}),
      },
      owner: isMulti
        ? undefined
        : {
            name: values.ownerName,
            phone: values.ownerPhone,
            nationalId: values.nationalId.trim() || undefined,
            ...(values.ownerGender ? { gender: values.ownerGender } : {}),
            province: values.applicantProvince,
            district: values.applicantDistrict,
            sector: values.applicantSector,
            cell: values.applicantCell,
            village: values.applicantVillage,
          },
      livestockLocation: {
        province: values.livestockProvince,
        district: values.district,
        sector: values.sector,
        cell: values.cell,
        village: values.village,
      },
      premiumTotals: {
        premiumPercentage: toNumber(amounts.premiumPercentage),
        premiumRateAmount: toNumber(amounts.premiumRateAmount),
        farmerContributionAmount: toNumber(amounts.farmerContributionAmount),
        governmentContribution: toNumber(amounts.governmentContribution),
        companyCommission: toNumber(amounts.companyCommission),
        veterinaryCommission: toNumber(amounts.veterinaryCommission),
        totalSumAssured: values.livestockItems.reduce(
          (s, i) => s + toNumber(i.sumAssured),
          0,
        ),
      },
      lines: values.livestockItems.map((item) => {
        const poultry = isPoultry ? computePoultryLotAmounts(item) : null;
        const sumAssured = poultry ? toNumber(poultry.sumAssured) : toNumber(item.sumAssured);
        return {
          lineType: isPoultry ? ('LOT' as const) : ('INDIVIDUAL' as const),
          quantity: isPoultry ? toNumber(item.quantity || '1') : 1,
          unitValue: isPoultry ? toNumber(item.unitValue || '0') : sumAssured,
          sumAssured,
          premiumRate: poultry ? toNumber(poultry.premiumAmount) : 0,
          farmerContribution: poultry ? toNumber(poultry.farmerAmount) : 0,
          governmentContribution: poultry ? toNumber(poultry.nkunganireAmount) : 0,
          owner: isMulti
            ? {
                name: item.ownerName || '',
                phone: item.ownerPhone || '',
                nationalId: item.ownerNationalId?.trim() || '',
                ...(item.ownerGender ? { gender: item.ownerGender } : {}),
              }
            : undefined,
          animal: {
            species: item.animalType,
            animalCategory: item.animalCategory,
            animalAge: item.animalAge,
            chipNumber: item.chipNumber,
            breed: item.breed,
            color: item.color,
            productivity: item.productivity,
            hatcherySource: item.hatcherySource,
            poultryProductType: item.poultryProductType || undefined,
            ...(item.vaccinationInfo?.trim()
              ? { vaccinationInfo: item.vaccinationInfo.trim() }
              : {}),
          },
          tekanaEligible: Boolean(item.chipNumber?.trim()),
        };
      }),
      veterinarianVerification: {
        insuranceAgentCode: values.insuranceAgentCode,
        veterinarianLicenseNumber: values.veterinarianLicenseNumber,
        veterinarianSignatureName: values.veterinarianSignatureName,
      },
    };
  }, [formProfile?.lineTableVariant, intake, values]);

  const resetForm = useCallback(() => {
    const initial = createInitialLivestockApplicationValues();
    if (lockedAnimalType) {
      initial.livestockItems = withLockedAnimalType(initial.livestockItems, lockedAnimalType);
    }
    setValues(initial);
    setStepIndex(0);
    setErrors({});
    setSubmitMessage(null);
    lastAutoPremiumRef.current = '';
  }, [lockedAnimalType]);

  return {
    values,
    setValues,
    setField,
    stepIndex,
    setStepIndex,
    errors,
    setErrors,
    isReadOnly,
    isReview,
    submitMessage,
    setSubmitMessage,
    updateLivestockItem,
    addLivestockItem,
    removeLivestockItem,
    mergeLivestockItems,
    saveDraft,
    loadDraft,
    validateCurrentStep,
    validateAllSteps,
    onEnterPremiumStep,
    prepareSubmitPayload,
    resetForm,
    stepIds,
  };
}
