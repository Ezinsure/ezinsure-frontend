import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  HelpCircle,
  UserCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/vet/livestock';

export const livestockVetNavigation: NavGroup[] = [
  {
    items: [
      { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `${base}/applications/new`, label: 'New application', icon: FilePlus2 },
      { href: `${base}/applications`, label: 'My Applications', icon: FileText },
      { href: `${base}/renewals`, label: 'Renewals', icon: RefreshCw },
      { href: `${base}/expiring`, label: 'Expiring clients', icon: Clock },
      { href: `${base}/FAQ`, label: 'FAQ', icon: HelpCircle },
      { href: `${base}/profile`, label: 'Profile', icon: UserCircle },
    ],
  },
];
