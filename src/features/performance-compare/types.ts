export type PerformanceCompareAudience = 'admin' | 'agent' | 'vet';

export type PerformanceCompareMetricKind =
  | 'count'
  | 'currency'
  | 'number';

export type PerformanceCompareMetric = {
  id: string;
  label: string;
  kind: PerformanceCompareMetricKind;
  /** Value for “today”. */
  current: number;
  /** Value for the same calendar day last month. */
  previous: number;
};

export type PerformanceCompareResult = {
  asOf: string;
  previousAsOf: string;
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
