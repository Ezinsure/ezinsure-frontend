import { LayoutDashboard, FileText, UserCircle } from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/sonarwa/livestock';

export const livestockSonarwaNavigation: NavGroup[] = [
  {
    label: 'Review',
    items: [
      { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `${base}/applications`, label: 'Applications', icon: FileText },
    ],
  },
  {
    label: 'Account',
    items: [{ href: `${base}/profile`, label: 'Profile', icon: UserCircle }],
  },
];
