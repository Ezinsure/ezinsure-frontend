import { SONARWA_REPRESENTATIVE_ROLE, VETERINARY_ROLE } from '@/shared/utils/role';

export type LivestockUsersViewerRole = 'ADMIN' | 'SUPER_ADMIN';

/** Roles that can be created / managed from the livestock users workspace. */
export type LivestockCreatableRole =
  | typeof VETERINARY_ROLE
  | typeof SONARWA_REPRESENTATIVE_ROLE;

/** Roles visible in the livestock workspace user table */
export function getLivestockWorkspaceRoles(viewerRole: LivestockUsersViewerRole): string[] {
  if (viewerRole === 'SUPER_ADMIN') {
    return [VETERINARY_ROLE, SONARWA_REPRESENTATIVE_ROLE, 'ADMIN'];
  }
  return [VETERINARY_ROLE, SONARWA_REPRESENTATIVE_ROLE];
}

export function getUsersListEndpoint(viewerRole: LivestockUsersViewerRole): string {
  return viewerRole === 'SUPER_ADMIN'
    ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/getAllusers`
    : `${process.env.NEXT_PUBLIC_API_BASE_URL}/users`;
}

export function formatLivestockUserRole(role: string): string {
  if (role === VETERINARY_ROLE) return 'Veterinarian';
  if (role === SONARWA_REPRESENTATIVE_ROLE) return 'SONARWA Representative';
  if (role === 'ADMIN') return 'Admin';
  return role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, ' ');
}

export function livestockCreateRoleLabel(role: LivestockCreatableRole): string {
  if (role === VETERINARY_ROLE) return 'Veterinarian';
  return 'SONARWA Representative';
}
