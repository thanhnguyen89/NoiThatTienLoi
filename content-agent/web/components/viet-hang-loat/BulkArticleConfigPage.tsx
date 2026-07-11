'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BrandSection, EMPTY_BRAND_SECTION_STATE, buildBrandConfig } from '@/components/BrandSection';
import ModelPicker from '@/components/ModelPicker';
import { SeoAdvancedBlock } from '@/components/SeoAdvancedBlock';
import { IMAGE_OPTIONS, SUPPORTED_LANGUAGES, TARGET_LENGTHS, WRITING_TONES, type AutoBoldOption, type ImageOption } from '@/lib/shared/options';
import { KEYWORD_TONES, AI_OUTLINE_OBJECTIVES, AI_OUTLINE_SIZES } from '@/lib/viet-theo-tu-khoa/options';
import { OUTLINE_TYPES, TARGET_LENGTHS as TINH_GON_LENGTHS } from '@/lib/tinh-gon/options';
import { ARTICLE_STRUCTURES, ARTICLE_TONES, OUTLINE_AI_OPTIONS } from '@/lib/viet-theo-nguon/options';
import { DAN_BAI_LENGTHS, DAN_BAI_TONES, WRITE_METHODS } from '@/lib/viet-theo-dan-bai/options';
import { parseOutline, validateOutline } from '@/lib/viet-theo-dan-bai/outline-parser';
import { getBulkFeature, type BulkFeatureId, type DuplicateMode, type TitleMode } from '@/lib/viet-hang-loat/features';
import { estimateBulkMinutes, parseBulkKeywords } from '@/lib/viet-hang-loat/parser';
import type { BulkArticleConfig } from '@/lib/viet-hang-loat/types';
import type { SourceItem } from '@/lib/viet-theo-nguon/types';

const CONTENT_TYPES = [
  { value: 'blog_seo', label: 'Blog SEO', note: 'Bài dài, tối ưu ranking' },
  { value: 'how_to', label: 'Hướng dẫn', note: 'Step-by-step' },
  { value: 'listicle', label: 'Danh sách', note: 'Top/list' },
  { value: 'comparison', label: 'So sánh', note: 'A vs B' },
  { value: 'review', label: 'Review', note: 'Đánh giá' },
  { value: 'news', label: 'Tin tức', note: 'Cập nhật nhanh' },
  { value: 'product', label: 'Sản phẩm', note: 'Landing/category' },
];

const TOPICAL_ROLES = [
  { value: 'standalone', label: 'Standalone' },
  { value: 'hub', label: 'Hub' },
  { value: 'spoke', label: 'Spoke' },
];

function defaultTargetLength(featureId: BulkFeatureId): number {
  if (featureId === 'tinh-gon') return 1000;
  if (featureId === 'dan-bai') return 1200;
  if (featureId === 'tu-khoa') return 2000;
  return 1200;
}

function createInitialConfig(featureId: BulkFeatureId): BulkArticleConfig {
  return {
    featureId,
    keywordsRaw: '',
    duplicateMode: 'reject',
    titleMode: 'keyword_as_title',
    language: 'Vietnamese',
    imageOption: 'none',
    imageCount: 1,
    targetLength: defaultTargetLength(featureId),
    tone: featureId === 'theo-nguon' ? 'formal' : 'seo_basic',
    modelId: '',
    brand: EMPTY_BRAND_SECTION_STATE,
    seoAdvanced: {
      mainLink: '',
      keywordLinks: '',
      autoBold: 'none',
      footerContent: '',
    },
    outlineMode: 'no_outline',
    aiOutlineObjective: 'basic',
    aiOutlineSize: '5_6_h2',
    dataSourceMode: 'ai_only',
    contentType: 'blog_seo',
    topicalMapRole: 'standalone',
    outlineType: 'review_product',
    searchResultCount: 5,
    crawlMode: 'auto',
    addFreshnessDate: false,
    structure: 'auto',
    outlineAIType: 'h2_6',
    sourceUrls: ['', ''],
    sharedOutline: '',
    parsedHeadings: [],
    writeMethod: 'balance',
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </section>
  );
}

