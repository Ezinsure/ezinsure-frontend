import type {
  LivestockFinanceApplication,
  LivestockFinanceApplicationStatusFilter,
  LivestockFinanceDateRange,
  LivestockFinanceVet,
  LivestockFinanceVetStats,
  LivestockFinanceVetTotals,
  LivestockPaidHistoryMonthBlock,
} from './domain';

const VET_COMMISSION_RATE = 0.05;
const SOLEKTRA_COMMISSION_RATE = 0.08;

export function computeCommissions(netPremium: number) {
  const veterinaryCommission = Math.round(netPremium * VET_COMMISSION_RATE);
  const solektraCommission = Math.round(netPremium * SOLEKTRA_COMMISSION_RATE);
  const totalCommission13_5 = veterinaryCommission + solektraCommission;
  return { veterinaryCommission, solektraCommission, totalCommission13_5 };
}

export const MOCK_VETS: LivestockFinanceVet[] = [
  {
    vetId: 'vet-001',
    name: 'Dr. Jean Baptiste Nkurunziza',
    email: 'j.nkurunziza@rwandavet.rw',
    phoneNumber: '+250788123456',
    bankName: 'BPR',
    bankAccountNumber: '1000123456789',
    district: 'MUSANZE',
  },
  {
    vetId: 'vet-002',
    name: 'Dr. Marie Claire Uwimana',
    email: 'mc.uwimana@livestock.rw',
    phoneNumber: '+250789234567',
    bankName: 'Bank of Kigali',
    bankAccountNumber: '2000987654321',
    district: 'NYAMASHEKE',
  },
  {
    vetId: 'vet-003',
    name: 'Dr. Emmanuel Hakizimana',
    email: 'e.hakizimana@vetservices.rw',
    phoneNumber: '+250788345678',
    bankName: 'Equity Bank',
    bankAccountNumber: '3000112233445',
    district: 'RUBAVU',
  },
  {
    vetId: 'vet-004',
    name: 'Dr. Vestine Mukamana',
    email: 'v.mukamana@huye-vet.rw',
    phoneNumber: '+250787456789',
    bankName: 'I&M Bank',
    bankAccountNumber: '4000556677889',
    district: 'HUYE',
  },
  {
    vetId: 'vet-005',
    name: 'Dr. Patrick Nsengimana',
    email: 'p.nsengimana@gakenke.rw',
    phoneNumber: '+250786567890',
    bankName: 'BPR',
    bankAccountNumber: '5000667788990',
    district: 'GAKENKE',
  },
  {
    vetId: 'vet-006',
    name: 'Dr. Alice Uwineza',
    email: 'a.uwineza@karongi.rw',
    phoneNumber: '+250785678901',
    bankName: 'Bank of Kigali',
    bankAccountNumber: '6000778899001',
    district: 'KARONGI',
  },
  {
    vetId: 'vet-007',
    name: 'Dr. Théophile Habimana',
    email: 't.habimana@rwamagana.rw',
    phoneNumber: '+250784789012',
    bankName: 'Equity Bank',
    bankAccountNumber: '7000889900112',
    district: 'RWAMAGANA',
  },
  {
    vetId: 'vet-008',
    name: 'Dr. Chantal Ingabire',
    email: 'c.ingabire@musanze.rw',
    phoneNumber: '+250783890123',
    bankName: 'BPR',
    bankAccountNumber: '8000990011223',
    district: 'MUSANZE',
  },
];

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function buildApp(
  id: string,
  appNum: string,
  vetId: string,
  clientName: string,
  district: string,
  netPremium: number,
  status: string,
  submittedAt: string,
): LivestockFinanceApplication {
  const commissions = computeCommissions(netPremium);
  const vet = MOCK_VETS.find((v) => v.vetId === vetId);
  return {
    _id: id,
    applicationNumber: appNum,
    status,
    submittedAt,
    vetId,
    vetName: vet?.name,
    clientName,
    district,
    netPremium,
    veterinaryCommission: commissions.veterinaryCommission,
    solektraCommission: commissions.solektraCommission,
    totalCommission: commissions.totalCommission13_5,
  };
}

const now = new Date();
const currentYear = now.getUTCFullYear();
const currentMonth = now.getUTCMonth() + 1;

