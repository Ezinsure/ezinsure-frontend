import type {
  LivestockApplicationPackage,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';
import { speciesGroupToAnimalType } from '@/features/livestock-application/domain/form-profiles';
import { formatLotOrChipDisplay } from '@/features/livestock-application/utils/insured-line-display';
import { resolveSubsidyEligibility } from '@/features/livestock-application/utils/subsidy-eligibility';
import { insuranceProviderLabel } from '@/shared/insurance-providers';

const COAT_OF_ARMS_URL = '/coat_of_arms.png';

/** Brand accents (Solektra) — used sparingly on an official government form. */
const BRAND_BLUE: [number, number, number] = [0, 93, 170];
const BRAND_ORANGE: [number, number, number] = [245, 130, 32];
const INK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [71, 85, 105];
const RULE: [number, number, number] = [203, 213, 225];

/** Space reserved under the top rule for emblem + titles (every page). */
const HEADER_BAND_HEIGHT = 38;

const TABLE_HEADERS = [
  'NO',
  "AMAZINA Y'UMWOROZI",
  'IGITSINA\nGabo/Gore',
  'INDANGAMUNTU / TIN',
  'Telefoni',
  "Nimero ya Lot\n/ Chip",
  "Nimero\ny'ubwishingizi",
  "AGACIRO\nK'AMATUNGO (FRW)",
  "Ikiguzi\ncy'ubwishingizi",
  "Ubwishyu\nbw'umworozi 60%",
  'Nkunganire\nya Leta 40%',
  'UMUKONO',
] as const;

interface ExportRow {
  ownerName: string;
  gender: string;
  nationalId: string;
  phone: string;
  lotOrChip: string;
  policyNumber: string;
  sumAssured: number;
  premiumRate: number;
  farmerContribution: number;
  governmentContribution: number;
}

type JsPdfDoc = InstanceType<typeof import('jspdf').jsPDF>;

function genderLabel(gender?: 'male' | 'female'): string {
  if (gender === 'male') return 'Gabo';
  if (gender === 'female') return 'Gore';
  return '';
}

function policyYearLabel(application: LivestockApplicationPackage): string {
  const start = application.policyStartDate?.slice(0, 4);
  const end = application.policyEndDate?.slice(0, 4);
  if (start && end) return `${start}/${end}`;
  if (start) return start;
  return new Date().getFullYear().toString();
}

function speciesKinyarwanda(group: LivestockSpeciesGroup): string {
  return speciesGroupToAnimalType(group).toUpperCase();
}

function providerDisplayName(application: LivestockApplicationPackage): string {
  const id = application.insuranceProvider;
  if (!id || id === 'SONARWA') return 'SONARWA GENERAL INSURANCE CO LTD';
  return insuranceProviderLabel(id).toUpperCase();
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '';
  return Math.round(value).toLocaleString('en-US');
}

function countGenders(application: LivestockApplicationPackage): { male: number; female: number } {
  const owners =
    application.ownersList?.length
      ? application.ownersList
      : application.primaryOwner
        ? [application.primaryOwner]
        : [];

  let male = 0;
  let female = 0;
  for (const owner of owners) {
    if (owner.gender === 'male') male += 1;
    else if (owner.gender === 'female') female += 1;
  }

  if (male === 0 && female === 0) {
    if (application.ownerGender === 'male') male = 1;
    else if (application.ownerGender === 'female') female = 1;
    else female = Math.max(1, application.lineCount || 1);
  }

  return { male, female };
}

function buildExportRows(application: LivestockApplicationPackage): ExportRow[] {
  const eligibility = resolveSubsidyEligibility(application);
  // Subsidy export must only include animals that need sector signature
  // (no chip code for cattle; all pigs / poultry).
  const sourceLines =
    eligibility.linesMissingTekana.length > 0
      ? eligibility.linesMissingTekana
      : application.speciesGroup === 'CATTLE'
        ? []
        : application.lines;

  return sourceLines.map((line) => ({
    ownerName: line.owner?.name ?? application.primaryOwner?.name ?? application.ownerSummary,
    gender: genderLabel(line.owner?.gender ?? application.primaryOwner?.gender ?? application.ownerGender),
    nationalId:
      line.owner?.nationalId ??
      application.primaryOwner?.nationalId ??
      application.nationalId ??
      '',
    phone: line.owner?.phone ?? application.primaryOwner?.phone ?? '',
    lotOrChip:
      application.speciesGroup === 'CATTLE'
        ? line.animal.chipNumber ?? ''
        : line.lineType === 'LOT'
          ? formatLotOrChipDisplay(line)
          : line.animal.species,
    policyNumber: application.applicationNumber,
    sumAssured: line.sumAssured,
    premiumRate: line.premiumRate,
    farmerContribution: line.farmerContribution,
    governmentContribution: line.governmentContribution,
  }));
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`Failed to read ${url}`));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function pageMetrics(doc: JsPdfDoc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;
  return { pageWidth, pageHeight, marginX, contentWidth };
}

