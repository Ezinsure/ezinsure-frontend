import type { AppUser } from '@/shared/types/auth';
import type { ProductLine } from '@/shared/types/product-line';
import {
  SONARWA_REPRESENTATIVE_ROLE,
  isSonarwaRepresentativeRole,
  isVeterinaryRole,
  normalizeRole,
} from '@/shared/utils/role';

export function getAllowedProductLinesForRole(role: string): ProductLine[] {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case 'AGENT':
      return ['motor'];
    case 'VETERINARY':
      return ['livestock'];
    case 'ADMIN':
    case 'SUPER_ADMIN':
    case 'FINANCE':
    case SONARWA_REPRESENTATIVE_ROLE:
      return ['motor', 'livestock'];
    default:
      return isVeterinaryRole(normalized) ? ['livestock'] : ['motor'];
  }
}

export function getDefaultProductLineForRole(role: string): ProductLine {
  if (isVeterinaryRole(role) || isSonarwaRepresentativeRole(role)) {
    return 'livestock';
  }
  return 'motor';
}

export function resolveUserProductLines(user: AppUser | null): ProductLine[] {
  if (!user) return [];
  if (user.allowedProductLines?.length) {
    return user.allowedProductLines;
  }
  return getAllowedProductLinesForRole(user.role);
}

export function resolveUserDefaultProductLine(user: AppUser | null): ProductLine {
  if (!user) return 'motor';
  if (user.defaultProductLine) {
    return user.defaultProductLine;
  }
  return getDefaultProductLineForRole(user.role);
}

export function canAccessProductLine(
  user: AppUser | null,
  productLine: ProductLine,
): boolean {
  return resolveUserProductLines(user).includes(productLine);
}
