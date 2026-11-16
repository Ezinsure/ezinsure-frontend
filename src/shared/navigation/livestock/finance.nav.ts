import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  UserCircle,
  Stethoscope,
  Banknote,
  ClipboardList,
  RefreshCw,
  UserRoundSearch,
  CalendarRange,
  BookOpen,
  ScrollText,
  Receipt,
  Scale,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/finance/livestock';

/**
 * Livestock finance sidebar.
 *
 * Finance = money flow (vets → SONARWA → bank).
 * Operations = underwriting / commissions tooling that feeds the ledger.
 */
export const livestockFinanceNavigation: NavGroup[] = [
  {
    label: 'Finance',
    items: [
      { href: `${base}/overview`, label: 'Overview', icon: LayoutDashboard },
      { href: `${base}/ledger`, label: 'Ledger', icon: BookOpen },
      { href: `${base}/payouts`, label: 'Payouts', icon: Banknote },
      { href: `${base}/statements`, label: 'Statements', icon: ScrollText },
      { href: `${base}/receipts`, label: 'Receipts', icon: Receipt },
      { href: `${base}/mismatches`, label: 'Differences', icon: Scale },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: `${base}/applications`, label: 'Applications', icon: FileText },
      { href: `${base}/renewals`, label: 'Renewals', icon: RefreshCw },
      { href: `${base}/commission-review`, label: 'Admin Review', icon: ClipboardList },
      { href: `${base}/vet-analytics`, label: 'Vet Analytics', icon: Stethoscope },
      {
        href: `${base}/external-vets`,
        label: 'Commission Requests',
        icon: UserRoundSearch,
      },
      { href: `${base}/payment-cycles`, label: 'Payment Cycles', icon: CalendarRange },
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
