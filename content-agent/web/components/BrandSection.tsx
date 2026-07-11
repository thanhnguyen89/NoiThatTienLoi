'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  latitude: number | null;
  longitude: number | null;
  openingHours: string | null;
  priceRange: string | null;
  isDefault: boolean;
}

export interface BrandSectionState {
  shopName: string;
  industry: string;
  brandPronouns: string;
  brandAudience: string;
  brandToneNotes: string;
  brandDesc: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  priceRange: string;
  phone: string;
  address: string;
  brandForbidden: string;
  ctaStandard: string;
  mainProducts: string;
  selectedProfileId: string;
}

export const EMPTY_BRAND_SECTION_STATE: BrandSectionState = {
  shopName: '',
  industry: '',
  brandPronouns: '',
  brandAudience: '',
  brandToneNotes: '',
  brandDesc: '',
  latitude: '',
  longitude: '',
  openingHours: '',
  priceRange: '',
  phone: '',
  address: '',
  brandForbidden: '',
  ctaStandard: '',
  mainProducts: '',
  selectedProfileId: '',
};

const INDUSTRY_SUGGESTIONS = [
  'Nội thất',
  'Thời trang',
  'Mỹ phẩm / Làm đẹp',
  'Thực phẩm & Đồ uống',
  'Điện tử / Công nghệ',
  'Nhà hàng / Cafe',
  'Sức khỏe / Thể thao',
  'Giáo dục',
  'Bất động sản',
  'Du lịch',
  'Ô tô / Xe máy',
  'Khác',
];

function hasBrandValue(value: BrandSectionState): boolean {
  return Boolean(
    value.shopName ||
      value.industry ||
      value.brandPronouns ||
      value.brandAudience ||
      value.brandToneNotes ||
      value.brandDesc ||
      value.latitude ||
      value.longitude ||
      value.openingHours ||
      value.priceRange ||
      value.phone ||
      value.address ||
      value.brandForbidden ||
      value.ctaStandard ||
      value.mainProducts,
  );
}

export function buildBrandConfig(value: BrandSectionState): TinhGonBrandConfig | undefined {
  const brandConfig: TinhGonBrandConfig = {
    name: value.shopName.trim() || undefined,
    pronouns: value.brandPronouns.trim() || undefined,
    audience: value.brandAudience.trim() || undefined,
    forbiddenExtra: value.brandForbidden.trim() || undefined,
    description: value.brandDesc.trim() || undefined,
    latitude: value.latitude.trim() ? Number(value.latitude) : undefined,
    longitude: value.longitude.trim() ? Number(value.longitude) : undefined,
    openingHours: value.openingHours.trim() || undefined,
    priceRange: value.priceRange.trim() || undefined,
    toneNotes: [
      value.brandToneNotes.trim(),
      value.brandDesc.trim() ? `Mo ta thuong hieu: ${value.brandDesc.trim()}` : '',
      value.phone.trim() ? `Hotline: ${value.phone.trim()}` : '',
      value.address.trim() ? `Địa chỉ: ${value.address.trim()}` : '',
      value.ctaStandard.trim() ? `CTA: ${value.ctaStandard.trim()}` : '',
      value.mainProducts.trim() ? `Sản phẩm chính: ${value.mainProducts.trim()}` : '',
      value.industry.trim() ? `Ngành hàng: ${value.industry.trim()}` : '',
    ].filter(Boolean).join('\n') || undefined,
  };

  return Object.values(brandConfig).some(Boolean) ? brandConfig : undefined;
}

interface BrandSectionProps {
  value: BrandSectionState;
  onChange: (next: BrandSectionState) => void;
  lsKey: string;
  defaultBrandName?: string;
}

