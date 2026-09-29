export type ApplicationEmergencyContact = {
  fullName: string;
  phoneNumber: string;
  relationship: string;
  _id?: string;
};

export type ApplicationDocumentItem = {
  id: string;
  label: string;
  path?: string | null;
  kind?: 'image' | 'file';
};

export type VetApplicationProfile = {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  dateOfBirth?: string;
  address?: string;
  province?: string;
  district?: string;
  sector?: string;
  bankName?: string;
  bankAccountNumber?: string;
  veterinaryType?: string;
  companyCommissionRate?: number | string;
  passportPhoto?: string;
  nationalIdDocument?: string;
  rcvdLicenceDocument?: string;
  criminalRecordCertificate?: string;
  emergencyContacts?: ApplicationEmergencyContact[];
  createdAt?: string;
  rejectionReason?: string;
  deactivationHistory?: Array<{
    deactivationReason: string;
    deactivationFile?: string;
    deactivationDate: string;
    _id: string;
  }>;
};

export function formatOptionalDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export function isImageDocumentPath(path?: string | null): boolean {
  if (!path) return false;
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(path) || path.includes('/image/upload/');
}