/** Seed applications — mutated in-memory when initiating / marking paid. */
const INITIAL_APPLICATIONS: LivestockFinanceApplication[] = [
  buildApp('ls-app-001', 'LS-2026-0041', 'vet-001', 'Niyonsaba Eric', 'MUSANZE', 850000, 'READY_TO_BE_PAID', isoDate(currentYear, currentMonth, 3)),
  buildApp('ls-app-002', 'LS-2026-0042', 'vet-001', 'Mukamana Vestine', 'MUSANZE', 620000, 'READY_TO_BE_PAID', isoDate(currentYear, currentMonth, 7)),
  buildApp('ls-app-003', 'LS-2026-0043', 'vet-002', 'Habimana Claude', 'NYAMASHEKE', 1200000, 'READY_TO_BE_PAID', isoDate(currentYear, currentMonth, 5)),
  buildApp('ls-app-004', 'LS-2026-0044', 'vet-002', 'Uwase Divine', 'NYAMASHEKE', 480000, 'READY_TO_BE_PAID', isoDate(currentYear, currentMonth, 11)),
  buildApp('ls-app-005', 'LS-2026-0035', 'vet-003', 'Nshimiyimana Jean', 'RUBAVU', 950000, 'READY_TO_BE_PAID', isoDate(currentYear, currentMonth, 2)),
  buildApp('ls-app-006', 'LS-2026-0036', 'vet-003', 'Mutesi Grace', 'NYABIHU', 730000, 'PAYMENT_INITIATED', isoDate(currentYear, currentMonth, 1)),
  buildApp('ls-app-007', 'LS-2026-0028', 'vet-004', 'Bizimana Pierre', 'HUYE', 560000, 'PAYMENT_INITIATED', isoDate(currentYear, currentMonth, 4)),
  buildApp('ls-app-008', 'LS-2026-0029', 'vet-004', 'Ingabire Chantal', 'HUYE', 410000, 'PAYMENT_INITIATED', isoDate(currentYear, currentMonth, 8)),
  buildApp('ls-app-009', 'LS-2026-0015', 'vet-005', 'Ndayisaba François', 'GAKENKE', 680000, 'PAID', isoDate(currentYear, currentMonth - 1 || 12, 15)),
  buildApp('ls-app-010', 'LS-2026-0016', 'vet-005', 'Uwimana Alice', 'GAKENKE', 520000, 'PAID', isoDate(currentYear, currentMonth - 1 || 12, 20)),
  buildApp('ls-app-011', 'LS-2026-0017', 'vet-006', 'Hakizimana Théophile', 'KARONGI', 890000, 'PAID', isoDate(currentYear, currentMonth - 1 || 12, 10)),
  buildApp('ls-app-012', 'LS-2026-0030', 'vet-006', 'Mukamurenzi Odette', 'KARONGI', 340000, 'READY_TO_BE_PAID', isoDate(currentYear, currentMonth, 9)),
  buildApp('ls-app-013', 'LS-2026-0031', 'vet-007', 'Nsengimana Patrick', 'RWAMAGANA', 770000, 'READY_TO_BE_PAID', isoDate(currentYear, currentMonth, 6)),
  buildApp('ls-app-014', 'LS-2026-0018', 'vet-007', 'Uwineza Marie', 'RWAMAGANA', 450000, 'PAID', isoDate(currentYear, currentMonth - 2 > 0 ? currentMonth - 2 : 11, 5)),
  buildApp('ls-app-015', 'LS-2026-0045', 'vet-008', 'Nkurunziza Jean B.', 'MUSANZE', 1020000, 'READY_TO_BE_PAID', isoDate(currentYear, currentMonth, 10)),
  buildApp('ls-app-016', 'LS-2026-0046', 'vet-008', 'Mukamana Vestine', 'GICUMBI', 640000, 'READY_TO_BE_PAID', isoDate(currentYear, currentMonth, 12)),
  buildApp('ls-app-017', 'LS-2026-0019', 'vet-001', 'Habimana Claude', 'MUSANZE', 390000, 'PAID', isoDate(currentYear, currentMonth - 2 > 0 ? currentMonth - 2 : 11, 18)),
  buildApp('ls-app-018', 'LS-2026-0020', 'vet-002', 'Uwase Divine', 'NYAMASHEKE', 510000, 'PAID', isoDate(currentYear, currentMonth - 3 > 0 ? currentMonth - 3 : 10, 22)),
];

let mockApplications: LivestockFinanceApplication[] = INITIAL_APPLICATIONS.map((a) => ({ ...a }));

export function resetMockLivestockFinanceData() {
  mockApplications = INITIAL_APPLICATIONS.map((a) => ({ ...a }));
}

function parseDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inRange(iso: string | undefined, range: LivestockFinanceDateRange): boolean {
  if (!iso) return false;
  const d = parseDate(iso);
  if (!d) return false;
  const day = d.toISOString().slice(0, 10);
  return day >= range.startDate && day <= range.endDate;
}

function matchesStatus(status: string | undefined, filter: LivestockFinanceApplicationStatusFilter): boolean {
  if (filter === 'ALL') return true;
  return (status ?? '').toUpperCase() === filter;
}

function filterApplications(
  range: LivestockFinanceDateRange,
  applicationStatus: LivestockFinanceApplicationStatusFilter,
  vetId?: string,
): LivestockFinanceApplication[] {
  return mockApplications.filter((app) => {
    if (vetId && app.vetId !== vetId) return false;
    if (!inRange(app.submittedAt, range)) return false;
    return matchesStatus(app.status, applicationStatus);
  });
}

