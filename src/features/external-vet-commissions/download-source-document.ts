/**
 * Authenticated download of the original commission request form.
 *
 * Prefer `GET /batches/:id/sourceDocument` (Bearer) so Cloudinary raw /
 * authenticated assets are not fetched cross-origin from the browser.
 * Falls back to a public `sourceDocumentUrl` when the dedicated endpoint
 * is missing (404) or the caller's role is not yet ACL'd (401/403).
 */

import { EXTERNAL_VET_COMMISSION_ENDPOINTS } from './endpoints';

export type DownloadSourceDocumentInput = {
  batchId: string;
  /** Display / save-as name (…xlsx / …pdf). */
  fileName: string;
  /** Legacy public CDN URL when the stream endpoint is missing or denied. */
  fallbackUrl?: string;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
};

function resolveDownloadFileName(
  documentName: string,
  fallback?: string,
): string {
  const named = (documentName || fallback || 'commission-request-form').trim();
  if (/\.[a-z0-9]{2,5}$/i.test(named)) return named;
  const fromFallback = (fallback || '').trim();
  if (/\.[a-z0-9]{2,5}$/i.test(fromFallback)) return fromFallback;
  return `${named || 'commission-request-form'}.xlsx`;
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function downloadFromUrl(url: string, fileName: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const blob = await response.blob();
  triggerBlobDownload(blob, fileName);
}

async function tryFallbackDownload(
  fallbackUrl: string | undefined,
  fileName: string,
): Promise<'fallback'> {
  const fallback = fallbackUrl?.trim();
  if (!fallback) {
    throw new Error(
      'Original document is not available. Ask the backend team to grant your role access to GET /batches/:id/sourceDocument (SONARWA, admin, finance, and the owning vet).',
    );
  }

  try {
    await downloadFromUrl(fallback, fileName);
    return 'fallback';
  } catch {
    window.open(fallback, '_blank', 'noopener,noreferrer');
    throw new Error(
      'Opened the file in a new tab. If download still fails, the Cloudinary asset needs a signed/authenticated delivery URL from the backend.',
    );
  }
}

/**
 * Download the original commission request form for a batch.
 * @returns `'stream' | 'signed' | 'fallback'` describing which path succeeded.
 */
export async function downloadBatchSourceDocument(
  input: DownloadSourceDocumentInput,
): Promise<'stream' | 'signed' | 'fallback'> {
  const fileName = resolveDownloadFileName(input.fileName);
  const path = EXTERNAL_VET_COMMISSION_ENDPOINTS.downloadSourceDocument(
    input.batchId,
  );

  const response = await input.apiFetch(path, { method: 'GET' });

  if (response.ok) {
    const contentType = response.headers.get('content-type') || '';

    // JSON contract: `{ data: { url } }` or `{ url }` — short-lived signed URL.
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as Record<string, unknown>;
      const nested =
        payload.data && typeof payload.data === 'object'
          ? (payload.data as Record<string, unknown>)
          : payload;
      const signedUrl =
        nested.url ?? nested.downloadUrl ?? nested.sourceDocumentUrl;
      if (typeof signedUrl === 'string' && signedUrl.trim()) {
        await downloadFromUrl(signedUrl.trim(), fileName);
        return 'signed';
      }
      throw new Error('Document endpoint returned JSON without a download URL');
    }

    const blob = await response.blob();
    triggerBlobDownload(blob, fileName);
    return 'stream';
  }

  // Missing endpoint, or role ACL not yet granted (common for SONARWA) —
  // fall back to the batch's stored document URL when present.
  if (
    response.status === 404 ||
    response.status === 401 ||
    response.status === 403
  ) {
    return tryFallbackDownload(input.fallbackUrl, fileName);
  }

  let message = `Download failed (${response.status})`;
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    message = body.message || body.error || message;
  } catch {
    // ignore
  }
  throw new Error(message);
}

export { resolveDownloadFileName };
