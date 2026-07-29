/**
 * Maps raw API / server error strings to user-facing copy for the livestock module.
 */

const PAYMENT_PROOF_FALLBACK =
  'We could not upload your payment proof. Please check the file (JPG, PNG, or PDF), transaction ID, and amount, then try again.';

const GENERAL_FALLBACK = 'Something went wrong. Please try again or contact support if the problem continues.';

function isTechnicalServerMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /is not defined/.test(m) ||
    /referenceerror/.test(m) ||
    /typeerror/.test(m) ||
    /cannot read propert/.test(m) ||
    /unexpected token/.test(m) ||
    /internal server error/.test(m) ||
    /^request failed \(\d+\)$/.test(m)
  );
}

const MESSAGE_REWRITES: Array<{ test: RegExp; message: string }> = [
  {
    test: /filetype is not defined/i,
    message:
      'The server could not read the file type for your receipt. Please upload a JPG, PNG, or PDF and try again. If this keeps happening, ask your administrator to check the upload endpoint.',
  },
  {
    test: /multipart|form-data|unexpected field|multer/i,
    message:
      'The upload format was not accepted by the server. Please use a JPG, PNG, or PDF file and try again.',
  },
  {
    test: /file too large|payload too large|entity too large/i,
    message: 'This file is too large. Please upload a smaller image or PDF (under 10 MB).',
  },
  {
    test: /invalid file|unsupported file|file type|mimetype|mime type/i,
    message: 'This file type is not supported. Please upload a JPG, PNG, or PDF receipt.',
  },
  {
    test: /transaction/i,
    message: 'Please enter a valid transaction ID or payment reference and try again.',
  },
  {
    test: /amount|farmer|contribution|60%/i,
    message:
      'The amount does not match the expected farmer contribution. Please verify the figure and try again.',
  },
  {
    test: /unauthorized|forbidden|not allowed|permission/i,
    message: 'You do not have permission to upload payment proof for this application.',
  },
  {
    test: /not found|does not exist/i,
    message: 'This application could not be found. Refresh the page and try again.',
  },
  {
    test: /network|failed to fetch|timeout/i,
    message: 'Network error. Check your connection and try again.',
  },
];

export type LivestockErrorContext =
  | 'payment-proof'
  | 'issue-insurance'
  | 'subsidy-upload'
  | 'sonarwa-review'
  | 'commission-approve'
  | 'commission-paid'
  | 'application-detail'
  | 'list'
  | 'create'
  | 'general';

function fallbackForContext(context: LivestockErrorContext): string {
  if (context === 'payment-proof') return PAYMENT_PROOF_FALLBACK;
  if (context === 'issue-insurance') {
    return 'We could not issue insurance. Please check the certificate file and try again.';
  }
  if (context === 'subsidy-upload') {
    return 'We could not upload the signed nkunganire document. Please check the file and try again.';
  }
  if (context === 'sonarwa-review') {
    return 'We could not complete the SONARWA review. Please try again.';
  }
  if (context === 'commission-approve') {
    return 'We could not approve the commission. Please try again.';
  }
  if (context === 'commission-paid') {
    return 'We could not mark the commission as paid. Please try again.';
  }
  if (context === 'application-detail') {
    return 'We could not load this application. Please refresh and try again.';
  }
  if (context === 'list') return 'We could not load applications. Please refresh or widen the date range.';
  if (context === 'create') return 'We could not submit the application. Please review the form and try again.';
  return GENERAL_FALLBACK;
}

export function humanizeLivestockApiError(
  raw: string | undefined | null,
  options?: { context?: LivestockErrorContext; status?: number },
): string {
  const context = options?.context ?? 'general';
  const status = options?.status;

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (status === 404) {
    if (context === 'payment-proof') {
      return 'This application was not found. Refresh the list and try again.';
    }
    if (context === 'application-detail') {
      return 'This application was not found. It may have been removed or you may not have access.';
    }
    return 'The requested record was not found.';
  }
  if (status === 409) {
    return 'This action is not allowed for the current application status. Refresh the page and try again.';
  }
  if (status === 422) {
    return 'This application does not meet the requirements for this step. Refresh and review the workflow status.';
  }
  if (status === 413) {
    return 'This file is too large. Please upload a smaller JPG, PNG, or PDF.';
  }
  if (status && status >= 500) {
    return context === 'payment-proof'
      ? 'The server had trouble saving your payment proof. Please try again in a few minutes or contact support.'
      : 'The server is temporarily unavailable. Please try again shortly.';
  }

  const trimmed = (raw ?? '').trim();
  if (!trimmed) return fallbackForContext(context);

  for (const { test, message } of MESSAGE_REWRITES) {
    if (test.test(trimmed)) return message;
  }

  if (isTechnicalServerMessage(trimmed)) {
    return fallbackForContext(context);
  }

  if (trimmed.length <= 200 && !trimmed.includes(' at ') && !trimmed.includes('stack')) {
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  }

  return fallbackForContext(context);
}

export function resolvePaymentProofFileType(file: File): string {
  const mime = file.type?.trim().toLowerCase();
  if (mime && mime !== 'application/octet-stream') return mime;

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';

  return mime || 'application/octet-stream';
}
