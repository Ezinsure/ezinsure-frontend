import type { AppUser } from '@/shared/types/auth';
import type { ProductLine } from '@/shared/types/product-line';

export function getAllowedProductLinesForRole(role: string): ProductLine[] {
  switch (role) {
    case 'AGENT':
      return ['motor'];
    case 'VET':
      return ['livestock'];
    case 'ADMIN':
    case 'SUPER_ADMIN':
    case 'FINANCE':
      return ['motor', 'livestock'];
    default:
      return ['motor'];
  }
}

export function getDefaultProductLineForRole(role: string): ProductLine {
  switch (role) {
    case 'VET':
      return 'livestock';
    default:
      return 'motor';
  }
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
