export interface MonthlyCommissionSummary {
  totalCompanyCommission: number;
  totalAgentCommission: number;
  administrationFees: number;
}

export const EMPTY_MONTHLY_COMMISSION_SUMMARY: MonthlyCommissionSummary = {
  totalCompanyCommission: 0,
  totalAgentCommission: 0,
  administrationFees: 0,
};

/** Parse GET /getTotalCompanyCommissionThisMonth response. */
export function parseMonthlyCommissionSummary(payload: unknown): MonthlyCommissionSummary {
  const root = (payload ?? {}) as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;

  return {
    totalCompanyCommission: Number(nested.totalCompanyCommission ?? 0) || 0,
    totalAgentCommission: Number(nested.totalAgentCommission ?? 0) || 0,
    administrationFees: Number(nested.administrationFees ?? 0) || 0,
  };
}

export function getSonarwaBillingTotal(summary: MonthlyCommissionSummary): number {
  return (
    summary.totalCompanyCommission +
    summary.totalAgentCommission +
    summary.administrationFees
  );
}

export async function fetchMonthlyCommissionSummary(
  token: string,
  startDate: string,
  endDate: string,
): Promise<MonthlyCommissionSummary> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/getTotalCompanyCommissionThisMonth?startDate=${startDate}&endDate=${endDate}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return parseMonthlyCommissionSummary(data);
}
