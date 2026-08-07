import {
  LayoutDashboard,
  FileText,
  FilePlus,
  HelpCircle,
  UserCircle,
  RefreshCw,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/agent/motor';

export const motorAgentNavigation: NavGroup[] = [
  {
    items: [
      { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `${base}/applications`, label: 'My Applications', icon: FileText },
      { href: `${base}/apply`, label: 'Apply', icon: FilePlus },
      { href: `${base}/renewals`, label: 'Renewals', icon: RefreshCw },
      { href: `${base}/FAQ`, label: 'FAQ', icon: HelpCircle },
      { href: `${base}/profile`, label: 'Profile', icon: UserCircle },
    ],
  },
];
