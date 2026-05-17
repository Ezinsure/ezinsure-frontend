import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  UserCircle,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/vet/livestock';

export const livestockVetNavigation: NavGroup[] = [
  {
    items: [
      { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `${base}/applications`, label: 'My Applications', icon: FileText },
      { href: `${base}/FAQ`, label: 'FAQ', icon: HelpCircle },
      { href: `${base}/profile`, label: 'Profile', icon: UserCircle },
    ],
  },
];
