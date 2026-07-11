'use client';

import type { TinhGonDecision } from '@/lib/tinh-gon/types';

interface Props {
  score: number | null;
  decision: TinhGonDecision | null;
  issues: string[];
  forbiddenFound: string[];
  stale?: boolean;
}

const DECISION_STYLES: Record<TinhGonDecision, { bg: string; border: string; text: string; label: string }> = {
  PUBLISH: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'PUBLISH' },
  REVIEW: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'REVIEW' },
  REWRITE: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'REWRITE' },
};

export function HumannessPanel({ score, decision, issues, forbiddenFound, stale }: Props) {
  if (score === null) return null;

  const style = decision ? DECISION_STYLES[decision] : DECISION_STYLES.REVIEW;

  return (
    <div className={`rounded-xl border p-4 ${stale ? 'bg-gray-50 border-gray-200 opacity-75' : `${style.bg} ${style.border}`}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Humanness Score</span>
        {stale ? (
          <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
            <span className="inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            Đang chấm lại...
          </span>
        ) : (
          <span className={`text-sm font-bold ${style.text}`}>{style.label}</span>
        )}
      </div>

      <div className="h-2 bg-white/70 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            stale ? 'bg-gray-300' : score >= 76 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      <p className={`text-xs text-right font-bold mb-3 ${stale ? 'text-gray-400' : 'text-gray-600'}`}>{score}/100</p>

      {issues.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">Vấn đề phát hiện</p>
          <ul className="space-y-0.5">
            {issues.map((issue) => (
              <li key={issue} className="text-xs text-gray-600">
                • {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {forbiddenFound.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Từ/cụm từ nên sửa</p>
          <div className="flex flex-wrap gap-1.5">
            {forbiddenFound.map((word) => (
              <span
                key={word}
                className="px-2 py-0.5 rounded-full bg-white/80 border border-white text-xs text-gray-700"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
