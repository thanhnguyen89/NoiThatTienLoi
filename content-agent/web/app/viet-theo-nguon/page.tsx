'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '@/app/components/ModelPicker';
import { BrandSection, buildBrandConfig, EMPTY_BRAND_SECTION_STATE, type BrandSectionState } from '@/components/BrandSection';
import { SeoAdvancedBlock } from '@/components/SeoAdvancedBlock';
import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import {
  ARTICLE_STRUCTURES,
  ARTICLE_TONES,
  IMAGE_OPTIONS,
  OUTLINE_AI_OPTIONS,
  OUTLINE_AI_TYPE_TARGET,
} from '@/lib/viet-theo-nguon/options';
import type { SourceConfig, SourceItem, SourceStartResponse } from '@/lib/viet-theo-nguon/types';

const DEFAULT_BRAND_NAME = 'Nội Thất Minh Quân';
const LS_BRAND_KEY = 'vtn_brand_info';

export default function VietTheoNguonPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [language, setLanguage] = useState('Vietnamese');
  const [urlInputs, setUrlInputs] = useState<string[]>(['', '']);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [outlineMode, setOutlineMode] = useState<SourceConfig['outlineMode']>('ai');
  const [outlineAIType, setOutlineAIType] = useState<SourceConfig['outlineAIType']>('h2h3_detail');
  const [customOutline, setCustomOutline] = useState('');
  const [aiOutline, setAiOutline] = useState('');
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [structure, setStructure] = useState<SourceConfig['structure']>('auto');
  const [tone, setTone] = useState<SourceConfig['tone']>('formal');
  const [model, setModel] = useState('gemini-flash');
  const [imageOption, setImageOption] = useState<SourceConfig['imageOption']>('0');
  const [showSeo, setShowSeo] = useState(false);
  const [seoMainLink, setSeoMainLink] = useState('');
  const [seoKeywordLinks, setSeoKeywordLinks] = useState('');
  const [boldKeyword, setBoldKeyword] = useState(false);
  const [boldHeading, setBoldHeading] = useState(false);
  const [footerContent, setFooterContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [brand, setBrand] = useState<BrandSectionState>(EMPTY_BRAND_SECTION_STATE);

  useEffect(() => {
    document.title = 'Viết Theo Nguồn URL - Content Agent';
    const stored = sessionStorage.getItem('vtn_config');
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as SourceConfig;
      setKeyword(parsed.keyword || '');
      setSecondaryKeywords(parsed.secondaryKeywords.join(', '));
      setLanguage(parsed.language);
      setOutlineMode(parsed.outlineMode);
      setOutlineAIType(parsed.outlineAIType);
      setCustomOutline(parsed.customOutline || '');
      setStructure(parsed.structure);
      setTone(parsed.tone);
      setModel(parsed.model);
      setImageOption(parsed.imageOption);
      setSeoMainLink(parsed.seoOptions.mainLink || '');
      setSeoKeywordLinks(parsed.seoOptions.keywordLinks || '');
      setBoldKeyword(parsed.seoOptions.boldKeyword);
      setBoldHeading(parsed.seoOptions.boldHeading);
      setFooterContent(parsed.seoOptions.footerContent || '');
      if (parsed.brandConfig) {
        setBrand({
          ...EMPTY_BRAND_SECTION_STATE,
          shopName: parsed.brandConfig.name || '',
          brandPronouns: parsed.brandConfig.pronouns || '',
          brandAudience: parsed.brandConfig.audience || '',
          brandToneNotes: parsed.brandConfig.toneNotes || '',
          brandForbidden: parsed.brandConfig.forbiddenExtra || '',
        });
      }
    } catch {
      sessionStorage.removeItem('vtn_config');
    }

    const storedSources = sessionStorage.getItem('vtn_sources');
    if (storedSources) {
      try {
        setSources(JSON.parse(storedSources) as SourceItem[]);
      } catch {
        sessionStorage.removeItem('vtn_sources');
      }
    }

    const storedOutline = sessionStorage.getItem('vtn_outline');
    if (storedOutline) setAiOutline(storedOutline);
  }, []);

  const autoBoldMode = boldKeyword && boldHeading ? 'both' : boldKeyword ? 'keyword' : boldHeading ? 'headings' : 'none';

  function handleAutoBoldChange(value: 'none' | 'keyword' | 'headings' | 'both') {
    setBoldKeyword(value === 'keyword' || value === 'both');
    setBoldHeading(value === 'headings' || value === 'both');
  }

  const finalConfig = {
    keyword: keyword.trim(),
    secondaryKeywords: secondaryKeywords.split(',').map((item) => item.trim()).filter(Boolean),
    language,
    outlineMode,
    outlineAIType,
    customOutline,
    structure,
    tone,
    model,
    targetLength: OUTLINE_AI_TYPE_TARGET[outlineAIType] ?? 2500,
    imageOption,
    seoOptions: {
      mainLink: seoMainLink.trim() || undefined,
      keywordLinks: seoKeywordLinks.trim() || undefined,
      boldKeyword,
      boldHeading,
      footerContent: footerContent.trim() || undefined,
    },
    brandConfig: buildBrandConfig(brand),
  } satisfies SourceConfig;

  function addUrlInput() {
    setUrlInputs((prev) => [...prev, '']);
  }

  function updateUrlInput(index: number, value: string) {
    setUrlInputs((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function removeUrlInput(index: number) {
    setUrlInputs((prev) => prev.filter((_, i) => i !== index));
  }

  function buildFinalSources(baseSources: SourceItem[]): SourceItem[] {
    const nextSources = baseSources.filter((item) => !item.isManual && item.url !== 'manual');
    const trimmedManual = manualContent.trim();
    if (trimmedManual) {
      const manualItem: SourceItem = {
        url: 'manual',
        title: 'Nội dung thêm thủ công',
        content: trimmedManual,
        wordCount: trimmedManual.split(/\s+/).filter(Boolean).length,
        isUnique: true,
        isManual: true,
      };
      const existingManualIndex = nextSources.findIndex((item) => item.isManual || item.url === 'manual');
      if (existingManualIndex >= 0) {
        nextSources[existingManualIndex] = manualItem;
      } else {
        nextSources.push(manualItem);
      }
    }
    return nextSources;
  }

  async function handleCrawl() {
    const validUrls = urlInputs.map((url) => url.trim()).filter((url) => url.startsWith('http'));
    if (!validUrls.length) {
      setCrawlError('Vui lòng nhập ít nhất 1 URL hợp lệ (bắt đầu bằng http)');
      return;
    }

    setCrawling(true);
    setCrawlError('');
    setSources([]);

    try {
      const response = await fetch('/api/viet-theo-nguon/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls }),
      });
      const payload = (await response.json()) as { sources?: SourceItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Crawl thất bại');
      setSources(payload.sources ?? []);
    } catch (requestError) {
      setCrawlError(requestError instanceof Error ? requestError.message : 'Không thể crawl URL');
    } finally {
      setCrawling(false);
    }
  }

  async function handleGenerateOutline() {
    if (!keyword.trim()) {
      setError('Nhập từ khóa trước');
      return;
    }

    setGeneratingOutline(true);
    setAiOutline('');
    setError('');

    try {
      const response = await fetch('/api/pipeline/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          language,
          tone,
          outlineType: outlineAIType,
        }),
      });

      if (!response.ok || !response.body) throw new Error('Lỗi tạo dàn ý');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const chunk = line.slice(6);
          if (chunk === '[DONE]') continue;
          if (!chunk.startsWith('[ERROR]')) {
            setAiOutline((prev) => prev + chunk);
          }
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo dàn ý');
    } finally {
      setGeneratingOutline(false);
    }
  }

  async function handleSubmit() {
    const finalSources = buildFinalSources(sources);
    if (!keyword.trim()) {
      setError('Vui lòng nhập từ khóa');
      return;
    }
    if (!finalSources.length) {
      setError('Vui lòng thu thập ít nhất 1 nguồn');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const outlineText = outlineMode === 'ai' ? aiOutline.trim() : outlineMode === 'custom' ? customOutline.trim() : '';
      const response = await fetch('/api/viet-theo-nguon/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: finalConfig, sources: finalSources, outline: outlineText }),
      });

      const data = (await response.json()) as SourceStartResponse & { error?: string };
      if (!response.ok || !data.articleId || !data.runId) {
        throw new Error(data.error || 'Không thể tạo bài');
      }

      sessionStorage.setItem('vtn_config', JSON.stringify(finalConfig));
      sessionStorage.setItem('vtn_article_id', data.articleId);
      sessionStorage.setItem('vtn_run_id', data.runId);
      sessionStorage.setItem('vtn_sources', JSON.stringify(finalSources));
      sessionStorage.setItem('vtn_outline', outlineText);
      sessionStorage.removeItem('vtn_result');

      router.push('/viet-theo-nguon/generate');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full max-w-none space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Viết Bài Theo Nguồn URL</h1>
              <p className="text-sm text-blue-600 mt-1">Bước 1 / 2 — Thu thập nguồn và cấu hình bài viết</p>
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Từ khóa chính</label>
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="VD: giường sắt 1m2"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Từ khóa phụ</label>
              <input
                type="text"
                value={secondaryKeywords}
                onChange={(event) => setSecondaryKeywords(event.target.value)}
                placeholder="Cách nhau bởi dấu phẩy"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ</label>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SUPPORTED_LANGUAGES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Link nguồn dữ liệu</label>
            <div className="space-y-2 mb-3">
              {urlInputs.map((url, index) => (
                <div key={`${index}-${url}`} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => updateUrlInput(index, event.target.value)}
                    placeholder={`URL nguồn ${index + 1}... (https://)`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {urlInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUrlInput(index)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={addUrlInput} className="px-4 py-2 text-sm border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50">
                + Thêm URL
              </button>
              <button
                type="button"
                onClick={() => void handleCrawl()}
                disabled={crawling}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {crawling ? 'Đang thu thập...' : 'Thu thập'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Nếu AI không lấy được URL, dán nội dung thủ công ở block bên dưới.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">Nội dung thêm thủ công</label>
              <span className="text-xs text-gray-400">Tùy chọn</span>
            </div>
            <textarea
              value={manualContent}
              onChange={(event) => setManualContent(event.target.value)}
              rows={5}
              placeholder="Dán thêm thông tin, số liệu, ghi chú hoặc nội dung cần giữ lại..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">Nguồn đã crawl</h2>
              {sources.length > 0 && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{sources.length} nguồn</span>
              )}
            </div>
            {sources.length > 0 ? (
              <div className="space-y-2">
                {sources.map((item, index) => (
                  <div key={`${item.url}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-sm font-medium text-gray-700">{item.title}</p>
                    <p className="text-xs text-gray-400 truncate">{item.url}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Chưa có nguồn nào. Hãy thu thập URL trước.</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">Cấu trúc bút viết</label>
              <span className="text-xs text-gray-400">{outlineMode === 'ai' ? 'AI Outline' : outlineMode === 'custom' ? 'Tùy chỉnh' : 'Không outline'}</span>
            </div>

            <div className="space-y-2">
              {[
                { value: 'none', label: 'Không cần dàn ý', note: 'AI tự viết theo nguồn, khoảng 1.000–1.500 từ' },
                { value: 'ai', label: 'AI Outline (Khuyên dùng)', note: 'AI tạo dàn ý chi tiết trước khi viết bài' },
                { value: 'custom', label: 'Tự nhập dàn ý', note: 'Bạn tự kiểm soát cấu trúc bài viết' },
              ].map((item) => (
                <label
                  key={item.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    outlineMode === item.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="outlineMode"
                    checked={outlineMode === item.value}
                    onChange={() => setOutlineMode(item.value as SourceConfig['outlineMode'])}
                    className="mt-1 accent-blue-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
                  </div>
                </label>
              ))}
            </div>

            {outlineMode === 'ai' && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-600 mb-2">Loại dàn ý AI</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {OUTLINE_AI_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setOutlineAIType(item.value)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        outlineAIType === item.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-800">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.estWords}</div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateOutline()}
                  disabled={generatingOutline || !keyword.trim()}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {generatingOutline ? 'Đang tạo dàn ý...' : 'AI tạo dàn ý'}
                </button>
                {aiOutline && (
                  <textarea
                    value={aiOutline}
                    onChange={(event) => setAiOutline(event.target.value)}
                    rows={6}
                    className="mt-3 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            )}

            {outlineMode === 'custom' && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-600 mb-2">Dàn ý tự nhập</label>
                <textarea
                  value={customOutline}
                  onChange={(event) => setCustomOutline(event.target.value)}
                  rows={6}
                  placeholder="[h2] Mở đầu\n[h2] Phần 1\n[h3] Ý nhỏ..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cấu trúc bài viết</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ARTICLE_STRUCTURES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStructure(item.value)}
                    className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-colors ${
                      structure === item.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${structure === item.value ? 'text-blue-700' : 'text-gray-700'}`}>{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.note}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giọng văn</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ARTICLE_TONES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    title={item.note}
                    onClick={() => setTone(item.value)}
                    className={`py-2.5 px-3 rounded-lg border-2 text-xs font-medium transition-colors ${
                      tone === item.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">Chọn AI Model</label>
              <ModelPicker value={model} onChange={setModel} size="md" label="" />

              <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">Nguồn ảnh</label>
              <div className="grid grid-cols-2 gap-2">
                {IMAGE_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setImageOption(item.value)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-xs font-medium transition-colors ${
                      imageOption === item.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <BrandSection
            value={brand}
            onChange={setBrand}
            lsKey={LS_BRAND_KEY}
            defaultBrandName={DEFAULT_BRAND_NAME}
          />

          <SeoAdvancedBlock
            show={showSeo}
            onToggle={() => setShowSeo((prev) => !prev)}
            mainLink={seoMainLink}
            onMainLinkChange={setSeoMainLink}
            keywordLinks={seoKeywordLinks}
            onKeywordLinksChange={setSeoKeywordLinks}
            autoBold={autoBoldMode}
            onAutoBoldChange={handleAutoBoldChange}
            footerContent={footerContent}
            onFooterContentChange={setFooterContent}
          />

          {crawlError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {crawlError}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Đang xử lý...' : 'Viết bài theo nguồn →'}
          </button>
        </div>
      </div>
    </div>
  );
}
