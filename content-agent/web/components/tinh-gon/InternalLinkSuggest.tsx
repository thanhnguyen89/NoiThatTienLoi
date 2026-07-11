'use client';

import type { TinhGonInternalLinkSuggestion } from '@/lib/tinh-gon/types';

interface Props {
  links: TinhGonInternalLinkSuggestion[];
  onInsert: (text: string) => void;
}

export function InternalLinkSuggest({ links, onInsert }: Props) {
  if (links.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white">
      <p className="text-sm font-semibold text-gray-700 mb-3">🔗 Internal Links gợi ý</p>
      <div className="space-y-2">
        {links.map((link) => (
          <div key={link.slug} className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-800 truncate">{link.title}</p>
              <p className="text-xs text-gray-400">{link.relevance}% liên quan</p>
            </div>
            <button
              type="button"
              onClick={() => onInsert(`<a href="${link.url}">${link.suggestText || link.title}</a>`)}
              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 shrink-0"
            >
              Chèn
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
