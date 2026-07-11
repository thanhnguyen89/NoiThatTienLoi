'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import {
  CONTENT_TYPES,
  DATA_SOURCE_MODES,
  TOPICAL_MAP_ROLES,
} from '@/lib/viet-bai-thong-minh/options';
import {
  clearVbtWorkflowStorage,
  writeVbtStorage,
} from '@/lib/viet-bai-thong-minh/storage';
import type {
  ContentType,
  DataSourceMode,
  SemanticAnalysis,
  TopicalMapRole,
  VbtStep1State,
} from '@/lib/viet-bai-thong-minh/types';

interface CannibalizationArticle {
  id: string;
  title: string;
  slug: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

interface CannibalizationPayload {
  success?: boolean;
  data?: {
    exists: boolean;
    articles: CannibalizationArticle[];
  };
}

function blankTriple(): string[] {
  return ['', '', ''];
}

function compactList(items: string[], max = 3): string[] {
  return items.map((item) => item.trim()).filter(Boolean).slice(0, max);
}

export default function VietBaiThongMinhStep1() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [secondaryKeywordsRaw, setSecondaryKeywordsRaw] = useState('');
  const [contentType, setContentType] = useState<ContentType>('blog_seo');
  const [topicalMapRole, setTopicalMapRole] = useState<TopicalMapRole>('standalone');
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(blankTriple);
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>('ai_only');
  const [dataSourceUrls, setDataSourceUrls] = useState<string[]>(blankTriple);
  const [dataSourceText, setDataSourceText] = useState('');
  const [language, setLanguage] = useState('Vietnamese');
  const [suggestingKw, setSuggestingKw] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [cannibalizationWarning, setCannibalizationWarning] = useState<{
    exists: boolean;
    articles: CannibalizationArticle[];
  } | null>(null);

  useEffect(() => {
    document.title = 'Viết Bài Thông Minh - Bước 1';
  }, []);

