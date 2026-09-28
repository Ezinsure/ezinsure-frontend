import type { AppUser } from '@/shared/types/auth';
import type { ProductLine } from '@/shared/types/product-line';
import {
  getAllowedProductLinesForRole,
  getDefaultProductLineForRole,
} from '@/shared/utils/product-line-access';
import { normalizeRole } from '@/shared/utils/role';

/** localStorage keys for dev/testing before /auth/me returns product lines. */
export const ALLOWED_PRODUCT_LINES_STORAGE_KEY = 'ezinsure_allowed_product_lines';
export const DEFAULT_PRODUCT_LINE_STORAGE_KEY = 'ezinsure_default_product_line';

function parseAllowedProductLines(raw: string | null): ProductLine[] | undefined {
  if (!raw) return undefined;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;

    const lines = parsed.filter(
      (line): line is ProductLine => line === 'motor' || line === 'livestock',
    );

    return lines.length > 0 ? lines : undefined;
  } catch {
    return undefined;
  }
}

function parseDefaultProductLine(raw: string | null): ProductLine | undefined {
  if (raw === 'motor' || raw === 'livestock') {
    return raw;
  }
  return undefined;
}

export function readProductLineDevOverrides(): {
  allowedProductLines?: ProductLine[];
  defaultProductLine?: ProductLine;
} {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    allowedProductLines: parseAllowedProductLines(
      localStorage.getItem(ALLOWED_PRODUCT_LINES_STORAGE_KEY),
    ),
    defaultProductLine: parseDefaultProductLine(
      localStorage.getItem(DEFAULT_PRODUCT_LINE_STORAGE_KEY),
    ),
  };
}

/**
 * Merge API user with localStorage overrides, then role defaults.
 * Set overrides in devtools, e.g.:
 * localStorage.setItem('ezinsure_allowed_product_lines', '["motor","livestock"]')
 * localStorage.setItem('ezinsure_default_product_line', 'livestock')
 */
export function enrichUserWithProductLines(user: AppUser): AppUser {
  const overrides = readProductLineDevOverrides();
  const role = normalizeRole(user.role);

  const allowedProductLines =
    user.allowedProductLines?.length
      ? user.allowedProductLines
      : overrides.allowedProductLines ?? getAllowedProductLinesForRole(role);

  const defaultProductLine =
    user.defaultProductLine ??
    overrides.defaultProductLine ??
    getDefaultProductLineForRole(role);

  return {
    ...user,
    role,
    allowedProductLines,
    defaultProductLine,
  };
}

export function setProductLineDevOverrides(options: {
  allowedProductLines: ProductLine[];
  defaultProductLine?: ProductLine;
}) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(
    ALLOWED_PRODUCT_LINES_STORAGE_KEY,
    JSON.stringify(options.allowedProductLines),
  );

  if (options.defaultProductLine) {
    localStorage.setItem(
      DEFAULT_PRODUCT_LINE_STORAGE_KEY,
      options.defaultProductLine,
    );
  }
}

export function clearProductLineDevOverrides() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(ALLOWED_PRODUCT_LINES_STORAGE_KEY);
  localStorage.removeItem(DEFAULT_PRODUCT_LINE_STORAGE_KEY);
}
