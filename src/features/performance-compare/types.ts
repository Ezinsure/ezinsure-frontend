export type PerformanceCompareAudience = 'admin' | 'agent' | 'vet';

export type PerformanceCompareMetricKind =
  | 'count'
  | 'currency'
  | 'number';

export type PerformanceCompareMetric = {
  id: string;
  label: string;
  kind: PerformanceCompareMetricKind;
  /** Value for current month-to-date (1st → asOf). */
  current: number;
  /** Value for prior month MTD (1st → same day last month). */
  previous: number;
};

export type PerformanceCompareResult = {
  /** Inclusive end of current MTD (usually today). */
  asOf: string;
  /** Inclusive start of current MTD (1st of month). */
  currentStart: string;
  /** Inclusive end of prior MTD (same calendar day last month). */
  previousAsOf: string;
  /** Inclusive start of prior MTD (1st of prior month). */
  previousStart: string;
  audience: PerformanceCompareAudience;
  metrics: PerformanceCompareMetric[];
  /** True when values came from the dedicated compare endpoint. */
  fromApi: boolean;
};

export type PerformanceCompareDelta = {
  absolute: number;
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
};

export function computeDelta(
  current: number,
  previous: number,
): PerformanceCompareDelta {
  const absolute = current - previous;
  if (absolute === 0) {
    return { absolute: 0, percent: previous === 0 ? null : 0, direction: 'flat' };
  }
  const direction = absolute > 0 ? 'up' : 'down';
  if (previous === 0) {
    return { absolute, percent: null, direction };
  }
  return {
    absolute,
    percent: (absolute / Math.abs(previous)) * 100,
    direction,
  };
}
