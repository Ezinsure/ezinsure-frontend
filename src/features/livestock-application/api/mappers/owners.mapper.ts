import type {
  InsuredLinePayload,
  LivestockApplicationPackage,
} from '@/features/livestock-application/domain/application-types';
import { mapApiLineRecord } from '@/features/livestock-application/api/mappers/line.mapper';
import {
  normalizeOwnerRecord,
  type NormalizedOwnerFields,
} from '@/features/livestock-application/api/mappers/owner-fields';
import { mapPaidStatus } from '@/features/livestock-application/api/mappers/status.mapper';

export type ResolvedOwner = NormalizedOwnerFields;

export function resolvePackagePrimaryOwner(
  record: Record<string, unknown>,
): ResolvedOwner | undefined {
  const owner = record.owner;
  if (!owner || typeof owner !== 'object') return undefined;
  return normalizeOwnerRecord(owner as Record<string, unknown>) ?? undefined;
}

export function resolvePackageOwnersList(record: Record<string, unknown>): ResolvedOwner[] {
  if (!Array.isArray(record.owners)) return [];
  const owners: ResolvedOwner[] = [];
  for (const item of record.owners) {
    const normalized = normalizeOwnerRecord(item as Record<string, unknown>);
    if (normalized) owners.push(normalized);
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
        ...(owner
          ? {
              owner: {
                ...(owner.id ? { id: owner.id } : {}),
                name: owner.name,
                phone: owner.phone,
                ...(owner.nationalId ? { nationalId: owner.nationalId } : {}),
                ...(owner.gender ? { gender: owner.gender } : {}),
              },
            }
          : {}),
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

function pickNonemptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return undefined;
}

/** Root `proofOfPayment` URL or latest entry in `paymentProofs[]`. */
export function resolvePaymentProofDocumentUrl(
  record: Record<string, unknown>,
): string | undefined {
  const proofs = Array.isArray(record.paymentProofs) ? record.paymentProofs : [];
  const latest = proofs.length > 0 ? (proofs[proofs.length - 1] as Record<string, unknown>) : null;

  return pickNonemptyString(
    record.proofOfPayment,
    record.proofOfPaymentUrl,
    latest?.documentUrl,
    latest?.proofOfPayment,
    latest?.url,
  );
}

export function mapPaymentProofFromRecord(
  record: Record<string, unknown>,
  expectedAmount: number,
): LivestockApplicationPackage['paymentProof'] {
  const proofs = Array.isArray(record.paymentProofs) ? record.paymentProofs : [];
  const latest = proofs.length > 0 ? (proofs[proofs.length - 1] as Record<string, unknown>) : null;
  const documentUrl = resolvePaymentProofDocumentUrl(record);
  const appStatus = String(record.status ?? '').toUpperCase();

  let statusSource: string | undefined;
  if (latest?.status) {
    statusSource = String(latest.status);
  } else if (documentUrl || appStatus === 'PAYMENT_PROOF_SUBMITTED') {
    const paid = String(record.paidStatus ?? '').toUpperCase();
    statusSource =
      paid === 'VERIFIED' || appStatus === 'PAYMENT_VERIFIED' ? 'VERIFIED' : 'SUBMITTED';
  } else {
    statusSource = pickNonemptyString(record.paidStatus, record.paymentProofStatus);
  }

  return {
    status: mapPaidStatus(String(statusSource ?? '')),
    expectedAmount,
    documentUrl,
    transactionId: pickNonemptyString(
      latest?.transactionId,
      record.transactionId,
      record.paymentTransactionId,
    ),
    submittedAt: latest?.submittedAt ? String(latest.submittedAt) : undefined,
    verifiedAt: latest?.verifiedAt ? String(latest.verifiedAt) : undefined,
  };
}
