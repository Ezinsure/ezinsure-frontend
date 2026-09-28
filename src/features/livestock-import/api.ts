import type { TekanaMassUploadResponse } from '@/features/livestock-import/types';

/** Temporary hardcoded uploader until admin-scoped agentId is wired from auth. */
const TEKANA_IMPORT_AGENT_ID = '6a09bce4c4d7aef1df01b91a';

type ApiFetch = (path: string, options?: RequestInit) => Promise<Response>;

export async function uploadTekanaVeterinaryApplications(
  apiFetch: ApiFetch,
  file: File,
): Promise<TekanaMassUploadResponse> {
  const body = new FormData();
  body.append('file', file);

  const response = await apiFetch(
    `/massVeterinaryApplicationsUpload?agentId=${encodeURIComponent(TEKANA_IMPORT_AGENT_ID)}`,
    {      method: 'POST',
      body,
    },
  );

  let payload: unknown = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const p = payload as { message?: string; error?: string };
    throw new Error(p.message || p.error || `Upload failed (${response.status})`);
  }

  return payload as TekanaMassUploadResponse;
}
