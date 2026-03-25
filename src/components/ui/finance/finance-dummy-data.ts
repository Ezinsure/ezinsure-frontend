import type { FinanceApplication, FinanceAgent, FinanceBatch, FinanceMonthYear } from './finance-domain';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function toMonthYear(month: number, year: number): FinanceMonthYear {
  return { month, year, label: `${MONTH_NAMES[month - 1]} ${year}` };
}

export const dummyAgents: FinanceAgent[] = [
  {
    agentId: '684add6131bb22171c4137c7',
    name: 'Agent happy',
    email: 'a.dukundei@alustudent.com',
    phoneNumber: '0897999999',
    bankName: 'Equity',
    bankAccountNumber: '087999999999999',
  },
  {
    agentId: '684add6131bb22171c4137c8',
    name: 'Agent brave',
    email: 'b.dukundei@alustudent.com',
    phoneNumber: '0788888888',
    bankName: 'KCB',
    bankAccountNumber: '2500000000000001',
  },
  {
    agentId: '684add6131bb22171c4137c9',
    name: 'Agent calm',
    email: 'c.dukundei@alustudent.com',
    phoneNumber: '0797777777',
    bankName: 'Bank of Kigali',
    bankAccountNumber: '100000129075',
  },
];

// Ready-to-be-paid (accrual) dataset. In real backend, this comes from "ready_to_be_paid" & accounting rules.
export const dummyApplications: FinanceApplication[] = [
  // March 2026
  {
    _id: 'app-mar-1',
    applicationNumber: 'APP-MAR-0001',
    status: 'READY_TO_BE_PAID',
    submittedAt: '2026-03-05T10:00:00.000Z',
    insuranceCategory: 'Car Insurance',
    insuranceType: 'Third Party Insurance (covers partial)',
    insuranceDuration: '1 Month',
    amount: 10000,
    companyCommission: 2500,
    administrationFees: 2500,
    agentCommission: 2749.25,
    agentId: '684add6131bb22171c4137c7',
    agentFullName: 'Agent happy',
    client: {
      fullName: 'Client One',
      email: 'client.one@example.com',
      phoneNumber: '250700000001',
      nationalID: '1234567890123456',
      province: 'Kigali',
      district: 'Gasabo',
      sector: 'Kimironko',
      address: 'Kigali, Rwanda',
    },
    vehicle: { plateNumber: 'RAA 123A', vehicleType: 'Sedan', vehicleAge: '4', vehicleUse: 'Private' },
    documents: {
      nationalID: '/File_not_found.jpg',
      yellowCard: '/File_not_found.jpg',
      pastInsuranceCertificate: '/File_not_found.jpg',
      proofOfPayment: '/File_not_found.jpg',
    },
  },
  {
    _id: 'app-mar-2',
    applicationNumber: 'APP-MAR-0002',
    status: 'READY_TO_BE_PAID',
    submittedAt: '2026-03-12T10:00:00.000Z',
    insuranceCategory: 'MotorBike Insurance',
    insuranceType: 'Third Party Insurance',
    insuranceDuration: '1 Month',
    amount: 8000,
    companyCommission: 2000,
    administrationFees: 2000,
    agentCommission: 1995.1,
    agentId: '684add6131bb22171c4137c8',
    agentFullName: 'Agent brave',
    client: {
      fullName: 'Client Two',
      email: 'client.two@example.com',
      phoneNumber: '250700000002',
      nationalID: '2234567890123456',
      province: 'Southern',
      district: 'Muhanga',
      sector: 'Nyamabuye',
      address: 'Muhanga, Rwanda',
    },
    vehicle: { plateNumber: 'RA 555Z', vehicleType: 'MotorBike', vehicleAge: '2', vehicleUse: 'Business' },
    documents: {
      nationalID: '/File_not_found.jpg',
      yellowCard: '/File_not_found.jpg',
      proofOfPayment: '/File_not_found.jpg',
    },
  },
  {
    _id: 'app-mar-3',
    applicationNumber: 'APP-MAR-0003',
    status: 'READY_TO_BE_PAID',
    submittedAt: '2026-03-20T10:00:00.000Z',
    insuranceCategory: 'Car Insurance',
    insuranceType: 'Third Party Insurance (covers partial)',
    insuranceDuration: '1 Month',
    amount: 12000,
    companyCommission: 3000,
    administrationFees: 3000,
    agentCommission: 2399.75,
    agentId: '684add6131bb22171c4137c7',
    agentFullName: 'Agent happy',
    client: {
      fullName: 'Client Three',
      email: 'client.three@example.com',
      phoneNumber: '250700000003',
      nationalID: '3234567890123456',
      province: 'Northern',
      district: 'Musanze',
      sector: 'Gacaca',
      address: 'Musanze, Rwanda',
    },
    vehicle: { plateNumber: 'RAA 777B', vehicleType: 'SUV', vehicleAge: '3', vehicleUse: 'Private' },
    documents: {
      nationalID: '/File_not_found.jpg',
      yellowCard: '/File_not_found.jpg',
      proofOfPayment: '/File_not_found.jpg',
    },
  },

  // February 2026
  {
    _id: 'app-feb-1',
    applicationNumber: 'APP-FEB-0001',
    status: 'READY_TO_BE_PAID',
    submittedAt: '2026-02-07T10:00:00.000Z',
    insuranceCategory: 'Car Insurance',
    insuranceType: 'Third Party Insurance (covers partial)',
    insuranceDuration: '1 Month',
    amount: 9000,
    companyCommission: 2250,
    administrationFees: 2250,
    agentCommission: 1544.2,
    agentId: '684add6131bb22171c4137c9',
    agentFullName: 'Agent calm',
    client: {
      fullName: 'Client Four',
      email: 'client.four@example.com',
      phoneNumber: '250700000004',
      nationalID: '4234567890123456',
      province: 'East',
      district: 'Rwamagana',
      sector: 'Karenge',
      address: 'Rwamagana, Rwanda',
    },
    vehicle: { plateNumber: 'RA 222C', vehicleType: 'Sedan', vehicleAge: '5', vehicleUse: 'Private' },
    documents: {
      nationalID: '/File_not_found.jpg',
      yellowCard: '/File_not_found.jpg',
      proofOfPayment: '/File_not_found.jpg',
    },
  },
];

export type DummyPaymentInitiatedBatchSeed = {
  id: string;
  month: number;
  year: number;
  createdAt: string;
  paid: boolean;
  applicationIds: string[];
};

export const dummyInitiatedSeedBatches: DummyPaymentInitiatedBatchSeed[] = [
  {
    id: 'batch-mar-2026',
    month: 3,
    year: 2026,
    createdAt: '2026-03-25T10:00:00.000Z',
    paid: false,
    applicationIds: ['app-mar-1', 'app-mar-2', 'app-mar-3'],
  },
];

export function toBatch(seed: DummyPaymentInitiatedBatchSeed): FinanceBatch {
  const monthYear = toMonthYear(seed.month, seed.year);
  return {
    id: seed.id,
    monthYear,
    status: seed.paid ? 'PAID' : 'INITIATED',
    createdAt: seed.createdAt,
    markedPaidAt: seed.paid ? seed.createdAt : undefined,
    applicationIds: seed.applicationIds,
  };
}

