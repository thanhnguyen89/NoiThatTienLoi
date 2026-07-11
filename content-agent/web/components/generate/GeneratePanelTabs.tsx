'use client';

import type { GenerateTab } from '@/lib/shared/generate-tabs';
import { GENERATE_TABS, TAB_LABELS } from '@/lib/shared/generate-tabs';

interface GeneratePanelTabsProps {
  value: GenerateTab;
  onChange: (tab: GenerateTab) => void;
  tabs?: readonly GenerateTab[];
}

export function GeneratePanelTabs({
  value,
  onChange,
  tabs = GENERATE_TABS,
}: GeneratePanelTabsProps) {
  return (
    <div className="flex shrink-0 overflow-x-auto border-b border-gray-200 bg-white">
      {tabs.map((tab) => {
        const meta = TAB_LABELS[tab];
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            aria-pressed={value === tab}
            className={`min-w-0 flex-1 whitespace-nowrap px-2 py-2.5 text-center text-[10px] font-semibold transition-colors ${
              value === tab
                ? 'border-b-2 border-blue-600 bg-white text-blue-600'
                : 'border-b-2 border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <span className="truncate">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
