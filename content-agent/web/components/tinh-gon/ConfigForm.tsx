'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '@/app/components/ModelPicker';
import { LANGUAGE_OPTIONS, OUTLINE_TYPES, TARGET_LENGTHS } from '@/lib/tinh-gon/options';
import type { TinhGonBrandConfig, TinhGonConfig } from '@/lib/tinh-gon/types';

// ─── Brand Profile type (từ API /api/brand-profiles) ─────────────────────────
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

const LS_BRAND_KEY = 'tg_brand_info';

const INDUSTRY_SUGGESTIONS = [
  'Nội thất', 'Thời trang', 'Mỹ phẩm / Làm đẹp', 'Thực phẩm & Đồ uống',
  'Điện tử / Công nghệ', 'Nhà hàng / Cafe', 'Sức khỏe / Thể thao',
  'Giáo dục', 'Bất động sản', 'Du lịch', 'Ô tô / Xe máy', 'Khác',
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  config: TinhGonConfig;
  error: string;
  suggestedKw: string[];
  loadingKw: boolean;
  loading: boolean;
  showKwPanel: boolean;
  showNotes: boolean;
  setConfig: Dispatch<SetStateAction<TinhGonConfig>>;
  setShowKwPanel: Dispatch<SetStateAction<boolean>>;
  setShowNotes: Dispatch<SetStateAction<boolean>>;
  onSuggestKeywords: () => Promise<void>;
  onToggleSecondaryKw: (keyword: string) => void;
  onSubmit: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ConfigForm({
  config,
  error,
  suggestedKw,
  loadingKw,
  loading,
  showKwPanel,
  showNotes,
  setConfig,
  setShowKwPanel,
  setShowNotes,
  onSuggestKeywords,
  onToggleSecondaryKw,
  onSubmit,
}: Props) {
  const router = useRouter();
  const selectedType = OUTLINE_TYPES.find((item) => item.value === config.outlineType);

  // ── Brand local state ──────────────────────────────────────────────────────
  const [showBrand,       setShowBrand]       = useState(false);
  const [shopName,        setShopName]        = useState('');
  const [industry,        setIndustry]        = useState('');
  const [brandPronouns,   setBrandPronouns]   = useState('');
  const [brandAudience,   setBrandAudience]   = useState('');
  const [brandToneNotes,  setBrandToneNotes]  = useState('');
  const [phone,           setPhone]           = useState('');
  const [address,         setAddress]         = useState('');
  const [brandForbidden,  setBrandForbidden]  = useState('');
  const [ctaStandard,     setCtaStandard]     = useState('');
  const [mainProducts,    setMainProducts]    = useState('');
  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false);

  // Brand profiles (DB)
  const [profiles,        setProfiles]        = useState<BrandProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [showDropdown,    setShowDropdown]    = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Load brand từ localStorage + profiles từ API ───────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(LS_BRAND_KEY);
    if (saved) {
      try {
        const b = JSON.parse(saved) as Partial<BrandProfile>;
        if (b.shopName)       setShopName(b.shopName);
        if (b.industry)       setIndustry(b.industry);
        if (b.brandPronouns)  setBrandPronouns(b.brandPronouns);
        if (b.brandAudience)  setBrandAudience(b.brandAudience);
        if (b.brandToneNotes) setBrandToneNotes(b.brandToneNotes);
        if (b.phone)          setPhone(b.phone);
        if (b.address)        setAddress(b.address);
        if (b.brandForbidden) setBrandForbidden(b.brandForbidden);
        if (b.ctaStandard)    setCtaStandard(b.ctaStandard);
        if (b.mainProducts)   setMainProducts(b.mainProducts);
      } catch { /* ignore */ }
    }
    void fetchProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Đóng dropdown khi click ngoài ─────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Mỗi khi brand fields thay đổi → sync vào config.brandConfig ───────────
  useEffect(() => {
    const brand: TinhGonBrandConfig = {
      name:           shopName.trim() || undefined,
      pronouns:       brandPronouns.trim() || undefined,
      audience:       brandAudience.trim() || undefined,
      forbiddenExtra: brandForbidden.trim() || undefined,
      toneNotes:      [
        brandToneNotes.trim(),
        phone.trim()       ? `Hotline: ${phone.trim()}`        : '',
        address.trim()     ? `Địa chỉ: ${address.trim()}`      : '',
        ctaStandard.trim() ? `CTA: ${ctaStandard.trim()}`      : '',
        mainProducts.trim()? `Sản phẩm chính: ${mainProducts.trim()}` : '',
        industry.trim()    ? `Ngành hàng: ${industry.trim()}`  : '',
      ].filter(Boolean).join('\n') || undefined,
    };
    setConfig((prev) => ({ ...prev, brandConfig: brand }));
    // Auto-save localStorage
    localStorage.setItem(LS_BRAND_KEY, JSON.stringify({
      shopName, industry, brandPronouns, brandAudience, brandToneNotes,
      phone, address, brandForbidden, ctaStandard, mainProducts,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopName, industry, brandPronouns, brandAudience, brandToneNotes, phone, address, brandForbidden, ctaStandard, mainProducts]);

  async function fetchProfiles() {
    try {
      const res = await fetch('/api/brand-profiles?activeOnly=true');
      const json = await res.json() as { success: boolean; data: BrandProfile[] };
      if (json.success) {
        setProfiles(json.data);
        const def = json.data.find((p) => p.isDefault);
        if (def && !localStorage.getItem(LS_BRAND_KEY)) {
          applyProfile(def);
        }
      }
    } catch { /* ignore */ }
  }

  function applyProfile(p: BrandProfile) {
    setShopName(p.shopName             || '');
    setIndustry(p.industry             || '');
    setBrandPronouns(p.brandPronouns   || '');
    setBrandAudience(p.brandAudience   || '');
    setBrandToneNotes(p.brandToneNotes || '');
    setPhone(p.phone                   || '');
    setAddress(p.address               || '');
    setBrandForbidden(p.brandForbidden || '');
    setCtaStandard(p.ctaStandard       || '');
    setMainProducts(p.mainProducts     || '');
    setSelectedProfile(p.id);
    setShowBrand(true);
  }

  function clearBrand() {
    setShopName(''); setIndustry(''); setBrandPronouns(''); setBrandAudience('');
    setBrandToneNotes(''); setPhone(''); setAddress('');
    setBrandForbidden(''); setCtaStandard(''); setMainProducts('');
    setSelectedProfile('');
    localStorage.removeItem(LS_BRAND_KEY);
  }

  const activeProfile = profiles.find((p) => p.id === selectedProfile);
  const hasBrandFields = !!(shopName || industry || brandPronouns || phone);

  // ── Helpers để reset selectedProfile khi user tự nhập ─────────────────────
  function handleBrandField<T>(setter: Dispatch<SetStateAction<T>>, value: T) {
    setter(value);
    setSelectedProfile('');
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">

      {/* ── AI Model ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn AI Model</label>
        <ModelPicker value={config.model} onChange={(id) => setConfig((prev) => ({ ...prev, model: id }))} size="md" label="" />
      </div>

      {/* ── Keyword ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Từ khóa hoặc chủ đề bài viết
          <span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          value={config.keyword}
          onChange={(event) => setConfig((prev) => ({ ...prev, keyword: event.target.value }))}
          placeholder="Ví dụ: giường sắt hộp 1m2, tủ quần áo sắt giá rẻ..."
          rows={2}
          className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-300'
          }`}
        />
        {error ? (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        ) : (
          <p className="text-xs text-gray-400 mt-1">Từ khóa ngắn, rõ intent sẽ cho outline đẹp hơn.</p>
        )}
      </div>

      {/* ── Loại bài viết ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Loại bài viết</label>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
          {OUTLINE_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, outlineType: type.value }))}
              className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-all text-center ${
                config.outlineType === type.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300 text-gray-600'
              }`}
            >
              <span className="text-xl">{type.icon}</span>
              <span className="text-xs font-semibold leading-tight">{type.label}</span>
            </button>
          ))}
        </div>
        {selectedType && (
          <div className="mt-2 px-3 py-2 bg-blue-50 rounded-lg flex gap-2">
            <span className="text-base">{selectedType.icon}</span>
            <div>
              <p className="text-xs text-blue-700">{selectedType.note}</p>
              <p className="text-xs text-blue-500 italic mt-0.5">{selectedType.example}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Độ dài + Ngôn ngữ ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Độ dài mục tiêu</label>
          <select
            value={config.targetLength}
            onChange={(event) => setConfig((prev) => ({ ...prev, targetLength: Number(event.target.value) }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TARGET_LENGTHS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}{item.badge ? ` — ${item.badge}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ</label>
          <select
            value={config.language}
            onChange={(event) => setConfig((prev) => ({ ...prev, language: event.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Dữ liệu cho AI</label>
        <select
          value={config.dataSource ?? 'ai_only'}
          onChange={(event) => setConfig((prev) => ({ ...prev, dataSource: event.target.value as 'ai_only' | 'google_search' }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ai_only">Chỉ dùng AI</option>
          <option value="google_search">🔍 Google Search & AI</option>
        </select>
        {config.dataSource === 'google_search' && (
          <p className="text-xs text-blue-600 mt-1.5">
            AI sẽ đọc top kết quả Google thực tế trước khi viết — chậm hơn một chút nhưng nội dung sát thực tế hơn.
          </p>
        )}
      </div>

      {/* ── Tùy chỉnh thương hiệu — giống /viet-bai-facebook ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center px-4 py-3.5 gap-2">
          {/* Toggle collapse */}
          <button
            type="button"
            onClick={() => setShowBrand(!showBrand)}
            className="flex-1 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors text-left"
          >
            <span className={`text-gray-400 transition-transform duration-200 ${showBrand ? 'rotate-180' : ''}`}>▾</span>
            🏢 Tùy chỉnh thương hiệu
            {activeProfile ? (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{activeProfile.name}</span>
            ) : hasBrandFields ? (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{shopName || 'Đã điền'}</span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-xs rounded-full border border-gray-200">Mặc định: Nội Thất Minh Quân</span>
            )}
          </button>

          {/* Profile dropdown */}
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
                      {profiles.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { applyProfile(p); setShowDropdown(false); }}
                          className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${selectedProfile === p.id ? 'bg-blue-50' : ''}`}
                        >
                          <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${selectedProfile === p.id ? 'bg-blue-500' : 'bg-gray-200'}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-gray-800">{p.name}</span>
                              {p.isDefault && <span className="text-xs text-blue-500 bg-blue-50 px-1.5 rounded">Mặc định</span>}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{p.shopName}{p.industry ? ` · ${p.industry}` : ''}</p>
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

            {/* Hàng 1: Tên shop + Ngành hàng */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tên thương hiệu / Shop</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => handleBrandField(setShopName, e.target.value)}
                  placeholder="Ví dụ: Hasaki, Nội Thất Minh Quân..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ngành hàng</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => { handleBrandField(setIndustry, e.target.value); setShowIndustrySuggestions(true); }}
                  onFocus={() => setShowIndustrySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowIndustrySuggestions(false), 150)}
                  placeholder="Nội thất, Mỹ phẩm, Thời trang..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {showIndustrySuggestions && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="flex flex-wrap gap-1.5 p-2.5">
                      {INDUSTRY_SUGGESTIONS
                        .filter((s) => !industry || s.toLowerCase().includes(industry.toLowerCase()))
                        .map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={() => { setIndustry(s); setSelectedProfile(''); setShowIndustrySuggestions(false); }}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 rounded-lg text-xs transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hàng 2: Xưng hô + Đối tượng */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Xưng hô</label>
                <input
                  type="text"
                  value={brandPronouns}
                  onChange={(e) => handleBrandField(setBrandPronouns, e.target.value)}
                  placeholder='"mình / bạn" hoặc "em / anh chị"'
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Đối tượng khách hàng</label>
                <input
                  type="text"
                  value={brandAudience}
                  onChange={(e) => handleBrandField(setBrandAudience, e.target.value)}
                  placeholder="Ví dụ: phụ nữ 25–40 tuổi, chủ homestay..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Ghi chú giọng văn / USP */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú giọng văn / USP</label>
              <textarea
                value={brandToneNotes}
                onChange={(e) => handleBrandField(setBrandToneNotes, e.target.value)}
                placeholder={`Ví dụ:\n- Sản phẩm: giường sắt hộp, khung 1.4mm, bảo hành 12 tháng\n- USP: giá xưởng, không qua trung gian\n- Giao hàng: hỏa tốc 2–4h nội thành HCM`}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed"
              />
            </div>

            {/* Hotline + Địa chỉ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Hotline</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => handleBrandField(setPhone, e.target.value)}
                  placeholder="Ví dụ: 0901 234 567"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Địa chỉ / Website</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => handleBrandField(setAddress, e.target.value)}
                  placeholder="A7/8 đường 1C, Bình Chánh hoặc noithat.vn"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Sản phẩm chính + CTA chuẩn */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sản phẩm chính</label>
                <input
                  type="text"
                  value={mainProducts}
                  onChange={(e) => handleBrandField(setMainProducts, e.target.value)}
                  placeholder="Giường sắt, tủ quần áo, bàn ghế inox..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">CTA chuẩn</label>
                <input
                  type="text"
                  value={ctaStandard}
                  onChange={(e) => handleBrandField(setCtaStandard, e.target.value)}
                  placeholder="Có sẵn – giao liền. Báo giá trong ngày."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Từ cấm bổ sung */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Từ cấm bổ sung</label>
              <input
                type="text"
                value={brandForbidden}
                onChange={(e) => handleBrandField(setBrandForbidden, e.target.value)}
                placeholder='"cao cấp, sang trọng, đẳng cấp" — cách nhau bởi dấu phẩy'
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Từ khóa phụ ── */}
      <div className="border border-blue-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowKwPanel((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            🔗 Từ khóa phụ (AI gợi ý)
            {config.secondaryKeywords.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {config.secondaryKeywords.length} đã chọn
              </span>
            )}
          </span>
          <span className={`text-gray-400 transition-transform duration-200 ${showKwPanel ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {showKwPanel && (
          <div className="border-t border-blue-100 p-4 bg-blue-50 space-y-3">
            <button
              type="button"
              onClick={() => void onSuggestKeywords()}
              disabled={!config.keyword.trim() || loadingKw}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 rounded-lg text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <span>{loadingKw ? '⏳' : '✨'}</span>
              <span>{loadingKw ? 'Đang gợi ý...' : 'AI gợi ý từ khóa phụ'}</span>
            </button>

            {suggestedKw.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {suggestedKw.map((keyword) => {
                  const active = config.secondaryKeywords.includes(keyword);
                  return (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => onToggleSecondaryKw(keyword)}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {active ? '☑' : '☐'} {keyword}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Nhập từ khóa chính trước, rồi bấm AI gợi ý.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Ghi chú thêm ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowNotes((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>📝 Ghi chú thêm</span>
          <span className={`text-gray-400 transition-transform duration-200 ${showNotes ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {showNotes && (
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            <textarea
              value={config.notes}
              onChange={(event) => setConfig((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Ví dụ: nhấn mạnh giao nhanh, giá xưởng, hoặc ưu tiên khách phòng trọ..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {activeProfile
            ? <span className="text-blue-600 font-medium">🏢 {activeProfile.name} · </span>
            : hasBrandFields
            ? <span className="text-gray-600 font-medium">{shopName || industry} · </span>
            : null
          }
          Pipeline sẽ tạo outline trong khoảng 5–10 giây.
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="px-8 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
        >
          <span>{loading ? 'Đang chuyển bước...' : 'Tiếp theo'}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
