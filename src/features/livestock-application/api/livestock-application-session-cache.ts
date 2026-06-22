const CACHE_KEY = 'ezinsure.livestock.applications';

function readCache(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota errors */
  }
}

/** Merge list rows into session cache (keyed by application _id). */
export function cacheLivestockApplicationRows(rows: unknown[]): void {
  if (!rows.length) return;
  const cache = readCache();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const id = String((row as { _id?: string })._id ?? '').trim();
    if (id) cache[id] = row;
  }
  writeCache(cache);
}

export function getCachedLivestockApplicationRow(applicationId: string): unknown | null {
  const cache = readCache();
  return cache[applicationId] ?? null;
}

/** Patch fields on a cached list row after a workflow action (e.g. payment proof upload). */
export function patchCachedLivestockApplicationRow(
  applicationId: string,
  patch: Record<string, unknown>,
): void {
  const cache = readCache();
  const existing = cache[applicationId];
  if (!existing || typeof existing !== 'object') return;
  cache[applicationId] = { ...(existing as Record<string, unknown>), ...patch };
  writeCache(cache);
}

/** @deprecated Use cacheLivestockApplicationRows */
export const cacheVetApplicationRows = cacheLivestockApplicationRows;

/** @deprecated Use getCachedLivestockApplicationRow */
export const getCachedVetApplicationRow = getCachedLivestockApplicationRow;
