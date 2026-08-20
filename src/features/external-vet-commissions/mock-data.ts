import type {
  CreateCommissionBatchInput,
  CreateExternalVetInput,
  ExternalVet,
  ExternalVetCommissionBatch,
  ExternalVetCommissionBatchSummary,
  ExternalVetCommissionLine,
  ExternalVetCommissionStatus,
  ExternalVetPerformanceRow,
  ExternalVetsOverviewStats,
  PlatformVetSearchHit,
} from './domain';

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const SAMPLE_LINES: Omit<ExternalVetCommissionLine, 'id'>[] = [
  {
    sn: 1,
    prodDate: '18/03/2026 10:52:10',
    branch: 'Butare',
    effecDate: '18/03/2026',
    expiryDate: '17/03/2027',
    contract: '0717484|BASE|00',
    typeLivestock: 'Cattle-Non-Girinka',
    clientId: '0500866',
    clientName: 'TUMUSIFU JEROME',
    agent: 'SOLEKTRA R',
    sumInsured: 1000000,
    netPremium: 55000,
    commission: 5500,
    userName: 'NYAMWASA',
  },
  {
    sn: 2,
    prodDate: '18/03/2026 11:01:14',
    branch: 'Butare',
    effecDate: '18/03/2026',
    expiryDate: '17/03/2027',
    contract: '0717486|BASE|00',
    typeLivestock: 'Cattle-Non-Girinka',
    clientId: '0500866',
    clientName: 'TUMUSIFU JEROME',
    agent: 'SOLEKTRA R',
    sumInsured: 600000,
    netPremium: 33000,
    commission: 3300,
    userName: 'NYAMWASA',
  },
  {
    sn: 3,
    prodDate: '18/03/2026 11:07:27',
    branch: 'Butare',
    effecDate: '18/03/2026',
    expiryDate: '17/03/2027',
    contract: '0717487|BASE|00',
    typeLivestock: 'Cattle-Non-Girinka',
    clientId: '0500866',
    clientName: 'TUMUSIFU JEROME',
    agent: 'SOLEKTRA R',
    sumInsured: 1000000,
    netPremium: 55000,
    commission: 5500,
    userName: 'NYAMWASA',
  },
  {
    sn: 4,
    prodDate: '18/03/2026 10:57:00',
    branch: 'Butare',
    effecDate: '18/03/2026',
    expiryDate: '17/03/2027',
    contract: '0717485|BASE|00',
    typeLivestock: 'Cattle-Non-Girinka',
    clientId: '0500866',
    clientName: 'TUMUSIFU JEROME',
    agent: 'SOLEKTRA R',
    sumInsured: 700000,
    netPremium: 38500,
    commission: 3850,
    userName: 'NYAMWASA',
  },
  {
    sn: 5,
    prodDate: '18/03/2026 10:47:16',
    branch: 'Butare',
    effecDate: '18/03/2026',
    expiryDate: '17/03/2027',
    contract: '0717483|BASE|00',
    typeLivestock: 'Cattle-Non-Girinka',
    clientId: '0500866',
    clientName: 'TUMUSIFU JEROME',
    agent: 'SOLEKTRA R',
    sumInsured: 1200000,
    netPremium: 66000,
    commission: 6600,
    userName: 'NYAMWASA',
  },
  {
    sn: 6,
    prodDate: '25/03/2026 11:16:26',
    branch: 'Butare',
    effecDate: '25/03/2026',
    expiryDate: '24/03/2027',
    contract: '0717553|BASE|00',
    typeLivestock: 'Cattle-Non-Girinka',
    clientId: '0501412',
    clientName: 'HABIMANA EMMANUEL',
    agent: 'SOLEKTRA R',
    sumInsured: 1200000,
    netPremium: 66000,
    commission: 6600,
    userName: 'NYAMWASA',
  },
  {
    sn: 7,
    prodDate: '25/03/2026 11:22:27',
    branch: 'Butare',
    effecDate: '25/03/2026',
    expiryDate: '24/03/2027',
    contract: '0717554|BASE|00',
    typeLivestock: 'Cattle-Non-Girinka',
    clientId: '0501413',
    clientName: 'MUTUYEYEZU THEOPHILE',
    agent: 'SOLEKTRA R',
    sumInsured: 1200000,
    netPremium: 66000,
    commission: 6600,
    userName: 'NYAMWASA',
  },
  {
    sn: 8,
    prodDate: '25/03/2026 11:26:14',
    branch: 'Butare',
    effecDate: '25/03/2026',
    expiryDate: '24/03/2027',
    contract: '0717552|BASE|00',
    typeLivestock: 'Cattle-Non-Girinka',
    clientId: '0501413',
    clientName: 'MUTUYEYEZU THEOPHILE',
    agent: 'SOLEKTRA R',
    sumInsured: 400000,
    netPremium: 22000,
    commission: 2200,
    userName: 'NYAMWASA',
  },
];

