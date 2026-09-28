/** Shared insurance provider registry — extend when adding Radiant etc. */
export type InsuranceProviderId = 'SONARWA' | 'RADIANT';

export interface InsuranceProviderDefinition {
  id: InsuranceProviderId;
  label: string;
  shortLabel: string;
}

export const INSURANCE_PROVIDERS: InsuranceProviderDefinition[] = [
  { id: 'SONARWA', label: 'SONARWA', shortLabel: 'SONARWA' },
  { id: 'RADIANT', label: 'Radiant Insurance', shortLabel: 'Radiant' },
];

export const DEFAULT_INSURANCE_PROVIDER: InsuranceProviderId = 'SONARWA';

export function insuranceProviderLabel(id?: InsuranceProviderId | string): string {
  const match = INSURANCE_PROVIDERS.find((p) => p.id === id);
  return match?.label ?? id ?? DEFAULT_INSURANCE_PROVIDER;
}
