'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ComingSoonButtonProps {
  children: React.ReactNode;
  tooltip?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function ComingSoonButton({
  children,
  tooltip = 'Coming soon — digital signing on platform',
  variant = 'outline',
  size = 'sm',
  className = '',
}: ComingSoonButtonProps) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      <Button type="button" variant={variant} size={size} disabled className="opacity-60">
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        {children}
      </Button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-lg group-hover:block"
      >
        {tooltip}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}
