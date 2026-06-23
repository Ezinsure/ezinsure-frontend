import {
  LayoutDashboard,
  FileText,
  Users,
  Clock,
  MessageSquare,
  BarChart3,
  HelpCircle,
  UserCircle,
  Building2,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/super_admin/motor';

export const motorSuperAdminNavigation: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `${base}/applications`, label: 'Applications', icon: FileText },
    ],
  },
  {
    label: 'Commissions',
    items: [
      { href: `${base}/company-performance`, label: 'Company Performance', icon: Building2 },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: `${base}/users`, label: 'Manage Users', icon: Users },
      { href: `${base}/expiring-insurance`, label: 'Expiring Insurance', icon: Clock },
      { href: `${base}/sms-tracking`, label: 'SMS Tracking', icon: MessageSquare },
      { href: `${base}/agents/analytics`, label: 'Agent Analytics', icon: BarChart3 },
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
