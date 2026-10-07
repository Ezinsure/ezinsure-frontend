import { normalizeRole } from '@/shared/utils/role';

export type MotorUsersViewerRole = 'ADMIN' | 'SUPER_ADMIN' | 'FINANCE';

/** Roles visible in the motor workspace user table (livestock staff excluded). */
export function getMotorWorkspaceRoles(viewerRole: MotorUsersViewerRole): string[] {
  if (viewerRole === 'SUPER_ADMIN') {
    return ['ADMIN', 'AGENT', 'FINANCE', 'SUPER_ADMIN'];
  }
  if (viewerRole === 'FINANCE') {
    return ['ADMIN', 'AGENT', 'FINANCE'];
  }
  return ['ADMIN', 'AGENT'];
}

export function userBelongsToMotorWorkspace(
  userRole: string,
  viewerRole: MotorUsersViewerRole,
): boolean {
  const normalized = normalizeRole(userRole);
  return getMotorWorkspaceRoles(viewerRole).includes(normalized);
}

export function filterMotorWorkspaceUsers<T extends { role: string }>(
  users: T[],
  viewerRole: MotorUsersViewerRole,
): T[] {
  return users.filter((user) => userBelongsToMotorWorkspace(user.role, viewerRole));
}
