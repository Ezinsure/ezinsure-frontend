import { ApplicationStatus } from '@/features/admin-motor-applications/types';
import type { Application } from '@/features/admin-motor-applications/types';
import {
  getApplicationPerformedByKind,
  type ApplicationPerformedByFields,
} from '@/utils/application-performed-by-filter';
import type {
  PlateLookupApplicationRow,
  PlateLookupPerformer,
  PlateLookupPerformerKind,
  PlateLookupResult,
  PlateLookupStats,
  PlateLookupVehicleMeta,
} from './types';

const PAID_STATUSES = new Set<string>([
  ApplicationStatus.PAYMENT_VERIFIED,
  ApplicationStatus.INSURANCE_ISSUED,
]);

/** Trim leading/trailing whitespace only — preserve spaces inside the plate. */
export function normalizePlateNumber(value: string): string {
  return value.trim().toUpperCase();
}

export function parseAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function extractRoot(payload: unknown): Record<string, unknown> {
  const root = asRecord(payload);
  const data = root.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return asRecord(data);
  }
  return root;
}

function extractApplicationRows(payload: unknown): unknown[] {
  const root = extractRoot(payload);
  if (Array.isArray(root.applications)) return root.applications;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.data)) return root.data;

  const nested = asRecord(root.data);
  if (Array.isArray(nested.applications)) return nested.applications;
  if (Array.isArray(nested.items)) return nested.items;

  if (Array.isArray(payload)) return payload;
  return [];
}

function performerLabel(kind: PlateLookupPerformerKind): string {
  switch (kind) {
    case 'admin':
      return 'Admin';
    case 'agent':
      return 'Agent';
    default:
      return 'Client';
  }
}

function resolvePerformedBy(raw: Record<string, unknown>): PlateLookupPerformer {
  const nested = asRecord(raw.performedBy);
  const nestedKind = String(nested.kind ?? nested.type ?? '').toLowerCase();
  if (
    nestedKind === 'admin' ||
    nestedKind === 'agent' ||
    nestedKind === 'client'
  ) {
    const name = String(nested.name ?? nested.fullName ?? '').trim();
    return {
      kind: nestedKind,
      name:
        name ||
        (nestedKind === 'client' ? 'Self-service' : performerLabel(nestedKind)),
    };
  }

  const fields: ApplicationPerformedByFields = {
    admin: (raw.admin as ApplicationPerformedByFields['admin']) ?? null,
    agent: (raw.agent as ApplicationPerformedByFields['agent']) ?? null,
  };
  const kind = getApplicationPerformedByKind(fields);
  if (kind === 'admin') {
    return {
      kind: 'admin',
      name: String(fields.admin?.fullName ?? 'Admin').trim() || 'Admin',
    };
  }
  if (kind === 'agent') {
    return {
      kind: 'agent',
      name: String(fields.agent?.fullName ?? 'Agent').trim() || 'Agent',
    };
  }
  return { kind: 'client', name: 'Self-service' };
}

function resolveVehicleMeta(
  payload: unknown,
  rows: PlateLookupApplicationRow[],
): PlateLookupVehicleMeta | undefined {
  const root = extractRoot(payload);
  const vehicle = asRecord(root.vehicle);
  if (Object.keys(vehicle).length > 0) {
    return {
      vehicleType: vehicle.vehicleType
        ? String(vehicle.vehicleType)
        : undefined,
      chasisNumber: vehicle.chasisNumber
        ? String(vehicle.chasisNumber)
        : vehicle.chassisNumber
          ? String(vehicle.chassisNumber)
          : undefined,
      vehicleUse: vehicle.vehicleUse ? String(vehicle.vehicleUse) : undefined,
    };
  }

  const fromRow = rows[0]?.application?.vehicle;
  if (!fromRow) return undefined;
  return {
    vehicleType: fromRow.vehicleType || undefined,
    chasisNumber: fromRow.chasisNumber || undefined,
    vehicleUse: fromRow.vehicleUse || undefined,
  };
}