/** Official header: republic title, coat of arms, programme name, Solektra text mark. */
function drawOfficialHeader(doc: JsPdfDoc, coatOfArms: string | null): void {
  const { pageWidth, marginX } = pageMetrics(doc);
  const centerX = pageWidth / 2;

  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.55);
  doc.line(marginX, 5.5, pageWidth - marginX, 5.5);
  doc.setDrawColor(...BRAND_ORANGE);
  doc.setLineWidth(0.3);
  doc.line(marginX, 6.6, pageWidth - marginX, 6.6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text("REPUBLIKA Y'U RWANDA", centerX, 12, { align: 'center' });

  const emblemSize = 16;
  const emblemY = 13.5;
  if (coatOfArms) {
    try {
      doc.addImage(coatOfArms, 'PNG', centerX - emblemSize / 2, emblemY, emblemSize, emblemSize);
    } catch {
      // Continue without emblem if decode fails.
    }
  }

  // Text-only Solektra mark (PNG logo has a black background unsuitable for print)
  // Draw as one continuous word with the brand color split (SO orange + LEKTRA blue).
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const soWidth = doc.getTextWidth('SO');
  const lektraWidth = doc.getTextWidth('LEKTRA');
  const brandStartX = pageWidth - marginX - soWidth - lektraWidth;
  doc.setTextColor(...BRAND_ORANGE);
  doc.text('SO', brandStartX, 12);
  doc.setTextColor(...BRAND_BLUE);
  doc.text('LEKTRA', brandStartX + soWidth, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...MUTED);
  doc.text('Digital Solutions', pageWidth - marginX, 15.5, { align: 'right' });

  const titleY = emblemY + emblemSize + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text("GAHUNDA Y'UBWISHINGIZI BW'AMATUNGO / MINAGRI", centerX, titleY, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Livestock Insurance Subsidy Form (Nkunganire)', centerX, titleY + 3.8, {
    align: 'center',
  });
}

function drawFooter(doc: JsPdfDoc, yearLabel: string, pageNumber: number, pageCount: number): void {
  const { pageWidth, pageHeight, marginX } = pageMetrics(doc);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.line(marginX, pageHeight - 8, pageWidth - marginX, pageHeight - 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Prepared digitally by SOLEKTRA  ·  UMWAKA WA ${yearLabel}`,
    marginX,
    pageHeight - 4.5,
  );
  doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - marginX, pageHeight - 4.5, {
    align: 'right',
  });
}

function drawMetaBlock(
  doc: JsPdfDoc,
  startY: number,
  application: LivestockApplicationPackage,
  genders: { male: number; female: number },
  yearLabel: string,
): number {
  const { marginX, contentWidth } = pageMetrics(doc);
  const location = application.livestockLocation;
  const district = (location?.district ?? '').toUpperCase() || '—';
  const sector = (location?.sector ?? '').toUpperCase() || '—';
  const species = speciesKinyarwanda(application.speciesGroup);
  const provider = providerDisplayName(application);

  const boxY = startY;
  const boxH = 16;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, boxY, contentWidth, boxH, 1.2, 1.2, 'FD');

  const col1 = marginX + 3;
  const col2 = marginX + contentWidth * 0.38;
  const col3 = marginX + contentWidth * 0.78;
  const row1 = boxY + 5;
  const row2 = boxY + 11;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...INK);
  doc.text(`AKARERE: ${district}`, col1, row1);
  doc.text(`UMURENGE: ${sector}`, col1, row2);

  doc.text(`IKIGO CY'UBWISHINGIZI: ${provider}`, col2, row1);
  doc.text(`UBWOKO BW'AMATUNGO: ${species}`, col2, row2);

  doc.text(`Abagabo: ${genders.male}`, col3, row1);
  doc.text(`Abagore: ${genders.female}`, col3, row2);

  const listTitleY = boxY + boxH + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK);
  const listTitle = `LISITI IGARAGAZA ABOROZI BAHAWE UBWISHINGIZI MU BURYO BWA NKUNGANIRE — UMWAKA WA ${yearLabel}`;
  const wrapped = doc.splitTextToSize(listTitle, contentWidth);
  doc.text(wrapped, marginX + contentWidth / 2, listTitleY, { align: 'center' });

  return listTitleY + wrapped.length * 3.4 + 1.5;
}

