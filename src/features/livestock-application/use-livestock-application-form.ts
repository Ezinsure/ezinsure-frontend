'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
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
import { computePremiumBreakdownFromForm } from '@/features/livestock-application/utils/premium-calculations';
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

export function useLivestockApplicationForm(
  initialValues?: Partial<LivestockApplicationFormValues>,
  mode: LivestockApplicationFormMode = 'create',
) {
  const [values, setValues] = useState<LivestockApplicationFormValues>(() => ({
    ...createInitialLivestockApplicationValues(),
    ...initialValues,
  }));
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const lastAutoPremiumRef = useRef('');

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
      setValues((prev) => {
        const livestockItems = prev.livestockItems.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        );
        let next = { ...prev, livestockItems };
        if (patch.animalType !== undefined) {
          const suggested = suggestPremiumPercentage(livestockItems);
          if (
            suggested &&
            (!prev.premiumPercentage.trim() ||
              prev.premiumPercentage === lastAutoPremiumRef.current)
          ) {
            lastAutoPremiumRef.current = suggested;
            next = { ...next, premiumPercentage: suggested };
          }
        }
        if (patch.sumAssured !== undefined || patch.animalType !== undefined) {
          next = withPremiumAmounts(next);
        }
        return next;
      });
    },
    [],
  );

  const addLivestockItem = useCallback(() => {
    setValues((prev) => ({
      ...prev,
      livestockItems: [...prev.livestockItems, createEmptyLivestockItem()],
    }));
  }, []);

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
      const livestockItems = mergeImportedLivestockItems(prev.livestockItems, imported);
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
  }, []);

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
      setValues(parsed.values);
      if (typeof parsed.stepIndex === 'number') setStepIndex(parsed.stepIndex);
      setSubmitMessage('Draft yavanywe.');
      return true;
    } catch {
      return false;
    }
  }, []);

  const validateCurrentStep = useCallback(
    (stepId: LivestockApplicationStepId) => {
      const stepErrors = validateLivestockApplicationStep(stepId, values);
      setErrors(stepErrors);
      return !validateLivestockApplicationStepHasErrors(stepId, values);
    },
    [values],
  );

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

  const prepareSubmitPayload = useMemo(() => {
    const amounts = withPremiumAmounts(values);
    const toNumber = (v: string) => {
      const n = parseFloat(String(v).replace(/\s/g, '').replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    return {
      ...amounts,
      insuranceType: values.isRenewal ? 'Renewal' : values.isFirstApplication ? 'New' : '',
      premiumRateAmount: toNumber(amounts.premiumRateAmount),
      farmerContributionAmount: toNumber(amounts.farmerContributionAmount),
      governmentContribution: toNumber(amounts.governmentContribution),
      companyCommission: toNumber(amounts.companyCommission),
      veterinaryCommission: toNumber(amounts.veterinaryCommission),
      premiumPercentage: toNumber(amounts.premiumPercentage),
      livestockItems: values.livestockItems.map((item) => ({
        ...item,
        sex: item.animalCategory,
        species: item.animalType,
        sumAssured: toNumber(item.sumAssured),
      })),
    };
  }, [values]);

  const handleSubmit = useCallback(() => {
    setSubmitMessage(
      'API ntirakora — payload yateguwe mu console. Ohereza bizakorwa nyuma yo gushyiraho API.',
    );
    console.log('[LivestockApplication] submit payload (preview)', prepareSubmitPayload);
  }, [prepareSubmitPayload]);

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
    onEnterPremiumStep,
    handleSubmit,
    prepareSubmitPayload,
  };
}
