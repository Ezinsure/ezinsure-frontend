'use client';

import type {
  ApplicationDetailNavItem,
  ApplicationDetailSectionId,
} from '@/features/livestock-application/utils/application-detail-sections';

interface ApplicationInfoTabsProps {
  items: ApplicationDetailNavItem[];
  activeSection: ApplicationDetailSectionId;
  onSelect: (section: ApplicationDetailSectionId) => void;
}

export function ApplicationInfoTabs({
  items,
  activeSection,
  onSelect,
}: ApplicationInfoTabsProps) {
  return (
    <div className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
