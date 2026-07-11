'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '@/app/components/ModelPicker';
import { BrandSection, buildBrandConfig, EMPTY_BRAND_SECTION_STATE } from '@/components/BrandSection';
import { SeoAdvancedBlock } from '@/components/SeoAdvancedBlock';
import {
  IMAGE_OPTIONS,
  SUPPORTED_LANGUAGES,
  TARGET_LENGTHS,
  WRITING_TONES,
  type AutoBoldOption,
  type ImageOption,
} from '@/lib/shared/options';
import {
  AI_OUTLINE_OBJECTIVES,
  AI_OUTLINE_SIZES,
  CRAWL_MODES,
  DEFAULT_SEARCH_RESULT_COUNT,
  SEARCH_RESULT_COUNTS,
  VTGS_ARTICLE_ID_SESSION_KEY,
  VTGS_BRAND_KEY,
  VTGS_RESULT_SESSION_KEY,
  VTGS_RUN_ID_SESSION_KEY,
  VTGS_SEARCH_RESULT_SESSION_KEY,
  VTGS_SESSION_KEY,
} from '@/lib/viet-tu-google-search/options';
import type { CrawlMode, OutlineMode, VtgsConfig, VtgsSeoAdvancedState } from '@/lib/viet-tu-google-search/types';

interface CannibalizationArticle {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  similarity: number;
}

const DEFAULT_SEO_ADVANCED: VtgsSeoAdvancedState = {
  mainLink: '',
  keywordLinks: '',
  autoBold: 'none',
  footerContent: '',
  customSlug: '',
  noIndex: false,
  focusKeyphrase: '',
  enableFeaturedSnippet: true,
};

const DEFAULT_CONFIG: VtgsConfig = {
  keyword: '',
  secondaryKeywords: [],
  imageOption: 'none',
  language: 'Vietnamese',
  outlineMode: 'ai_outline',
  targetLength: 1200,
  userOutlineText: '',
  aiOutlineObjective: 'comprehensive',
  aiOutlineSize: 'medium',
  editedOutline: '',
  tone: 'seo_focus',
  modelId: '',
  brand: EMPTY_BRAND_SECTION_STATE,
  brandConfig: undefined,
  seoAdvanced: DEFAULT_SEO_ADVANCED,
  searchResultCount: DEFAULT_SEARCH_RESULT_COUNT,
  crawlMode: 'auto',
  addFreshnessDate: true,
};

function splitSecondaryKeywords(value: string): string[] {
  return value
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index);
}

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

