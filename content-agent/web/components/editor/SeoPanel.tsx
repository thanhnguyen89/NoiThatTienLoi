'use client';

import { useMemo, useState } from 'react';
import { countPassedChecks, runAllSeoChecks, type SeoCheckResult, type SeoScore } from './SeoChecks';
import { SerpPreview } from './SerpPreview';

interface SeoPanelProps {
  html: string;
  keyword: string;
  title: string;
  metaDescription: string;
  slug?: string;
  onMetaChange: (field: 'title' | 'description', value: string) => void;
}

function ScoreBar({ label, passed, total }: { label: string; passed: number; total: number }) {
  const pct = Math.round((passed / total) * 100);

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-semibold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
          {passed}/{total}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CheckList({ checks }: { checks: SeoCheckResult[] }) {
  return (
    <ul className="space-y-1.5">
      {checks.map((check) => (
        <li key={`${check.label}-${check.message}`} className="flex items-start gap-2">
          <span className={`mt-0.5 text-sm flex-shrink-0 ${check.passed ? 'text-green-500' : 'text-red-400'}`}>
            {check.passed ? '✓' : '✗'}
          </span>
          <div className="flex-1 min-w-0">
            <span className={`text-xs ${check.passed ? 'text-gray-700' : 'text-gray-500'}`}>
              {check.label}
            </span>
            {!check.passed && (
              <p className="text-xs text-red-500 mt-0.5">{check.message}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

type SeoSection = 'basic' | 'additional' | 'titleRead' | 'contentRead';

const SECTION_LABELS: Record<SeoSection, string> = {
  basic: 'Basic SEO',
  additional: 'Additional SEO',
  titleRead: 'Title Readability',
  contentRead: 'Content Readability',
};

export function SeoPanel({ html, keyword, title, metaDescription, slug, onMetaChange }: SeoPanelProps) {
  const [expandedSection, setExpandedSection] = useState<SeoSection | null>('basic');

  const score: SeoScore = useMemo(
    () => runAllSeoChecks(html, keyword, title, metaDescription),
    [html, keyword, title, metaDescription],
  );

  const totalPassed = (
    countPassedChecks(score.basic) +
    countPassedChecks(score.additional) +
    countPassedChecks(score.titleRead) +
    countPassedChecks(score.contentRead)
  );
  const totalChecks = 21;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="text-center py-3 border-b border-gray-100">
        <div className={`text-3xl font-bold ${totalPassed >= 17 ? 'text-green-600' : totalPassed >= 12 ? 'text-amber-500' : 'text-red-500'}`}>
          {totalPassed}/{totalChecks}
        </div>
        <div className="text-xs text-gray-500 mt-1">SEO Score</div>
      </div>

      <SerpPreview
        title={title}
        description={metaDescription}
        keyword={keyword}
        slug={slug}
        onChange={onMetaChange}
      />

      <div>
        <ScoreBar label="Basic SEO" passed={countPassedChecks(score.basic)} total={7} />
        <ScoreBar label="Additional SEO" passed={countPassedChecks(score.additional)} total={7} />
        <ScoreBar label="Title Readability" passed={countPassedChecks(score.titleRead)} total={4} />
        <ScoreBar label="Content Readability" passed={countPassedChecks(score.contentRead)} total={3} />
      </div>

      {(Object.keys(SECTION_LABELS) as SeoSection[]).map((section) => {
        const checks = score[section];
        const passed = countPassedChecks(checks);
        const isOpen = expandedSection === section;

        return (
          <div key={section} className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedSection(isOpen ? null : section)}
              className="w-full flex justify-between items-center px-3 py-2.5 text-left hover:bg-gray-50"
            >
              <span className="text-xs font-semibold text-gray-700">{SECTION_LABELS[section]}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${passed === checks.length ? 'text-green-600' : 'text-amber-500'}`}>
                  {passed}/{checks.length}
                </span>
                <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                <CheckList checks={checks} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
