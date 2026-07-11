'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '@/app/components/ModelPicker';
import type { TinhGonBrandConfig } from '@/lib/tinh-gon/types';
import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';
import { DAN_BAI_LENGTHS, DAN_BAI_TONES, OUTLINE_TAB_LABELS, WRITE_METHODS } from '@/lib/viet-theo-dan-bai/options';
import { parseOutline, validateOutline } from '@/lib/viet-theo-dan-bai/outline-parser';
import type { DanBaiConfig, DanBaiOutlineTab } from '@/lib/viet-theo-dan-bai/types';

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

const DEFAULT_CONFIG: DanBaiConfig = {
  keyword: '',
  language: 'Vietnamese',
  postTitle: '',
  outline: '',
  parsedHeadings: [],
  writeMethod: 'balance',
  tone: 'seo_focus',
  model: 'gemini-flash',
  targetLength: 1000,
};

const LS_BRAND_KEY = 'vdb_brand_info';

const INDUSTRY_SUGGESTIONS = [
  'Nội thất', 'Thời trang', 'Mỹ phẩm / Làm đẹp', 'Thực phẩm & Đồ uống',
  'Điện tử / Công nghệ', 'Nhà hàng / Cafe', 'Sức khỏe / Thể thao',
  'Giáo dục', 'Bất động sản', 'Du lịch', 'Ô tô / Xe máy', 'Khác',
];

