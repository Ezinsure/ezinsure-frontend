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
import { suggestPremiumPercentage } from '@/features/livestock-application/utils/premium';
import {
  validateLivestockApplicationStep,
  validateLivestockApplicationStepHasErrors,
} from '@/features/livestock-application/validation';

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

  const applySuggestedPremium = useCallback((items: LivestockAnimalRow[], force = false) => {
    const suggested = suggestPremiumPercentage(items);
    if (!suggested) return;
    setValues((prev) => {
      if (
        !force &&
        prev.premiumPercentage.trim() &&
        prev.premiumPercentage !== lastAutoPremiumRef.current
      ) {
        return prev;
      }
      lastAutoPremiumRef.current = suggested;
      return { ...prev, premiumPercentage: suggested };
    });
  }, []);

  const setField = useCallback(
    <K extends keyof LivestockApplicationFormValues>(
      key: K,
      value: LivestockApplicationFormValues[K],
    ) => {
      setValues((prev) => ({ ...prev, [key]: value }));
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
        const next = { ...prev, livestockItems };
        if (patch.animalType !== undefined) {
          const suggested = suggestPremiumPercentage(livestockItems);
          if (
            suggested &&
            (!prev.premiumPercentage.trim() ||
              prev.premiumPercentage === lastAutoPremiumRef.current)
          ) {
            lastAutoPremiumRef.current = suggested;
            return { ...next, premiumPercentage: suggested };
          }
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
      const next = { ...prev, livestockItems };
      if (
        !prev.premiumPercentage.trim() ||
        prev.premiumPercentage === lastAutoPremiumRef.current
      ) {
        const suggested = suggestPremiumPercentage(livestockItems);
        if (suggested) {
          lastAutoPremiumRef.current = suggested;
          return { ...next, premiumPercentage: suggested };
        }
      }
      return next;
    });
  }, []);

  const mergeLivestockItems = useCallback((imported: LivestockAnimalRow[]) => {
    setValues((prev) => {
      const livestockItems = mergeImportedLivestockItems(prev.livestockItems, imported);
      const next = { ...prev, livestockItems };
      const suggested = suggestPremiumPercentage(livestockItems);
      if (
        suggested &&
        (!prev.premiumPercentage.trim() ||
          prev.premiumPercentage === lastAutoPremiumRef.current)
      ) {
        lastAutoPremiumRef.current = suggested;
        return { ...next, premiumPercentage: suggested };
      }
      return next;
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
    applySuggestedPremium(values.livestockItems, false);
  }, [applySuggestedPremium, values.livestockItems]);

  const prepareSubmitPayload = useMemo(() => {
    return {
      ...values,
      insuranceType: values.isRenewal ? 'Renewal' : values.isFirstApplication ? 'New' : '',
      livestockItems: values.livestockItems.map((item) => ({
        ...item,
        sex: item.animalCategory,
        species: item.animalType,
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
