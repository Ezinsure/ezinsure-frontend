import {
  LayoutDashboard,
  FileText,
  FilePlus,
  ClipboardList,
  Users,
  Clock,
  MessageSquare,
  BarChart3,
  HelpCircle,
  UserCircle,
  Building2,
  UserCheck,
} from 'lucide-react';
import type { NavGroup } from '@/shared/navigation/types';

const base = '/admin/motor';

export const motorAdminNavigation: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: `${base}/applications`, label: 'Applications', icon: FileText },
      { href: `${base}/my-applications`, label: 'My Applications', icon: ClipboardList },
      { href: `${base}/new-application`, label: 'Apply', icon: FilePlus },
    ],
  },
  {
    label: 'Commissions',
    items: [
      { href: `${base}/commission-review`, label: 'Commission Review', icon: BarChart3 },
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
      { href: `${base}/customer-retention`, label: 'Customer Retention', icon: UserCheck },
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
