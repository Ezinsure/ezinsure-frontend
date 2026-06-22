import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}
