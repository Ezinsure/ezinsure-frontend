import { LayoutDashboard } from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/sonarwa/motor';

export const motorSonarwaNavigation: NavGroup[] = [
  {
    items: [{ href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard }],
  },
];
