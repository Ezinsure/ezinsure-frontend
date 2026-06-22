export interface VeterinaryApplicationAgent {
  _id: string;
  fullName: string;
  phoneNumber: string;
}

export interface VeterinaryApplicationAdmin {
  _id: string;
  fullName: string;
}

export interface VeterinaryApplication {
  _id: string;
  applicationNumber: string;
  policyNumber: string;
  insuranceType: string;
  insuranceProvider: string;
  modeOfPayment: string;
  sumAssured: number;
  farmerContributionAmount: number;
  premiumRateAmount: number;
  governmentContribution: number;
  companyCommission: number;
  veterinaryCommission: number;
  chipNumber: string;
  animalType: string;
  species: string;
  breed: string;
  sex: string;
  animalDateOfBirth: string;
  chippedDate: string;
  policyStartDate: string;
  policyEndDate: string;
  ownerName: string;
  ownerDateOfBirth: string;
  ownerAge: number;
  ownerPhone: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  status: string;
  subsidyStatus: string;
  paidStatus: string;
  agentCommissionPaymentStatus: string;
  approvedBy: string;
  approvedOn: string;
  submittedAt: string;
  insuranceIssuedAt: string;
  agent?: VeterinaryApplicationAgent;
  admin?: VeterinaryApplicationAdmin;
}

export interface VeterinaryApplicationsResponse {
  data: VeterinaryApplication[];
}
