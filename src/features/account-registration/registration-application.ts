import {
  VETERINARY_ROLE,
  isVeterinaryRole,
  normalizeRole,
} from '@/shared/utils/role';
import type { RegistrationAccountType } from './types';

/**
 * Canonical model for a public agent/vet registration application.
 *
 * The public apply/track/update endpoints are not perfectly consistent: some
 * responses omit `role`, nest the record under `agent`/`veterinary`, or return
 * document URLs under legacy keys. Every surface (status view, edit modal,
 * update payload) reads this normalized shape instead of raw API fields so the
 * role-specific document set can never drift between screens.
 */
export type RegistrationApplication = {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  province?: string;
  district?: string;
  sector?: string;
  status: string;
  /** Always resolved — never undefined after normalization. */
  role: RegistrationAccountType;
  veterinaryType?: string;
  bankName?: string;
  bankAccountNumber?: string;
  nationalIdDocument?: string;
  criminalRecordCertificate?: string;
  rcvdLicenceDocument?: string;
  passportPhoto?: string;
  emergencyContacts: RegistrationEmergencyContact[];
  createdAt: string;
  submittedAt?: string;
  rejectionReason?: string;
};

export type RegistrationEmergencyContact = {
  fullName: string;
  phoneNumber: string;
  relationship: string;
};

export type RegistrationDocumentId =
  | 'nationalIdDocument'
  | 'criminalRecordCertificate'
  | 'rcvdLicenceDocument'
  | 'passportPhoto';

export type RegistrationDocumentField = {
  id: RegistrationDocumentId;
  label: string;
  /** Shown as the helper line on status cards and upload fields. */
  description: string;
  accept: string;
  required: boolean;
};

const NATIONAL_ID_FIELD: RegistrationDocumentField = {
  id: 'nationalIdDocument',
  label: 'National ID',
  description: 'Identification document',
  accept: '.pdf,.jpg,.jpeg,.png',
  required: true,
};

const CRIMINAL_RECORD_FIELD: RegistrationDocumentField = {
  id: 'criminalRecordCertificate',
  label: 'Criminal Record Certificate',
  description: 'Certificate',
  accept: '.pdf,.jpg,.jpeg,.png',
  required: true,
};

const RCVD_LICENCE_FIELD: RegistrationDocumentField = {
  id: 'rcvdLicenceDocument',
  label: 'RCVD Licence',
  description: 'Veterinary licence',
  accept: '.pdf,.jpg,.jpeg,.png',
  required: true,
};

const PASSPORT_PHOTO_FIELD: RegistrationDocumentField = {
  id: 'passportPhoto',
  label: 'Passport Photo',
  description: 'Recent photo',
  accept: '.jpg,.jpeg,.png',
  required: true,
};

/** Vet-only document keys — presence of any is strong evidence of a vet record. */
const VETERINARY_ONLY_DOCUMENT_IDS: RegistrationDocumentId[] = [
  'rcvdLicenceDocument',
];

/**
 * Single source of truth for the documents a role must provide. Apply, status,
 * and RFA edit all render from this list, so vets can never be shown the agent
 * criminal-record field (or vice versa).
 */
export function registrationDocumentFields(
  role: RegistrationAccountType | string | undefined,
): RegistrationDocumentField[] {
  const licence = isVeterinaryRole(String(role ?? ''))
    ? RCVD_LICENCE_FIELD
    : CRIMINAL_RECORD_FIELD;
  return [NATIONAL_ID_FIELD, licence, PASSPORT_PHOTO_FIELD];
}

