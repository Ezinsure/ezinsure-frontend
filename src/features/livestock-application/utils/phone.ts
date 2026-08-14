/**
 * Vet apply form: accept local Rwanda mobile `07XXXXXXXX` only.
 * Payload must be sent as `2507XXXXXXXX`.
 */

const LOCAL_MOBILE_PATTERN = /^07\d{8}$/;
const E164_RWANDA_MOBILE_PATTERN = /^2507\d{8}$/;

export function isLocalRwandaMobile(value: string): boolean {
  const digits = value.replace(/\s/g, '');
  return LOCAL_MOBILE_PATTERN.test(digits);
}

/** True for display/input values (07…) or already-normalized API values (2507…). */
export function isAcceptableOwnerPhoneInput(value: string): boolean {
  const digits = value.replace(/\s/g, '');
  return LOCAL_MOBILE_PATTERN.test(digits) || E164_RWANDA_MOBILE_PATTERN.test(digits);
}

/** Normalize to `2507XXXXXXXX` before API submit. */
export function toApiRwandaPhone(value: string): string {
  const digits = value.replace(/\s/g, '').replace(/^\+/, '');
  if (E164_RWANDA_MOBILE_PATTERN.test(digits)) return digits;
  if (LOCAL_MOBILE_PATTERN.test(digits)) return `25${digits}`;
  return digits;
}

/** Prefill form inputs from API `2507XXXXXXXX` as `07XXXXXXXX`. */
export function toLocalRwandaPhone(value: string): string {
  const digits = value.replace(/\s/g, '').replace(/^\+/, '');
  if (E164_RWANDA_MOBILE_PATTERN.test(digits)) return digits.slice(2);
  return digits;
}
