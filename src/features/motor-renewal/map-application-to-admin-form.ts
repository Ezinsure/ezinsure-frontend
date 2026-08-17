import type { Application } from '@/features/admin-motor-applications/types';
import {
  ApplicationStatus,
  type ApplicationFormData,
} from '@/features/admin-motor-new-application/types';
import { isoDateOnly, nextPolicyPeriod } from '@/features/renewals/date-utils';
import { calculateAdministrationFeesRwf } from '@/utils/administration-fees';
import { rwandaProvinces } from '@/utils/rwanda-administrative';

const DEFAULT_PAYMENT_INSTRUCTIONS =
  'Please make your payment to one of the following:\nBank of Kigali: 100000129075 (SONARWA)\nOr via Momo Account: 051499 (SONARWA) \nOr Agency at Kimihurura (KBC) under SOLEKTRA';

function parseVehicleUse(raw: string, fallbackOther: string): { vehicleUse: string; otherVehicleUse: string } {
  if (raw.startsWith('Other - ')) {
    return { vehicleUse: 'Other', otherVehicleUse: raw.slice('Other - '.length) || fallbackOther };
  }
  return { vehicleUse: raw, otherVehicleUse: fallbackOther };
}

function resolveInsuranceType(value: string | undefined): string {
  if (!value || /^renewal$/i.test(value)) {
    return 'Third Party Insurance (covers partial)';
  }
  return value;
}

export interface RenewalPolicyDates {
  policyStartDate: string;
  policyEndDate: string;
}

export function renewalPolicyDatesFromApplication(app: Application): RenewalPolicyDates {
  const end = isoDateOnly(app.insuranceEndAt);
  if (!end) return { policyStartDate: '', policyEndDate: '' };
  const period = nextPolicyPeriod(end);
  return { policyStartDate: period.start, policyEndDate: period.end };
}

export function mapMotorApplicationToAdminForm(app: Application): ApplicationFormData {
  const client = app.client;
  const vehicle = app.vehicle;
  const { vehicleUse, otherVehicleUse } = parseVehicleUse(
    vehicle?.vehicleUse ?? app.vehicleUse ?? '',
    vehicle?.otherVehicleUse ?? app.otherVehicleUse ?? '',
  );
  const net = app.netPremium ?? app.amount ?? 0;
  const category = app.insuranceCategory || 'Car Insurance';
  const isComesa = Boolean(app.isCOMESA);
  const { policyEndDate } = renewalPolicyDatesFromApplication(app);
  const extended = app as Application & {
    identificationDocumentUrl?: string;
    yellowCardUrl?: string;
    pastInsuranceCertificateUrl?: string;
  };

  return {
    fullName: client?.fullName ?? app.fullName ?? '',
    email: client?.email ?? app.email ?? '',
    phoneNumber: client?.phoneNumber ?? app.phoneNumber ?? '',
    dateOfBirth: isoDateOnly(client?.dateOfBirth ?? app.dateOfBirth),
    address: client?.address ?? app.address ?? '',
    province: client?.province ?? app.province ?? '',
    district: client?.district ?? app.district ?? '',
    sector: client?.sector ?? app.sector ?? '',
    identificationDocumentType: client?.identificationDocumentType ?? 'nationalID',
    identificationNumber:
      client?.identificationNumber ||
      client?.nationalID ||
      app.nationalID ||
      '',
    insuranceCategory: category,
    insuranceType: resolveInsuranceType(app.insuranceType),
    insuranceDuration: app.insuranceDuration ?? '12 Months',
    insuranceProvider: app.insuranceProvider ?? 'SONARWA',
    isCOMESA: isComesa,
    plateNumber: vehicle?.plateNumber ?? '',
    chasisNumber: vehicle?.chasisNumber ?? app.chasisNumber ?? '',
    vehicleType: vehicle?.vehicleType ?? app.vehicleType ?? '',
    vehicleAge: vehicle?.vehicleAge ?? app.vehicleAge ?? '',
    vehicleUse,
    otherVehicleUse,
    nationalID: null,
    yellowCard: null,
    pastInsuranceCertificate: null,
    vehicleId: vehicle?._id ?? '',
    clientId: client?._id ?? '',
    identificationDocumentUrl: extended.identificationDocumentUrl ?? '',
    yellowCardUrl: extended.yellowCardUrl ?? app.yellowCard ?? '',
    pastInsuranceCertificateUrl:
      extended.pastInsuranceCertificateUrl ?? app.pastInsuranceCertificate ?? '',
    isNewClient: false,
    isNewVehicle: false,
    amount: net ? String(net) : '',
    netPremium: net ? String(net) : '',
    commissionPercentage: '',
    paymentInstructions: DEFAULT_PAYMENT_INSTRUCTIONS,
    invoice: null,
    companyCommission:
      app.companyCommission != null ? String(app.companyCommission) : '',
    administrationFees:
      app.administrationFees ??
      String(calculateAdministrationFeesRwf(category, isComesa)),
    proofOfPayment: null,
    transactionId: '',
    policeNumber: app.policeNumber ?? '',
    insuranceCertificate: null,
    contract: null,
    receipt: null,
    ebm: null,
    status: ApplicationStatus.PENDING,
    insuranceEndAt: policyEndDate,
    wantsToAssignAgent: '',
    assignToAgent: '',
    deductAgentAssignmentCommission: 'yes',
  };
}

export function rwandaDistrictsForProvince(provinceName: string) {
  const selectedProvince = rwandaProvinces.find((p) => p.name === provinceName);
  const districts = selectedProvince?.districts ?? [];
  return districts.map((district) => ({
    name: district.name,
    sectors: district.sectors?.map((sector) => sector.name) ?? [],
  }));
}

export function rwandaSectorsForDistrict(
  districts: { name: string; sectors?: string[] }[],
  districtName: string,
): string[] {
  return districts.find((d) => d.name === districtName)?.sectors ?? [];
}
