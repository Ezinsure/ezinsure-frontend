import {
  LayoutDashboard,
  Wallet,
  Clock,
  History,
  UserCircle,
  BarChart3,
  ClipboardList,
  Building2,
  FileText,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/finance/motor';

export const motorFinanceNavigation: NavGroup[] = [
  {
    items: [
      { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `${base}/applications`, label: 'Applications', icon: FileText },
      { href: `${base}/agents/analytics`, label: 'Agent Analytics', icon: BarChart3 },
      { href: `${base}/commission-review`, label: 'Commission Review', icon: ClipboardList },
      { href: `${base}/company-performance`, label: 'Company Performance', icon: Building2 },
      { href: `${base}/payments`, label: 'Payments', icon: Wallet },
      { href: `${base}/payment-initiated`, label: 'Initiated Payments', icon: Clock },
      { href: `${base}/history`, label: 'Payment History', icon: History },
      { href: `${base}/profile`, label: 'Profile', icon: UserCircle },
    ],
  },
];