  useEffect(() => {
    const value = keyword.trim();
    if (value.length < 3) {
      setCannibalizationWarning(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/articles/check-cannibalization?keyword=${encodeURIComponent(value)}`);
          if (!response.ok) return;
          const payload = await response.json() as CannibalizationPayload;
          setCannibalizationWarning(payload.data ? {
            exists: payload.data.exists,
            articles: payload.data.articles,
          } : null);
        } catch {
          setCannibalizationWarning(null);
        }
      })();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [keyword]);

  function updateList(
    setter: (value: string[]) => void,
    current: string[],
    index: number,
    value: string,
  ) {
    const next = [...current];
    next[index] = value;
    setter(next);
  }

  async function handleSuggestKeywords() {
    const base = keyword.trim();
    if (!base) return;

    setSuggestingKw(true);
    try {
      const response = await fetch('/api/vbt/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: base,
          contentType,
          language,
        }),
      });
      const payload = await response.json() as { suggestions?: string[] };
      const existing = secondaryKeywordsRaw.split(',').map((item) => item.trim()).filter(Boolean);
      const merged = Array.from(new Set([...existing, ...(payload.suggestions || [])]));
      setSecondaryKeywordsRaw(merged.join(', '));
    } catch {
      // Silent fallback: keep existing secondary keywords untouched.
    } finally {
      setSuggestingKw(false);
    }
  }

  function buildState(): VbtStep1State {
    return {
      keyword: keyword.trim(),
      secondaryKeywordsRaw: secondaryKeywordsRaw.trim(),
      contentType,
      topicalMapRole,
      competitorUrls: compactList(competitorUrls),
      dataSourceMode,
      dataSourceUrls: compactList(dataSourceUrls),
      dataSourceText: dataSourceText.trim(),
      language,
    };
  }

  function validate(state: VbtStep1State): string {
    if (state.keyword.length < 3) return 'Nhập từ khóa tối thiểu 3 ký tự.';
    if (state.keyword.length > 200) return 'Từ khóa tối đa 200 ký tự.';
    if (state.dataSourceMode === 'url_crawl' && state.dataSourceUrls.length === 0) return 'Nhập ít nhất 1 URL nguồn dữ liệu.';
    if (state.dataSourceMode === 'manual_text' && state.dataSourceText.length < 30) return 'Nhập dữ liệu thủ công tối thiểu 30 ký tự.';
    return '';
  }

  async function handleAnalyze() {
    const state = buildState();
    const validationError = validate(state);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setAnalyzing(true);
    clearVbtWorkflowStorage();
    writeVbtStorage('step1', JSON.stringify(state));

    try {
      const response = await fetch('/api/vbt/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      const payload = await response.json() as SemanticAnalysis | { error?: string };

      if (!response.ok) {
        throw new Error('error' in payload ? payload.error || 'Không thể phân tích.' : 'Không thể phân tích.');
      }

      writeVbtStorage('semantic', JSON.stringify(payload));
      router.push('/viet-bai-thong-minh/step2');
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : 'Không thể phân tích từ khóa.');
      setAnalyzing(false);
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-gray-50 p-6">
      <div className="w-full space-y-5">
        <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-950">Viết Bài Thông Minh</h1>
              <p className="mt-1 text-sm text-blue-700">Bước 1 / 4 - Từ khóa, nguồn và dữ liệu semantic</p>
            </div>
            <button
              type="button"
              onClick={() => clearVbtWorkflowStorage()}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Bắt đầu lại
            </button>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className={`h-2 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Khối 1</p>
              <h2 className="text-lg font-black text-gray-900">Từ khóa chính</h2>
            </div>
            <button
              type="button"
              onClick={handleSuggestKeywords}
              disabled={!keyword.trim() || suggestingKw}
              className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              {suggestingKw ? 'Đang gợi ý...' : 'AI gợi ý từ khóa phụ'}
            </button>
          </div>

          <textarea
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setError('');
            }}
            rows={3}
            maxLength={200}
            placeholder="Ví dụ: giường sắt 2 tầng cho phòng nhỏ"
            className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={error ? 'text-red-600' : 'text-gray-400'}>
              {error || 'Nhập từ khóa SEO hoặc chủ đề bài viết cần tạo.'}
            </span>
            <span className="text-gray-400">{keyword.length}/200</span>
          </div>

          {cannibalizationWarning?.exists && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">
                Có {cannibalizationWarning.articles.length} bài viết gần keyword này.
              </p>
              <div className="mt-2 space-y-1">
                {cannibalizationWarning.articles.slice(0, 4).map((article) => (
                  <a
                    key={article.id}
                    href={`/dashboard/articles/${article.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs font-medium text-amber-700 underline"
                  >
                    {article.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1 block text-sm font-bold text-gray-700">Từ khóa phụ</label>
            <input
              type="text"
              value={secondaryKeywordsRaw}
              onChange={(event) => setSecondaryKeywordsRaw(event.target.value)}
              placeholder="cách nhau bằng dấu phẩy"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Loại nội dung</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CONTENT_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setContentType(item.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    contentType === item.value
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <span className="text-sm font-black">{item.label}</span>
                  <span className="mt-1 block text-xs text-gray-500">{item.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Bản đồ chủ đề</p>
            <div className="mt-3 space-y-2">
              {TOPICAL_MAP_ROLES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTopicalMapRole(item.value)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    topicalMapRole === item.value
                      ? 'border-violet-500 bg-violet-50 text-violet-800'
                      : 'border-gray-200 text-gray-700 hover:border-violet-300'
                  }`}
                >
                  <span className="text-sm font-black">{item.label}</span>
                  <span className="ml-2 text-xs text-gray-500">{item.note}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">URL đối thủ</p>
          <p className="mt-1 text-sm text-gray-500">Tối đa 3 URL đối thủ, không bắt buộc.</p>
          <div className="mt-3 grid gap-2">
            {competitorUrls.map((url, index) => (
              <input
                key={index}
                type="url"
                value={url}
                onChange={(event) => updateList(setCompetitorUrls, competitorUrls, index, event.target.value)}
                placeholder={`https://example.com/bai-doi-thu-${index + 1}`}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Nguồn dữ liệu</p>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {DATA_SOURCE_MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setDataSourceMode(item.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  dataSourceMode === item.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 text-gray-700 hover:border-emerald-300'
                }`}
              >
                <span className="text-sm font-black">{item.label}</span>
                <span className="mt-1 block text-xs text-gray-500">{item.note}</span>
              </button>
            ))}
          </div>

          {dataSourceMode === 'url_crawl' && (
            <div className="mt-4 grid gap-2">
              {dataSourceUrls.map((url, index) => (
                <input
                  key={index}
                  type="url"
                  value={url}
                  onChange={(event) => updateList(setDataSourceUrls, dataSourceUrls, index, event.target.value)}
                  placeholder={`https://example.com/source-${index + 1}`}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ))}
            </div>
          )}

          {dataSourceMode === 'manual_text' && (
            <textarea
              value={dataSourceText}
              onChange={(event) => setDataSourceText(event.target.value)}
              rows={6}
              placeholder="Dán brief, thông số, nội dung tham khảo..."
              className="mt-4 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Khối 3 - Ngôn ngữ</p>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SUPPORTED_LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </section>

        <footer className="sticky bottom-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Khi tiếp tục, hệ thống sẽ gọi <span className="font-mono text-gray-800">/api/vbt/analyze</span> và lưu vào sessionStorage.
            </p>
            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={analyzing}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {analyzing ? 'Đang phân tích...' : 'Phân tích semantic →'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
