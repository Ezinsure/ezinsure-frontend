import {
  LayoutDashboard,
  Upload,
  FileText,
  HelpCircle,
  UserCircle,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/admin/livestock';

export const livestockAdminNavigation: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `${base}/import`, label: 'Import from Tekana', icon: Upload },
      { href: `${base}/applications`, label: 'Applications', icon: FileText },
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
