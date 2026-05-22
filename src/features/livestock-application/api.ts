import type { LivestockApplicationFormValues } from '@/features/livestock-application/types';

/**
 * Submit livestock application — API wiring pending.
 */
export type LivestockApplicationSubmitPayload = LivestockApplicationFormValues & {
  insuranceType?: string;
};

export async function submitLivestockApplication(
  _payload: LivestockApplicationSubmitPayload,
): Promise<never> {
  throw new Error('Livestock application API is not connected yet.');
}
