'use client';

import type { ReactNode } from 'react';
import { HumannessPanel } from '@/components/tinh-gon/HumannessPanel';
import type { TinhGonDecision } from '@/lib/tinh-gon/types';

interface QualitySummaryItem {
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'muted';
}

interface QualityPanelProps {
  humannessScore: number | null;
  decision?: TinhGonDecision | null;
  issues?: string[];
  forbiddenFound?: string[];
  summaryTitle?: string;
  summaryItems?: QualitySummaryItem[];
  children?: ReactNode;
}

const toneClass: Record<NonNullable<QualitySummaryItem['tone']>, string> = {
  good: 'text-green-600',
  warn: 'text-amber-600',
  muted: 'text-gray-500',
};

export function QualityPanel({
  humannessScore,
  decision = 'REVIEW',
  issues = [],
  forbiddenFound = [],
  summaryTitle = 'Readability',
  summaryItems = [],
  children,
}: QualityPanelProps) {
  return (
    <div className="space-y-4 p-4">
      <HumannessPanel
        score={humannessScore}
        decision={decision}
        issues={issues}
        forbiddenFound={forbiddenFound}
      />

      {(summaryItems.length > 0 || children) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-gray-800">{summaryTitle}</p>
          {summaryItems.length > 0 && (
            <div className="space-y-2 text-sm">
              {summaryItems.map((item) => (
                <p key={item.label} className={toneClass[item.tone ?? 'muted']}>
                  {item.label}: {item.value}
                </p>
              ))}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