function buildApplicationStub(
  record: Record<string, unknown>,
  performedBy: PlateLookupPerformer,
  plateNumber: string,
): Application {
  const client = asRecord(record.client);
  const vehicle = asRecord(record.vehicle);
  const admin =
    performedBy.kind === 'admin'
      ? { _id: '', fullName: performedBy.name }
      : (record.admin as Application['admin']) ?? null;
  const agent =
    performedBy.kind === 'agent'
      ? { _id: '', fullName: performedBy.name }
      : (record.agent as Application['agent']) ?? null;

  return {
    ...(record as unknown as Application),
    _id: String(record._id ?? record.id ?? ''),
    applicationNumber: String(
      record.applicationNumber ?? record.application_number ?? '—',
    ),
    insuranceCategory: String(record.insuranceCategory ?? '—'),
    insuranceType: String(record.insuranceType ?? ''),
    insuranceDuration: String(record.insuranceDuration ?? ''),
    status: String(record.status ?? ''),
    amount: parseAmount(record.amount),
    netPremium: parseAmount(
      record.netPremium !== undefined && record.netPremium !== null
        ? record.netPremium
        : 0,
    ),
    policeNumber:
      record.policeNumber != null
        ? String(record.policeNumber)
        : undefined,
    submittedAt: String(record.submittedAt ?? record.submitted_at ?? ''),
    admin,
    agent,
    client: {
      _id: String(client._id ?? ''),
      fullName: String(
        client.fullName ?? record.fullName ?? record.clientName ?? '—',
      ).trim(),
      email: String(client.email ?? record.email ?? ''),
      phoneNumber: String(client.phoneNumber ?? record.phoneNumber ?? ''),
      dateOfBirth: String(client.dateOfBirth ?? ''),
      address: String(client.address ?? ''),
      nationalID: String(client.nationalID ?? ''),
      identificationDocumentType: String(
        client.identificationDocumentType ?? '',
      ),
      identificationNumber: String(client.identificationNumber ?? ''),
      province: String(client.province ?? ''),
      district: String(client.district ?? ''),
      sector: String(client.sector ?? ''),
      createdAt: String(client.createdAt ?? ''),
    },
    vehicle: {
      _id: String(vehicle._id ?? ''),
      clientId: String(vehicle.clientId ?? ''),
      vehicleType: String(vehicle.vehicleType ?? record.vehicleType ?? ''),
      vehicleAge: String(vehicle.vehicleAge ?? record.vehicleAge ?? ''),
      plateNumber: String(
        vehicle.plateNumber ?? record.plateNumber ?? plateNumber,
      ),
      chasisNumber: String(
        vehicle.chasisNumber ??
          vehicle.chassisNumber ??
          record.chasisNumber ??
          '',
      ),
      vehicleUse: String(vehicle.vehicleUse ?? record.vehicleUse ?? ''),
      otherVehicleUse: String(
        vehicle.otherVehicleUse ?? record.otherVehicleUse ?? '',
      ),
      createdAt: String(vehicle.createdAt ?? ''),
    },
  };
}

export function normalizePlateLookupApplication(
  raw: unknown,
  plateNumber: string,
): PlateLookupApplicationRow {
  const record = asRecord(raw);
  const performedBy = resolvePerformedBy(record);
  const client = asRecord(record.client);
  const application = buildApplicationStub(record, performedBy, plateNumber);

  return {
    _id: String(record._id ?? record.id ?? ''),
    applicationNumber: String(
      record.applicationNumber ?? record.application_number ?? '—',
    ),
    submittedAt: String(record.submittedAt ?? record.submitted_at ?? ''),
    status: String(record.status ?? ''),
    insuranceCategory: String(record.insuranceCategory ?? '—'),
    amount: parseAmount(record.amount),
    netPremium: parseAmount(
      record.netPremium !== undefined && record.netPremium !== null
        ? record.netPremium
        : 0,
    ),
    policeNumber:
      record.policeNumber != null && String(record.policeNumber).trim()
        ? String(record.policeNumber)
        : undefined,
    clientName: String(
      client.fullName ?? record.fullName ?? record.clientName ?? '—',
    ).trim(),
    performedBy,
    application,
  };
}

export function isPaidApplicationStatus(status: string): boolean {
  return PAID_STATUSES.has(String(status).toLowerCase());
}

export function computeStatsFromApplications(
  applications: PlateLookupApplicationRow[],
): PlateLookupStats {
  return {
    applicationCount: applications.length,
    totalNetPremium: applications.reduce((sum, app) => sum + app.netPremium, 0),
    totalAmountPaid: applications.reduce((sum, app) => {
      if (!isPaidApplicationStatus(app.status)) return sum;
      return sum + app.amount;
    }, 0),
  };
}

function readStatsFromPayload(
  payload: unknown,
  fallback: PlateLookupStats,
): PlateLookupStats {
  const root = extractRoot(payload);
  const stats = asRecord(root.stats);

  const applicationCount = Number(
    stats.applicationCount ??
      root.applicationCount ??
      root.totalApplications ??
      fallback.applicationCount,
  );
  const totalNetPremium = parseAmount(
    stats.totalNetPremium ?? root.totalNetPremium ?? fallback.totalNetPremium,
  );
  const totalAmountPaid = parseAmount(
    stats.totalAmountPaid ??
      root.totalAmountPaid ??
      stats.totalPaid ??
      fallback.totalAmountPaid,
  );

  return {
    applicationCount: Number.isFinite(applicationCount)
      ? applicationCount
      : fallback.applicationCount,
    totalNetPremium,
    totalAmountPaid,
  };
}

export function parsePlateLookupResponse(
  payload: unknown,
  query: { plateNumber: string; startDate: string; endDate: string },
): PlateLookupResult {
  const root = extractRoot(payload);
  const plateNumber =
    normalizePlateNumber(
      String(root.plateNumber ?? query.plateNumber ?? ''),
    ) || query.plateNumber;

  const applications = extractApplicationRows(payload).map((row) =>
    normalizePlateLookupApplication(row, plateNumber),
  );
  const fallbackStats = computeStatsFromApplications(applications);

  return {
    plateNumber,
    startDate: String(root.startDate ?? query.startDate),
    endDate: String(root.endDate ?? query.endDate),
    vehicle: resolveVehicleMeta(payload, applications),
    stats: readStatsFromPayload(payload, fallbackStats),
    applications,
  };
}
