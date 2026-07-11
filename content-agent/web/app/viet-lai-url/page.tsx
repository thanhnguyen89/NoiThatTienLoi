'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '@/app/components/ModelPicker';
import { clearDraftRef, loadDraftRef, saveDraftRef } from '@/lib/article-draft-client';
import { URL_IDEAS, URL_IMAGE_OPTIONS, URL_STRUCTURES, URL_TONES } from '@/lib/viet-lai-url/options';
import type { UrlCrawlResult, UrlIdeaType, UrlRewriteConfig, UrlRewriteStartResponse } from '@/lib/viet-lai-url/types';
import type { TinhGonBrandConfig } from '@/lib/tinh-gon/types';

interface BrandProfile {
  id: string;
  name: string;
  shopName: string;
  industry: string | null;
  brandPronouns: string | null;
  brandAudience: string | null;
  brandToneNotes: string | null;
  phone: string | null;
  address: string | null;
  brandDesc: string | null;
  brandForbidden: string | null;
  ctaStandard: string | null;
  mainProducts: string | null;
  isDefault: boolean;
}

const SS_KEY = 'vlu_config';
const LS_BRAND_KEY = 'vlu_brand_info';
const DRAFT_REF_KEY = 'draft:vlu';

const DEFAULT_CONFIG: UrlRewriteConfig = {
  sourceUrl: '',
  extractedHeadings: '',
  extractedContent: '',
  sourceTitle: '',
  keyword: '',
  secondaryKeywords: '',
  seoMode: true,
  selectedIdeas: [],
  structure: 'auto',
  tone: 'formal',
  language: 'Vietnamese',
  imageOption: 'none',
  mainKeywordUrl: '',
  additionalLinks: [],
  appendContent: '',
  autoBold: 'none',
  model: 'gemini-flash',
};

const INDUSTRY_SUGGESTIONS = [
  'Nội thất', 'Thời trang', 'Mỹ phẩm / Làm đẹp', 'Thực phẩm & Đồ uống',
  'Điện tử / Công nghệ', 'Nhà hàng / Cafe', 'Sức khỏe / Thể thao',
  'Giáo dục', 'Bất động sản', 'Du lịch', 'Ô tô / Xe máy', 'Khác',
];

