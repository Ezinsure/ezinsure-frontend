import type { LivestockApplicationFormValues } from '@/features/livestock-application/types';
import type { AppUser } from '@/shared/types/auth';
import { isVeterinaryRole } from '@/shared/utils/role';

export type VetVerificationPrefill = Pick<
  LivestockApplicationFormValues,
  'insuranceAgentCode' | 'veterinarianLicenseNumber' | 'veterinarianSignatureName'
>;

function pickNonEmpty(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

/** Map logged-in veterinarian profile fields to application verification inputs. */
export function resolveVetVerificationPrefill(
  user: AppUser | null | undefined,
): VetVerificationPrefill | undefined {
  if (!user || !isVeterinaryRole(user.role)) return undefined;

  const profile = user as AppUser & {
    licenseNumber?: string;
    veterinarianLicenseNumber?: string;
    veterinaryLicenseNumber?: string;
  };

  const prefill: VetVerificationPrefill = {
    insuranceAgentCode: pickNonEmpty(user.agentCode),
    veterinarianSignatureName: pickNonEmpty(user.fullName),
    veterinarianLicenseNumber: pickNonEmpty(
      profile.veterinarianLicenseNumber,
      profile.veterinaryLicenseNumber,
      profile.licenseNumber,
    ),
  };

  if (
    !prefill.insuranceAgentCode &&
    !prefill.veterinarianLicenseNumber &&
    !prefill.veterinarianSignatureName
  ) {
    return undefined;
  }

  return prefill;
}

/** Fill empty vet verification fields without overwriting user edits or draft values. */
export function withVetVerificationPrefill(
  values: LivestockApplicationFormValues,
  prefill?: VetVerificationPrefill,
): LivestockApplicationFormValues {
  if (!prefill) return values;

  return {
    ...values,
    insuranceAgentCode: pickNonEmpty(values.insuranceAgentCode, prefill.insuranceAgentCode),
    veterinarianLicenseNumber: pickNonEmpty(
      values.veterinarianLicenseNumber,
      prefill.veterinarianLicenseNumber,
    ),
    veterinarianSignatureName: pickNonEmpty(
      values.veterinarianSignatureName,
      prefill.veterinarianSignatureName,
    ),
  };
}
