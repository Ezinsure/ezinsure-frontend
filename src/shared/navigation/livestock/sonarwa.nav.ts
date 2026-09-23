import { LayoutDashboard, FileText, UserCircle, ClipboardCheck } from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/sonarwa/livestock';

export const livestockSonarwaNavigation: NavGroup[] = [
  {
    label: 'Review',
    items: [
      { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `${base}/applications`, label: 'Applications', icon: FileText },
      {
        href: `${base}/commission-requests`,
        label: 'Commission Requests',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    label: 'Account',
    items: [{ href: `${base}/profile`, label: 'Profile', icon: UserCircle }],
  },
];
