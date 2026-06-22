import type {
  InsuredLinePayload,
  LivestockApplicationPackage,
} from '@/features/livestock-application/domain/application-types';
import { mapApiLineRecord } from '@/features/livestock-application/api/mappers/line.mapper';
import { mapPaidStatus } from '@/features/livestock-application/api/mappers/status.mapper';

export interface ResolvedOwner {
  id?: string;
  name: string;
  phone: string;
}

export function resolvePackagePrimaryOwner(
  record: Record<string, unknown>,
): ResolvedOwner | undefined {
  const owner = record.owner as { _id?: string; name?: string; phone?: string } | null | undefined;
  if (!owner || typeof owner !== 'object') return undefined;
  const name = String(owner.name ?? '').trim();
  if (!name) return undefined;
  return {
    id: owner._id ? String(owner._id) : undefined,
    name,
    phone: String(owner.phone ?? '').trim(),
  };
}

export function resolvePackageOwnersList(record: Record<string, unknown>): ResolvedOwner[] {
  if (!Array.isArray(record.owners)) return [];
  const owners: ResolvedOwner[] = [];
  for (const item of record.owners) {
    const owner = item as { _id?: string; name?: string; phone?: string };
    const name = String(owner.name ?? '').trim();
    if (!name) continue;
    owners.push({
      id: owner._id ? String(owner._id) : undefined,
      name,
      phone: String(owner.phone ?? '').trim(),
    });
  }
  return owners;
}

export function buildOwnerLookup(record: Record<string, unknown>): Map<string, ResolvedOwner> {
  const map = new Map<string, ResolvedOwner>();
  for (const owner of resolvePackageOwnersList(record)) {
    if (owner.id) map.set(owner.id, owner);
  }
  const primary = resolvePackagePrimaryOwner(record);
  if (primary?.id) map.set(primary.id, primary);
  return map;
}

export function resolveOwnerSummaryFromRecord(
  record: Record<string, unknown>,
  locationSummary: string,
): string {
  const ownerMode = String(record.ownerMode ?? '');

  const primary = resolvePackagePrimaryOwner(record);
  if (ownerMode !== 'MULTI_OWNER' && primary?.name) {
    return primary.name;
  }

  const owners = resolvePackageOwnersList(record);
  if (owners.length === 1) return owners[0].name;
  if (owners.length > 1) return `${owners.length} owners`;

  const animals = Array.isArray(record.animals) ? record.animals : [];
  const ownerIds = new Set(
    animals
      .map((animal) => String((animal as { ownerId?: string }).ownerId ?? '').trim())
      .filter(Boolean),
  );
  if (ownerIds.size > 1) return `${ownerIds.size} owners`;

  if (ownerMode === 'MULTI_OWNER') return 'Multiple owners';

  const explicit = String(record.ownerSummary ?? record.ownerName ?? '').trim();
  if (explicit) return explicit;

  return locationSummary !== '—' ? locationSummary : '—';
}

export function countInsuredLines(record: Record<string, unknown>): number {
  if (Array.isArray(record.animals)) return record.animals.length;
  if (Array.isArray(record.lines)) return record.lines.length;
  return 0;
}

export function mapInsuredLinesFromRecord(record: Record<string, unknown>): InsuredLinePayload[] {
  const animals = Array.isArray(record.animals) ? record.animals : [];
  if (animals.length > 0) {
    const lookup = buildOwnerLookup(record);
    const primary = resolvePackagePrimaryOwner(record);
    const isSingleOwner = record.ownerMode !== 'MULTI_OWNER';

    return animals.map((item) => {
      const animal = item as Record<string, unknown>;
      const ownerId = String(animal.ownerId ?? '').trim();
      const owner =
        (ownerId ? lookup.get(ownerId) : undefined) ??
        (isSingleOwner ? primary : undefined);

      return mapApiLineRecord({
        ...animal,
        ...(owner ? { owner: { name: owner.name, phone: owner.phone } } : {}),
      });
    });
  }

  if (Array.isArray(record.lines)) {
    return (record.lines as unknown[]).map((line) =>
      mapApiLineRecord(line as Record<string, unknown>),
    );
  }

  return [];
}

export function mapPaymentProofFromRecord(
  record: Record<string, unknown>,
  expectedAmount: number,
): LivestockApplicationPackage['paymentProof'] {
  const proofs = Array.isArray(record.paymentProofs) ? record.paymentProofs : [];
  const latest = proofs.length > 0 ? (proofs[proofs.length - 1] as Record<string, unknown>) : null;

  return {
    status: mapPaidStatus(
      String(latest?.status ?? record.paidStatus ?? record.paymentProofStatus ?? ''),
    ),
    expectedAmount,
    documentUrl: latest?.documentUrl ? String(latest.documentUrl) : undefined,
    transactionId: latest?.transactionId ? String(latest.transactionId) : undefined,
    submittedAt: latest?.submittedAt ? String(latest.submittedAt) : undefined,
    verifiedAt: latest?.verifiedAt ? String(latest.verifiedAt) : undefined,
  };
}
