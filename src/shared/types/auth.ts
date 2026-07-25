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
  status: string;
  /** From API when available; otherwise derived from role on the client */
  allowedProductLines?: ProductLine[];
  defaultProductLine?: ProductLine;
}
