import type { LivestockFinanceVetTotals, VetCommissionMemoMeta } from '../domain';

function formatRwf(value: number): number {
  return Math.round(value);
}

function formatDateLabel(iso?: string): string {
  if (!iso) {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Export Patrick-style Internal Memo Excel for livestock vet commissions.
 * Community xlsx cannot embed the Solektra PNG cleanly (black background);
 * branding is applied via the SOLEKTRA text header matching the memo layout.
 */
export async function downloadVetCommissionMemoExcel(
  vets: LivestockFinanceVetTotals[],
  meta: VetCommissionMemoMeta = {},
): Promise<void> {
  if (vets.length === 0) {
    throw new Error('No veterinarians to export');
  }

  const XLSX = await import('xlsx');
  const todayLabel = formatDateLabel(meta.date);
  const fromName = meta.fromName ?? 'Finance';
  const rangeLabel =
    meta.dateRange?.startDate && meta.dateRange?.endDate
      ? `${meta.dateRange.startDate} to ${meta.dateRange.endDate}`
      : '';

  const totals = vets.reduce(
    (acc, v) => ({
      netPremium: acc.netPremium + v.netPremium,
      totalCommission13_5: acc.totalCommission13_5 + v.totalCommission13_5,
      veterinaryCommission: acc.veterinaryCommission + v.veterinaryCommission,
      solektraCommission: acc.solektraCommission + v.solektraCommission,
    }),
    { netPremium: 0, totalCommission13_5: 0, veterinaryCommission: 0, solektraCommission: 0 },
  );

  const headerRows: (string | number)[][] = [
    ['SOLEKTRA'],
    ['INTERNAL MEMO'],
    [],
    ['To:', 'Managing Director'],
    ['From:', fromName],
    ['Date:', todayLabel],
    ['Re:', 'Livestock Insurance Agent Services Delivery'],
    ['Project:', 'Digital Solutions and Services delivery for the Community'],
    ['RE:', 'SOLEKTRA Commissions on Livestock insurances services'],
  ];

  if (rangeLabel) {
    headerRows.push(['Period:', rangeLabel]);
  }

  headerRows.push(
    [],
    [
      'No.',
      'Vet name',
      'Phones',
      'District',
      'Total insurance / Net Premium',
      'Commission (13.5%)',
      'Agent/Vet Commission (10%)',
      'Solektra Commission (3.5%)',
      'Vet Account Number',
      'Bank',
    ],
  );

  const dataRows = vets.map((vet, idx) => [
    idx + 1,
    vet.name,
    vet.phoneNumber ?? '',
    vet.districts.join(', '),
    formatRwf(vet.netPremium),
    formatRwf(vet.totalCommission13_5),
    formatRwf(vet.veterinaryCommission),
    formatRwf(vet.solektraCommission),
    vet.bankAccountNumber ?? '',
    vet.bankName ?? '',
  ]);

  const totalRow: (string | number)[] = [
    '',
    'TOTALS',
    '',
    '',
    formatRwf(totals.netPremium),
    formatRwf(totals.totalCommission13_5),
    formatRwf(totals.veterinaryCommission),
    formatRwf(totals.solektraCommission),
    '',
    '',
  ];

  const sheetData = [...headerRows, ...dataRows, totalRow];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Internal Memo');

  const filenameDate = meta.date ?? new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `livestock_vet_commissions_${filenameDate}.xlsx`);
}
