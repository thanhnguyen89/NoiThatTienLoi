'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '@/app/components/ModelPicker';
import {
  clearReviewWorkflowSession,
  readReviewBrandInfo,
  readReviewSession,
  removeReviewBrandInfo,
  removeReviewSession,
  writeReviewBrandInfo,
  writeReviewSession,
} from '@/lib/product-scraper/session';
import type { TinhGonBrandConfig } from '@/lib/tinh-gon/types';
import { isSupportedUrl } from '@/lib/product-scraper/scraper';
import type {
  ReviewConfig,
  ReviewStructure,
  ReviewStyle,
  ReviewStartResponse,
  ScrapeResponse,
} from '@/lib/product-scraper/types';

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

const REVIEW_STRUCTURES: Array<{ value: ReviewStructure; label: string; desc: string }> = [
  {
    value: 'full',
    label: 'Đầy đủ',
    desc: 'Thương hiệu – Tính năng – Kinh nghiệm sử dụng – Ưu & nhược điểm – Lời khuyên',
  },
  {
    value: 'focused',
    label: 'Tập trung',
    desc: 'Tập trung vào tính năng, điểm mạnh và điểm yếu của sản phẩm.',
  },
];

const REVIEW_STYLES: Array<{ value: ReviewStyle; icon: string; label: string; note: string }> = [
  { value: 'expert', icon: '🎓', label: 'Chuyên gia', note: 'Giọng phân tích sâu, rõ luận điểm và số liệu.' },
  { value: 'user', icon: '👤', label: 'Người dùng thực', note: 'Tập trung trải nghiệm thực tế, gần gũi hơn.' },
  { value: 'friendly', icon: '😊', label: 'Thân thiện', note: 'Dễ đọc, mềm mại, phù hợp blog thương hiệu.' },
  { value: 'fun', icon: '😄', label: 'Vui vẻ', note: 'Thoải mái, có chút dí dỏm nhưng vẫn đủ thông tin.' },
  { value: 'technical', icon: '🔧', label: 'Kỹ thuật', note: 'Nặng thông số, hiệu năng, độ bền và cấu tạo.' },
  { value: 'informational', icon: '📋', label: 'Thông tin', note: 'Khách quan, rõ ràng, ít cảm tính.' },
];

const DEFAULT_CONFIG: ReviewConfig = {
  productUrl: '',
  productName: '',
  productInfo: '',
  keyword: '',
  affiliateLink: '',
  reviewStructure: 'full',
  reviewStyle: 'expert',
  language: 'Vietnamese',
  model: 'gemini-flash',
};

const INDUSTRY_SUGGESTIONS = [
  'Nội thất', 'Thời trang', 'Mỹ phẩm / Làm đẹp', 'Thực phẩm & Đồ uống',
  'Điện tử / Công nghệ', 'Nhà hàng / Cafe', 'Sức khỏe / Thể thao',
  'Giáo dục', 'Bất động sản', 'Du lịch', 'Ô tô / Xe máy', 'Khác',
];

export default function VietDanhGiaSanPhamPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ReviewConfig>(DEFAULT_CONFIG);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState('');
  const [inputMode, setInputMode] = useState<'url' | 'manual'>('url');
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

  useEffect(() => {
    document.title = 'Viết Đánh Giá Sản Phẩm - Content Agent';
    const stored = readReviewSession('config');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ReviewConfig;
        setConfig(parsed);
        setInputMode(parsed.productUrl ? 'url' : 'manual');
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
        removeReviewSession('config');
      }
    }

    const saved = readReviewBrandInfo();
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
        removeReviewBrandInfo();
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
    setConfig((prev) => ({ ...prev, brandConfig: buildBrandConfig() }));
    const hasBrandValue = Boolean(
      shopName || industry || brandPronouns || brandAudience || brandToneNotes || phone || address || brandForbidden || ctaStandard || mainProducts,
    );

    if (hasBrandValue) {
      writeReviewBrandInfo(JSON.stringify({
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
      removeReviewBrandInfo();
    }
  }, [address, brandAudience, brandForbidden, brandPronouns, brandToneNotes, ctaStandard, industry, mainProducts, phone, shopName]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProfiles() {
    try {
      const res = await fetch('/api/brand-profiles?activeOnly=true');
      const json = await res.json() as { success: boolean; data: BrandProfile[] };
      if (json.success) {
        setProfiles(json.data);
        const def = json.data.find((item) => item.isDefault);
        if (def && !readReviewBrandInfo() && !sessionBrandLoadedRef.current) {
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
    removeReviewBrandInfo();
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

  async function handleScrape() {
    if (!config.productUrl?.trim()) return;

    setScraping(true);
    setScrapeMsg('');
    setError('');

    try {
      const res = await fetch('/api/danh-gia-san-pham/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: config.productUrl }),
      });
      const data = (await res.json()) as ScrapeResponse;

      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Không thể thu thập thông tin sản phẩm');
      }

      setConfig((prev) => ({
        ...prev,
        productName: data.data?.name || prev.productName,
        productInfo: data.data?.info || prev.productInfo,
      }));
      setScrapeMsg(`✅ Thu thập thành công: ${data.data.name?.slice(0, 80) || 'sản phẩm'}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể thu thập');
      setScrapeMsg('');
    } finally {
      setScraping(false);
    }
  }

  async function handleNext() {
    const keyword = config.keyword.trim();
    const productName = config.productName.trim();
    const productInfo = config.productInfo.trim();

    if (!keyword) {
      setError('Vui lòng nhập từ khóa');
      return;
    }
    if (!productName) {
      setError('Vui lòng nhập tên sản phẩm');
      return;
    }
    if (!productInfo) {
      setError('Vui lòng nhập hoặc thu thập thông tin sản phẩm');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const nextConfig: ReviewConfig = {
        ...config,
        keyword,
        productName,
        productInfo,
        brandConfig: buildBrandConfig(),
      };

      const res = await fetch('/api/danh-gia-san-pham/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: nextConfig }),
      });
      const data = (await res.json()) as ReviewStartResponse & { error?: string };

      if (!res.ok || !data.articleId || !data.runId) {
        throw new Error(data.error || 'Không thể khởi tạo bài viết');
      }

      writeReviewSession('config', JSON.stringify(nextConfig));
      writeReviewSession('articleId', data.articleId);
      writeReviewSession('runId', data.runId);
      removeReviewSession('result');

      router.push('/viet-danh-gia-san-pham/generate');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi khi khởi tạo');
      setLoading(false);
    }
  }

  const productUrlSupported = config.productUrl?.trim() ? isSupportedUrl(config.productUrl) : true;

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full max-w-none">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Viết đánh giá sản phẩm</h1>
              <p className="text-sm text-blue-600 mt-1">Bước 1 / 2 — Nhập dữ liệu sản phẩm và cấu hình bài review</p>
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                inputMode === 'url' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              🔗 Link sản phẩm
            </button>
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                inputMode === 'manual' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              ✏️ Nhập thủ công
            </button>
          </div>

          {inputMode === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                URL sản phẩm
                <span className="text-xs text-gray-400 ml-2">Shopee, Lazada, Amazon, Etsy, Alibaba, Shopify, WooCommerce...</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={config.productUrl ?? ''}
                  onChange={(event) => setConfig((prev) => ({ ...prev, productUrl: event.target.value }))}
                  placeholder="https://shopee.vn/product/... hoặc URL sản phẩm bất kỳ"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => void handleScrape()}
                  disabled={!config.productUrl?.trim() || scraping}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {scraping ? '⏳ Đang thu thập...' : '📥 Thu thập'}
                </button>
              </div>
              {!productUrlSupported && config.productUrl?.trim() && (
                <p className="text-xs text-amber-600 mt-1.5">
                  Domain này chưa nằm trong danh sách tối ưu. Bạn vẫn có thể thử thu thập, hoặc chuyển sang nhập thủ công nếu bị chặn.
                </p>
              )}
              {scrapeMsg && <p className="text-xs text-green-600 mt-1.5">{scrapeMsg}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.productName}
              onChange={(event) => setConfig((prev) => ({ ...prev, productName: event.target.value }))}
              placeholder="Ví dụ: Giường sắt hộp Minh Quân 1m6 - khung 1.4mm"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Thông tin sản phẩm <span className="text-red-500">*</span>
            </label>
            <textarea
              value={config.productInfo}
              onChange={(event) => setConfig((prev) => ({ ...prev, productInfo: event.target.value }))}
              placeholder="Dán thông số kỹ thuật, mô tả, tính năng, điểm mạnh/yếu... hoặc bấm Thu thập từ URL"
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Từ khóa SEO <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.keyword}
                onChange={(event) => setConfig((prev) => ({ ...prev, keyword: event.target.value }))}
                placeholder="Ví dụ: giường sắt hộp 1m6"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Link mua hàng / Affiliate
                <span className="text-xs text-gray-400 ml-1">(tùy chọn)</span>
              </label>
              <input
                type="url"
                value={config.affiliateLink ?? ''}
                onChange={(event) => setConfig((prev) => ({ ...prev, affiliateLink: event.target.value }))}
                placeholder="https://... — AI sẽ chèn 1–2 lần vào bài"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cấu trúc bài review</label>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              {REVIEW_STRUCTURES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, reviewStructure: item.value }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                    config.reviewStructure === item.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-800">{item.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phong cách viết</label>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {REVIEW_STYLES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  title={item.note}
                  onClick={() => setConfig((prev) => ({ ...prev, reviewStyle: item.value }))}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all ${
                    config.reviewStyle === item.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 text-gray-600'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs font-medium text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ</label>
              <select
                value={config.language}
                onChange={(event) => setConfig((prev) => ({ ...prev, language: event.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Vietnamese">🇻🇳 Tiếng Việt</option>
                <option value="English">🇬🇧 English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
              <ModelPicker value={config.model} onChange={(id) => setConfig((prev) => ({ ...prev, model: id }))} size="md" label="" />
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
                      placeholder="Ví dụ: gia đình trẻ, dân văn phòng, chủ homestay..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú giọng văn / USP</label>
                  <textarea
                    value={brandToneNotes}
                    onChange={(event) => handleBrandField(setBrandToneNotes, event.target.value)}
                    placeholder={`Ví dụ:\n- USP: giá xưởng, không qua trung gian\n- Ưu tiên viết thật, nêu cả điểm mạnh lẫn điểm yếu\n- Có bảo hành, giao hàng, đổi trả rõ ràng`}
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

          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">
              AI sẽ viết bài review chuẩn SEO trong khoảng 10–20 giây sau khi khởi động.
            </p>
            <button
              type="button"
              onClick={() => void handleNext()}
              disabled={loading}
              className="px-8 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              {loading ? 'Đang khởi tạo...' : 'Viết ngay →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
