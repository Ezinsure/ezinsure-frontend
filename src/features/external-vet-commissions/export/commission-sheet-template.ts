import {
  COMMISSION_SHEET_COLUMN_KEYS,
  COMMISSION_LINE_COLUMN_LABELS,
} from '../domain';

/** One sample data row matching the upload sheet (no companyCommission). */
const SAMPLE_ROW: Record<
  (typeof COMMISSION_SHEET_COLUMN_KEYS)[number],
  string | number
> = {
  sn: 1,
  prodDate: '18/03/2026 10:52:10',
  branch: 'Butare',
  effecDate: '18/03/2026',
  expiryDate: '17/03/2027',
  contract: '0717484|BASE|00',
  typeLivestock: 'Cattle-Non-Girinka',
  clientId: '0500866',
  clientName: 'TUMUSIFU JEROME',
  agent: 'SOLEKTRA R',
  sumInsured: 1000000,
  netPremium: 55000,
  userName: 'NYAMWASA',
};

/**
 * Download an Excel template with the sheet columns expected by upload.
 * companyCommission is NOT included — it is calculated in the form from
 * net premium × company commission %.
 * Vet name / phone / bank are also NOT in this file.
 */
export async function downloadExternalVetCommissionTemplate(): Promise<void> {
  const XLSX = await import('@e965/xlsx');
  const headers = COMMISSION_SHEET_COLUMN_KEYS.map(
    (key) => COMMISSION_LINE_COLUMN_LABELS[key],
  );
  const sample = COMMISSION_SHEET_COLUMN_KEYS.map((key) => SAMPLE_ROW[key]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, sample]);
  worksheet['!cols'] = headers.map((h) => ({
    wch: Math.max(12, String(h).length + 2),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Commission Lines');
  XLSX.writeFile(workbook, 'external_vet_commission_lines_template.xlsx');
}
