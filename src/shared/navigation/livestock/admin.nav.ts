import {
  LayoutDashboard,
  Upload,
  FileText,
  Users,
  HelpCircle,
  UserCircle,
  Wallet,
  Stethoscope,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

type LivestockAdminRolePrefix = 'admin' | 'super_admin';

export function getLivestockAdminNavigation(rolePrefix: LivestockAdminRolePrefix): NavGroup[] {
  const base = `/${rolePrefix}/livestock`;

  return [
    {
      label: 'Operations',
      items: [
        { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `${base}/import`, label: 'Import from Tekana', icon: Upload },
        { href: `${base}/applications`, label: 'Applications', icon: FileText },
        { href: `${base}/commission-review`, label: 'Admin Review', icon: Wallet },
        { href: `${base}/vet-analytics`, label: 'Vet Analytics', icon: Stethoscope },
      ],
    },
    {
      label: 'Management',
      items: [
        { href: `${base}/users`, label: 'Manage Users', icon: Users },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: `${base}/FAQ`, label: 'FAQ', icon: HelpCircle },
        { href: `${base}/profile`, label: 'Profile', icon: UserCircle },
      ],
    },
  ];
}