export default function VietTuGoogleSearchPage() {
  const router = useRouter();
  const [config, setConfig] = useState<VtgsConfig>(DEFAULT_CONFIG);
  const [secondaryRaw, setSecondaryRaw] = useState('');
  const [error, setError] = useState('');
  const [suggestedKw, setSuggestedKw] = useState<string[]>([]);
  const [loadingKw, setLoadingKw] = useState(false);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [showSeoAdvanced, setShowSeoAdvanced] = useState(false);
  const [checkingCannibalization, setCheckingCannibalization] = useState(false);
  const [cannibalizationArticles, setCannibalizationArticles] = useState<CannibalizationArticle[]>([]);

  const canSubmit = config.keyword.trim().length >= 3 && Boolean(config.modelId);

  const selectedTargetLength = useMemo(
    () => TARGET_LENGTHS.find((item) => item.value === config.targetLength),
    [config.targetLength],
  );

  const update = useCallback((patch: Partial<VtgsConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateSeo = useCallback((patch: Partial<VtgsSeoAdvancedState>) => {
    setConfig((prev) => ({
      ...prev,
      seoAdvanced: {
        ...prev.seoAdvanced,
        ...patch,
      },
    }));
  }, []);

  useEffect(() => {
    document.title = 'Viết từ tìm kiếm Google - Content Agent';
    const stored = sessionStorage.getItem(VTGS_SESSION_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as Partial<VtgsConfig>;
      const nextConfig: VtgsConfig = {
        ...DEFAULT_CONFIG,
        ...parsed,
        brand: {
          ...EMPTY_BRAND_SECTION_STATE,
          ...(parsed.brand || {}),
        },
        seoAdvanced: {
          ...DEFAULT_SEO_ADVANCED,
          ...(parsed.seoAdvanced || {}),
        },
      };
      setConfig(nextConfig);
      setSecondaryRaw((nextConfig.secondaryKeywords || []).join(', '));
    } catch {
      sessionStorage.removeItem(VTGS_SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    update({ secondaryKeywords: splitSecondaryKeywords(secondaryRaw) });
  }, [secondaryRaw, update]);

  async function checkCannibalization(keyword = config.keyword) {
    const trimmed = keyword.trim();
    if (trimmed.length < 3) {
      setCannibalizationArticles([]);
      return;
    }

    setCheckingCannibalization(true);
    try {
      const res = await fetch(`/api/articles/check-cannibalization?keyword=${encodeURIComponent(trimmed)}`);
      const json = await res.json() as {
        success?: boolean;
        data?: { articles?: CannibalizationArticle[] };
      };
      setCannibalizationArticles(json.success ? (json.data?.articles || []) : []);
    } catch {
      setCannibalizationArticles([]);
    } finally {
      setCheckingCannibalization(false);
    }
  }

  async function suggestKeywords() {
    const keyword = config.keyword.trim();
    if (keyword.length < 3) {
      setError('Nhập từ khóa tối thiểu 3 ký tự trước khi gọi ý.');
      return;
    }

    setError('');
    setLoadingKw(true);
    try {
      const res = await fetch('/api/viet-tu-google-search/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, count: 10, modelId: config.modelId || 'gemini-flash' }),
      });
      const data = await res.json() as { keywords?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Không thể gợi ý từ khóa.');
      setSuggestedKw(data.keywords || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể gợi ý từ khóa.');
    } finally {
      setLoadingKw(false);
    }
  }

  async function generateOutline() {
    const keyword = config.keyword.trim();
    if (keyword.length < 3 || !config.modelId) {
      setError('Nhập từ khóa và chọn model trước khi tạo dàn ý.');
      return;
    }

    setError('');
    setLoadingOutline(true);
    try {
      const res = await fetch('/api/viet-tu-google-search/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json() as { outline?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Không thể tạo dàn ý.');
      update({ editedOutline: data.outline || '', outlineMode: 'ai_outline' });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo dàn ý.');
    } finally {
      setLoadingOutline(false);
    }
  }

  function addSuggestedKeyword(keyword: string) {
    const next = splitSecondaryKeywords(`${secondaryRaw}\n${keyword}`);
    setSecondaryRaw(next.join(', '));
  }

  async function handleSubmit() {
    const keyword = config.keyword.trim();
    if (keyword.length < 3) {
      setError('Từ khóa phải có tối thiểu 3 ký tự.');
      return;
    }
    if (!config.modelId) {
      setError('Vui lòng chọn AI model.');
      return;
    }

    setError('');
    await checkCannibalization(keyword);

    const nextConfig: VtgsConfig = {
      ...config,
      keyword,
      secondaryKeywords: splitSecondaryKeywords(secondaryRaw),
      brandConfig: buildBrandConfig(config.brand),
    };

    sessionStorage.setItem(VTGS_SESSION_KEY, JSON.stringify(nextConfig));
    sessionStorage.removeItem(VTGS_RESULT_SESSION_KEY);
    sessionStorage.removeItem(VTGS_RUN_ID_SESSION_KEY);
    sessionStorage.removeItem(VTGS_ARTICLE_ID_SESSION_KEY);
    sessionStorage.removeItem(VTGS_SEARCH_RESULT_SESSION_KEY);
    router.push('/viet-tu-google-search/generate');
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 px-4 py-6">
      <div className="mx-auto w-full max-w-none space-y-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-950">AI Viết từ tìm kiếm Google</h1>
              <p className="mt-1 text-sm text-blue-600">Trang cấu hình - tìm kiếm, crawl, viết và lưu bài viết vào DB</p>
            </div>
            <button
              type="button"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hướng dẫn
            </button>
          </div>
          <div className="mt-5 flex gap-1">
            <div className="h-1.5 flex-[2] rounded-full bg-blue-600" />
            <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
          </div>
        </div>

        <SectionCard
          title="Khối 1 - Từ khóa + cấu hình tìm kiếm"
          desc="Nhập từ khóa chính, từ khóa phụ và cấu hình cách lấy nguồn Google."
        >
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Từ khóa chính *</label>
                <textarea
                  value={config.keyword}
                  onChange={(event) => update({ keyword: event.target.value })}
                  onBlur={() => void checkCannibalization()}
                  rows={2}
                  placeholder="VD: cách chọn giường sắt 1m2, xu hướng nội thất 2026..."
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  {checkingCannibalization && <span>Đang kiểm tra bài trùng từ khóa...</span>}
                  {!checkingCannibalization && cannibalizationArticles.length === 0 && <span>Sẽ cảnh báo nếu từ khóa đã có bài cũ.</span>}
                </div>
                {cannibalizationArticles.length > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-800">
                      Có {cannibalizationArticles.length} bài có từ khóa gần giống. Nên cân nhắc cập nhật bài cũ.
                    </p>
                    <div className="mt-2 space-y-1">
                      {cannibalizationArticles.slice(0, 5).map((article) => (
                        <a
                          key={article.id}
                          href={`/editor/${article.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs text-amber-700 underline"
                        >
                          {article.title} ({Math.round(article.similarity * 100)}%)
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700">Từ khóa phụ</label>
                  <button
                    type="button"
                    onClick={() => void suggestKeywords()}
                    disabled={loadingKw || config.keyword.trim().length < 3}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    {loadingKw ? 'Đang gợi ý...' : 'AI gợi ý từ khóa'}
                  </button>
                </div>
                <textarea
                  value={secondaryRaw}
                  onChange={(event) => setSecondaryRaw(event.target.value)}
                  rows={3}
                  placeholder="Mỗi dòng hoặc dấu phẩy là một từ khóa phụ"
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {suggestedKw.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestedKw.map((keyword) => (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => addSuggestedKeyword(keyword)}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        + {keyword}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="mb-2 text-sm font-bold text-gray-800">Chế độ quét nguồn</p>
                <div className="grid gap-2">
                  {CRAWL_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => update({ crawlMode: mode.value as CrawlMode })}
                      className={`rounded-xl border-2 p-3 text-left transition ${
                        config.crawlMode === mode.value
                          ? 'border-blue-500 bg-white text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{mode.label}</span>
                        <span className="text-xs text-gray-400">{mode.icon}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{mode.note}</p>
                    </button>
                  ))}
                </div>
              </div>

              {config.crawlMode !== 'no_crawl' && (
                <div>
                  <p className="mb-2 text-sm font-bold text-gray-800">So nguon Google</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SEARCH_RESULT_COUNTS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => update({ searchResultCount: item.value })}
                        className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
                          config.searchResultCount === item.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3">
                <input
                  type="checkbox"
                  checked={config.addFreshnessDate}
                  onChange={(event) => update({ addFreshnessDate: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">Thêm ngày cập nhật</span>
                  <span className="block text-xs text-gray-500">Chèn dòng "Cập nhật: tháng/năm" vào bài nếu phù hợp.</span>
                </span>
              </label>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Khối 2 - Tùy chọn hình ảnh" desc="Giữ đúng 4 lựa chọn ảnh theo PAGE-STANDARD.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {IMAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ imageOption: option.value as ImageOption })}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  config.imageOption === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="mb-3 flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 text-xl font-black text-gray-500">
                  {option.icon}
                </div>
                <p className="font-bold text-gray-900">{option.label}</p>
                <p className="mt-1 text-sm text-gray-500">{option.note}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Khối 3 - Ngôn ngữ">
          <select
            value={config.language}
            onChange={(event) => update({ language: event.target.value })}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </SectionCard>

        <SectionCard
          title="Khối 4 - Dàn ý + độ dài"
          desc={`Độ dài hiện tại: ${selectedTargetLength?.label || config.targetLength}`}
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="mb-2 text-sm font-bold text-gray-800">Độ dài bài viết</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {TARGET_LENGTHS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => update({ targetLength: item.value })}
                    className={`rounded-xl border-2 p-3 text-left ${
                      config.targetLength === item.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{item.label}</span>
                      {item.badge && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{item.badge}</span>}
                    </div>
                    {item.note && <p className="mt-1 text-xs text-gray-500">{item.note}</p>}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-800">Chế độ dàn ý</p>
              <div className="grid gap-2 md:grid-cols-3">
                {([
                  ['no_outline', 'AI tự quyết', 'Nhanh, để AI tự xây cấu trúc'],
                  ['user_outline', 'Dàn ý của bạn', 'Dàn ý thủ công dạng [h2]/[h3]'],
                  ['ai_outline', 'AI tạo dàn ý', 'Tạo dàn ý trước, có thể sửa'],
                ] as Array<[OutlineMode, string, string]>).map(([value, label, note]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ outlineMode: value })}
                    className={`rounded-xl border-2 p-3 text-left ${
                      config.outlineMode === value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                    }`}
                  >
                    <span className="block text-sm font-bold">{label}</span>
                    <span className="mt-1 block text-xs text-gray-500">{note}</span>
                  </button>
                ))}
              </div>

              {config.outlineMode === 'user_outline' && (
                <textarea
                  value={config.userOutlineText}
                  onChange={(event) => update({ userOutlineText: event.target.value })}
                  rows={8}
                  placeholder="[h2] Tổng quan\n[h3] Ý chính cần viết"
                  className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              )}

              {config.outlineMode === 'ai_outline' && (
                <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={config.aiOutlineObjective}
                      onChange={(event) => update({ aiOutlineObjective: event.target.value })}
                      className="rounded-xl border border-blue-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {AI_OUTLINE_OBJECTIVES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={config.aiOutlineSize}
                      onChange={(event) => update({ aiOutlineSize: event.target.value })}
                      className="rounded-xl border border-blue-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {AI_OUTLINE_SIZES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label} ({item.wordRange})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => void generateOutline()}
                    disabled={loadingOutline || config.keyword.trim().length < 3 || !config.modelId}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loadingOutline ? 'Đang tạo dàn ý...' : 'Tạo dàn ý AI'}
                  </button>
                  <textarea
                    value={config.editedOutline}
                    onChange={(event) => update({ editedOutline: event.target.value })}
                    rows={8}
                    placeholder="Dàn ý AI sẽ hiện ở đây. Bạn có thể sửa trước khi tạo bài."
                    className="w-full resize-y rounded-xl border border-blue-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Khối 5 - Giọng văn">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {WRITING_TONES.map((tone) => (
              <button
                key={tone.value}
                type="button"
                title={tone.note}
                onClick={() => update({ tone: tone.value })}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  config.tone === tone.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                }`}
              >
                <p className="text-sm font-bold">{tone.label}</p>
                <p className="mt-1 text-xs text-gray-500">{tone.note}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Khối 6 - Mô hình AI">
          <ModelPicker value={config.modelId} onChange={(modelId) => update({ modelId })} size="md" label="" />
        </SectionCard>

        <SectionCard title="Khối 7 - Cấu hình thương hiệu">
          <BrandSection
            value={config.brand}
            onChange={(brand) => update({ brand })}
            lsKey={VTGS_BRAND_KEY}
            defaultBrandName="Nội Thất Minh Quân"
          />
        </SectionCard>

        <SectionCard title="Khối 8 - SEO nâng cao">
          <SeoAdvancedBlock
            show={showSeoAdvanced}
            onToggle={() => setShowSeoAdvanced((prev) => !prev)}
            mainLink={config.seoAdvanced.mainLink}
            onMainLinkChange={(value) => updateSeo({ mainLink: value })}
            keywordLinks={config.seoAdvanced.keywordLinks}
            onKeywordLinksChange={(value) => updateSeo({ keywordLinks: value })}
            autoBold={config.seoAdvanced.autoBold}
            onAutoBoldChange={(value: AutoBoldOption) => updateSeo({ autoBold: value })}
            footerContent={config.seoAdvanced.footerContent}
            onFooterContentChange={(value) => updateSeo({ footerContent: value })}
          />
          {showSeoAdvanced && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                value={config.seoAdvanced.customSlug}
                onChange={(event) => updateSeo({ customSlug: event.target.value })}
                placeholder="Slug tùy chỉnh (không bắt buộc)"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <input
                value={config.seoAdvanced.focusKeyphrase}
                onChange={(event) => updateSeo({ focusKeyphrase: event.target.value })}
                placeholder="Từ khóa trọng tâm"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={config.seoAdvanced.enableFeaturedSnippet}
                  onChange={(event) => updateSeo({ enableFeaturedSnippet: event.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Đoạn trích nổi bật
              </label>
            </div>
          )}
        </SectionCard>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-white/90 px-4 py-4 backdrop-blur">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Tìm Google và viết bài
          </button>
        </div>
      </div>
    </div>
  );
}
