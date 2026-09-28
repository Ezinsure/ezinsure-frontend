import type { ExportColumn } from '@/shared/export/types';
import { exportTableToExcel, exportTableToPdf } from '@/shared/export/table-export';
import {
  formatApplicationStatus,
  formatExportDate,
  formatRwfExport,
  formatRwfExportNumber,
  sanitizeFilenameSegment,
} from '@/shared/export/formatters';
import { formatPoliceNumberForExport } from '@/utils/police-number';

/** Row shape used by the agent analytics table */
export interface AgentAnalyticsExportRow {
  name: string;
  email: string;
  phoneNumber: string;
  province?: string;
  district?: string;
  status?: string;
  totalApplications: number;
  totalCommission: number;
  averageCommission: number;
  totalRevenue: number;
}

/** Row shape used by the agent detail applications table */
export interface AgentApplicationExportRow {
  applicationNumber: string;
  clientName: string;
  clientEmail: string;
  insuranceCategory: string;
  insuranceType: string;
  amount: number;
  agentCommission: number;
  status: string;
  submittedAt: string;
  policeNumber: string;
}

const AGENT_ANALYTICS_COLUMNS: ExportColumn<AgentAnalyticsExportRow>[] = [
  { header: 'Agent Name', getValue: (r) => r.name, pdfWidth: 32 },
  { header: 'Email', getValue: (r) => r.email, pdfWidth: 38 },
  { header: 'Phone', getValue: (r) => r.phoneNumber, pdfWidth: 28 },
  { header: 'Province', getValue: (r) => r.province || '—', pdfWidth: 28 },
  { header: 'District', getValue: (r) => r.district || '—', pdfWidth: 28 },
  { header: 'Applications', getValue: (r) => r.totalApplications, pdfWidth: 22 },
  { header: 'Total Commission (RWF)', getValue: (r) => formatRwfExportNumber(r.totalCommission), pdfWidth: 30 },
  { header: 'Avg Commission (RWF)', getValue: (r) => Math.round(r.averageCommission * 100) / 100, pdfWidth: 28 },
  { header: 'Total Revenue (RWF)', getValue: (r) => formatRwfExportNumber(r.totalRevenue), pdfWidth: 30 },
  { header: 'Status', getValue: (r) => r.status || 'ACTIVE', pdfWidth: 22 },
];

const AGENT_APPLICATION_COLUMNS: ExportColumn<AgentApplicationExportRow>[] = [
  { header: 'Application #', getValue: (r) => r.applicationNumber, pdfWidth: 36 },
  { header: 'Client', getValue: (r) => r.clientName, pdfWidth: 32 },
  { header: 'Client Email', getValue: (r) => r.clientEmail, pdfWidth: 38 },
  { header: 'Category', getValue: (r) => r.insuranceCategory, pdfWidth: 28 },
  { header: 'Type', getValue: (r) => r.insuranceType, pdfWidth: 32 },
  { header: 'Amount (RWF)', getValue: (r) => formatRwfExportNumber(r.amount), pdfWidth: 26 },
  { header: 'Commission (RWF)', getValue: (r) => formatRwfExportNumber(r.agentCommission), pdfWidth: 28 },
  { header: 'Status', getValue: (r) => formatApplicationStatus(r.status), pdfWidth: 28 },
  { header: 'Police Number', getValue: (r) => formatPoliceNumberForExport(r), pdfWidth: 24 },
  { header: 'Submitted', getValue: (r) => formatExportDate(r.submittedAt), pdfWidth: 24 },
];

export interface AgentAnalyticsExportParams {
  rows: AgentAnalyticsExportRow[];
  startDate: string;
  endDate: string;
  searchQuery?: string;
  provinceFilter?: string;
  statusFilter?: string;
}

export interface AgentApplicationsExportParams {
  rows: AgentApplicationExportRow[];
  agentName: string;
  agentEmail: string;
  startDate: string;
  endDate: string;
  searchQuery?: string;
  statusFilter?: string;
}