let batchSeq = 3;

const vets: ExternalVet[] = [
  {
    id: 'ext-vet-001',
    name: 'AHISHAKIYE THEOPHILE',
    phoneNumber: '0788494556',
    bankName: 'EQUITY BANK',
    bankAccountNumber: '4008112892329',
    createdById: 'admin-001',
    createdAt: '2026-08-12T10:00:00.000Z',
    updatedAt: '2026-08-12T10:00:00.000Z',
  },
  {
    id: 'ext-vet-002',
    name: 'UWIMANA CLAUDINE',
    phoneNumber: '0788123456',
    bankName: 'BPR',
    bankAccountNumber: '1000556677889',
    createdById: 'admin-001',
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-01T09:00:00.000Z',
  },
];

const platformVets: PlatformVetSearchHit[] = [
  {
    userId: 'plat-vet-001',
    fullName: 'Dr. Jean Baptiste Nkurunziza',
    phoneNumber: '+250788123456',
    bankName: 'BPR',
    bankAccountNumber: '1000123456789',
    email: 'j.nkurunziza@rwandavet.rw',
  },
  {
    userId: 'plat-vet-002',
    fullName: 'Dr. Marie Claire Uwimana',
    phoneNumber: '+250789234567',
    bankName: 'Bank of Kigali',
    bankAccountNumber: '2000987654321',
    email: 'mc.uwimana@livestock.rw',
  },
];

function withLineIds(
  rows: Omit<ExternalVetCommissionLine, 'id'>[],
): ExternalVetCommissionLine[] {
  return rows.map((row) => ({ ...row, id: uid('line') }));
}

