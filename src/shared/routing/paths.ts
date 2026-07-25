import type { ProductLine } from '@/shared/types/product-line';
import {
  SONARWA_REPRESENTATIVE_ROLE,
  isVeterinaryRole,
  normalizeRole,
} from '@/shared/utils/role';

const ROLE_SEGMENTS: Record<string, string> = {
  ADMIN: 'admin',
  AGENT: 'agent',
  SUPER_ADMIN: 'super_admin',
  FINANCE: 'finance',
  VETERINARY: 'vet',
  [SONARWA_REPRESENTATIVE_ROLE]: 'sonarwa',
};

export function getRolePathPrefix(role: string): string {
  const normalized = normalizeRole(role);
  return ROLE_SEGMENTS[normalized] ?? normalized.toLowerCase();
}

/** Canonical dashboard path for a role + product line */
export function getDashboardPath(role: string, productLine: ProductLine = 'motor'): string {
  const normalized = normalizeRole(role);
  const prefix = getRolePathPrefix(normalized);

  if (isVeterinaryRole(normalized)) {
    return `/${prefix}/livestock/dashboard`;
  }

  if (normalized === 'AGENT') {
    return `/${prefix}/motor/dashboard`;
  }

  if (
    normalized === 'ADMIN' ||
    normalized === 'SUPER_ADMIN' ||
    normalized === 'FINANCE' ||
    normalized === SONARWA_REPRESENTATIVE_ROLE
  ) {
    return `/${prefix}/${productLine}/dashboard`;
  }

  return `/${prefix}/dashboard`;
}

/** Parse product line from pathname, or null if legacy/unscoped */
export function parseProductLineFromPath(pathname: string): ProductLine | null {
  const match = pathname.match(/^\/(?:admin|super_admin|finance|sonarwa)\/(motor|livestock)(?:\/|$)/);
  if (match?.[1] === 'motor' || match?.[1] === 'livestock') {
    return match[1];
  }

  if (pathname.match(/^\/agent\/motor(?:\/|$)/)) {
    return 'motor';
  }

  if (pathname.match(/^\/vet\/livestock(?:\/|$)/)) {
    return 'livestock';
  }

  return null;
}

/** Legacy admin/agent routes without /motor segment still map to motor */
export function isLegacyMotorPath(pathname: string): boolean {
  if (parseProductLineFromPath(pathname)) {
    return false;
  }

  return /^\/(admin|agent|super_admin|finance)\//.test(pathname);
}

export function resolveProductLineFromPath(
  pathname: string,
  fallback: ProductLine,
): ProductLine {
  return parseProductLineFromPath(pathname) ?? (isLegacyMotorPath(pathname) ? 'motor' : fallback);
}

export function isAuthenticatedAppPath(pathname: string): boolean {
  return /^\/(admin|agent|super_admin|finance|vet|sonarwa)(\/|$)/.test(pathname);
}
