import {
  LayoutDashboard,
  Upload,
  FileText,
  Users,
  HelpCircle,
  UserCircle,
  Wallet,
  Stethoscope,
  RefreshCw,
  UserRoundSearch,
  Settings2,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

type LivestockAdminRolePrefix = 'admin' | 'super_admin';

export function getLivestockAdminNavigation(rolePrefix: LivestockAdminRolePrefix): NavGroup[] {
  const base = `/${rolePrefix}/livestock`;
  const isSuperAdmin = rolePrefix === 'super_admin';

  const managementItems = [
    { href: `${base}/users`, label: 'Manage Users', icon: Users },
    ...(isSuperAdmin
      ? [
          {
            href: '/super_admin/settings/commission-defaults',
            label: 'Commission settings',
            icon: Settings2,
          },
        ]
      : []),
  ];

  return [
    {
      label: 'Operations',
      items: [
        { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `${base}/import`, label: 'Import from Tekana', icon: Upload },
        { href: `${base}/applications`, label: 'Applications', icon: FileText },
        { href: `${base}/renewals`, label: 'Renewals', icon: RefreshCw },
        { href: `${base}/commission-review`, label: 'Admin Review', icon: Wallet },
        { href: `${base}/vet-analytics`, label: 'Vet Analytics', icon: Stethoscope },
        {
          href: `${base}/external-vets`,
          label: 'Commission Requests',
          icon: UserRoundSearch,
        },
      ],
    },
    {
      label: 'Management',
      items: managementItems,
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