function OptionButton({
  active,
  title,
  note,
  onClick,
}: {
  active: boolean;
  title: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-3 text-left transition ${
        active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-blue-300'
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      {note && <div className="mt-1 text-xs text-gray-500">{note}</div>}
    </button>
  );
}

export default function BulkArticleConfigPage({ featureId }: { featureId: BulkFeatureId }) {
  const router = useRouter();
  const feature = getBulkFeature(featureId);
  const [config, setConfig] = useState<BulkArticleConfig>(() => createInitialConfig(featureId));
  const [showSeo, setShowSeo] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [outlineTopic, setOutlineTopic] = useState('');
  const [outlineUrl, setOutlineUrl] = useState('');
  const [outlineLoading, setOutlineLoading] = useState(false);

  const parsed = useMemo(
    () => parseBulkKeywords(config.keywordsRaw, {
      duplicateMode: config.duplicateMode,
      maxKeywords: feature.maxKeywords,
      pipeMode: featureId === 'dan-bai',
    }),
    [config.duplicateMode, config.keywordsRaw, feature.maxKeywords, featureId],
  );

  const parsedHeadings = useMemo(() => parseOutline(config.sharedOutline), [config.sharedOutline]);
  const outlineError = featureId === 'dan-bai' && config.sharedOutline.trim()
    ? validateOutline(parsedHeadings)
    : null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem(feature.configKey);
    if (!saved) return;
    try {
      const parsedConfig = JSON.parse(saved) as Partial<BulkArticleConfig>;
      setConfig((prev) => ({ ...prev, ...parsedConfig, featureId }));
    } catch {
      sessionStorage.removeItem(feature.configKey);
    }
  }, [feature.configKey, featureId]);

  function update(next: Partial<BulkArticleConfig>) {
    setConfig((prev) => ({ ...prev, ...next }));
  }

  async function handleCrawlSources() {
    const urls = config.sourceUrls.map((url) => url.trim()).filter((url) => /^https?:\/\//i.test(url));
    if (!urls.length) {
      setError('Nhập ít nhất 1 URL hợp lệ trước khi thu thập.');
      return;
    }

    setCrawling(true);
    setError('');
    setSources([]);
    try {
      const res = await fetch('/api/vhltn/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json() as { success?: boolean; sources?: SourceItem[]; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể crawl URL');
      setSources(data.sources ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi crawl URL');
    } finally {
      setCrawling(false);
    }
  }

  async function handleSuggestOutline() {
    const keyword = outlineTopic.trim() || parsed.items[0]?.keyword || '';
    if (!keyword) {
      setError('Nhập topic hoặc keyword trước khi gợi ý dàn bài.');
      return;
    }

    setOutlineLoading(true);
    setError('');
    try {
      const res = await fetch('/api/viet-theo-dan-bai/suggest-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, language: config.language }),
      });
      const data = await res.json() as { outline?: string; error?: string };
      if (!res.ok || !data.outline) throw new Error(data.error || 'Không tạo được dàn bài');
      update({ sharedOutline: data.outline });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi gợi ý dàn bài');
    } finally {
      setOutlineLoading(false);
    }
  }

  async function handleExtractOutline() {
    if (!outlineUrl.trim()) {
      setError('Nhập URL để trích xuất dàn bài.');
      return;
    }

    setOutlineLoading(true);
    setError('');
    try {
      const res = await fetch('/api/viet-theo-dan-bai/extract-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: outlineUrl.trim() }),
      });
      const data = await res.json() as { outline?: string; error?: string };
      if (!res.ok || !data.outline) throw new Error(data.error || 'Không trích xuất được dàn bài');
      update({ sharedOutline: data.outline });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi lấy dàn bài từ URL');
    } finally {
      setOutlineLoading(false);
    }
  }

  async function handleSubmit() {
    setError('');
    if (!parsed.items.length) {
      setError('Cần ít nhất 1 keyword.');
      return;
    }
    if (featureId === 'dan-bai') {
      const validation = validateOutline(parsedHeadings);
      if (validation) {
        setError(validation);
        return;
      }
    }
    if (feature.requiresSources && sources.filter((source) => !source.error && source.content).length === 0) {
      setError('Trang theo nguồn cần bấm Thu thập URL trước khi tạo job.');
      return;
    }
    if (!config.modelId) {
      setError('Chọn AI model trước khi tạo job.');
      return;
    }

    setLoading(true);
    try {
      const finalConfig: BulkArticleConfig = {
        ...config,
        parsedHeadings,
        sourceUrls: config.sourceUrls.filter((url) => url.trim()),
      };
      const brandConfig = buildBrandConfig(config.brand);
      const res = await fetch(`${feature.apiPrefix}/enqueue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: finalConfig, brandConfig, crawledSources: sources }),
      });
      const data = await res.json() as { success?: boolean; jobId?: string; error?: string };
      if (!res.ok || !data.success || !data.jobId) throw new Error(data.error || 'Không thể tạo job');

      sessionStorage.setItem(feature.configKey, JSON.stringify(finalConfig));
      sessionStorage.setItem(feature.jobIdKey, data.jobId);
      if (featureId === 'smart') sessionStorage.setItem('vhl_job_id', data.jobId);
      router.push(`${feature.route}/queue`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo job');
    } finally {
      setLoading(false);
    }
  }

  const estimatedSeconds =
    featureId === 'google-search'
      ? config.crawlMode === 'no_crawl'
        ? 30
        : config.searchResultCount === 10
          ? 100
          : config.searchResultCount === 5
            ? 75
            : 60
      : featureId === 'tinh-gon'
        ? 40
        : 45;

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="w-full px-6 py-8">
        <div className={`mb-5 rounded-3xl bg-gradient-to-r ${feature.accent} p-6 text-white shadow-sm`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">P3 Queue Bulk</p>
              <h1 className="mt-2 text-3xl font-bold">{feature.title}</h1>
              <p className="mt-2 text-sm leading-6 text-white/85">{feature.description}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm">
              <strong>{parsed.items.length}</strong>/{feature.maxKeywords} keyword · khoảng{' '}
              <strong>{estimateBulkMinutes(parsed.items.length, estimatedSeconds)} phút</strong>
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <Section title="Khối 1 - Danh sách keyword và cấu hình đầu vào">
            <div className="grid gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">
                    {featureId === 'dan-bai' ? 'Danh sách tiêu đề | keyword' : 'Danh sách keyword'}
                  </label>
                  <span className={`text-xs font-semibold ${parsed.items.length >= feature.maxKeywords ? 'text-red-500' : 'text-gray-400'}`}>
                    {parsed.items.length}/{feature.maxKeywords}
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={config.keywordsRaw}
                  onChange={(event) => update({ keywordsRaw: event.target.value })}
                  placeholder={
                    featureId === 'dan-bai'
                      ? 'Giường sắt 1m2 giá rẻ - Top mẫu đáng mua | giường sắt 1m2\nTủ quần áo 3 cánh gỗ | tủ quần áo 3 cánh'
                      : 'giường sắt 1m2\ntủ quần áo 3 cánh\nbàn làm việc gỗ'
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-2 text-xs text-gray-500">
                  {featureId === 'tu-khoa'
                    ? 'Có thể thêm keyword phụ trên cùng dòng, cách nhau bằng dấu phẩy.'
                    : featureId === 'dan-bai'
                      ? 'Format: Tiêu đề bài | keyword. Nếu không có dấu | thì dùng cả dòng làm keyword.'
                      : 'Mỗi dòng tương ứng một bài viết trong queue.'}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <OptionButton active={config.duplicateMode === 'reject'} title="Bỏ qua keyword trùng" note="So sánh không phân biệt hoa thường" onClick={() => update({ duplicateMode: 'reject' as DuplicateMode })} />
                <OptionButton active={config.duplicateMode === 'allow'} title="Cho phép trùng" note="AI có thể viết nhiều góc nhìn cho cùng keyword" onClick={() => update({ duplicateMode: 'allow' as DuplicateMode })} />
              </div>

              {feature.supportsTitleMode && (
                <div className="grid gap-3 md:grid-cols-2">
                  <OptionButton active={config.titleMode === 'keyword_as_title'} title="Keyword làm tiêu đề" note="Hoặc dùng phần trước dấu | với page dàn bài" onClick={() => update({ titleMode: 'keyword_as_title' as TitleMode })} />
                  <OptionButton active={config.titleMode === 'ai_title'} title="AI tự tạo tiêu đề" note="Phù hợp khi cần title tự nhiên hơn" onClick={() => update({ titleMode: 'ai_title' as TitleMode })} />
                </div>
              )}

              {featureId === 'smart' && (
                <div className="grid gap-3 md:grid-cols-3">
                  <select value={config.contentType} onChange={(event) => update({ contentType: event.target.value })} className="rounded-xl border px-3 py-2 text-sm">
                    {CONTENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label} - {item.note}</option>)}
                  </select>
                  <select value={config.dataSourceMode} onChange={(event) => update({ dataSourceMode: event.target.value as BulkArticleConfig['dataSourceMode'] })} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="ai_only">AI only</option>
                    <option value="google_search">Google + AI</option>
                  </select>
                  <select value={config.topicalMapRole} onChange={(event) => update({ topicalMapRole: event.target.value })} className="rounded-xl border px-3 py-2 text-sm">
                    {TOPICAL_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
              )}

              {featureId === 'tu-khoa' && (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <OptionButton active={config.outlineMode === 'no_outline'} title="Không dàn ý" note="AI viết trực tiếp theo target length" onClick={() => update({ outlineMode: 'no_outline' })} />
                    <OptionButton active={config.outlineMode === 'ai_outline'} title="AI tạo dàn ý" note="Tạo outline riêng cho từng keyword" onClick={() => update({ outlineMode: 'ai_outline' })} />
                  </div>
                  {config.outlineMode === 'ai_outline' ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <select value={config.aiOutlineObjective} onChange={(event) => update({ aiOutlineObjective: event.target.value })} className="rounded-xl border px-3 py-2 text-sm">
                        {AI_OUTLINE_OBJECTIVES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                      <select value={config.aiOutlineSize} onChange={(event) => update({ aiOutlineSize: event.target.value })} className="rounded-xl border px-3 py-2 text-sm">
                        {AI_OUTLINE_SIZES.map((item) => <option key={item.value} value={item.value}>{item.label} - {item.note}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-3">
                      {[1500, 2000, 3000].map((length) => (
                        <OptionButton key={length} active={config.targetLength === length} title={`~${length.toLocaleString('vi-VN')} từ`} onClick={() => update({ targetLength: length })} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {featureId === 'tinh-gon' && (
                <div className="grid gap-2 md:grid-cols-5">
                  {OUTLINE_TYPES.map((item) => (
                    <OptionButton key={item.value} active={config.outlineType === item.value} title={item.label} note={item.note} onClick={() => update({ outlineType: item.value })} />
                  ))}
                </div>
              )}

              {featureId === 'google-search' && (
                <div className="grid gap-3 md:grid-cols-3">
                  <select value={config.searchResultCount} onChange={(event) => update({ searchResultCount: Number(event.target.value) as 3 | 5 | 10 })} className="rounded-xl border px-3 py-2 text-sm">
                    <option value={3}>3 nguồn</option>
                    <option value={5}>5 nguồn</option>
                    <option value={10}>10 nguồn</option>
                  </select>
                  <select value={config.crawlMode} onChange={(event) => update({ crawlMode: event.target.value as BulkArticleConfig['crawlMode'] })} className="rounded-xl border px-3 py-2 text-sm">
                    <option value="auto">Search + crawl đầy đủ</option>
                    <option value="search_only">Chỉ snippet</option>
                    <option value="no_crawl">Không crawl</option>
                  </select>
                  <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                    <input type="checkbox" checked={config.addFreshnessDate} onChange={(event) => update({ addFreshnessDate: event.target.checked })} />
                    Thêm ngày cập nhật
                  </label>
                </div>
              )}

              {featureId === 'theo-nguon' && (
                <div className="grid gap-4">
                  <div className="grid gap-2 md:grid-cols-5">
                    {ARTICLE_STRUCTURES.map((item) => (
                      <OptionButton key={item.value} active={config.structure === item.value} title={`${item.icon} ${item.label}`} note={item.note} onClick={() => update({ structure: item.value })} />
                    ))}
                  </div>
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700">Nguồn URL dùng chung</p>
                      <button type="button" onClick={() => update({ sourceUrls: [...config.sourceUrls, ''].slice(0, 5) })} disabled={config.sourceUrls.length >= 5} className="text-xs font-semibold text-blue-600 disabled:text-gray-300">
                        + Thêm URL
                      </button>
                    </div>
                    <div className="grid gap-2">
                      {config.sourceUrls.map((url, index) => (
                        <input
                          key={index}
                          value={url}
                          onChange={(event) => {
                            const next = [...config.sourceUrls];
                            next[index] = event.target.value;
                            update({ sourceUrls: next });
                          }}
                          placeholder={`https://... nguồn ${index + 1}`}
                          className="rounded-xl border px-3 py-2 text-sm"
                        />
                      ))}
                    </div>
                    <button type="button" onClick={handleCrawlSources} disabled={crawling} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400">
                      {crawling ? 'Đang thu thập...' : 'Thu thập nguồn'}
                    </button>
                    {sources.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {sources.map((source, index) => (
                          <div key={`${source.url}-${index}`} className={`rounded-xl border p-3 text-xs ${source.error ? 'border-red-200 bg-red-50' : source.isUnique ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                            <div className="font-semibold text-gray-800">{source.title || source.url}</div>
                            <div className="mt-1 text-gray-500">{source.error || `${source.wordCount} từ · ${source.isUnique ? 'Unique' : 'Duplicate'}`}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {featureId === 'dan-bai' && (
                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                    <input value={outlineTopic} onChange={(event) => setOutlineTopic(event.target.value)} placeholder="Topic để AI gợi ý outline" className="rounded-xl border px-3 py-2 text-sm" />
                    <button type="button" onClick={handleSuggestOutline} disabled={outlineLoading} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400">AI Suggest</button>
                    <button type="button" onClick={handleExtractOutline} disabled={outlineLoading} className="rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 disabled:text-gray-300">Từ URL</button>
                  </div>
                  <input value={outlineUrl} onChange={(event) => setOutlineUrl(event.target.value)} placeholder="URL để trích dàn bài (tuỳ chọn)" className="mb-3 w-full rounded-xl border px-3 py-2 text-sm" />
                  <textarea value={config.sharedOutline} onChange={(event) => update({ sharedOutline: event.target.value })} rows={10} placeholder={'[h2] Tổng quan\n[h2] Tiêu chí lựa chọn\n[h3] Chất liệu\n[h3] Kích thước\n[h2] Kết luận'} className="w-full rounded-xl border px-3 py-2 font-mono text-sm" />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={outlineError ? 'text-red-600' : 'text-gray-500'}>{outlineError || `${parsedHeadings.length} heading`}</span>
                    <span className="text-gray-400">Outline chung cho toàn bộ batch</span>
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section title="Khối 2 - Hình ảnh">
            <div className="grid gap-3 md:grid-cols-4">
              {IMAGE_OPTIONS.map((item) => (
                <OptionButton key={item.value} active={config.imageOption === item.value} title={`${item.icon} ${item.label}`} note={item.note} onClick={() => update({ imageOption: item.value as ImageOption })} />
              ))}
            </div>
            {config.imageOption !== 'none' && (
              <label className="mt-4 block text-sm text-gray-600">
                Số ảnh mỗi bài
                <input type="number" min={1} max={10} value={config.imageCount} onChange={(event) => update({ imageCount: Number(event.target.value) })} className="ml-3 w-24 rounded-xl border px-3 py-2" />
              </label>
            )}
          </Section>

          <Section title="Khối 3 - Ngôn ngữ">
            <select value={config.language} onChange={(event) => update({ language: event.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm">
              {SUPPORTED_LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Section>

          {featureId !== 'tu-khoa' && featureId !== 'dan-bai' && (
            <Section title="Khối 4 - Outline và độ dài">
              {featureId === 'theo-nguon' || featureId === 'google-search' ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <OptionButton active={config.outlineMode === 'no_outline'} title="Không dàn ý" onClick={() => update({ outlineMode: 'no_outline' })} />
                    <OptionButton active={config.outlineMode === 'ai_outline'} title="AI tạo dàn ý" onClick={() => update({ outlineMode: 'ai_outline' })} />
                  </div>
                  {config.outlineMode === 'ai_outline' && featureId === 'theo-nguon' && (
                    <div className="grid gap-2 md:grid-cols-3">
                      {OUTLINE_AI_OPTIONS.map((item) => (
                        <OptionButton key={item.value} active={config.outlineAIType === item.value} title={item.label} note={item.estWords} onClick={() => update({ outlineAIType: item.value })} />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {(featureId === 'tinh-gon' ? TINH_GON_LENGTHS : TARGET_LENGTHS).map((item) => (
                  <OptionButton key={item.value} active={config.targetLength === item.value} title={item.label} note={item.badge} onClick={() => update({ targetLength: item.value })} />
                ))}
              </div>
            </Section>
          )}

          {featureId !== 'tinh-gon' && (
            <Section title="Khối 5 - Giọng văn">
              {featureId === 'dan-bai' ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {WRITE_METHODS.map((item) => <OptionButton key={item.value} active={config.writeMethod === item.value} title={item.label} note={item.note} onClick={() => update({ writeMethod: item.value })} />)}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {DAN_BAI_TONES.map((item) => <OptionButton key={item.value} active={config.tone === item.value} title={item.label} note={item.note} onClick={() => update({ tone: item.value })} />)}
                  </div>
                  <div className="grid gap-2 md:grid-cols-6">
                    {DAN_BAI_LENGTHS.map((item) => <OptionButton key={item.value} active={config.targetLength === item.value} title={item.label} note={item.badge} onClick={() => update({ targetLength: item.value })} />)}
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-4">
                  {(featureId === 'tu-khoa' ? KEYWORD_TONES : featureId === 'theo-nguon' ? ARTICLE_TONES : WRITING_TONES).map((item) => (
                    <OptionButton key={item.value} active={config.tone === item.value} title={item.label} note={item.note} onClick={() => update({ tone: item.value })} />
                  ))}
                </div>
              )}
            </Section>
          )}

          <Section title="Khối 6 - AI Model">
            <ModelPicker value={config.modelId} onChange={(modelId) => update({ modelId })} />
          </Section>

          <Section title="Khối 7 - Brand Config">
            <BrandSection value={config.brand} onChange={(brand) => update({ brand })} lsKey={feature.brandKey} />
          </Section>

          <Section title="Khối 8 - SEO Advanced">
            <SeoAdvancedBlock
              show={showSeo}
              onToggle={() => setShowSeo((value) => !value)}
              mainLink={config.seoAdvanced.mainLink}
              onMainLinkChange={(mainLink) => update({ seoAdvanced: { ...config.seoAdvanced, mainLink } })}
              keywordLinks={config.seoAdvanced.keywordLinks}
              onKeywordLinksChange={(keywordLinks) => update({ seoAdvanced: { ...config.seoAdvanced, keywordLinks } })}
              autoBold={config.seoAdvanced.autoBold}
              onAutoBoldChange={(autoBold: AutoBoldOption) => update({ seoAdvanced: { ...config.seoAdvanced, autoBold } })}
              footerContent={config.seoAdvanced.footerContent}
              onFooterContentChange={(footerContent) => update({ seoAdvanced: { ...config.seoAdvanced, footerContent } })}
            />
          </Section>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || parsed.items.length === 0 || (featureId === 'dan-bai' && Boolean(outlineError))}
            className="rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Đang tạo job...' : `Tạo hàng đợi ${parsed.items.length} ${feature.itemLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
