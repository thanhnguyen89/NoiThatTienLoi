'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ModelPicker from '@/app/components/ModelPicker';
import { clearDraftRef, loadDraftRef, saveDraftRef } from '@/lib/article-draft-client';
import { NEWS_REWRITE_LANGUAGES, NEWS_REWRITE_STYLES } from '@/lib/viet-lai-tin-tuc/options';
import type { NewsRewriteConfig, NewsRewriteStartResponse } from '@/lib/viet-lai-tin-tuc/types';
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

const SS_KEY = 'vltt_config';
const LS_BRAND_KEY = 'vltt_brand_info';
const DRAFT_REF_KEY = 'draft:vltt';

const DEFAULT_CONFIG: NewsRewriteConfig = {
  originalHtml: '',
  originalTitle: '',
  keyword: '',
  seoMode: false,
  style: 'neutral',
  language: 'Vietnamese',
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

export default function VietLaiTinTucPage() {
  const router = useRouter();
  const [config, setConfig] = useState<NewsRewriteConfig>(DEFAULT_CONFIG);
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

  useEffect(() => {
    document.title = 'Viết Lại Tin Tức - Content Agent';
    const stored = sessionStorage.getItem(SS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as NewsRewriteConfig;
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

  function addAdditionalLink() {
    if (!linkKeyword.trim() || !linkUrl.trim()) return;
    setConfig((prev) => ({
      ...prev,
      additionalLinks: [...prev.additionalLinks, { keyword: linkKeyword.trim(), url: linkUrl.trim() }],
    }));
    setLinkKeyword('');
    setLinkUrl('');
  }

  function removeAdditionalLink(index: number) {
    setConfig((prev) => ({
      ...prev,
      additionalLinks: prev.additionalLinks.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleNext() {
    if (!config.originalHtml.trim()) {
      setError('Vui lòng nhập nội dung tin gốc.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const nextConfig = {
        ...config,
        originalHtml: config.originalHtml.trim(),
        originalTitle: config.originalTitle.trim(),
        keyword: config.keyword.trim(),
        mainKeywordUrl: config.mainKeywordUrl.trim(),
        appendContent: config.appendContent,
        brandConfig: buildBrandConfig(),
      };

      const response = await fetch('/api/viet-lai-tin-tuc/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: nextConfig, draftArticleId }),
      });

      const data = await response.json() as NewsRewriteStartResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Lỗi khởi tạo');

      sessionStorage.setItem(SS_KEY, JSON.stringify(nextConfig));
      sessionStorage.setItem('vltt_article_id', data.articleId);
      sessionStorage.setItem('vltt_run_id', data.runId);
      sessionStorage.setItem('vltt_original_wc', String(data.wordCount));
      sessionStorage.removeItem('vltt_result');
      saveDraftRef(DRAFT_REF_KEY, { articleId: data.articleId, runId: data.runId });

      router.push('/viet-lai-tin-tuc/generate');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
      setLoading(false);
    }
  }

  useEffect(() => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    const shouldPersist = Boolean(
      config.originalHtml.trim() ||
      config.originalTitle.trim() ||
      config.keyword.trim() ||
      config.appendContent.trim(),
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
            feature: 'viet_lai_tin_tuc',
            keyword: nextConfig.keyword.trim() || nextConfig.originalTitle.trim(),
            language: nextConfig.language,
            contentType: 'viet_lai_tin_tuc',
            targetLength: 0,
            aiProvider: nextConfig.model,
            brandConfig: nextConfig.brandConfig,
            selectedTitle: nextConfig.originalTitle.trim() || nextConfig.keyword.trim() || 'Viết lại tin tức',
            userNotes: null,
            secondaryKeywords: [],
            competitorUrls: [],
            outline: {
              flow: 'viet_lai_tin_tuc',
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
        <div className="flex border-b border-gray-200 bg-white rounded-t-lg overflow-hidden mb-4">
          {[
            { label: 'Viết lại đoạn văn', href: '/viet-lai-doan-van', active: false },
            { label: 'Viết lại bài viết', href: '/viet-lai-bai-viet', active: false },
            { label: 'Viết lại tin tức', href: '/viet-lai-tin-tuc', active: true },
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

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Viết Lại Tin Tức</h1>
          <p className="text-sm text-blue-600 mt-1">Bước 1 / 2 — Cấu hình bản tin gốc và cách rewrite</p>
          <div className="mt-4 flex gap-1">
            {[1, 2].map((step) => (
              <div key={step} className={`h-1.5 flex-1 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Chế độ SEO</p>
            <p className="text-xs text-gray-400 mt-0.5">Bật để tối ưu headline và keyword trong tin viết lại</p>
          </div>
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, seoMode: !prev.seoMode }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${config.seoMode ? 'bg-blue-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.seoMode ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        {config.seoMode && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Từ khóa chính (SEO)</label>
            <input
              type="text"
              value={config.keyword}
              onChange={(event) => setConfig((prev) => ({ ...prev, keyword: event.target.value }))}
              placeholder="VD: giá vàng hôm nay, thị trường bất động sản..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tiêu đề gốc</label>
              <input
                type="text"
                value={config.originalTitle}
                onChange={(event) => setConfig((prev) => ({ ...prev, originalTitle: event.target.value }))}
                placeholder="Có thể để trống nếu nội dung đã có H1"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ngôn ngữ đầu ra</label>
              <select
                value={config.language}
                onChange={(event) => setConfig((prev) => ({ ...prev, language: event.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {NEWS_REWRITE_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nội dung tin gốc <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">Dán HTML hoặc plain text của bài tin muốn viết lại.</p>
          <textarea
            value={config.originalHtml}
            onChange={(event) => setConfig((prev) => ({ ...prev, originalHtml: event.target.value }))}
            placeholder="Dán nội dung tin gốc vào đây..."
            rows={12}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Phong cách viết lại tin</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {NEWS_REWRITE_STYLES.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, style: style.value }))}
                  title={style.note}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-colors ${
                    config.style === style.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  <span className="text-xs font-medium">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Model AI</label>
            <ModelPicker value={config.model} onChange={(id) => setConfig((prev) => ({ ...prev, model: id }))} size="md" label="" />

            <div className="mt-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tự động in đậm</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: 'none', label: 'Không dùng' },
                  { value: 'keyword', label: 'Từ khóa' },
                  { value: 'headings', label: 'Heading' },
                  { value: 'both', label: 'Cả hai' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, autoBold: item.value as NewsRewriteConfig['autoBold'] }))}
                    className={`px-3 py-2 rounded-lg border text-xs transition-colors ${
                      config.autoBold === item.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Link keyword chính</label>
          <input
            type="url"
            value={config.mainKeywordUrl}
            onChange={(event) => setConfig((prev) => ({ ...prev, mainKeywordUrl: event.target.value }))}
            placeholder="https://example.com/chuyen-muc"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Link phụ theo từ khóa</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={linkKeyword}
                onChange={(event) => setLinkKeyword(event.target.value)}
                placeholder="Từ khóa"
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://..."
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button type="button" onClick={addAdditionalLink} className="px-3 py-1.5 bg-gray-100 text-xs rounded-lg hover:bg-gray-200">
                + Thêm
              </button>
            </div>
            {config.additionalLinks.map((link, index) => (
              <div key={`${link.keyword}-${link.url}-${index}`} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1.5 mb-1">
                <span className="flex-1 text-gray-700 truncate">{link.keyword}</span>
                <span className="text-gray-400 truncate">→ {link.url}</span>
                <button type="button" onClick={() => removeAdditionalLink(index)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nội dung thêm cuối bài</label>
            <textarea
              value={config.appendContent}
              onChange={(event) => setConfig((prev) => ({ ...prev, appendContent: event.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Thông tin thương hiệu</h2>
              <p className="text-sm text-gray-500">Giữ cùng cách nhập brand như các flow khác để đồng bộ prompt.</p>
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
                  <input type="text" value={shopName} onChange={(event) => handleBrandField(setShopName, event.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Xưng hô</label>
                  <input type="text" value={brandPronouns} onChange={(event) => handleBrandField(setBrandPronouns, event.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Đối tượng khách hàng</label>
                  <input type="text" value={brandAudience} onChange={(event) => handleBrandField(setBrandAudience, event.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Hotline</label>
                  <input type="text" value={phone} onChange={(event) => handleBrandField(setPhone, event.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ</label>
                  <input type="text" value={address} onChange={(event) => handleBrandField(setAddress, event.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CTA chuẩn</label>
                  <textarea value={ctaStandard} onChange={(event) => handleBrandField(setCtaStandard, event.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">USP / sản phẩm chính</label>
                  <textarea value={mainProducts} onChange={(event) => handleBrandField(setMainProducts, event.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tone notes / lưu ý thương hiệu</label>
                  <textarea value={brandToneNotes} onChange={(event) => handleBrandField(setBrandToneNotes, event.target.value)} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Từ cấm thêm</label>
                  <textarea value={brandForbidden} onChange={(event) => handleBrandField(setBrandForbidden, event.target.value)} rows={4} placeholder="Ngăn cách bằng dấu phẩy" className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={clearBrand} className="text-sm px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
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
              sessionStorage.removeItem('vltt_article_id');
              sessionStorage.removeItem('vltt_run_id');
              sessionStorage.removeItem('vltt_original_wc');
              sessionStorage.removeItem('vltt_result');
              clearDraftRef(DRAFT_REF_KEY);
              setDraftArticleId(null);
              setConfig(DEFAULT_CONFIG);
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
            {loading ? 'Đang khởi tạo...' : 'Tiếp tục viết lại'}
          </button>
        </div>
      </div>
    </div>
  );
}