export default function VietTheoDanBaiPage() {
  const router = useRouter();
  const [config, setConfig] = useState<DanBaiConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<DanBaiOutlineTab>('ai_suggest');
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [outlineError, setOutlineError] = useState('');
  const [serpUrl, setSerpUrl] = useState('');
  const [fromUrl, setFromUrl] = useState('');
  const [searchSources, setSearchSources] = useState<Array<{ title: string; url: string; headingCount: number }>>([]);
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
  const selectedWriteMethod = WRITE_METHODS.find((item) => item.value === config.writeMethod);
  const selectedTone = DAN_BAI_TONES.find((item) => item.value === config.tone);
  const selectedLength = DAN_BAI_LENGTHS.find((item) => item.value === config.targetLength);
  const selectedLanguage = SUPPORTED_LANGUAGES.find((item) => item.value === config.language);

  useEffect(() => {
    document.title = 'Viết Theo Dàn Bài - Content Agent';
    const stored = sessionStorage.getItem('vdb_config');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DanBaiConfig;
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
        sessionStorage.removeItem('vdb_config');
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
    if (!config.outline.trim()) {
      setOutlineError('');
      return;
    }

    const headings = parseOutline(config.outline);
    const validationError = validateOutline(headings);
    setOutlineError(validationError ?? '');
  }, [config.outline]);

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
  }, [address, brandAudience, brandForbidden, brandPronouns, brandToneNotes, ctaStandard, industry, mainProducts, phone, shopName]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function updateOutline(text: string) {
    const headings = parseOutline(text);
    setConfig((prev) => ({ ...prev, outline: text, parsedHeadings: headings }));
  }

  async function handleAiSuggest() {
    if (!config.keyword.trim()) {
      setError('Vui lòng nhập từ khóa trước khi gợi ý dàn bài.');
      return;
    }

    setSuggestLoading(true);
    setError('');
    try {
      const res = await fetch('/api/viet-theo-dan-bai/suggest-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: config.keyword, language: config.language }),
      });
      const data = await res.json() as { outline?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Không thể gợi ý dàn bài');
      if (data.outline) updateOutline(data.outline);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
    } finally {
      setSuggestLoading(false);
    }
  }

  async function handleSearchOutline() {
    if (!config.keyword.trim()) {
      setError('Vui lòng nhập từ khóa trước khi lấy dàn bài từ Search.');
      return;
    }

    setSearchLoading(true);
    setSearchSources([]);
    setError('');
    try {
      const res = await fetch('/api/viet-theo-dan-bai/search-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: config.keyword, language: config.language }),
      });
      const data = await res.json() as {
        outline?: string;
        sources?: Array<{ title: string; url: string; headingCount: number }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Không thể lấy dàn bài từ Search');
      if (data.outline) updateOutline(data.outline);
      if (data.sources) setSearchSources(data.sources);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleCrawlUrl(url: string) {
    if (!url.trim()) return;

    setUrlLoading(true);
    setError('');
    try {
      const res = await fetch('/api/viet-theo-dan-bai/extract-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json() as { outline?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Không thể crawl URL');
      if (data.outline) updateOutline(data.outline);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
    } finally {
      setUrlLoading(false);
    }
  }

  async function handleNext() {
    const keyword = config.keyword.trim();
    const postTitle = config.postTitle.trim();

    if (!keyword) {
      setError('Vui lòng nhập từ khóa.');
      return;
    }
    if (!postTitle) {
      setError('Vui lòng nhập tiêu đề bài viết.');
      return;
    }
    if (!config.outline.trim()) {
      setError('Vui lòng nhập dàn bài.');
      return;
    }

    const headings = parseOutline(config.outline);
    const validationError = validateOutline(headings);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalConfig: DanBaiConfig = {
        ...config,
        keyword,
        postTitle,
        parsedHeadings: headings,
        brandConfig: buildBrandConfig(),
      };

      const res = await fetch('/api/viet-theo-dan-bai/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: finalConfig }),
      });

      const data = await res.json() as { articleId?: string; runId?: string; error?: string };
      if (!res.ok || !data.articleId || !data.runId) {
        throw new Error(data.error || 'Không thể bắt đầu');
      }

      sessionStorage.setItem('vdb_config', JSON.stringify(finalConfig));
      sessionStorage.setItem('vdb_article_id', data.articleId);
      sessionStorage.setItem('vdb_run_id', data.runId);
      sessionStorage.removeItem('vdb_result');

      router.push('/viet-theo-dan-bai/generate');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }

  const parsedHeadings = parseOutline(config.outline);

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full max-w-none">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Viết Bài Theo Dàn Bài</h1>
              <p className="text-sm text-blue-600 mt-1">Bước 1 / 2 — Cấu hình và nhập dàn bài</p>
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
              Từ khóa chính
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={config.keyword}
              onChange={(event) => setConfig((prev) => ({ ...prev, keyword: event.target.value }))}
              placeholder="VD: giường sắt 1m2, tủ quần áo cánh kính..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tiêu đề bài viết
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={config.postTitle}
              onChange={(event) => setConfig((prev) => ({ ...prev, postTitle: event.target.value }))}
              placeholder="VD: Giường Sắt 1m2 Nên Mua Loại Nào? So Sánh 5 Mẫu Bán Chạy 2025"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Dàn bài
              <span className="text-red-500 ml-1">*</span>
            </label>

            <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 pb-2">
              {(Object.keys(OUTLINE_TAB_LABELS) as DanBaiOutlineTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    activeTab === tab ? 'bg-blue-500 text-white font-medium' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {OUTLINE_TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {activeTab === 'ai_suggest' && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => void handleAiSuggest()}
                  disabled={suggestLoading || !config.keyword.trim()}
                  className="w-full py-2.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {suggestLoading ? (
                    <><span className="animate-spin">⟳</span> Đang gợi ý dàn bài...</>
                  ) : (
                    <>✨ Gợi ý dàn bài từ AI</>
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  AI sẽ gợi ý 6–10 heading dựa trên từ khóa. Bạn có thể chỉnh sửa lại bên dưới.
                </p>
              </div>
            )}

            {activeTab === 'from_search' && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => void handleSearchOutline()}
                  disabled={searchLoading || !config.keyword.trim()}
                  className="w-full py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {searchLoading ? (
                    <><span className="animate-spin">⟳</span> Đang phân tích top SERP...</>
                  ) : (
                    <>🔍 Lấy dàn bài từ top Google</>
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Crawl heading từ 5 trang đầu Google và AI tổng hợp lại thành 1 dàn bài.
                </p>

                {searchSources.length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs font-semibold text-green-700 mb-2">Tổng hợp từ {searchSources.length} trang:</p>
                    <ul className="space-y-1">
                      {searchSources.map((source, index) => (
                        <li key={source.url} className="flex items-start gap-2">
                          <span className="text-xs text-green-600 font-mono mt-0.5">{index + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline line-clamp-1 block"
                            >
                              {source.title}
                            </a>
                            <span className="text-xs text-gray-400">{source.headingCount} heading</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai_serp_url' && (
              <div className="mb-3 flex gap-2">
                <input
                  type="url"
                  value={serpUrl}
                  onChange={(event) => setSerpUrl(event.target.value)}
                  placeholder="https://example.com/article-url"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => void handleCrawlUrl(serpUrl)}
                  disabled={urlLoading || !serpUrl.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {urlLoading ? '⟳' : 'GET'}
                </button>
              </div>
            )}

            {activeTab === 'from_url' && (
              <div className="mb-3 flex gap-2">
                <input
                  type="url"
                  value={fromUrl}
                  onChange={(event) => setFromUrl(event.target.value)}
                  placeholder="https://example.com/bai-viet-mau"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => void handleCrawlUrl(fromUrl)}
                  disabled={urlLoading || !fromUrl.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {urlLoading ? '⟳' : 'GET'}
                </button>
              </div>
            )}

            {activeTab === 'manual' && (
              <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">
                  Bạn có thể nhập mỗi dòng là 1 heading, hoặc dùng format `[h2]` / `[h3]`.
                </p>
              </div>
            )}

            <textarea
              value={config.outline}
              onChange={(event) => updateOutline(event.target.value)}
              rows={10}
              placeholder={`Nhập dàn bài (mỗi dòng 1 heading):\n\nVD plain text:\nNên mua giường 1m2 hay 1m4?\nKhung 1.4mm có bền không?\nGiá dao động bao nhiêu?\n\nVD tag format:\n[h2] Nên mua giường 1m2 hay 1m4?\n[h3] Phòng nhỏ dưới 12m2\n[h2] Khung 1.4mm có bền không?`}
              className={`w-full border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
                outlineError ? 'border-red-400' : 'border-gray-300'
              }`}
            />

            <div className="flex justify-between items-center mt-2 gap-3">
              <span className="text-xs text-red-500">{outlineError}</span>
              <span className="text-xs text-gray-400 text-right">
                {parsedHeadings.length} heading |{' '}
                <span className="text-blue-500">format [h2][h3] hoặc plain text</span>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phương pháp viết</label>
            <select
              value={config.writeMethod}
              onChange={(event) => setConfig((prev) => ({ ...prev, writeMethod: event.target.value as DanBaiConfig['writeMethod'] }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {WRITE_METHODS.map((method) => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
            {selectedWriteMethod && (
              <p className="mt-1.5 text-xs text-gray-500">{selectedWriteMethod.note}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tone giọng văn</label>
            <select
              value={config.tone}
              onChange={(event) => setConfig((prev) => ({ ...prev, tone: event.target.value as DanBaiConfig['tone'] }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {DAN_BAI_TONES.map((tone) => (
                <option key={tone.value} value={tone.value}>{tone.label}</option>
              ))}
            </select>
            {selectedTone && (
              <p className="mt-1.5 text-xs text-gray-500">{selectedTone.note}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Độ dài bài</label>
            <select
              value={config.targetLength}
              onChange={(event) => setConfig((prev) => ({ ...prev, targetLength: Number(event.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {DAN_BAI_LENGTHS.map((length) => (
                <option key={length.value} value={length.value}>
                  {length.label}{length.badge ? ` - ${length.badge}` : ''}
                </option>
              ))}
            </select>
            {selectedLength && (
              <p className="mt-1.5 text-xs text-gray-500">
                {selectedLength.badge ? `${selectedLength.label} - ${selectedLength.badge}` : selectedLength.label}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ</label>
              <select
                value={config.language}
                onChange={(event) => setConfig((prev) => ({ ...prev, language: event.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
              {selectedLanguage && (
                <p className="mt-1.5 text-xs text-gray-500">{selectedLanguage.label}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chọn AI Model</label>
              <ModelPicker
                value={config.model}
                onChange={(id) => setConfig((prev) => ({ ...prev, model: id }))}
                size="md"
                label=""
                variant="select"
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3.5 gap-2">
              <button
                type="button"
                onClick={() => setShowBrand(!showBrand)}
                className="flex-1 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors text-left"
              >
                <span className={`text-gray-400 transition-transform duration-200 ${showBrand ? 'rotate-180' : ''}`}>▾</span>
                🏢 Tùy chỉnh thương hiệu
                {selectedProfile ? (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    {profiles.find((item) => item.id === selectedProfile)?.name || 'Profile'}
                  </span>
                ) : (shopName || industry || brandPronouns || brandAudience || brandToneNotes || phone || address || brandForbidden || ctaStandard || mainProducts) ? (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{shopName || 'Đã điền'}</span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-xs rounded-full border border-gray-200">Mặc định: Nội Thất Minh Quân</span>
                )}
              </button>

              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  📂 {profiles.length > 0 ? `${profiles.length} profile` : 'Profiles'}
                  <span className="text-gray-400">▾</span>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                    {profiles.length === 0 ? (
                      <div className="px-4 py-5 text-center">
                        <p className="text-xs text-gray-400 mb-2">Chưa có profile nào được lưu</p>
                        <button
                          type="button"
                          onClick={() => { setShowDropdown(false); router.push('/quan-ly-thuong-hieu'); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          + Tạo profile mới →
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-500">Chọn thương hiệu</p>
                          <button
                            type="button"
                            onClick={() => { setShowDropdown(false); router.push('/quan-ly-thuong-hieu'); }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Quản lý →
                          </button>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {selectedProfile && (
                            <button
                              type="button"
                              onClick={() => { clearBrand(); setShowDropdown(false); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 text-xs text-gray-400 border-b border-gray-50"
                            >
                              ✕ Bỏ chọn / Nhập tay
                            </button>
                          )}
                          {profiles.map((profile) => (
                            <button
                              key={profile.id}
                              type="button"
                              onClick={() => { applyProfile(profile); setShowDropdown(false); }}
                              className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${selectedProfile === profile.id ? 'bg-blue-50' : ''}`}
                            >
                              <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${selectedProfile === profile.id ? 'bg-blue-500' : 'bg-gray-200'}`} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-gray-800">{profile.name}</span>
                                  {profile.isDefault && <span className="text-xs text-blue-500 bg-blue-50 px-1.5 rounded">Mặc định</span>}
                                </div>
                                <p className="text-xs text-gray-400 truncate">{profile.shopName}{profile.industry ? ` · ${profile.industry}` : ''}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {showBrand && (
              <div className="px-5 pb-5 pt-4 border-t border-gray-100 bg-gray-50 space-y-4">
                <p className="text-xs text-gray-400">
                  Để trống → AI dùng brand Nội Thất Minh Quân mặc định. Điền vào để viết cho thương hiệu khác.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tên thương hiệu / Shop</label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(event) => handleBrandField(setShopName, event.target.value)}
                      placeholder="Ví dụ: Hasaki, Nội Thất Minh Quân..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Ngành hàng</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(event) => { handleBrandField(setIndustry, event.target.value); setShowIndustrySuggestions(true); }}
                      onFocus={() => setShowIndustrySuggestions(true)}
                      onBlur={() => setTimeout(() => setShowIndustrySuggestions(false), 150)}
                      placeholder="Nội thất, Mỹ phẩm, Thời trang..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {showIndustrySuggestions && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        <div className="flex flex-wrap gap-1.5 p-2.5">
                          {INDUSTRY_SUGGESTIONS
                            .filter((item) => !industry || item.toLowerCase().includes(industry.toLowerCase()))
                            .map((item) => (
                              <button
                                key={item}
                                type="button"
                                onMouseDown={() => { setIndustry(item); setSelectedProfile(''); setShowIndustrySuggestions(false); }}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 rounded-lg text-xs transition-colors"
                              >
                                {item}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Xưng hô</label>
                    <input
                      type="text"
                      value={brandPronouns}
                      onChange={(event) => handleBrandField(setBrandPronouns, event.target.value)}
                      placeholder='"mình / bạn" hoặc "em / anh chị"'
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Đối tượng khách hàng</label>
                    <input
                      type="text"
                      value={brandAudience}
                      onChange={(event) => handleBrandField(setBrandAudience, event.target.value)}
                      placeholder="Ví dụ: gia đình trẻ, dân văn phòng..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú giọng văn / USP</label>
                  <textarea
                    value={brandToneNotes}
                    onChange={(event) => handleBrandField(setBrandToneNotes, event.target.value)}
                    placeholder={`Ví dụ:\n- Muốn bài đi thẳng vào pain point\n- Giữ giọng chuyên gia, có số liệu cụ thể\n- Ưu tiên vượt AI detector`}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Hotline</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(event) => handleBrandField(setPhone, event.target.value)}
                      placeholder="Ví dụ: 0901 234 567"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Địa chỉ / Website</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(event) => handleBrandField(setAddress, event.target.value)}
                      placeholder="A7/8 đường 1C, Bình Chánh hoặc noithat.vn"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sản phẩm chính</label>
                    <input
                      type="text"
                      value={mainProducts}
                      onChange={(event) => handleBrandField(setMainProducts, event.target.value)}
                      placeholder="Giường sắt, tủ quần áo, bàn ghế inox..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">CTA chuẩn</label>
                    <input
                      type="text"
                      value={ctaStandard}
                      onChange={(event) => handleBrandField(setCtaStandard, event.target.value)}
                      placeholder="Có sẵn – giao liền. Báo giá trong ngày."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Từ cấm bổ sung</label>
                  <input
                    type="text"
                    value={brandForbidden}
                    onChange={(event) => handleBrandField(setBrandForbidden, event.target.value)}
                    placeholder='"cao cấp, sang trọng, đẳng cấp" — cách nhau bởi dấu phẩy'
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={loading || Boolean(outlineError)}
            className="w-full py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin">⟳</span> Đang xử lý...</>
            ) : (
              'Viết bài theo dàn bài →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
