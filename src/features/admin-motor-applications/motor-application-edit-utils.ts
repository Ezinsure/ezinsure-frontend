import type { Application } from '@/features/admin-motor-applications/types';
import { resolveChasisNumber } from '@/utils/chasis-number';
import { toDateInputValue, todayDateInputValue } from '@/utils/date-formatter';
import { normalizeInsuranceDurationPayload } from '@/utils/insurance-duration';
import { isMotorVehicleInsuranceCategory } from '@/utils/administration-fees';
import { getVehicleManufactureYearValidationError } from '@/utils/vehicle-year';

export type MotorEditFormData = Record<string, string | number | boolean | File | null>;

export function buildMotorEditFormData(app: Application): MotorEditFormData {
  return {
    fullName: app.client?.fullName || app.fullName || '',
    email: app.client?.email || app.email || '',
    phoneNumber: app.client?.phoneNumber || app.phoneNumber || '',
    dateOfBirth: app.client?.dateOfBirth
      ? toDateInputValue(app.client.dateOfBirth)
      : toDateInputValue(app.dateOfBirth),
    address: app.client?.address || app.address || '',
    province: app.client?.province || app.province || '',
    district: app.client?.district || app.district || '',
    sector: app.client?.sector || app.sector || '',
    identificationNumber:
      app.client?.identificationNumber || app.client?.nationalID || app.nationalID || '',
    insuranceCategory: app.insuranceCategory || '',
    insuranceType: app.insuranceType || '',
    insuranceDuration: app.insuranceDuration || '',
    insuranceProvider: app.insuranceProvider || '',
    plateNumber: app.vehicle?.plateNumber || '',
    chasisNumber: resolveChasisNumber(app),
    vehicleType: app.vehicle?.vehicleType || app.vehicleType || '',
    vehicleAge: app.vehicle?.vehicleAge || app.vehicleAge || '',
    vehicleUse: app.vehicle?.vehicleUse || app.vehicleUse || '',
    otherVehicleUse: app.vehicle?.otherVehicleUse || app.otherVehicleUse || '',
    isCOMESA: Boolean(app.isCOMESA),
    amount: app.amount?.toString() || '',
    netPremium: app.netPremium?.toString() || '',
    paymentInstructions: app.paymentInstructions || '',
    transactionId: app.transactionId || '',
    policeNumber: app.policeNumber || '',
    companyCommission: app.companyCommission?.toString() || '',
    administrationFees: app.administrationFees?.toString() || '',
    agentCommission: app.agentCommission?.toString() || '',
    status: (app.status || '').toLowerCase(),
    insuranceEndAt: toDateInputValue(app.insuranceEndAt),
    insuranceIssuedAt:
      toDateInputValue(app.insuranceIssuedAt) || todayDateInputValue(),
    invoice: null,
    insuranceCertificate: null,
    contract: null,
    receipt: null,
    ebm: null,
  };
}

export function hasExistingMotorEditValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'boolean') return value === true;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof File) return true;
  return true;
}

/** Admin edit always exposes every updatable field. */
export function buildMotorEditInitialVisibility(
  _app: Application,
  _formData: MotorEditFormData,
): Record<string, boolean> {
  return {
    clientFullName: true,
    clientEmail: true,
    clientPhone: true,
    clientDob: true,
    clientAddress: true,
    clientProvince: true,
    clientDistrict: true,
    clientSector: true,
    clientIdentification: true,
    insuranceCategory: true,
    plateNumber: true,
    chasisNumber: true,
    vehicleType: true,
    vehicleAge: true,
    vehicleUse: true,
    otherVehicleUse: true,
    comesa: true,
    insuranceProvider: true,
    insuranceType: true,
    insuranceDuration: true,
    amountField: true,
    netPremiumField: true,
    agentCommissionField: true,
    companyCommissionField: true,
    administrationFeesField: true,
    transactionIdField: true,
    policeNumberField: true,
    paymentInstructionsField: true,
    statusField: true,
    insuranceEndDateField: true,
    insuranceIssuedAtField: true,
    invoiceUpload: true,
    insuranceCertificateUpload: true,
    contractUpload: true,
    receiptUpload: true,
    ebmUpload: true,
    proofOfPaymentInfo: true,
    transactionIdInfo: true,
    policeNumberInfo: true,
    yellowCardInfo: true,
    pastInsuranceCertificateInfo: true,
  };
}

export function getMotorEditFormValue(
  value: string | number | boolean | File | null | undefined,
): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value.toString();
  if (value instanceof File) return '';
  return String(value);
}

export function collectMotorEditChangedFields(
  editFormData: MotorEditFormData,
  originalEditFormData: MotorEditFormData,
): Record<string, string | number | boolean | File> {
  const changedFields: Record<string, string | number | boolean | File> = {};

  Object.keys(editFormData).forEach((key) => {
    const currentValue = editFormData[key];
    const originalValue = originalEditFormData[key];

    if (currentValue instanceof File) {
      changedFields[key] = currentValue;
    } else if (typeof currentValue === 'boolean' || typeof originalValue === 'boolean') {
      if (Boolean(currentValue) !== Boolean(originalValue)) {
        changedFields[key] = currentValue as boolean;
      }
    } else if (String(currentValue || '') !== String(originalValue || '')) {
      changedFields[key] = currentValue as string | number | boolean;
    }
  });

  if ('fullName' in changedFields) {
    const trimmedName = String(changedFields.fullName).trim();
    if (!trimmedName) {
      throw new Error('Client full name is required');
    }
    changedFields.fullName = trimmedName;
  }

  return changedFields;
}

export async function submitMotorApplicationEdit(params: {
  token: string;
  applicationId: string;
  editingApp: Application;
  editFormData: MotorEditFormData;
  originalEditFormData: MotorEditFormData;
}): Promise<void> {
  const { token, applicationId, editingApp, editFormData, originalEditFormData } = params;
  const changedFields = collectMotorEditChangedFields(editFormData, originalEditFormData);

  if (Object.keys(changedFields).length === 0) {
    throw new Error('No changes detected');
  }

  if (
    isMotorVehicleInsuranceCategory(String(editFormData.insuranceCategory ?? '')) &&
    'vehicleAge' in changedFields
  ) {
    const v = getMotorEditFormValue(editFormData.vehicleAge);
    if (!v.trim()) {
      throw new Error('Vehicle year is required');
    }
    const yearErr = getVehicleManufactureYearValidationError(v);
    if (yearErr) {
      throw new Error(yearErr);
    }
  }

  const formDataToSend = new FormData();

  const clientId = editingApp.client?._id || '';
  if (clientId) {
    formDataToSend.set('clientId', clientId);
  }

  const vehicleId = editingApp.vehicle?._id || '';
  if (vehicleId) {
    formDataToSend.set('vehicleId', vehicleId);
  }

  Object.entries(changedFields).forEach(([key, value]) => {
    if (value instanceof File) {
      formDataToSend.append(key, value);
    } else if (value !== null && value !== undefined) {
      if (key === 'insuranceDuration') {
        formDataToSend.append(key, normalizeInsuranceDurationPayload(String(value)));
      } else {
        formDataToSend.append(key, value.toString());
      }
    }
  });

  // Admin edits persist as-is — backend must not recalculate commissions or derived fees.
  formDataToSend.set('skipCommissionRecalculation', 'true');
  formDataToSend.set('persistAdminValues', 'true');

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/editApplicationAdmin/${applicationId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formDataToSend,
    },
  );

  if (!response.ok) {
    let errorMessage = 'Failed to update application';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      const errorText = await response.text();
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  await response.json();
}