export default function VietLaiUrlPage() {
  const router = useRouter();
  const [config, setConfig] = useState<UrlRewriteConfig>(DEFAULT_CONFIG);
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState('');
  const [crawlWarning, setCrawlWarning] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkKeyword, setLinkKeyword] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const sessionBrandLoadedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showBrand, setShowBrand] = useState(false);
  const [shopName, setShopName] = useState('');
  const [industry, setIndustry] = useState('');
  const [brandPronouns, setBrandPronouns] = useState('');
  const [brandAudience, setBrandAudience] = useState('');
  const [brandToneNotes, setBrandToneNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [brandForbidden, setBrandForbidden] = useState('');
  const [ctaStandard, setCtaStandard] = useState('');
  const [mainProducts, setMainProducts] = useState('');
  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false);
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftArticleId, setDraftArticleId] = useState<string | null>(null);

  const crawlDone = Boolean(config.extractedHeadings.trim() || config.extractedContent.trim());

  useEffect(() => {
    document.title = 'Viết Lại URL - Content Agent';
    const stored = sessionStorage.getItem(SS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UrlRewriteConfig;
        setConfig(parsed);
        if (parsed.brandConfig) {
          sessionBrandLoadedRef.current = true;
          setShopName(parsed.brandConfig.name || '');
          setBrandPronouns(parsed.brandConfig.pronouns || '');
          setBrandAudience(parsed.brandConfig.audience || '');
          setBrandForbidden(parsed.brandConfig.forbiddenExtra || '');
          setBrandToneNotes(parsed.brandConfig.toneNotes || '');
          setShowBrand(true);
        }
      } catch {
        sessionStorage.removeItem(SS_KEY);
      }
    }

    const saved = localStorage.getItem(LS_BRAND_KEY);
    if (saved) {
      try {
        const brand = JSON.parse(saved) as Partial<BrandProfile>;
        if (brand.shopName) setShopName(brand.shopName);
        if (brand.industry) setIndustry(brand.industry);
        if (brand.brandPronouns) setBrandPronouns(brand.brandPronouns);
        if (brand.brandAudience) setBrandAudience(brand.brandAudience);
        if (brand.brandToneNotes) setBrandToneNotes(brand.brandToneNotes);
        if (brand.phone) setPhone(brand.phone);
        if (brand.address) setAddress(brand.address);
        if (brand.brandForbidden) setBrandForbidden(brand.brandForbidden);
        if (brand.ctaStandard) setCtaStandard(brand.ctaStandard);
        if (brand.mainProducts) setMainProducts(brand.mainProducts);
        setShowBrand(true);
      } catch {
        localStorage.removeItem(LS_BRAND_KEY);
      }
    }

    void fetchProfiles();

    const existingDraft = loadDraftRef(DRAFT_REF_KEY);
    if (existingDraft) {
      setDraftArticleId(existingDraft.articleId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setConfig((prev) => ({ ...prev, brandConfig: buildBrandConfig() }));

    const hasBrandValue = Boolean(
      shopName || industry || brandPronouns || brandAudience || brandToneNotes || phone || address || brandForbidden || ctaStandard || mainProducts,
    );

    if (hasBrandValue) {
      localStorage.setItem(LS_BRAND_KEY, JSON.stringify({
        shopName,
        industry,
        brandPronouns,
        brandAudience,
        brandToneNotes,
        phone,
        address,
        brandForbidden,
        ctaStandard,
        mainProducts,
      }));
    } else {
      localStorage.removeItem(LS_BRAND_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, brandAudience, brandForbidden, brandPronouns, brandToneNotes, ctaStandard, industry, mainProducts, phone, shopName]);

  async function fetchProfiles() {
    try {
      const res = await fetch('/api/brand-profiles?activeOnly=true');
      const json = await res.json() as { success: boolean; data: BrandProfile[] };
      if (json.success) {
        setProfiles(json.data);
        const def = json.data.find((item) => item.isDefault);
        if (def && !localStorage.getItem(LS_BRAND_KEY) && !sessionBrandLoadedRef.current) {
          applyProfile(def);
        }
      }
    } catch {
      // ignore
    }
  }

  function applyProfile(profile: BrandProfile) {
    setShopName(profile.shopName || '');
    setIndustry(profile.industry || '');
    setBrandPronouns(profile.brandPronouns || '');
    setBrandAudience(profile.brandAudience || '');
    setBrandToneNotes(profile.brandToneNotes || '');
    setPhone(profile.phone || '');
    setAddress(profile.address || '');
    setBrandForbidden(profile.brandForbidden || '');
    setCtaStandard(profile.ctaStandard || '');
    setMainProducts(profile.mainProducts || '');
    setSelectedProfile(profile.id);
    setShowBrand(true);
  }

  function clearBrand() {
    setShopName('');
    setIndustry('');
    setBrandPronouns('');
    setBrandAudience('');
    setBrandToneNotes('');
    setPhone('');
    setAddress('');
    setBrandForbidden('');
    setCtaStandard('');
    setMainProducts('');
    setSelectedProfile('');
    localStorage.removeItem(LS_BRAND_KEY);
  }

  function handleBrandField<T>(setter: Dispatch<SetStateAction<T>>, value: T) {
    setter(value);
    setSelectedProfile('');
  }

  function buildBrandConfig(): TinhGonBrandConfig {
    return {
      name: shopName.trim() || undefined,
      pronouns: brandPronouns.trim() || undefined,
      audience: brandAudience.trim() || undefined,
      forbiddenExtra: brandForbidden.trim() || undefined,
      toneNotes: [
        brandToneNotes.trim(),
        phone.trim() ? `Hotline: ${phone.trim()}` : '',
        address.trim() ? `Địa chỉ: ${address.trim()}` : '',
        ctaStandard.trim() ? `CTA: ${ctaStandard.trim()}` : '',
        mainProducts.trim() ? `Sản phẩm chính: ${mainProducts.trim()}` : '',
        industry.trim() ? `Ngành hàng: ${industry.trim()}` : '',
      ].filter(Boolean).join('\n') || undefined,
    };
  }

  async function handleCrawl() {
    const url = config.sourceUrl.trim();
    if (!url) {
      setCrawlError('Vui lòng nhập URL nguồn.');
      return;
    }

    setCrawling(true);
    setCrawlError('');
    setCrawlWarning('');

    try {
      const response = await fetch('/api/viet-lai-url/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json() as UrlCrawlResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Không thể thu thập nội dung URL');
      }

      setConfig((prev) => ({
        ...prev,
        sourceTitle: data.title,
        extractedHeadings: data.headings,
        extractedContent: data.content,
        keyword: prev.keyword.trim() || data.title.split(/\s+/).slice(0, 6).join(' '),
      }));

      if (data.warning) {
        setCrawlWarning(data.warning);
      }
    } catch (requestError) {
      setCrawlError(requestError instanceof Error ? requestError.message : 'Lỗi kết nối');
    } finally {
      setCrawling(false);
    }
  }

  async function handleSuggestKeywords() {
    if (!config.keyword.trim()) return;
    setSuggesting(true);
    try {
      const response = await fetch('/api/viet-lai-url/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: config.keyword,
          url: config.sourceUrl,
          language: config.language,
        }),
      });
      const data = await response.json() as { keywords?: string[] };
      if (data.keywords?.length) {
        setConfig((prev) => ({
          ...prev,
          secondaryKeywords: data.keywords?.join(', ') || '',
        }));
      }
    } finally {
      setSuggesting(false);
    }
  }

  function toggleIdea(idea: UrlIdeaType) {
    setConfig((prev) => ({
      ...prev,
      selectedIdeas: prev.selectedIdeas.includes(idea)
        ? prev.selectedIdeas.filter((item) => item !== idea)
        : [...prev.selectedIdeas, idea],
    }));
  }

  function addLink() {
    if (!linkKeyword.trim() || !linkUrl.trim()) return;
    setConfig((prev) => ({
      ...prev,
      additionalLinks: [...prev.additionalLinks, { keyword: linkKeyword.trim(), url: linkUrl.trim() }],
    }));
    setLinkKeyword('');
    setLinkUrl('');
  }

  function removeLink(index: number) {
    setConfig((prev) => ({
      ...prev,
      additionalLinks: prev.additionalLinks.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleNext() {
    if (!config.sourceUrl.trim()) {
      setError('Vui lòng nhập URL nguồn.');
      return;
    }

    if (!crawlDone) {
      setError('Hãy bấm "Thu thập" trước khi viết lại URL.');
      return;
    }

    if (!config.extractedContent.trim()) {
      setError('Nội dung nguồn đang trống. Hãy kiểm tra lại URL hoặc chỉnh tay phần nội dung.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const nextConfig = {
        ...config,
        sourceUrl: config.sourceUrl.trim(),
        keyword: config.keyword.trim(),
        secondaryKeywords: config.secondaryKeywords.trim(),
        mainKeywordUrl: config.mainKeywordUrl.trim(),
        appendContent: config.appendContent,
        brandConfig: buildBrandConfig(),
      };

      const response = await fetch('/api/viet-lai-url/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: nextConfig, draftArticleId }),
      });

      const data = await response.json() as UrlRewriteStartResponse & { error?: string };
      if (!response.ok || !data.articleId || !data.runId) {
        throw new Error(data.error || 'Không thể khởi tạo bài viết');
      }

      sessionStorage.setItem(SS_KEY, JSON.stringify(nextConfig));
      sessionStorage.setItem('vlu_article_id', data.articleId);
      sessionStorage.setItem('vlu_run_id', data.runId);
      sessionStorage.removeItem('vlu_result');
      saveDraftRef(DRAFT_REF_KEY, { articleId: data.articleId, runId: data.runId });

      router.push('/viet-lai-url/generate');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }

  useEffect(() => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    const shouldPersist = Boolean(
      config.sourceUrl.trim() ||
      config.extractedHeadings.trim() ||
      config.extractedContent.trim() ||
      config.keyword.trim(),
    );
    if (!shouldPersist) return;

    draftSaveTimerRef.current = setTimeout(() => {
      void saveDraftToDb();
    }, 1200);

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  async function saveDraftToDb() {
    const nextConfig = {
      ...config,
      brandConfig: buildBrandConfig(),
    };

    try {
      const response = await fetch('/api/articles/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(draftArticleId ? { articleId: draftArticleId } : {}),
          draft: {
            feature: 'viet_lai_url',
            keyword: nextConfig.keyword.trim() || nextConfig.sourceTitle.trim() || nextConfig.sourceUrl.trim(),
            language: nextConfig.language,
            contentType: 'viet_lai_url',
            targetLength: 1500,
            aiProvider: nextConfig.model,
            brandConfig: nextConfig.brandConfig,
            selectedTitle: nextConfig.sourceTitle.trim() || nextConfig.keyword.trim() || 'Viết lại URL',
            userNotes: null,
            secondaryKeywords: nextConfig.secondaryKeywords
              ? nextConfig.secondaryKeywords.split(',').map((item) => item.trim()).filter(Boolean)
              : [],
            competitorUrls: nextConfig.sourceUrl.trim() ? [nextConfig.sourceUrl.trim()] : [],
            outline: {
              flow: 'viet_lai_url',
              stage: 'config',
              config: nextConfig,
            },
          },
        }),
      });
      const data = await response.json() as { articleId?: string; runId?: string };
      if (response.ok && data.articleId && data.runId) {
        setDraftArticleId(data.articleId);
        saveDraftRef(DRAFT_REF_KEY, { articleId: data.articleId, runId: data.runId });
      }
    } catch {
      // ignore background draft save errors
    }
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full max-w-none">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Viết Lại URL</h1>
              <p className="text-sm text-blue-600 mt-1">Bước 1 / 2 — Thu thập URL và cấu hình bài viết mới</p>
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

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                URL nguồn
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="url"
                value={config.sourceUrl}
                onChange={(event) => setConfig((prev) => ({ ...prev, sourceUrl: event.target.value }))}
                placeholder="https://example.com/bai-viet-goc"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleCrawl()}
              disabled={crawling || !config.sourceUrl.trim()}
              className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {crawling ? 'Đang thu thập...' : 'Thu thập'}
            </button>
          </div>
          {crawlError && <p className="text-sm text-red-600 mt-2">{crawlError}</p>}
          {!crawlError && crawlWarning && <p className="text-sm text-amber-600 mt-2">{crawlWarning}</p>}
          <p className="text-xs text-gray-400 mt-2">
            Khác với các tool viết lại khác: bước này sẽ đọc URL trước, rồi bạn có thể sửa lại heading và nội dung nguồn trước khi AI viết.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Heading trích từ URL</label>
              {config.sourceTitle && (
                <span className="text-xs text-gray-400">Tiêu đề gốc: {config.sourceTitle}</span>
              )}
            </div>
            <textarea
              value={config.extractedHeadings}
              onChange={(event) => setConfig((prev) => ({ ...prev, extractedHeadings: event.target.value }))}
              rows={16}
              placeholder="Sau khi thu thập, danh sách heading H2/H3/H4 sẽ xuất hiện ở đây..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-2">Bạn có thể sửa, xóa hoặc thêm heading. AI sẽ lấy đây làm dàn tham khảo chính.</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nội dung nguồn đã trích</label>
            <textarea
              value={config.extractedContent}
              onChange={(event) => setConfig((prev) => ({ ...prev, extractedContent: event.target.value }))}
              rows={16}
              placeholder="Sau khi thu thập, nội dung văn bản từ URL sẽ xuất hiện ở đây..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-2">Bạn có thể gọt bớt hoặc bổ sung nội dung trước khi AI viết bài mới.</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4 space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Từ khóa chính</label>
              <input
                type="text"
                value={config.keyword}
                onChange={(event) => setConfig((prev) => ({ ...prev, keyword: event.target.value }))}
                placeholder="Ví dụ: ghế sofa góc, tủ bếp gỗ công nghiệp..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Từ khóa phụ</label>
                <button
                  type="button"
                  onClick={() => void handleSuggestKeywords()}
                  disabled={suggesting || !config.keyword.trim()}
                  className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
                >
                  {suggesting ? 'Đang gợi ý...' : '✨ AI gợi ý'}
                </button>
              </div>
              <textarea
                value={config.secondaryKeywords}
                onChange={(event) => setConfig((prev) => ({ ...prev, secondaryKeywords: event.target.value }))}
                rows={3}
                placeholder="Ngăn cách bằng dấu phẩy"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Idea Expander</label>
              <span className="text-xs text-gray-400">{config.selectedIdeas.length} ý tưởng đã chọn</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {URL_IDEAS.map((idea) => (
                <button
                  key={idea.value}
                  type="button"
                  onClick={() => toggleIdea(idea.value)}
                  className={`px-3 py-2.5 rounded-lg border-2 text-sm transition-colors ${
                    config.selectedIdeas.includes(idea.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {idea.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Mỗi idea sẽ trở thành một hướng mở rộng nội dung hoặc một section AI cần bổ sung vào bài mới.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cấu trúc bài viết</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {URL_STRUCTURES.map((item) => (
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
              <div className="grid grid-cols-2 gap-2">
                {URL_TONES.map((item) => (
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

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh trong bài</label>
                <div className="grid grid-cols-2 gap-2">
                  {URL_IMAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, imageOption: option.value }))}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        config.imageOption === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-800">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{option.note}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ</label>
              <select
                value={config.language}
                onChange={(event) => setConfig((prev) => ({ ...prev, language: event.target.value }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Vietnamese">🇻🇳 Tiếng Việt</option>
                <option value="English">🇬🇧 English</option>
                <option value="Japanese">🇯🇵 Japanese</option>
                <option value="Korean">🇰🇷 Korean</option>
                <option value="Thai">🇹🇭 Thai</option>
                <option value="Indonesian">🇮🇩 Indonesian</option>
              </select>
            </div>

            <div className="xl:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Model AI</label>
              <ModelPicker value={config.model} onChange={(id) => setConfig((prev) => ({ ...prev, model: id }))} size="md" label="" />
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">SEO & hậu xử lý</h3>
                <p className="text-xs text-gray-500 mt-0.5">Phần này thay cho helper `post-process` trong tài liệu cũ, nhưng bám đúng logic đang có của repo.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={config.seoMode}
                  onChange={(event) => setConfig((prev) => ({ ...prev, seoMode: event.target.checked }))}
                  className="rounded"
                />
                Bật SEO mode
              </label>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Link cho từ khóa chính</label>
                <input
                  type="url"
                  value={config.mainKeywordUrl}
                  onChange={(event) => setConfig((prev) => ({ ...prev, mainKeywordUrl: event.target.value }))}
                  placeholder="https://your-site.com/dich-vu"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tự động in đậm</label>
                <select
                  value={config.autoBold}
                  onChange={(event) => setConfig((prev) => ({ ...prev, autoBold: event.target.value as UrlRewriteConfig['autoBold'] }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">Không dùng</option>
                  <option value="keyword">Chỉ in đậm từ khóa</option>
                  <option value="headings">Chỉ in đậm heading</option>
                  <option value="both">Cả từ khóa và heading</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1fr_1fr_auto] gap-3">
              <input
                type="text"
                value={linkKeyword}
                onChange={(event) => setLinkKeyword(event.target.value)}
                placeholder="Từ khóa cần gắn link"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://your-site.com/landing-page"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addLink}
                className="px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-black"
              >
                Thêm link
              </button>
            </div>

            {config.additionalLinks.length > 0 && (
              <div className="mt-3 space-y-2">
                {config.additionalLinks.map((item, index) => (
                  <div key={`${item.keyword}-${item.url}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{item.keyword}</p>
                      <p className="text-xs text-gray-400 truncate">{item.url}</p>
                    </div>
                    <button type="button" onClick={() => removeLink(index)} className="text-sm text-red-600 hover:text-red-700">
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nội dung append cuối bài</label>
              <textarea
                value={config.appendContent}
                onChange={(event) => setConfig((prev) => ({ ...prev, appendContent: event.target.value }))}
                rows={4}
                placeholder="<p>CTA, bảng giá, ghi chú thương hiệu...</p>"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Thông tin thương hiệu</h2>
              <p className="text-sm text-gray-500">Dùng cùng pattern với các màn mới như `/viet-tinh-gon` và `/viet-tin-tuc`.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowBrand((prev) => !prev)}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {showBrand ? 'Ẩn brand section' : 'Hiện brand section'}
            </button>
          </div>

          {showBrand && (
            <div className="space-y-4">
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Profile thương hiệu</label>
                <button
                  type="button"
                  onClick={() => setShowDropdown((prev) => !prev)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left bg-white hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className={selectedProfile ? 'text-gray-800' : 'text-gray-400'}>
                    {selectedProfile
                      ? profiles.find((item) => item.id === selectedProfile)?.name || 'Đã chọn profile'
                      : 'Chọn profile có sẵn'}
                  </span>
                  <span className="text-gray-400">▾</span>
                </button>

                {showDropdown && (
                  <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {profiles.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Chưa có profile thương hiệu.</div>
                    ) : (
                      profiles.map((profile) => (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => {
                            applyProfile(profile);
                            setShowDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="text-sm font-medium text-gray-800">{profile.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{profile.shopName}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên shop / thương hiệu</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(event) => handleBrandField(setShopName, event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngành hàng</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(event) => handleBrandField(setIndustry, event.target.value)}
                    onFocus={() => setShowIndustrySuggestions(true)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showIndustrySuggestions && (
                    <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                      {INDUSTRY_SUGGESTIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            handleBrandField(setIndustry, item);
                            setShowIndustrySuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Xưng hô</label>
                  <input
                    type="text"
                    value={brandPronouns}
                    onChange={(event) => handleBrandField(setBrandPronouns, event.target.value)}
                    placeholder='VD: "chúng tôi - anh/chị"'
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Đối tượng khách hàng</label>
                  <input
                    type="text"
                    value={brandAudience}
                    onChange={(event) => handleBrandField(setBrandAudience, event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Hotline</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => handleBrandField(setPhone, event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(event) => handleBrandField(setAddress, event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CTA chuẩn</label>
                  <textarea
                    value={ctaStandard}
                    onChange={(event) => handleBrandField(setCtaStandard, event.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">USP / sản phẩm chính</label>
                  <textarea
                    value={mainProducts}
                    onChange={(event) => handleBrandField(setMainProducts, event.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tone notes / lưu ý thương hiệu</label>
                  <textarea
                    value={brandToneNotes}
                    onChange={(event) => handleBrandField(setBrandToneNotes, event.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Từ cấm thêm</label>
                  <textarea
                    value={brandForbidden}
                    onChange={(event) => handleBrandField(setBrandForbidden, event.target.value)}
                    rows={4}
                    placeholder="Ngăn cách bằng dấu phẩy"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearBrand}
                  className="text-sm px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Xóa brand đang nhập
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(SS_KEY);
              sessionStorage.removeItem('vlu_article_id');
              sessionStorage.removeItem('vlu_run_id');
              sessionStorage.removeItem('vlu_result');
              clearDraftRef(DRAFT_REF_KEY);
              setDraftArticleId(null);
              setConfig(DEFAULT_CONFIG);
              setCrawlError('');
              setCrawlWarning('');
              setError('');
            }}
            className="px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Làm mới form
          </button>
          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Đang khởi tạo...' : 'Tiếp tục viết bài'}
          </button>
        </div>
      </div>
    </div>
  );
}
