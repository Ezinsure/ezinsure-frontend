import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  UserCircle,
  Wallet,
  Stethoscope,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/finance/livestock';

export const livestockFinanceNavigation: NavGroup[] = [
    {
      label: 'Operations',
      items: [
        { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `${base}/applications`, label: 'Applications', icon: FileText },
        { href: `${base}/commission-review`, label: 'Admin Review', icon: Wallet },
        { href: `${base}/vet-analytics`, label: 'Vet Analytics', icon: Stethoscope },
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
