import { VETERINARY_ROLE } from '@/shared/utils/role';

/** Public self-registration account types. */
export type RegistrationAccountType = 'AGENT' | typeof VETERINARY_ROLE;

export const REGISTRATION_ACCOUNT_TYPES: {
  id: RegistrationAccountType;
  title: string;
  description: string;
}[] = [
  {
    id: 'AGENT',
    title: 'Insurance agent',
    description:
      'Sell motor and livestock policies. Your application is reviewed by ezInsure admin before you can sign in.',
  },
  {
    id: VETERINARY_ROLE,
    title: 'Veterinarian',
    description:
      'Submit livestock applications and commission requests. You must wait for admin verification after registering — login stays locked until approved.',
  },
];

export function registrationRoleLabel(
  role: RegistrationAccountType | string,
): string {
  return role === VETERINARY_ROLE ? 'veterinarian' : 'agent';
}
