export interface RevenueAnalyticsApiRow {
  month: string;
  totalCompanyCommission?: number;
  totalRevenue?: number;
  totalAgentCommission?: number;
  administrationFees?: number;
  totalApplications?: number;
  totalAgents?: number;
  conversionRate?: number;
}

export interface RevenueChartDataPoint {
  month: string;
  revenue: number;
  applications: number;
  agents: number;
  conversion: number;
}

function parseAmount(value: unknown): number {
  return Number(value ?? 0) || 0;
}

/** Parse GET /getRevenueAnalytics response into chart-ready monthly rows. */
export function parseRevenueAnalyticsPayload(payload: unknown): RevenueChartDataPoint[] {
  const root = (payload ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(root.data) ? root.data : [];

  return rows.map((row) => {
    const item = (row ?? {}) as RevenueAnalyticsApiRow;
    return {
      month: String(item.month ?? ''),
      revenue: parseAmount(item.totalCompanyCommission ?? item.totalRevenue),
      applications: parseAmount(item.totalApplications),
      agents: parseAmount(item.totalAgents),
      conversion: parseAmount(item.conversionRate),
    };
  });
}
