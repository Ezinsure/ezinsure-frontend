/**
 * Serves the official commission claim forms shipped in `public/templates/`.
 * Vets fill these in and admins upload them back, so the downloaded file must
 * be the untouched original rather than a generated look-alike.
 */

import type { ClaimFormLanguage } from '../commission-sheet-schema';

type ClaimFormTemplate = {
  language: ClaimFormLanguage;
  /** Button label in the UI. */
  label: string;
  /** Path under `public/`. */
  path: string;
  /** File name suggested to the browser. */
  downloadName: string;
};

/** Kinyarwanda is the primary form; English is offered as an alternative. */
export const CLAIM_FORM_TEMPLATES: Record<ClaimFormLanguage, ClaimFormTemplate> = {
  rw: {
    language: 'rw',
    label: 'Kinyarwanda',
    path: "/templates/Ifishi_yo_Gusaba_Komisiyo_y'ubwishingizibw'amatungo_Final.xlsx",
    downloadName: "Ifishi_yo_gusaba_Komisiyo_y'ubwishingizi_bw'amatungo.xlsx",
  },
  en: {
    language: 'en',
    label: 'English',
    path: '/templates/Commission_Claim_Form_Vet_English_Vestion_Excel_Final_last.xlsx',
    downloadName: 'Commission_Claim_Form_Vet_English.xlsx',
  },
};

async function downloadStaticFile(template: ClaimFormTemplate): Promise<void> {
  const response = await fetch(encodeURI(template.path));
  if (!response.ok) {
    throw new Error(
      `Could not load the ${template.label} claim form (${response.status})`,
    );
  }

  const url = URL.createObjectURL(await response.blob());
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = template.downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadCommissionClaimForm(
  language: ClaimFormLanguage,
): Promise<void> {
  await downloadStaticFile(CLAIM_FORM_TEMPLATES[language]);
}
