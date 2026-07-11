'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '@/app/components/ModelPicker';
import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import {
  TOPLIST_IMAGE_OPTIONS,
  TOPLIST_STRUCTURES,
  TOPLIST_TONES,
  TOPLIST_TOP_N_OPTIONS,
  computeToplistTargetLength,
} from '@/lib/viet-toplist/options';
import type { SuggestKeywordsResponse, ToplistConfig, ToplistStartResponse, ToplistTopN } from '@/lib/viet-toplist/types';

const DEFAULT_CONFIG: ToplistConfig = {
  keyword: '',
  secondaryKeywords: [],
  topN: 10,
  structure: 'intro_features_pros_cons',
  tone: 'formal_seo',
  dataSource: 'ai_only',
  imageOption: 'none',
  language: 'Vietnamese',
  model: 'gemini-flash',
};

export default function VietToplistPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ToplistConfig>(DEFAULT_CONFIG);
  const [kwInput, setKwInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Viết Toplist - Content Agent';
    const stored = sessionStorage.getItem('vtl_config');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ToplistConfig;
        setConfig(parsed);
        setKwInput(parsed.secondaryKeywords.join(', '));
      } catch {
        sessionStorage.removeItem('vtl_config');
      }
    }
  }, []);

  function parseKeywords(raw: string): string[] {
    return raw.split(',').map((keyword) => keyword.trim()).filter(Boolean);
  }

  const estimatedWords = computeToplistTargetLength(config.topN, config.structure);

  async function handleSuggestKeywords() {
    if (!config.keyword.trim()) {
      setError('Nhập từ khoá chính trước khi gợi ý.');
      return;
    }

    setSuggestLoading(true);
    setError('');
    try {
      const res = await fetch('/api/viet-toplist/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: config.keyword, topN: config.topN, language: config.language }),
      });

      const data = await res.json() as SuggestKeywordsResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Không thể gợi ý');
      if (data.keywords) {
        const joined = data.keywords.join(', ');
        setKwInput(joined);
        setConfig((prev) => ({ ...prev, secondaryKeywords: data.keywords }));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
    } finally {
      setSuggestLoading(false);
    }
  }

  async function handleNext() {
    const keyword = config.keyword.trim();
    if (!keyword) {
      setError('Vui lòng nhập từ khóa chính.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalConfig: ToplistConfig = {
        ...config,
        keyword,
        secondaryKeywords: parseKeywords(kwInput),
      };

      const res = await fetch('/api/viet-toplist/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: finalConfig }),
      });

      const data = await res.json() as ToplistStartResponse & { error?: string };
      if (!res.ok || !data.articleId || !data.runId) {
        throw new Error(data.error || 'Không thể bắt đầu');
      }

      sessionStorage.setItem('vtl_config', JSON.stringify(finalConfig));
      sessionStorage.setItem('vtl_article_id', data.articleId);
      sessionStorage.setItem('vtl_run_id', data.runId);
      if (data.serpData) sessionStorage.setItem('vtl_serp_data', data.serpData);
      else sessionStorage.removeItem('vtl_serp_data');
      sessionStorage.removeItem('vtl_result');

      router.push('/viet-toplist/generate');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Viết Toplist theo từ khóa</h1>
          <p className="text-sm text-gray-500 mb-4">
            AI viết bài Top N sản phẩm hoặc lựa chọn với cấu trúc nhất quán cho từng item.
          </p>
          <div className="flex items-center gap-2">
            {['Cấu hình', 'Viết & Chỉnh sửa'].map((label, index) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`h-1.5 flex-1 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <span className={`text-xs whitespace-nowrap ${index === 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {index + 1}. {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Từ khóa chính <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.keyword}
            onChange={(event) => setConfig((prev) => ({ ...prev, keyword: event.target.value }))}
            placeholder="VD: giường sắt giá rẻ, tủ quần áo 3 cánh..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Số lượng item</label>
          <div className="flex flex-wrap gap-2">
            {TOPLIST_TOP_N_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, topN: value as ToplistTopN }))}
                className={`w-12 h-10 text-sm rounded-lg border-2 font-medium transition-colors ${
                  config.topN === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Ước tính ~{estimatedWords.toLocaleString()} từ với cấu trúc đã chọn
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-700">Từ khoá phụ / Tên items gợi ý</label>
            <button
              type="button"
              onClick={() => void handleSuggestKeywords()}
              disabled={suggestLoading || !config.keyword.trim()}
              className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
            >
              {suggestLoading ? '⟳ Đang gợi ý...' : '✨ AI gợi ý'}
            </button>
          </div>
          <textarea
            value={kwInput}
            onChange={(event) => {
              setKwInput(event.target.value);
              setConfig((prev) => ({ ...prev, secondaryKeywords: parseKeywords(event.target.value) }));
            }}
            rows={3}
            placeholder="giường sắt 1m2, giường sắt 1m4, giường sắt 1m6, giường sắt 2 tầng..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">
            Phân cách bằng dấu phẩy. Để trống → AI tự đặt tên {config.topN} items.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Nguồn dữ liệu</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'google_search', label: '🔍 Google Search + AI', note: 'Dữ liệu thực tế từ SERP, chính xác hơn. Tốn 1 Google quota.' },
              { value: 'ai_only', label: '🤖 Chỉ dùng AI', note: 'Nhanh hơn, không cần Google key.' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, dataSource: item.value as ToplistConfig['dataSource'] }))}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  config.dataSource === item.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-800">{item.label}</div>
                <div className="text-xs text-gray-500 mt-1">{item.note}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Ảnh cho bài viết</label>
          <div className="grid grid-cols-2 gap-2">
            {TOPLIST_IMAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, imageOption: option.value as ToplistConfig['imageOption'] }))}
                className={`p-3 rounded-lg border-2 text-left flex items-center gap-2 transition-colors ${
                  config.imageOption === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <span className="text-lg">{option.icon}</span>
                <span className="text-sm font-medium text-gray-700">{option.label}</span>
              </button>
            ))}
          </div>
          {config.imageOption === 'ai_generated' && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ AI tạo ảnh cần cấu hình riêng, xem docs tính năng tạo ảnh.
            </p>
          )}
          {config.imageOption === 'shutterstock' && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Shutterstock yêu cầu API key trả phí — xem <code>SHUTTERSTOCK_API_KEY</code>.
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Cấu trúc mỗi item</label>
          <div className="space-y-2">
            {TOPLIST_STRUCTURES.map((structure) => (
              <button
                key={structure.value}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, structure: structure.value }))}
                className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                  config.structure === structure.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-800">{structure.label}</span>
                  <span className="text-xs text-gray-400">~{structure.wordsPerItem} từ/item</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{structure.note}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Tone giọng văn</label>
          <div className="space-y-2">
            {TOPLIST_TONES.map((tone) => (
              <button
                key={tone.value}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, tone: tone.value }))}
                className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                  config.tone === tone.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-800">{tone.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{tone.note}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Model AI</label>
          <ModelPicker value={config.model} onChange={(id) => setConfig((prev) => ({ ...prev, model: id }))} size="md" label="" />
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ Toplist dài (~{estimatedWords.toLocaleString()} từ) — ưu tiên model có context window lớn.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Ngôn ngữ</label>
          <div className="flex gap-3">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, language: lang.value }))}
                className={`flex-1 py-2.5 text-sm rounded-lg border-2 transition-colors ${
                  config.language === lang.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleNext()}
          disabled={loading || !config.keyword.trim()}
          className="w-full py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="animate-spin">⟳</span> Đang khởi tạo...</>
          ) : (
            `Viết Top ${config.topN} ${config.keyword || '...'} →`
          )}
        </button>
      </div>
    </div>
  );
}
