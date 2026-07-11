'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import ModelPicker from '@/app/components/ModelPicker';
import { REWRITE_LANGUAGES, REWRITE_STYLES } from '@/lib/viet-lai/options';
import type { ParagraphRewriteConfig } from '@/lib/viet-lai/types';

const DEFAULT_CONFIG: ParagraphRewriteConfig = {
  originalText: '',
  style: 'standard',
  language: 'Vietnamese',
  model: 'gemini-flash',
};

export default function VietLaiDoanVanPage() {
  const [config, setConfig] = useState<ParagraphRewriteConfig>(DEFAULT_CONFIG);
  const [output, setOutput] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const inputWordCount = config.originalText.trim()
    ? config.originalText.trim().split(/\s+/).length
    : 0;

  async function handleRewrite() {
    const text = config.originalText.trim();
    if (!text) {
      setError('Vui lòng nhập nội dung cần viết lại.');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError('');
    setOutput('');
    setWordCount(0);

    try {
      const response = await fetch('/api/viet-lai/paragraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Lỗi kết nối đến AI');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const line = event
            .split('\n')
            .map((item) => item.trim())
            .find((item) => item.startsWith('data: '));

          if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as {
            type: string;
            text?: string;
            wordCount?: number;
            message?: string;
          };

          if (payload.type === 'chunk' && payload.text) {
            setOutput((prev) => prev + payload.text);
          } else if (payload.type === 'done') {
            setWordCount(payload.wordCount ?? 0);
          } else if (payload.type === 'error') {
            setError(payload.message ?? 'Lỗi AI');
          }
        }
      }
    } catch (requestError) {
      if ((requestError as Error).name !== 'AbortError') {
        setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (output) void navigator.clipboard.writeText(output);
  }

  function handleClear() {
    setConfig((prev) => ({ ...prev, originalText: '' }));
    setOutput('');
    setWordCount(0);
    setError('');
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-gray-200 bg-white">
        {[
          { label: 'Viết lại đoạn văn', href: '/viet-lai-doan-van', active: true },
          { label: 'Viết lại bài viết', href: '/viet-lai-bai-viet', active: false },
          { label: 'Viết lại URL', href: '/viet-lai-url', active: false },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab.active
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-gray-200 p-4 overflow-y-auto bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <span>📎</span>
                <span>Upload</span>
                <input
                  type="file"
                  accept=".txt,.md,.html"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (readerEvent) => {
                      setConfig((prev) => ({ ...prev, originalText: String(readerEvent.target?.result ?? '') }));
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
            <span className="text-xs text-gray-400">{inputWordCount} từ</span>
          </div>

          <textarea
            value={config.originalText}
            onChange={(event) => setConfig((prev) => ({ ...prev, originalText: event.target.value }))}
            placeholder="Gõ hoặc dán nội dung cần viết lại vào đây..."
            className="flex-1 w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[260px]"
          />

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Model AI</label>
              <ModelPicker value={config.model} onChange={(id) => setConfig((prev) => ({ ...prev, model: id }))} size="md" label="" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Ngôn ngữ</label>
              <select
                value={config.language}
                onChange={(event) => setConfig((prev) => ({ ...prev, language: event.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REWRITE_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Phong cách viết</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {REWRITE_STYLES.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, style: style.value }))}
                    title={style.note}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors text-xs ${
                      config.style === style.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <span>{style.emoji}</span>
                    <span>{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleRewrite()}
              disabled={loading || !config.originalText.trim()}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Đang viết lại...' : 'Do Rewrite'}
            </button>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4 bg-gray-50 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-600">Kết quả</span>
            <div className="flex items-center gap-2">
              {wordCount > 0 && <span className="text-xs text-gray-400">số từ: {wordCount}</span>}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!output}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[260px]">
            {loading && !output && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>AI đang viết lại...</span>
              </div>
            )}
            {output || (!loading && (
              <p className="text-gray-400 italic">Kết quả sẽ hiển thị ở đây sau khi bấm &quot;Do Rewrite&quot;.</p>
            ))}
          </div>

          {output && loading && (
            <p className="text-xs text-blue-500 mt-2 animate-pulse">Đang stream...</p>
          )}
        </div>
      </div>
    </div>
  );
}
