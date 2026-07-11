'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '@/app/components/ModelPicker';
import {
  BrandSection,
  buildBrandConfig,
  EMPTY_BRAND_SECTION_STATE,
  type BrandSectionState,
} from '@/components/BrandSection';
import { SeoAdvancedBlock } from '@/components/SeoAdvancedBlock';
import { EMPTY_SEO_ADVANCED_CONFIG } from '@/lib/shared/seo-advanced';
import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import { NEWS_LANGUAGE_MAP, NEWS_LENGTHS, NEWS_STRUCTURES, NEWS_TONES } from '@/lib/viet-tin-tuc/options';
import { normalizeNewsConfig, type NewsConfig, type NewsStartResponse } from '@/lib/viet-tin-tuc/types';

const DEFAULT_CONFIG: NewsConfig = {
  keyword: '',
  language: 'Vietnamese',
  structure: 'auto',
  tone: 'formal',
  model: 'gemini-flash',
  targetLength: 600,
  secondaryKeywords: [],
};

const DEFAULT_BRAND_NAME = 'Nội Thất Minh Quân';
const BRAND_LS_KEY = 'vtt_brand_info';
const NEWS_LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.filter((item) => item.value in NEWS_LANGUAGE_MAP);

export default function VietTinTucPage() {
  const router = useRouter();
  const [config, setConfig] = useState<NewsConfig>(DEFAULT_CONFIG);
  const [brand, setBrand] = useState<BrandSectionState>(EMPTY_BRAND_SECTION_STATE);
  const [showSeo, setShowSeo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Viết Tin Tức - Content Agent';
    const stored = sessionStorage.getItem('vtt_config');
    if (!stored) return;

    try {
      const parsed = normalizeNewsConfig(JSON.parse(stored) as Partial<NewsConfig>);
      setConfig(parsed);
      if (parsed.seoOptions) {
        setShowSeo(
          Boolean(
            parsed.seoOptions.mainLink ||
              parsed.seoOptions.keywordLinks ||
              parsed.seoOptions.footerContent ||
              (parsed.seoOptions.autoBold && parsed.seoOptions.autoBold !== 'none'),
          ),
        );
      }
      if (parsed.brandConfig) {
        setBrand({
          ...EMPTY_BRAND_SECTION_STATE,
          shopName: parsed.brandConfig.name || '',
          brandPronouns: parsed.brandConfig.pronouns || '',
          brandAudience: parsed.brandConfig.audience || '',
          brandForbidden: parsed.brandConfig.forbiddenExtra || '',
          brandToneNotes: parsed.brandConfig.toneNotes || '',
        });
      }
    } catch {
      sessionStorage.removeItem('vtt_config');
    }
  }, []);

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      brandConfig: buildBrandConfig(brand),
    }));
  }, [brand]);

  async function handleNext() {
    const keyword = config.keyword.trim();
    if (!keyword) {
      setError('Vui lòng nhập từ khóa hoặc chủ đề.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const nextConfig = {
        ...config,
        keyword,
        brandConfig: buildBrandConfig(brand),
      };

      const response = await fetch('/api/viet-tin-tuc/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: nextConfig }),
      });

      const data = (await response.json()) as NewsStartResponse & { error?: string };
      if (!response.ok || !data.articleId || !data.runId) {
        throw new Error(data.error || 'Không thể bắt đầu');
      }

      sessionStorage.setItem('vtt_config', JSON.stringify(nextConfig));
      sessionStorage.setItem('vtt_article_id', data.articleId);
      sessionStorage.setItem('vtt_run_id', data.runId);
      sessionStorage.setItem('vtt_sources', JSON.stringify(data.sources || []));
      sessionStorage.removeItem('vtt_result');

      router.push('/viet-tin-tuc/generate');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full max-w-none">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Viết Tin Tức</h1>
              <p className="text-sm text-blue-600 mt-1">Bước 1 / 2 — Chọn chủ đề và cấu hình bài tin</p>
            </div>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              📘 Cách sử dụng
            </button>
          </div>
          <div className="mt-4 flex gap-1">
            {[1, 2].map((step) => (
              <div key={step} className={`h-1.5 flex-1 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Từ khóa hoặc chủ đề tin tức
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={config.keyword}
              onChange={(event) => setConfig((prev) => ({ ...prev, keyword: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleNext();
                }
              }}
              placeholder="Ví dụ: xu hướng nội thất 2026, giá gỗ tháng 5, thị trường bất động sản..."
              rows={2}
              className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                error ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {error ? (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                Hợp với tin mới, xu hướng, giá cả, sản phẩm ra mắt, tổng hợp thị trường. Không dành cho kiến thức evergreen.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ngôn ngữ bài viết</label>
            <select
              value={config.language}
              onChange={(event) => setConfig((prev) => ({ ...prev, language: event.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {NEWS_LANGUAGE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cấu trúc bài viết</label>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {NEWS_STRUCTURES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, structure: item.value }))}
                  className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-colors ${
                    config.structure === item.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${config.structure === item.value ? 'text-blue-700' : 'text-gray-700'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.note}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Giọng văn</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {NEWS_TONES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  title={item.note}
                  onClick={() => setConfig((prev) => ({ ...prev, tone: item.value }))}
                  className={`py-2.5 px-3 rounded-lg border-2 text-xs font-medium transition-colors ${
                    config.tone === item.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Hover vào mỗi tùy chọn để xem khi nào nên dùng.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Độ dài mục tiêu</label>
            <div className="flex flex-col md:flex-row gap-3">
              {NEWS_LENGTHS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, targetLength: item.value }))}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors relative ${
                    config.targetLength === item.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {item.label}
                  {item.badge && (
                    <span className="absolute -top-2 -right-1 text-[9px] bg-blue-500 text-white rounded-full px-1.5 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn AI Model</label>
            <ModelPicker value={config.model} onChange={(id) => setConfig((prev) => ({ ...prev, model: id }))} size="md" label="" />
          </div>

          <BrandSection
            value={brand}
            onChange={setBrand}
            lsKey={BRAND_LS_KEY}
            defaultBrandName={DEFAULT_BRAND_NAME}
          />

          <SeoAdvancedBlock
            show={showSeo}
            onToggle={() => setShowSeo((prev) => !prev)}
            mainLink={config.seoOptions?.mainLink ?? EMPTY_SEO_ADVANCED_CONFIG.mainLink}
            onMainLinkChange={(mainLink) => setConfig((prev) => ({
              ...prev,
              seoOptions: { ...(prev.seoOptions ?? EMPTY_SEO_ADVANCED_CONFIG), mainLink },
            }))}
            keywordLinks={config.seoOptions?.keywordLinks ?? EMPTY_SEO_ADVANCED_CONFIG.keywordLinks}
            onKeywordLinksChange={(keywordLinks) => setConfig((prev) => ({
              ...prev,
              seoOptions: { ...(prev.seoOptions ?? EMPTY_SEO_ADVANCED_CONFIG), keywordLinks },
            }))}
            autoBold={config.seoOptions?.autoBold ?? EMPTY_SEO_ADVANCED_CONFIG.autoBold}
            onAutoBoldChange={(autoBold) => setConfig((prev) => ({
              ...prev,
              seoOptions: { ...(prev.seoOptions ?? EMPTY_SEO_ADVANCED_CONFIG), autoBold },
            }))}
            footerContent={config.seoOptions?.footerContent ?? EMPTY_SEO_ADVANCED_CONFIG.footerContent}
            onFooterContentChange={(footerContent) => setConfig((prev) => ({
              ...prev,
              seoOptions: { ...(prev.seoOptions ?? EMPTY_SEO_ADVANCED_CONFIG), footerContent },
            }))}
          />

          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={loading || !config.keyword.trim()}
            className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang fetch Google News...
              </span>
            ) : 'Fetch News & Viết Bài →'}
          </button>

          <p className="text-center text-xs text-gray-400">
            AI sẽ lấy tin mới từ Google News, tổng hợp và viết bài ngay, không cần bước outline.
          </p>
        </div>
      </div>
    </div>
  );
}