export function BrandSection({
  value,
  onChange,
  lsKey,
  defaultBrandName = 'Nội Thất Minh Quân',
}: BrandSectionProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [showBrand, setShowBrand] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === value.selectedProfileId),
    [profiles, value.selectedProfileId],
  );

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch('/api/brand-profiles?activeOnly=true');
        const json = (await res.json()) as { success: boolean; data: BrandProfile[] };
        if (!json.success) return;

        setProfiles(json.data);
        if (hydratedRef.current) return;

        const def = json.data.find((item) => item.isDefault);
        if (def && !hasBrandValue(value) && !localStorage.getItem(lsKey)) {
          applyProfile(def);
        }
      } catch {
        // ignore
      }
    }

    fetchProfiles().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lsKey]);

  useEffect(() => {
    if (hydratedRef.current || typeof window === 'undefined') return;
    hydratedRef.current = true;

    if (hasBrandValue(value)) {
      setShowBrand(true);
      return;
    }

    const saved = localStorage.getItem(lsKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<BrandSectionState>;
      const next: BrandSectionState = {
        ...EMPTY_BRAND_SECTION_STATE,
        ...parsed,
        selectedProfileId: parsed.selectedProfileId || '',
      };
      onChange(next);
      if (hasBrandValue(next)) setShowBrand(true);
    } catch {
      localStorage.removeItem(lsKey);
    }
  }, [lsKey, onChange, value]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasBrandValue(value)) {
      localStorage.setItem(lsKey, JSON.stringify(value));
    } else {
      localStorage.removeItem(lsKey);
    }
  }, [lsKey, value]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function updateField<K extends keyof BrandSectionState>(field: K, nextValue: BrandSectionState[K]) {
    onChange({
      ...value,
      [field]: nextValue,
      selectedProfileId: field === 'selectedProfileId' ? String(nextValue) : '',
    });
  }

  function applyProfile(profile: BrandProfile) {
    onChange({
      shopName: profile.shopName || '',
      industry: profile.industry || '',
      brandPronouns: profile.brandPronouns || '',
      brandAudience: profile.brandAudience || '',
      brandToneNotes: profile.brandToneNotes || '',
      brandDesc: profile.brandDesc || '',
      latitude: profile.latitude != null ? String(profile.latitude) : '',
      longitude: profile.longitude != null ? String(profile.longitude) : '',
      openingHours: profile.openingHours || '',
      priceRange: profile.priceRange || '',
      phone: profile.phone || '',
      address: profile.address || '',
      brandForbidden: profile.brandForbidden || '',
      ctaStandard: profile.ctaStandard || '',
      mainProducts: profile.mainProducts || '',
      selectedProfileId: profile.id,
    });
    setShowBrand(true);
  }

  function clearBrand() {
    onChange(EMPTY_BRAND_SECTION_STATE);
    localStorage.removeItem(lsKey);
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center px-4 py-3.5 gap-2">
        <button
          type="button"
          onClick={() => setShowBrand((prev) => !prev)}
          className="flex-1 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors text-left"
        >
          <span className={`text-gray-400 transition-transform duration-200 ${showBrand ? 'rotate-180' : ''}`}>v</span>
          <span>Tùy chỉnh thương hiệu</span>
          {activeProfile ? (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{activeProfile.name}</span>
          ) : hasBrandValue(value) ? (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{value.shopName || 'Đã điền'}</span>
          ) : (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-xs rounded-full border border-gray-200">
              Mặc định: {defaultBrandName}
            </span>
          )}
        </button>

        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
          >
            {profiles.length > 0 ? `${profiles.length} profile` : 'Profiles'}
            <span className="text-gray-400">v</span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
              {profiles.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-gray-400 mb-2">Chưa có profile nào được lưu</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      router.push('/quan-ly-thuong-hieu');
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Tạo profile mới
                  </button>
                </div>
              ) : (
                <>
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500">Chọn thương hiệu</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDropdown(false);
                        router.push('/quan-ly-thuong-hieu');
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Quản lý
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {value.selectedProfileId && (
                      <button
                        type="button"
                        onClick={() => {
                          clearBrand();
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 text-xs text-gray-400 border-b border-gray-50"
                      >
                        Bỏ chọn / Nhập tay
                      </button>
                    )}
                    {profiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => {
                          applyProfile(profile);
                          setShowDropdown(false);
                        }}
                        className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${value.selectedProfileId === profile.id ? 'bg-blue-50' : ''}`}
                      >
                        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${value.selectedProfileId === profile.id ? 'bg-blue-500' : 'bg-gray-200'}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-800">{profile.name}</span>
                            {profile.isDefault && <span className="text-xs text-blue-500 bg-blue-50 px-1.5 rounded">Mặc định</span>}
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {profile.shopName}
                            {profile.industry ? ` - ${profile.industry}` : ''}
                          </p>
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
            Để trống sẽ dùng brand mặc định. Điền vào để AI viết theo thương hiệu của bạn.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">MÃ´ táº£ thÆ°Æ¡ng hiá»‡u</label>
            <textarea
              value={value.brandDesc}
              onChange={(event) => updateField('brandDesc', event.target.value)}
              rows={2}
              placeholder="Chuyen cung cap giuong sat, ban ghe inox gia xuong..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed"
            />
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-emerald-800">LocalBusiness schema</p>
              <p className="text-xs text-emerald-700 mt-0.5">Dung khi publish de sinh schema cua hang/local business.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Latitude</label>
                <input
                  type="text"
                  value={value.latitude}
                  onChange={(event) => updateField('latitude', event.target.value)}
                  placeholder="10.762622"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Longitude</label>
                <input
                  type="text"
                  value={value.longitude}
                  onChange={(event) => updateField('longitude', event.target.value)}
                  placeholder="106.660172"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Gio mo cua</label>
                <input
                  type="text"
                  value={value.openingHours}
                  onChange={(event) => updateField('openingHours', event.target.value)}
                  placeholder="Mo-Sa 08:00-20:00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Price range</label>
                <input
                  type="text"
                  value={value.priceRange}
                  onChange={(event) => updateField('priceRange', event.target.value)}
                  placeholder="$$"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tên thương hiệu / Shop</label>
              <input
                type="text"
                value={value.shopName}
                onChange={(event) => updateField('shopName', event.target.value)}
                placeholder="Ví dụ: Hasaki, Nội Thất Minh Quân..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ngành hàng</label>
              <input
                type="text"
                value={value.industry}
                onChange={(event) => {
                  updateField('industry', event.target.value);
                  setShowIndustrySuggestions(true);
                }}
                onFocus={() => setShowIndustrySuggestions(true)}
                onBlur={() => setTimeout(() => setShowIndustrySuggestions(false), 150)}
                placeholder="Nội thất, Mỹ phẩm, Thời trang..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {showIndustrySuggestions && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="flex flex-wrap gap-1.5 p-2.5">
                    {INDUSTRY_SUGGESTIONS.filter((item) => !value.industry || item.toLowerCase().includes(value.industry.toLowerCase())).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onMouseDown={() => {
                          updateField('industry', item);
                          setShowIndustrySuggestions(false);
                        }}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Xưng hô</label>
              <input
                type="text"
                value={value.brandPronouns}
                onChange={(event) => updateField('brandPronouns', event.target.value)}
                placeholder='"mình / bạn" hoặc "em / anh chị"'
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Đối tượng khách hàng</label>
              <input
                type="text"
                value={value.brandAudience}
                onChange={(event) => updateField('brandAudience', event.target.value)}
                placeholder="Ví dụ: gia đình trẻ, dân văn phòng..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú giọng văn / USP</label>
            <textarea
              value={value.brandToneNotes}
              onChange={(event) => updateField('brandToneNotes', event.target.value)}
              rows={3}
              placeholder={`Ví dụ:\n- USP: giá xưởng, không qua trung gian\n- Ưu tiên viết thật, có số liệu cụ thể`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hotline</label>
              <input
                type="text"
                value={value.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="Ví dụ: 0901 234 567"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Địa chỉ / Website</label>
              <input
                type="text"
                value={value.address}
                onChange={(event) => updateField('address', event.target.value)}
                placeholder="A7/8 đường 1C, Bình Chánh hoặc noithat.vn"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sản phẩm chính</label>
              <input
                type="text"
                value={value.mainProducts}
                onChange={(event) => updateField('mainProducts', event.target.value)}
                placeholder="Giường sắt, tủ quần áo, bàn ghế..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">CTA chuẩn</label>
              <input
                type="text"
                value={value.ctaStandard}
                onChange={(event) => updateField('ctaStandard', event.target.value)}
                placeholder="Có sẵn - giao liền. Báo giá trong ngày."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Từ cấm bổ sung</label>
            <input
              type="text"
              value={value.brandForbidden}
              onChange={(event) => updateField('brandForbidden', event.target.value)}
              placeholder='"cao cấp, sang trọng, đẳng cấp" - cách nhau bởi dấu phẩy'
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
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
  );
}