export function registrationDocumentUrl(
  application: Pick<RegistrationApplication, RegistrationDocumentId>,
  id: RegistrationDocumentId,
): string | undefined {
  const value = application[id];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Last path segment of a stored document URL, used to prefill upload fields. */
export function registrationDocumentFileName(
  url: string | undefined,
): string | undefined {
  if (!url?.trim()) return undefined;
  const withoutQuery = url.split('?')[0] ?? url;
  return withoutQuery.split('/').pop() || undefined;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function firstString(
  row: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = asOptionalString(row[key]);
    if (value) return value;
  }
  return undefined;
}

/**
 * Flatten the response envelope. Different endpoints return the record at the
 * root, under `data`, or nested under `agent`/`veterinary`/`application`, and
 * may group files under `documents`/`files`.
 */
function flattenApplicationRecord(raw: unknown): Record<string, unknown> {
  const root = asRecord(raw);
  if (!root) return {};

  // Outer fields always win; nested envelopes and document groups fill gaps.
  let row: Record<string, unknown> = { ...root };
  for (const key of [
    'data',
    'application',
    'agent',
    'veterinary',
    'vet',
    'user',
    'documents',
    'files',
    'attachments',
  ]) {
    const nested = asRecord(row[key]);
    if (nested) row = { ...nested, ...row };
  }

  return row;
}

const DOCUMENT_ALIASES: Record<RegistrationDocumentId, string[]> = {
  nationalIdDocument: [
    'nationalIdDocument',
    'nationalIDDocument',
    'nationalId',
    'nationalID',
    'idDocument',
  ],
  criminalRecordCertificate: [
    'criminalRecordCertificate',
    'criminalRecordDocument',
    'criminalRecord',
    'policeClearance',
  ],
  rcvdLicenceDocument: [
    'rcvdLicenceDocument',
    'rcvdLicenseDocument',
    'rcvdLicence',
    'rcvdLicense',
    'rcvdDocument',
    'licenceDocument',
    'licenseDocument',
    'veterinaryLicence',
    'veterinaryLicense',
  ],
  passportPhoto: [
    'passportPhoto',
    'passportPhotograph',
    'passportPicture',
    'photo',
  ],
};

function readDocuments(
  row: Record<string, unknown>,
): Record<RegistrationDocumentId, string | undefined> {
  return {
    nationalIdDocument: firstString(row, DOCUMENT_ALIASES.nationalIdDocument),
    criminalRecordCertificate: firstString(
      row,
      DOCUMENT_ALIASES.criminalRecordCertificate,
    ),
    rcvdLicenceDocument: firstString(row, DOCUMENT_ALIASES.rcvdLicenceDocument),
    passportPhoto: firstString(row, DOCUMENT_ALIASES.passportPhoto),
  };
}

function readEmergencyContacts(
  row: Record<string, unknown>,
): RegistrationEmergencyContact[] {
  const list = Array.isArray(row.emergencyContacts)
    ? row.emergencyContacts
    : Array.isArray(row.emergencyContact)
      ? row.emergencyContact
      : [];

  const mapped = list
    .map((entry) => {
      const contact = asRecord(entry);
      if (!contact) return null;
      return {
        fullName: firstString(contact, ['fullName', 'name']) ?? '',
        phoneNumber:
          firstString(contact, ['phoneNumber', 'phone', 'telephone']) ?? '',
        relationship: firstString(contact, ['relationship', 'relation']) ?? '',
      };
    })
    .filter((contact): contact is RegistrationEmergencyContact => contact != null);

  if (mapped.length) return mapped;

  // Some payloads return flattened emergencyContacts1Name / 2Name fields.
  const flattened: RegistrationEmergencyContact[] = [];
  for (const index of [1, 2]) {
    const fullName = firstString(row, [
      `emergencyContacts${index}Name`,
      `emergencyContact${index}Name`,
    ]);
    const phoneNumber = firstString(row, [
      `emergencyContacts${index}Phone`,
      `emergencyContact${index}PhoneNumber`,
    ]);
    const relationship = firstString(row, [
      `emergencyContacts${index}Relationship`,
      `emergencyContact${index}Relationship`,
    ]);
    if (fullName || phoneNumber || relationship) {
      flattened.push({
        fullName: fullName ?? '',
        phoneNumber: phoneNumber ?? '',
        relationship: relationship ?? '',
      });
    }
  }
  return flattened;
}

/**
 * External signals that help resolve the role when the payload omits it.
 * Ordered by trust in {@link resolveRegistrationRole}.
 */
export type RegistrationRoleHints = {
  /** Role recorded when this applicant submitted from this browser. */
  rememberedRole?: RegistrationAccountType | null;
  /** Which track endpoint returned the record. */
  endpointRole?: RegistrationAccountType | null;
  /** Account type currently selected in the UI. */
  selectedRole?: RegistrationAccountType | null;
};

/**
 * Resolve the applicant role. Any credible veterinary signal wins, because the
 * agent shape is the backend default and silently downgrading a vet hides the
 * RCVD licence they are required to fix during RFA.
 */
export function resolveRegistrationRole(
  row: Record<string, unknown>,
  hints: RegistrationRoleHints = {},
): RegistrationAccountType {
  const payloadRole = firstString(row, [
    'role',
    'userRole',
    'accountType',
    'applicationType',
    'type',
  ]);
  if (payloadRole && isVeterinaryRole(payloadRole)) return VETERINARY_ROLE;

  if (asOptionalString(row.veterinaryType)) return VETERINARY_ROLE;

  const documents = readDocuments(row);
  if (VETERINARY_ONLY_DOCUMENT_IDS.some((id) => documents[id])) {
    return VETERINARY_ROLE;
  }

  for (const hint of [
    hints.rememberedRole,
    hints.endpointRole,
    hints.selectedRole,
  ]) {
    if (hint && isVeterinaryRole(hint)) return VETERINARY_ROLE;
  }

  if (payloadRole && normalizeRole(payloadRole) === 'AGENT') return 'AGENT';
  return 'AGENT';
}

/**
 * Normalize any apply/track/update response into {@link RegistrationApplication}.
 * Returns null when the payload carries no record.
 */
export function normalizeRegistrationApplication(
  raw: unknown,
  hints: RegistrationRoleHints = {},
): RegistrationApplication | null {
  const row = flattenApplicationRecord(raw);
  if (!Object.keys(row).length) return null;

  const documents = readDocuments(row);
  const role = resolveRegistrationRole(row, hints);

  return {
    _id: firstString(row, ['_id', 'id', 'applicationId']) ?? '',
    fullName: firstString(row, ['fullName', 'name']) ?? '',
    email: firstString(row, ['email']) ?? '',
    phoneNumber: firstString(row, ['phoneNumber', 'phone']),
    dateOfBirth: firstString(row, ['dateOfBirth', 'dob']),
    address: firstString(row, ['address']),
    province: firstString(row, ['province']),
    district: firstString(row, ['district']),
    sector: firstString(row, ['sector']),
    status: firstString(row, ['status', 'applicationStatus']) ?? 'PENDING',
    role,
    veterinaryType: asOptionalString(row.veterinaryType),
    bankName: firstString(row, ['bankName']),
    bankAccountNumber: firstString(row, ['bankAccountNumber', 'accountNumber']),
    ...documents,
    emergencyContacts: readEmergencyContacts(row),
    createdAt:
      firstString(row, ['createdAt', 'submittedAt']) ?? new Date().toISOString(),
    submittedAt: firstString(row, ['submittedAt', 'createdAt']),
    rejectionReason: firstString(row, [
      'rejectionReason',
      'actionReason',
      'reason',
    ]),
  };
}

export function isVeterinaryApplication(
  application: Pick<RegistrationApplication, 'role'> | null | undefined,
): boolean {
  return isVeterinaryRole(String(application?.role ?? ''));
}

const ROLE_MEMORY_STORAGE_KEY = 'ezinsure.registration.accountTypeByEmail';

function readRoleMemory(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ROLE_MEMORY_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return asRecord(parsed) ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Remember the account type an applicant submitted with, keyed by email, so a
 * later track (new tab or after reload) still renders the correct role-specific
 * documents even if the API response omits `role`.
 */
export function rememberRegistrationRole(
  email: string | undefined,
  role: RegistrationAccountType | undefined,
): void {
  const key = email?.trim().toLowerCase();
  if (!key || !role || typeof window === 'undefined') return;
  try {
    const memory = readRoleMemory();
    memory[key] = role;
    window.localStorage.setItem(
      ROLE_MEMORY_STORAGE_KEY,
      JSON.stringify(memory),
    );
  } catch {
    /* storage unavailable (private mode / quota) — hints stay in-memory only */
  }
}

export function recallRegistrationRole(
  email: string | undefined,
): RegistrationAccountType | undefined {
  const key = email?.trim().toLowerCase();
  if (!key) return undefined;
  const stored = asOptionalString(readRoleMemory()[key]);
  if (!stored) return undefined;
  return isVeterinaryRole(stored) ? VETERINARY_ROLE : 'AGENT';
}