function aggregateVetTotals(
  apps: LivestockFinanceApplication[],
): LivestockFinanceVetTotals[] {
  const byVet = new Map<string, LivestockFinanceVetTotals>();

  for (const app of apps) {
    const vetId = app.vetId ?? '';
    if (!vetId) continue;
    const vet = MOCK_VETS.find((v) => v.vetId === vetId);
    if (!vet) continue;

    const cur =
      byVet.get(vetId) ??
      ({
        ...vet,
        netPremium: 0,
        totalInsurance: 0,
        veterinaryCommission: 0,
        solektraCommission: 0,
        totalCommission13_5: 0,
        applicationsCount: 0,
        district: vet.district,
      } satisfies LivestockFinanceVetTotals);

    cur.netPremium += Number(app.netPremium ?? 0);
    cur.totalInsurance = cur.netPremium;
    cur.veterinaryCommission += Number(app.veterinaryCommission ?? 0);
    cur.solektraCommission += Number(app.solektraCommission ?? 0);
    cur.totalCommission13_5 += Number(app.totalCommission ?? 0);
    cur.applicationsCount += 1;
    byVet.set(vetId, cur);
  }

  return [...byVet.values()]
    .filter((row) => row.applicationsCount > 0)
    .sort((a, b) => b.totalCommission13_5 - a.totalCommission13_5);
}

export const mockLivestockFinanceApi = {
  getLivestockFinanceVetStats(
    range: LivestockFinanceDateRange,
    applicationStatus: LivestockFinanceApplicationStatusFilter,
  ): LivestockFinanceVetStats {
    const apps = filterApplications(range, applicationStatus);
    const totals = aggregateVetTotals(apps);
    return {
      totalCommission: totals.reduce((s, v) => s + v.totalCommission13_5, 0),
      totalApplications: apps.length,
      totalVets: totals.length,
      totalNetPremium: totals.reduce((s, v) => s + v.netPremium, 0),
    };
  },

  getVetsCommissionBreakdown(
    range: LivestockFinanceDateRange,
    applicationStatus: LivestockFinanceApplicationStatusFilter,
  ): LivestockFinanceVetTotals[] {
    const apps = filterApplications(range, applicationStatus);
    return aggregateVetTotals(apps);
  },

  getApplicationsByVetFinance(
    vetId: string,
    range: LivestockFinanceDateRange,
    applicationStatus: LivestockFinanceApplicationStatusFilter,
  ) {
    const apps = filterApplications(range, applicationStatus, vetId).sort(
      (a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime(),
    );
    const totalCommission = apps.reduce((s, a) => s + Number(a.totalCommission ?? 0), 0);
    return {
      data: apps,
      totalApplications: apps.length,
      totalCommission,
    };
  },

  initiateLivestockPayment(range: LivestockFinanceDateRange): void {
    mockApplications = mockApplications.map((app) => {
      if (
        inRange(app.submittedAt, range) &&
        (app.status ?? '').toUpperCase() === 'READY_TO_BE_PAID'
      ) {
        return { ...app, status: 'PAYMENT_INITIATED' };
      }
      return app;
    });
  },

  markLivestockAsPaid(range: LivestockFinanceDateRange): void {
    mockApplications = mockApplications.map((app) => {
      if (
        inRange(app.submittedAt, range) &&
        (app.status ?? '').toUpperCase() === 'PAYMENT_INITIATED'
      ) {
        return { ...app, status: 'PAID' };
      }
      return app;
    });
  },

  getLivestockPaidBatchesByYear(year: number): LivestockPaidHistoryMonthBlock[] {
    const monthNames = [
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
    ] as const;

    const paidApps = mockApplications.filter(
      (a) =>
        (a.status ?? '').toUpperCase() === 'PAID' &&
        parseDate(a.submittedAt ?? '')?.getUTCFullYear() === year,
    );

    return monthNames.map((monthName, idx) => {
      const monthIndex = idx + 1;
      const monthApps = paidApps.filter((a) => {
        const d = parseDate(a.submittedAt ?? '');
        return d && d.getUTCMonth() + 1 === monthIndex;
      });

      const byVet = new Map<string, { vet: LivestockFinanceVet; totalPaid: number }>();
      for (const app of monthApps) {
        const vetId = app.vetId ?? '';
        const vet = MOCK_VETS.find((v) => v.vetId === vetId);
        if (!vet) continue;
        const cur = byVet.get(vetId) ?? { vet, totalPaid: 0 };
        cur.totalPaid += Number(app.veterinaryCommission ?? 0);
        byVet.set(vetId, cur);
      }

      const vets = [...byVet.values()].map(({ vet, totalPaid }) => ({
        vetId: vet.vetId,
        name: vet.name,
        email: vet.email,
        phoneNumber: vet.phoneNumber,
        bankName: vet.bankName,
        bankAccountNumber: vet.bankAccountNumber,
        totalPaid,
      }));

      return {
        monthIndex,
        monthName,
        totalMonthPaid: vets.reduce((s, v) => s + v.totalPaid, 0),
        vets,
      };
    });
  },
};