function drawSignatureBlock(doc: JsPdfDoc, startY: number, coatOfArms: string | null): void {
  const { pageHeight, marginX, contentWidth } = pageMetrics(doc);
  const minBottom = pageHeight - 14;
  let y = startY + 3;

  if (y + 28 > minBottom) {
    doc.addPage();
    drawOfficialHeader(doc, coatOfArms);
    y = HEADER_BAND_HEIGHT + 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text('Imikono / Amazina / Tel', marginX, y);

  y += 5;
  const colW = contentWidth / 3;
  const labels = [
    "Umukozi w'ikigo cy'ubwishingizi",
    "Veterineri w'umurenge",
    "Ubuyobozi bw'umurenge",
  ];

  labels.forEach((label, index) => {
    const x = marginX + index * colW + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...INK);
    doc.text(label, x, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('Amazina: ___________________________', x, y + 7);
    doc.text('Umukono: __________________________', x, y + 13);
    doc.text('Tel: ________________________________', x, y + 19);
  });

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.line(marginX + colW, y - 2, marginX + colW, y + 22);
  doc.line(marginX + 2 * colW, y - 2, marginX + 2 * colW, y + 22);
}

/**
 * Download a professional, branded Nkunganire (livestock subsidy) PDF.
 * Landscape A4; table headers repeat on every page when animal rows overflow.
 */
export async function downloadNkunganireSubsidyPdf(
  application: LivestockApplicationPackage,
): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableMod.default;

  const coatOfArms = await loadImageDataUrl(COAT_OF_ARMS_URL);
  const rows = buildExportRows(application);
  const genders = countGenders(application);
  const yearLabel = policyYearLabel(application);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { marginX } = pageMetrics(doc);

  const body = rows.map((row, index) => [
    String(index + 1),
    row.ownerName || '',
    row.gender,
    row.nationalId,
    row.phone,
    row.lotOrChip,
    row.policyNumber,
    formatAmount(row.sumAssured),
    formatAmount(row.premiumRate),
    formatAmount(row.farmerContribution),
    formatAmount(row.governmentContribution),
    '',
  ]);

  const totals = rows.reduce(
    (acc, row) => ({
      sumAssured: acc.sumAssured + row.sumAssured,
      premiumRate: acc.premiumRate + row.premiumRate,
      farmerContribution: acc.farmerContribution + row.farmerContribution,
      governmentContribution: acc.governmentContribution + row.governmentContribution,
    }),
    { sumAssured: 0, premiumRate: 0, farmerContribution: 0, governmentContribution: 0 },
  );

  const foot = [
    [
      '',
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      formatAmount(totals.sumAssured),
      formatAmount(totals.premiumRate),
      formatAmount(totals.farmerContribution),
      formatAmount(totals.governmentContribution),
      '',
    ],
  ];

  drawOfficialHeader(doc, coatOfArms);
  const tableStartY = drawMetaBlock(doc, HEADER_BAND_HEIGHT, application, genders, yearLabel);

  autoTable(doc, {
    head: [TABLE_HEADERS.map((h) => h)],
    body:
      body.length > 0
        ? body
        : [
            [
              '—',
              'Nta boruzi bahabwa nkunganire kuri iyi application.',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
            ],
          ],
    foot,
    startY: tableStartY,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      cellPadding: 1.35,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: INK,
      lineColor: RULE,
      lineWidth: 0.2,
      minCellHeight: 6.5,
    },
    headStyles: {
      fillColor: BRAND_BLUE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6,
      halign: 'center',
      valign: 'middle',
      cellPadding: 1.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: INK,
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'right',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 36, halign: 'left' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 30, halign: 'left' },
      4: { cellWidth: 20, halign: 'left' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 26, halign: 'left' },
      7: { cellWidth: 24, halign: 'right' },
      8: { cellWidth: 22, halign: 'right' },
      9: { cellWidth: 24, halign: 'right' },
      10: { cellWidth: 24, halign: 'right' },
      11: { cellWidth: 22, halign: 'center' },
    },
    margin: {
      top: HEADER_BAND_HEIGHT + 2,
      left: marginX,
      right: marginX,
      bottom: 12,
    },
    showHead: 'everyPage',
    showFoot: 'lastPage',
    didDrawPage: () => {
      const pageNumber = doc.getCurrentPageInfo().pageNumber;
      if (pageNumber > 1) {
        drawOfficialHeader(doc, coatOfArms);
      }
    },
  });

  const lastTable = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  const finalY = lastTable?.finalY ?? 160;
  doc.setPage(doc.getNumberOfPages());
  drawSignatureBlock(doc, finalY + 2, coatOfArms);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    drawFooter(doc, yearLabel, i, pageCount);
  }

  const filename = `${application.applicationNumber}-nkunganire.pdf`;
  doc.save(filename);
}