const batches: ExternalVetCommissionBatch[] = [
  {
    id: 'evc-batch-001',
    batchNumber: 'EVC-2026-0001',
    status: 'PENDING_ADMIN_REVIEW',
    externalVetId: 'ext-vet-001',
    payee: {
      name: 'AHISHAKIYE THEOPHILE',
      phoneNumber: '0788494556',
      bankName: 'EQUITY BANK',
      bankAccountNumber: '4008112892329',
    },
    periodLabel: 'UP MAY 2026',
    sourceFileName: 'Vet_Gisagara_Huye_branch.xlsx',
    totalCommission: 40150,
    lineCount: 8,
    lines: withLineIds(SAMPLE_LINES),
    createdById: 'admin-001',
    createdByName: 'Admin User',
    createdAt: '2026-08-12T11:00:00.000Z',
  },
  {
    id: 'evc-batch-002',
    batchNumber: 'EVC-2026-0002',
    status: 'READY_TO_BE_PAID',
    externalVetId: 'ext-vet-002',
    payee: {
      name: 'UWIMANA CLAUDINE',
      phoneNumber: '0788123456',
      bankName: 'BPR',
      bankAccountNumber: '1000556677889',
    },
    periodLabel: 'UP APRIL 2026',
    sourceFileName: 'Vet_Huye_April.xlsx',
    totalCommission: 18700,
    lineCount: 3,
    lines: withLineIds([
      {
        sn: 1,
        prodDate: '10/04/2026 09:00:00',
        branch: 'Butare',
        effecDate: '10/04/2026',
        expiryDate: '09/04/2027',
        contract: '0718001|BASE|00',
        typeLivestock: 'Cattle-Non-Girinka',
        clientId: '0502001',
        clientName: 'NSHIMIYIMANA JEAN',
        agent: 'SOLEKTRA R',
        sumInsured: 900000,
        netPremium: 49500,
        commission: 4950,
        userName: 'NYAMWASA',
      },
      {
        sn: 2,
        prodDate: '10/04/2026 09:15:00',
        branch: 'Butare',
        effecDate: '10/04/2026',
        expiryDate: '09/04/2027',
        contract: '0718002|BASE|00',
        typeLivestock: 'Cattle-Non-Girinka',
        clientId: '0502002',
        clientName: 'MUKAMANA ALICE',
        agent: 'SOLEKTRA R',
        sumInsured: 1100000,
        netPremium: 60500,
        commission: 6050,
        userName: 'NYAMWASA',
      },
      {
        sn: 3,
        prodDate: '12/04/2026 14:20:00',
        branch: 'Butare',
        effecDate: '12/04/2026',
        expiryDate: '11/04/2027',
        contract: '0718003|BASE|00',
        typeLivestock: 'Cattle-Non-Girinka',
        clientId: '0502003',
        clientName: 'HABIMANA ERIC',
        agent: 'SOLEKTRA R',
        sumInsured: 1400000,
        netPremium: 77000,
        commission: 7700,
        userName: 'NYAMWASA',
      },
    ]),
    createdById: 'admin-001',
    createdByName: 'Admin User',
    createdAt: '2026-07-20T10:00:00.000Z',
    reviewedById: 'admin-001',
    reviewedByName: 'Admin User',
    reviewedAt: '2026-07-21T08:30:00.000Z',
  },
  {
    id: 'evc-batch-003',
    batchNumber: 'EVC-2026-0003',
    status: 'PAID',
    externalVetId: 'ext-vet-001',
    payee: {
      name: 'AHISHAKIYE THEOPHILE',
      phoneNumber: '0788494556',
      bankName: 'EQUITY BANK',
      bankAccountNumber: '4008112892329',
    },
    periodLabel: 'UP MARCH 2026',
    sourceFileName: 'Vet_March.xlsx',
    totalCommission: 22000,
    lineCount: 2,
    lines: withLineIds([
      {
        sn: 1,
        prodDate: '05/03/2026 10:00:00',
        branch: 'Butare',
        effecDate: '05/03/2026',
        expiryDate: '04/03/2027',
        contract: '0717001|BASE|00',
        typeLivestock: 'Cattle-Non-Girinka',
        clientId: '0501001',
        clientName: 'KAMANZI PAUL',
        agent: 'SOLEKTRA R',
        sumInsured: 2000000,
        netPremium: 110000,
        commission: 11000,
        userName: 'NYAMWASA',
      },
      {
        sn: 2,
        prodDate: '05/03/2026 10:20:00',
        branch: 'Butare',
        effecDate: '05/03/2026',
        expiryDate: '04/03/2027',
        contract: '0717002|BASE|00',
        typeLivestock: 'Cattle-Non-Girinka',
        clientId: '0501002',
        clientName: 'UWASE DIVINE',
        agent: 'SOLEKTRA R',
        sumInsured: 2000000,
        netPremium: 110000,
        commission: 11000,
        userName: 'NYAMWASA',
      },
    ]),
    createdById: 'admin-001',
    createdByName: 'Admin User',
    createdAt: '2026-04-01T10:00:00.000Z',
    reviewedById: 'admin-001',
    reviewedByName: 'Admin User',
    reviewedAt: '2026-04-02T09:00:00.000Z',
    paymentInitiatedAt: '2026-04-05T11:00:00.000Z',
    paidAt: '2026-04-08T15:00:00.000Z',
    paidById: 'finance-001',
    paidByName: 'Finance User',
  },
];

function toSummary(batch: ExternalVetCommissionBatch): ExternalVetCommissionBatchSummary {
  const { lines: _lines, ...rest } = batch;
  return rest;
}

