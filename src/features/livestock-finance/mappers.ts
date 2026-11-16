import type {
  LivestockFinanceApplication,
  LivestockFinanceVetTotals,
  LivestockPaidHistoryMonthBlock,
} from './domain';

type RawRecord = Record<string, unknown>;

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
] as const;

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/** Accepts `[...]` or `{ data: [...] }` and always returns an array. */
export function unwrapRows<T = RawRecord>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

/** Accepts `{ ... }` or `{ data: { ... } }`. */
export function unwrapObject<T extends object>(payload: unknown): Partial<T> {
  const root = (payload ?? {}) as { data?: unknown };
  const inner = root.data;
  return (inner && typeof inner === 'object' ? inner : root) as Partial<T>;
}

function resolveDistrict(row: RawRecord): string | undefined {
  if (typeof row.district === 'string') return row.district;
  if (typeof row.districts === 'string') return row.districts;
  if (Array.isArray(row.districts) && typeof row.districts[0] === 'string') {
    return String(row.districts[0]);
  }
  return undefined;
}

export function mapVetTotalsRow(row: RawRecord): LivestockFinanceVetTotals {
  const netPremium = Number(row.netPremium ?? row.totalInsurance ?? 0);
  const veterinaryCommission = Number(
    row.veterinaryCommission ?? row.agentCommission ?? 0,
  );
  const solektraCommission = Number(
    row.solektraCommission ?? row.companyCommission ?? row.solektraShare ?? 0,
  );

  return {
    vetId: String(row.vetId ?? row._id ?? ''),
    name: String(row.fullName ?? row.name ?? '—'),
    email: optionalString(row.email),
    phoneNumber: optionalString(row.phoneNumber),
    bankName: optionalString(row.bankName),
    bankAccountNumber: optionalString(row.bankAccountNumber),
    netPremium,
    totalInsurance: Number(row.totalInsurance ?? netPremium),
    veterinaryCommission,
    solektraCommission,
    totalCommission13_5: Number(
      row.totalCommission13_5 ??
        row.totalCommission ??
        veterinaryCommission + solektraCommission,
    ),
    applicationsCount: Number(row.applicationsCount ?? row.totalApplications ?? 0),
    district: resolveDistrict(row),
  };
}

export function mapApplicationRow(raw: RawRecord): LivestockFinanceApplication {
  const client = (raw.client as RawRecord | undefined) ?? {};
  return {
    _id: String(raw._id ?? ''),
    applicationNumber: String(raw.applicationNumber ?? ''),
    status: optionalString(raw.status),
    submittedAt: optionalString(raw.submittedAt),
    vetId: optionalString(raw.vetId),
    vetName: optionalString(raw.vetName) ?? optionalString(raw.fullName),
    clientName: optionalString(raw.clientName) ?? optionalString(client.fullName),
    district: optionalString(raw.district) ?? optionalString(client.district),
    netPremium: Number(raw.netPremium ?? raw.amount ?? 0),
    veterinaryCommission: Number(raw.veterinaryCommission ?? 0),
    solektraCommission: Number(raw.solektraCommission ?? raw.companyCommission ?? 0),
    totalCommission: Number(raw.totalCommission ?? raw.totalCommission13_5 ?? 0),
  };
}

type RawPaidBatch = {
  month?: string;
  totalMonthPaid?: number;
  vets?: Array<{ vet?: RawRecord; totalPaid?: number }>;
};

/** Normalises `getLivestockPaidBatchesByYear` into a fixed 12-month list. */
export function mapPaidHistoryYear(payload: unknown): LivestockPaidHistoryMonthBlock[] {
  const byMonthName = new Map<
    string,
    { totalMonthPaid: number; vets: LivestockPaidHistoryMonthBlock['vets'] }
  >();

  for (const item of unwrapRows<RawPaidBatch>(payload)) {
    const rawMonth = String(item?.month ?? '').trim().toLowerCase();
    const monthName = MONTH_NAMES.find((m) => m.toLowerCase() === rawMonth);
    if (!monthName) continue;

    const vets = (Array.isArray(item.vets) ? item.vets : []).map((entry) => {
      const v = entry?.vet ?? {};
      return {
        vetId: String(v._id ?? v.vetId ?? ''),
        name: String(v.fullName ?? v.name ?? ''),
        email: optionalString(v.email),
        phoneNumber: optionalString(v.phoneNumber),
        bankName: optionalString(v.bankName),
        bankAccountNumber: optionalString(v.bankAccountNumber),
        totalPaid: Number(entry?.totalPaid ?? 0),
      };
    });

    byMonthName.set(monthName, {
      totalMonthPaid: Number(item?.totalMonthPaid ?? 0),
      vets,
    });
  }

  return MONTH_NAMES.map((monthName, idx) => {
    const block = byMonthName.get(monthName);
    return {
      monthIndex: idx + 1,
      monthName,
      totalMonthPaid: block?.totalMonthPaid ?? 0,
      vets: block?.vets ?? [],
    };
  });
}