function buildAgentAnalyticsContext(params: AgentAnalyticsExportParams): string[] {
  const lines = [`Date range: ${params.startDate} to ${params.endDate}`];
  if (params.searchQuery?.trim()) lines.push(`Search: ${params.searchQuery.trim()}`);
  if (params.provinceFilter && params.provinceFilter !== 'all') {
    lines.push(`Province: ${params.provinceFilter}`);
  }
  if (params.statusFilter && params.statusFilter !== 'all') {
    lines.push(`Status: ${params.statusFilter}`);
  }
  return lines;
}

function buildAgentAnalyticsSummary(rows: AgentAnalyticsExportRow[]): string[] {
  const totalCommission = rows.reduce((sum, r) => sum + r.totalCommission, 0);
  const totalApplications = rows.reduce((sum, r) => sum + r.totalApplications, 0);
  const totalRevenue = rows.reduce((sum, r) => sum + r.totalRevenue, 0);
  return [
    `Agents exported: ${rows.length}`,
    `Total applications: ${totalApplications}`,
    `Total commission: ${formatRwfExport(totalCommission)}`,
    `Total revenue: ${formatRwfExport(totalRevenue)}`,
  ];
}

function buildAgentApplicationsContext(params: AgentApplicationsExportParams): string[] {
  const lines = [
    `Agent: ${params.agentName}`,
    `Email: ${params.agentEmail}`,
    `Date range: ${params.startDate} to ${params.endDate}`,
  ];
  if (params.searchQuery?.trim()) lines.push(`Search: ${params.searchQuery.trim()}`);
  if (params.statusFilter && params.statusFilter !== 'all') {
    lines.push(`Status: ${formatApplicationStatus(params.statusFilter)}`);
  }
  return lines;
}

function buildAgentApplicationsSummary(rows: AgentApplicationExportRow[]): string[] {
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  const totalCommission = rows.reduce((sum, r) => sum + r.agentCommission, 0);
  return [
    `Applications exported: ${rows.length}`,
    `Total amount: ${formatRwfExport(totalAmount)}`,
    `Total commission: ${formatRwfExport(totalCommission)}`,
  ];
}

export async function exportAgentAnalyticsToExcel(params: AgentAnalyticsExportParams): Promise<void> {
  await exportTableToExcel({
    title: 'Agent Analytics',
    filenameBase: 'agent_analytics',
    sheetName: 'Agents',
    columns: AGENT_ANALYTICS_COLUMNS,
    rows: params.rows,
    contextLines: buildAgentAnalyticsContext(params),
    summaryLines: buildAgentAnalyticsSummary(params.rows),
  });
}

export async function exportAgentAnalyticsToPdf(params: AgentAnalyticsExportParams): Promise<void> {
  await exportTableToPdf({
    title: 'EZInsure — Agent Analytics Report',
    subtitle: 'Motor insurance agent performance',
    filenameBase: 'agent_analytics',
    columns: AGENT_ANALYTICS_COLUMNS,
    rows: params.rows,
    contextLines: buildAgentAnalyticsContext(params),
    summaryLines: buildAgentAnalyticsSummary(params.rows),
    pdfOrientation: 'landscape',
  });
}

export async function exportAgentApplicationsToExcel(params: AgentApplicationsExportParams): Promise<void> {
  const agentSlug = sanitizeFilenameSegment(params.agentName);
  await exportTableToExcel({
    title: `Applications — ${params.agentName}`,
    filenameBase: `agent_applications_${agentSlug}`,
    sheetName: 'Applications',
    columns: AGENT_APPLICATION_COLUMNS,
    rows: params.rows,
    contextLines: buildAgentApplicationsContext(params),
    summaryLines: buildAgentApplicationsSummary(params.rows),
  });
}

export async function exportAgentApplicationsToPdf(params: AgentApplicationsExportParams): Promise<void> {
  const agentSlug = sanitizeFilenameSegment(params.agentName);
  await exportTableToPdf({
    title: 'EZInsure — Agent Applications Report',
    subtitle: params.agentName,
    filenameBase: `agent_applications_${agentSlug}`,
    columns: AGENT_APPLICATION_COLUMNS,
    rows: params.rows,
    contextLines: buildAgentApplicationsContext(params),
    summaryLines: buildAgentApplicationsSummary(params.rows),
    pdfOrientation: 'landscape',
  });
}
