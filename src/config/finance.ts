/**
 * Finance portal runtime configuration.
 *
 * NEXT_PUBLIC_FINANCE_MOCK=true   -> finance screens use local demo data.
 *                                    A visible "Demo data" banner is shown.
 * (unset / anything else)         -> real API only. Failures surface as errors;
 *                                    they are never replaced with fake figures.
 *
 * NEXT_PUBLIC_FINANCE_CURRENCY    -> ISO 4217 code used when formatting money
 *                                    (default: RWF).
 */
export const FINANCE_MOCK_ENABLED =
  process.env.NEXT_PUBLIC_FINANCE_MOCK === 'true';

export const FINANCE_CURRENCY =
  process.env.NEXT_PUBLIC_FINANCE_CURRENCY?.trim().toUpperCase() || 'RWF';
