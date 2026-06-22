import { VETERINARY_ROLE } from '@/shared/utils/role';

export type LivestockUsersViewerRole = 'ADMIN' | 'SUPER_ADMIN';

/** Roles visible in the livestock workspace user table */
export function getLivestockWorkspaceRoles(viewerRole: LivestockUsersViewerRole): string[] {
  if (viewerRole === 'SUPER_ADMIN') {
    return [VETERINARY_ROLE, 'ADMIN'];
  }
  return [VETERINARY_ROLE];
}

export function getUsersListEndpoint(viewerRole: LivestockUsersViewerRole): string {
  return viewerRole === 'SUPER_ADMIN'
    ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/getAllusers`
    : `${process.env.NEXT_PUBLIC_API_BASE_URL}/users`;
}

export function formatLivestockUserRole(role: string): string {
  if (role === VETERINARY_ROLE) return 'Veterinarian';
  if (role === 'ADMIN') return 'Admin';
  return role.charAt(0) + role.slice(1).toLowerCase();
}
