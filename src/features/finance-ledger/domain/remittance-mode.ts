/**
 * How SONARWA tells us what they paid.
 *
 * Confirmed for livestock: they send a **total** for a period (or against
 * one or more statements), not a per-contract remittance file. The finance
 * user records the bank total, allocates it to statements, and we apply it
 * to billed lines oldest-first.
 *
 * Per-line import (`importRemittance`) stays on the API for a possible later
 * motor / SONARWA format change, but the livestock UI does not use it.
 */
export const REMITTANCE_MODE = 'TOTAL_ONLY' as const;
export type RemittanceMode = typeof REMITTANCE_MODE;
