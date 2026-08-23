import type { ProductLine } from '@/shared/types/product-line';

export const USER_ROLES = [
  'ADMIN',
  'AGENT',
  'SUPER_ADMIN',
  'FINANCE',
  'VETERINARY',
  'SONARWA_REPRESENTATIVE',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AppUser {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole | string;
  agentCode?: string;
  /** Veterinarian-only: PRIVATE or SARO when returned by the API. */
  veterinaryType?: 'PRIVATE' | 'SARO' | string;
  /** Veterinarian licence number when returned by the API. */
  veterinarianLicenseNumber?: string;
  /**
   * Default Solektra company commission rate (%) applied to livestock applications
   * this vet creates — 5, 8, or 10. Defaults to 8 when omitted.
   */
  companyCommissionRate?: number;
  status: string;
  /** From API when available; otherwise derived from role on the client */
  allowedProductLines?: ProductLine[];
  defaultProductLine?: ProductLine;
}
