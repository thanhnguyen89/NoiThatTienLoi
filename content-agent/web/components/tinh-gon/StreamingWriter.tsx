'use client';

import type { RefObject } from 'react';
import type { TinhGonEditCommand } from '@/lib/tinh-gon/types';

const EDIT_COMMANDS: Array<{ value: TinhGonEditCommand; label: string }> = [
  { value: 'shorten', label: 'Rút gọn' },
  { value: 'expand', label: 'Mở rộng' },
  { value: 'humanize', label: 'Tự nhiên hơn' },
  { value: 'more_spec', label: 'Thêm chi tiết' },
  { value: 'stronger_cta', label: 'CTA mạnh hơn' },
  { value: 'rewrite', label: 'Viết lại đoạn' },
];

interface Props {
  title: string;
  loading: boolean;
  activeTab: 'preview' | 'html';
  streamText: string;
  html: string;
  selectionLabel: string;
  textareaRef: RefObject<HTMLTextAreaElement>;
  aiEditing: boolean;
  onTabChange: (tab: 'preview' | 'html') => void;
  onChangeHtml: (value: string) => void;
  onApplyCommand: (command: TinhGonEditCommand) => void;
  onRefreshMetrics: () => void;
  onTextareaSelect: () => void;
}

export function StreamingWriter({
  title,
  loading,
  activeTab,
  streamText,
  html,
  selectionLabel,
  textareaRef,
  aiEditing,
  onTabChange,
  onChangeHtml,
  onApplyCommand,
  onRefreshMetrics,
  onTextareaSelect,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col min-h-[720px]">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-blue-600 mt-1">Bước 3 / 3 — Generate, edit và publish</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {([
            { key: 'preview', label: 'Preview' },
            { key: 'html', label: 'HTML Source' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === tab.key ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-700">AI Edit cho đoạn được chọn</p>
              <div className="relative group">
                <button
                  type="button"
                  aria-label="Hướng dẫn AI Edit"
                  className="w-5 h-5 rounded-full border border-blue-200 bg-white text-blue-600 text-xs font-bold hover:bg-blue-50"
                >
                  ?
                </button>
                <div className="absolute left-0 top-7 z-10 hidden w-72 rounded-lg border border-blue-200 bg-white p-3 text-xs text-gray-600 shadow-lg group-hover:block">
                  <p className="font-semibold text-gray-700 mb-1">Cách dùng AI Edit</p>
                  <p>1. Mở tab <strong>HTML Source</strong>.</p>
                  <p>2. Bôi đen đoạn cần sửa trong textarea.</p>
                  <p>3. Bấm lệnh AI Edit để thay đoạn đã chọn.</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {selectionLabel || 'AI Edit chỉ hoạt động ở tab HTML Source. Hãy mở tab này, bôi đen đoạn cần chỉnh, rồi chọn lệnh.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onRefreshMetrics}
            className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-white"
          >
            Re-check score
          </button>
        </div>
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <p className="text-xs text-blue-700">
            Hướng dẫn nhanh: <strong>HTML Source</strong> → bôi đen đoạn cần sửa → bấm lệnh AI Edit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {EDIT_COMMANDS.map((command) => (
            <button
              key={command.value}
              type="button"
              onClick={() => onApplyCommand(command.value)}
              disabled={aiEditing}
              className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs hover:bg-blue-50 disabled:opacity-50"
            >
              {aiEditing ? 'Đang xử lý...' : command.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-blue-700">AI đang viết bài...</p>
            </div>
            <pre className="flex-1 overflow-auto whitespace-pre-wrap text-xs text-gray-700 leading-relaxed">
              {streamText || 'Đang khởi tạo stream...'}
            </pre>
          </div>
        ) : activeTab === 'preview' ? (
          <div className="h-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={html}
            onSelect={onTextareaSelect}
            onChange={(event) => onChangeHtml(event.target.value)}
            spellCheck={false}
            className="w-full h-full min-h-[520px] border border-gray-300 rounded-xl p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>
    </div>
  );
}
