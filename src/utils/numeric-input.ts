/**
 * Strip non-digits and optional leading zeros (keeps empty string).
 * For integer-only fields (no type="number" spinners).
 */
export function filterIntegerDigits(raw: string, maxDigits?: number): string {
  let s = raw.replace(/\D/g, '');
  if (maxDigits != null && maxDigits >= 0) {
    s = s.slice(0, maxDigits);
  }
  s = s.replace(/^0+(?=\d)/, '');
  return s;
}
