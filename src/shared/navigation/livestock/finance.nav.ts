import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  UserCircle,
  Stethoscope,
  Clock,
  History,
  Banknote,
  ClipboardList,
  RefreshCw,
  UserRoundSearch,
  CalendarRange,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/finance/livestock';

export const livestockFinanceNavigation: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `${base}/applications`, label: 'Applications', icon: FileText },
      { href: `${base}/renewals`, label: 'Renewals', icon: RefreshCw },
      { href: `${base}/commission-review`, label: 'Admin Review', icon: ClipboardList },
      { href: `${base}/vet-analytics`, label: 'Vet Analytics', icon: Stethoscope },
      {
        href: `${base}/external-vets`,
        label: 'External Vets',
        icon: UserRoundSearch,
      },
      { href: `${base}/payment-cycles`, label: 'Payment Cycles', icon: CalendarRange },
      { href: `${base}/payments`, label: 'Payments', icon: Banknote },
      { href: `${base}/payment-initiated`, label: 'Initiated Payments', icon: Clock },
      { href: `${base}/history`, label: 'Payment History', icon: History },
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
