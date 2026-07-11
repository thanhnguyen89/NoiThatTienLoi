'use client';

import { useEffect, useState } from 'react';

interface SerpPreviewProps {
  title: string;
  description: string;
  keyword: string;
  slug?: string;
  onChange: (field: 'title' | 'description', value: string) => void;
}

function highlightKeyword(text: string, keyword: string): string {
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-transparent font-semibold">$1</mark>');
}

export function SerpPreview({ title, description, keyword, slug, onChange }: SerpPreviewProps) {
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description);

  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  useEffect(() => {
    setEditDesc(description);
  }, [description]);

  const titleLen = editTitle.length;
  const descLen = editDesc.length;
  const previewUrl = `example.com/${slug ?? 'bai-viet'}`;
  const displayTitle = editTitle.length > 60 ? `${editTitle.slice(0, 57)}...` : editTitle;
  const displayDesc = editDesc.length > 160 ? `${editDesc.slice(0, 157)}...` : editDesc;

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">SERP Preview</p>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
        <p className="text-xs text-green-700 mb-0.5">{previewUrl}</p>
        <p
          className="text-blue-700 text-base font-medium leading-snug mb-1 cursor-pointer hover:underline"
          dangerouslySetInnerHTML={{ __html: highlightKeyword(displayTitle, keyword) }}
        />
        <p
          className="text-sm text-gray-600 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightKeyword(displayDesc, keyword) }}
        />
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Tiêu đề SEO</label>
            <span className={`text-xs ${titleLen > 70 ? 'text-red-500' : titleLen > 60 ? 'text-amber-500' : 'text-gray-400'}`}>
              {titleLen}/70
            </span>
          </div>
          <input
            type="text"
            value={editTitle}
            onChange={(event) => {
              setEditTitle(event.target.value);
              onChange('title', event.target.value);
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div
            className={`h-1 mt-1 rounded-full ${titleLen <= 60 ? 'bg-green-400' : titleLen <= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${Math.min((titleLen / 70) * 100, 100)}%` }}
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Meta Description</label>
            <span className={`text-xs ${descLen > 160 ? 'text-red-500' : 'text-gray-400'}`}>
              {descLen}/160
            </span>
          </div>
          <textarea
            value={editDesc}
            onChange={(event) => {
              setEditDesc(event.target.value);
              onChange('description', event.target.value);
            }}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