function actorFrom(
  actor?: { id: string; name: string },
): { id: string; name: string } {
  return actor ?? { id: 'local-user', name: 'Local User' };
}

export const mockExternalVetCommissionsApi = {
  listExternalVets: async (): Promise<ExternalVet[]> => [...vets],

  searchPlatformVets: async (q: string): Promise<PlatformVetSearchHit[]> => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [...platformVets];
    return platformVets.filter(
      (v) =>
        v.fullName.toLowerCase().includes(needle) ||
        (v.phoneNumber ?? '').includes(needle) ||
        (v.email ?? '').toLowerCase().includes(needle),
    );
  },

  createExternalVet: async (
    input: CreateExternalVetInput,
    actor?: { id: string; name: string },
  ): Promise<ExternalVet> => {
    const who = actorFrom(actor);
    const vet: ExternalVet = {
      id: uid('ext-vet'),
      name: input.name.trim(),
      phoneNumber: input.phoneNumber.trim(),
      bankName: input.bankName?.trim() || undefined,
      bankAccountNumber: input.bankAccountNumber?.trim() || undefined,
      linkedUserId: input.linkedUserId,
      createdById: who.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    vets.unshift(vet);
    return vet;
  },

  listBatches: async (
    status?: ExternalVetCommissionStatus | 'ALL',
  ): Promise<ExternalVetCommissionBatchSummary[]> => {
    const filtered =
      !status || status === 'ALL'
        ? batches
        : batches.filter((b) => b.status === status);
    return filtered
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toSummary);
  },

  getBatch: async (id: string): Promise<ExternalVetCommissionBatch | null> => {
    return batches.find((b) => b.id === id) ?? null;
  },

  createBatch: async (
    input: CreateCommissionBatchInput,
    actor?: { id: string; name: string },
  ): Promise<ExternalVetCommissionBatch> => {
    const who = actorFrom(actor);
    batchSeq += 1;
    const lines = withLineIds(input.lines);
    const totalCommission = lines.reduce((sum, l) => sum + l.commission, 0);
    const batch: ExternalVetCommissionBatch = {
      id: uid('evc-batch'),
      batchNumber: `EVC-2026-${String(batchSeq).padStart(4, '0')}`,
      status: 'PENDING_ADMIN_REVIEW',
      externalVetId: input.externalVetId,
      payee: { ...input.payee },
      periodLabel: input.periodLabel,
      sourceFileName: input.sourceFileName,
      totalCommission,
      lineCount: lines.length,
      lines,
      createdById: who.id,
      createdByName: who.name,
      createdAt: nowIso(),
    };
    batches.unshift(batch);
    return batch;
  },

  approveBatch: async (
    id: string,
    note?: string,
    actor?: { id: string; name: string },
  ): Promise<ExternalVetCommissionBatch> => {
    const batch = batches.find((b) => b.id === id);
    if (!batch) throw new Error('Batch not found');
    if (batch.status !== 'PENDING_ADMIN_REVIEW') {
      throw new Error('Batch is not pending admin review');
    }
    const who = actorFrom(actor);
    batch.status = 'READY_TO_BE_PAID';
    batch.reviewedById = who.id;
    batch.reviewedByName = who.name;
    batch.reviewedAt = nowIso();
    batch.reviewNote = note?.trim() || undefined;
    return batch;
  },

  rejectBatch: async (
    id: string,
    note: string,
    actor?: { id: string; name: string },
  ): Promise<ExternalVetCommissionBatch> => {
    const batch = batches.find((b) => b.id === id);
    if (!batch) throw new Error('Batch not found');
    if (batch.status !== 'PENDING_ADMIN_REVIEW') {
      throw new Error('Batch is not pending admin review');
    }
    const who = actorFrom(actor);
    batch.status = 'REJECTED';
    batch.reviewedById = who.id;
    batch.reviewedByName = who.name;
    batch.reviewedAt = nowIso();
    batch.reviewNote = note.trim();
    return batch;
  },

  initiatePayment: async (
    id: string,
    actor?: { id: string; name: string },
  ): Promise<ExternalVetCommissionBatch> => {
    const batch = batches.find((b) => b.id === id);
    if (!batch) throw new Error('Batch not found');
    if (batch.status !== 'READY_TO_BE_PAID') {
      throw new Error('Batch is not ready to be paid');
    }
    actorFrom(actor);
    batch.status = 'PAYMENT_INITIATED';
    batch.paymentInitiatedAt = nowIso();
    return batch;
  },

  markPaid: async (
    id: string,
    actor?: { id: string; name: string },
  ): Promise<ExternalVetCommissionBatch> => {
    const batch = batches.find((b) => b.id === id);
    if (!batch) throw new Error('Batch not found');
    if (batch.status !== 'PAYMENT_INITIATED') {
      throw new Error('Batch is not payment initiated');
    }
    const who = actorFrom(actor);
    batch.status = 'PAID';
    batch.paidAt = nowIso();
    batch.paidById = who.id;
    batch.paidByName = who.name;
    return batch;
  },

  initiatePaymentBulk: async (
    ids: string[],
    actor?: { id: string; name: string },
  ): Promise<ExternalVetCommissionBatch[]> => {
    const results: ExternalVetCommissionBatch[] = [];
    for (const id of ids) {
      results.push(await mockExternalVetCommissionsApi.initiatePayment(id, actor));
    }
    return results;
  },

  markPaidBulk: async (
    ids: string[],
    actor?: { id: string; name: string },
  ): Promise<ExternalVetCommissionBatch[]> => {
    const results: ExternalVetCommissionBatch[] = [];
    for (const id of ids) {
      results.push(await mockExternalVetCommissionsApi.markPaid(id, actor));
    }
    return results;
  },

  getOverview: async (): Promise<ExternalVetsOverviewStats> => {
    const year = new Date().getFullYear();
    const pending = batches.filter((b) => b.status === 'PENDING_ADMIN_REVIEW');
    const ready = batches.filter((b) => b.status === 'READY_TO_BE_PAID');
    const initiated = batches.filter((b) => b.status === 'PAYMENT_INITIATED');
    const paidYtd = batches.filter(
      (b) =>
        b.status === 'PAID' &&
        b.paidAt &&
        new Date(b.paidAt).getFullYear() === year,
    );
    const performance = await mockExternalVetCommissionsApi.getPerformance();
    return {
      pendingReviewCount: pending.length,
      pendingReviewCommission: pending.reduce((s, b) => s + b.totalCommission, 0),
      readyToPayCount: ready.length,
      readyToPayCommission: ready.reduce((s, b) => s + b.totalCommission, 0),
      initiatedCount: initiated.length,
      initiatedCommission: initiated.reduce((s, b) => s + b.totalCommission, 0),
      paidYtdCount: paidYtd.length,
      paidYtdCommission: paidYtd.reduce((s, b) => s + b.totalCommission, 0),
      externalVetCount: vets.length,
      topVets: performance.slice(0, 5),
    };
  },

  getPerformance: async (): Promise<ExternalVetPerformanceRow[]> => {
    return vets
      .map((vet) => {
        const vetBatches = batches.filter((b) => b.externalVetId === vet.id);
        const sumWhere = (status: ExternalVetCommissionStatus) =>
          vetBatches
            .filter((b) => b.status === status)
            .reduce((s, b) => s + b.totalCommission, 0);
        return {
          externalVetId: vet.id,
          name: vet.name,
          phoneNumber: vet.phoneNumber,
          batchCount: vetBatches.length,
          totalCommission: vetBatches.reduce((s, b) => s + b.totalCommission, 0),
          pendingCommission: sumWhere('PENDING_ADMIN_REVIEW'),
          readyCommission: sumWhere('READY_TO_BE_PAID') + sumWhere('PAYMENT_INITIATED'),
          paidCommission: sumWhere('PAID'),
        };
      })
      .sort((a, b) => b.totalCommission - a.totalCommission);
  },
};
