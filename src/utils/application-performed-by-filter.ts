export type PerformedByFilter = 'all' | 'admin' | 'agent' | 'client';

export interface ApplicationPerformedByFields {
  admin?: { fullName?: string } | null;
  agent?: { fullName?: string } | null;
}

export function getApplicationPerformedByKind(
  app: ApplicationPerformedByFields,
): Exclude<PerformedByFilter, 'all'> {
  if (app.admin) return 'admin';
  if (app.agent) return 'agent';
  return 'client';
}

export function matchesPerformedByFilter(
  app: ApplicationPerformedByFields,
  filter: PerformedByFilter,
): boolean {
  if (filter === 'all') return true;
  return getApplicationPerformedByKind(app) === filter;
}

export function performedByFilterLabel(filter: PerformedByFilter): string {
  switch (filter) {
    case 'admin':
      return 'Admin';
    case 'agent':
      return 'Agent';
    case 'client':
      return 'Client';
    default:
      return 'All';
  }
}
