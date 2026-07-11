'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '../components/ModelPicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandProfile {
  id:             string;
  name:           string;
  shopName:       string;
  industry:       string | null;
  brandPronouns:  string | null;
  brandAudience:  string | null;
  brandToneNotes: string | null;
  phone:          string | null;
  address:        string | null;
  brandDesc:      string | null;
  brandForbidden: string | null;
  ctaStandard:    string | null;
  mainProducts:   string | null;
  isDefault:      boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WORD_COUNT_PRESETS = [
  { value: 100,  label: '100',  badge: ''         },
  { value: 150,  label: '150',  badge: ''         },
  { value: 200,  label: '200',  badge: 'Phổ biến' },
  { value: 300,  label: '300',  badge: ''         },
  { value: 500,  label: '500',  badge: ''         },
  { value: 700,  label: '700',  badge: ''         },
  { value: 1000, label: '1000', badge: 'Hasaki'   },
];

const TONES = [
  { value: 'friendly',     icon: '😊', label: 'Thân thiện',     desc: 'Gần gũi, dễ tiếp cận' },
  { value: 'professional', icon: '💼', label: 'Chuyên nghiệp',  desc: 'Tư vấn chuyên gia, số liệu' },
  { value: 'casual',       icon: '💬', label: 'Tự nhiên',       desc: '"Dạ bên em có..." — real' },
  { value: 'sales',        icon: '🔥', label: 'Bán hàng mạnh', desc: 'Urgency, deal hot' },
  { value: 'rewrite',      icon: '✏️', label: 'Viết lại',       desc: 'Dán bài cũ → AI viết sạch hơn' },
  { value: 'shorten',      icon: '✂️', label: 'Rút ngắn',      desc: 'Dán bài dài → cô đọng lại' },
];

const TEMPLATES = [
  { value: 'product_intro',   icon: '🌟', label: 'Giới thiệu sản phẩm', desc: 'Hook mạnh → Pain point → Ưu điểm → Giá → CTA', badge: 'Phổ biến nhất' },
  { value: 'combo_wholesale', icon: '🪑', label: 'Bàn ghế / Sỉ lẻ',    desc: 'Ứng dụng đa dạng → Kỹ thuật → Giá sỉ/lẻ → CTA', badge: 'Tương tác cao' },
  { value: 'bulk_b2b',        icon: '🏭', label: 'Giường tầng / B2B',   desc: 'Nhắm công nhân, ký túc xá — Giá xưởng, bền' },
  { value: 'friendly_stock',  icon: '💬', label: 'Kho hàng / Thân thiện', desc: 'Tone gần gũi, tự nhiên — tạo cảm giác real' },
  { value: 'branding',        icon: '⭐', label: 'Branding / Thông báo', desc: 'Xây thương hiệu — chuyên nghiệp, giá xưởng' },
];

const OPTIONS = [
  { key: 'includeEmojis',   label: 'Thêm emoji',             desc: '✔️ 🚚 💬 — tối đa 4' },
  { key: 'includeHashtags', label: 'Thêm hashtag',           desc: '#giuongsat #noithat...' },
  { key: 'freeShip',        label: 'Miễn phí giao hàng HCM', desc: 'Giao hỏa tốc nội thành' },
  { key: 'urgency',         label: 'Tạo urgency',            desc: 'Số lượng có hạn, chỉ hôm nay' },
];

const INDUSTRY_SUGGESTIONS = [
  'Nội thất', 'Thời trang', 'Mỹ phẩm / Làm đẹp', 'Thực phẩm & Đồ uống',
  'Điện tử / Công nghệ', 'Nhà hàng / Cafe', 'Sức khỏe / Thể thao',
  'Giáo dục', 'Bất động sản', 'Du lịch', 'Ô tô / Xe máy', 'Khác',
];

const LS_BRAND_KEY = 'fb_post_brand_info';

// ─── Save Profile Modal ───────────────────────────────────────────────────────

function SaveProfileModal({ fields, onSave, onClose }: {
  fields: Omit<BrandProfile, 'id' | 'name' | 'isDefault'>;
  onSave: (name: string, isDefault: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [profileName, setProfileName] = useState('');
  const [isDefault,   setIsDefault]   = useState(false);
  const [saving,      setSaving]      = useState(false);

  async function handleSubmit() {
    if (!profileName.trim()) return;
    setSaving(true);
    await onSave(profileName.trim(), isDefault);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900 mb-1">💾 Lưu thương hiệu</h3>
        <p className="text-xs text-gray-400 mb-4">Lưu thông tin hiện tại thành profile để dùng lại sau</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tên profile <span className="text-red-500">*</span></label>
            <input
              autoFocus
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={`Ví dụ: ${fields.shopName || 'Nội Thất Minh Quân'} — Chính`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
              className="accent-blue-600 w-4 h-4" />
            <span className="text-xs text-gray-600">Đặt làm thương hiệu mặc định</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={!profileName.trim() || saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VietBaiFacebook() {
  const router = useRouter();

  // Core
  const [keyword,   setKeyword]   = useState('');
  const [provider,  setProvider]  = useState('gemini-flash');
  const [wordCount, setWordCount] = useState(200);
  const [tone,      setTone]      = useState('friendly');

  // Template
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Options
  const [opts, setOpts] = useState({
    includeEmojis: true, includeHashtags: false, freeShip: true, urgency: false,
  });

  // Brand info (manual fields)
  const [showBrand,      setShowBrand]      = useState(false);
  const [shopName,       setShopName]       = useState('');
  const [industry,       setIndustry]       = useState('');
  const [brandPronouns,  setBrandPronouns]  = useState('');
  const [brandAudience,  setBrandAudience]  = useState('');
  const [brandToneNotes, setBrandToneNotes] = useState('');
  const [phone,          setPhone]          = useState('');
  const [address,        setAddress]        = useState('');
  const [brandDesc,      setBrandDesc]      = useState('');
  const [brandForbidden, setBrandForbidden] = useState('');
  const [ctaStandard,    setCtaStandard]    = useState('');
  const [mainProducts,   setMainProducts]   = useState('');
  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false);

  // Brand profiles (DB)
  const [profiles,        setProfiles]        = useState<BrandProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');   // profile id hoặc ''
  const [showSaveModal,   setShowSaveModal]   = useState(false);
  const [savingProfile,   setSavingProfile]   = useState(false);
  const [profileSaved,    setProfileSaved]    = useState(false);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState('');

  // ── Load profiles + saved brand from localStorage ───────────────────────────
  useEffect(() => {
    document.title = 'Viết bài Facebook — Content Agent';
    setProvider(localStorage.getItem('pipeline_provider') || 'gemini-flash');

    // Load manual brand từ localStorage
    const savedBrand = localStorage.getItem(LS_BRAND_KEY);
    if (savedBrand) {
      try {
        const b = JSON.parse(savedBrand);
        if (b.shopName)       setShopName(b.shopName);
        if (b.industry)       setIndustry(b.industry);
        if (b.brandPronouns)  setBrandPronouns(b.brandPronouns);
        if (b.brandAudience)  setBrandAudience(b.brandAudience);
        if (b.brandToneNotes) setBrandToneNotes(b.brandToneNotes);
        if (b.phone)          setPhone(b.phone);
        if (b.address)        setAddress(b.address);
        if (b.brandDesc)      setBrandDesc(b.brandDesc);
        if (b.brandForbidden) setBrandForbidden(b.brandForbidden);
        if (b.ctaStandard)    setCtaStandard(b.ctaStandard);
        if (b.mainProducts)   setMainProducts(b.mainProducts);
      } catch { /* ignore */ }
    }

    // Load danh sách brand profiles từ API
    fetchProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfiles() {
    try {
      const res  = await fetch('/api/brand-profiles?activeOnly=true');
      const json = await res.json();
      if (json.success) {
        setProfiles(json.data);
        // Auto-select default profile nếu chưa có gì nhập
        const def = json.data.find((p: BrandProfile) => p.isDefault);
        if (def && !localStorage.getItem(LS_BRAND_KEY)) {
          applyProfile(def);
          setSelectedProfile(def.id);
        }
      }
    } catch { /* ignore */ }
  }

  // Auto-save brand fields khi thay đổi
  useEffect(() => {
    localStorage.setItem(LS_BRAND_KEY, JSON.stringify({
      shopName, industry, brandPronouns, brandAudience, brandToneNotes,
      phone, address, brandDesc, brandForbidden, ctaStandard, mainProducts,
    }));
  }, [shopName, industry, brandPronouns, brandAudience, brandToneNotes, phone, address, brandDesc, brandForbidden, ctaStandard, mainProducts]);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Apply profile → điền fields ─────────────────────────────────────────────
  function applyProfile(p: BrandProfile) {
    setShopName(p.shopName             || '');
    setIndustry(p.industry             || '');
    setBrandPronouns(p.brandPronouns   || '');
    setBrandAudience(p.brandAudience   || '');
    setBrandToneNotes(p.brandToneNotes || '');
    setPhone(p.phone                   || '');
    setAddress(p.address               || '');
    setBrandDesc(p.brandDesc           || '');
    setBrandForbidden(p.brandForbidden || '');
    setCtaStandard(p.ctaStandard       || '');
    setMainProducts(p.mainProducts     || '');
    setSelectedProfile(p.id);
    setShowBrand(true);
  }

  // ── Save profile mới lên DB ─────────────────────────────────────────────────
  async function handleSaveProfile(name: string, isDefault: boolean) {
    setSavingProfile(true);
    try {
      const res  = await fetch('/api/brand-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, shopName, industry, brandPronouns, brandAudience,
          brandToneNotes, phone, address, brandDesc, brandForbidden,
          ctaStandard, mainProducts, isDefault,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setProfiles(prev => isDefault
          ? [json.data, ...prev.map(p => ({ ...p, isDefault: false }))]
          : [...prev, json.data],
        );
        setSelectedProfile(json.data.id);
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function handleProviderChange(id: string) {
    setProvider(id);
    localStorage.setItem('pipeline_provider', id);
  }

  function clearBrand() {
    setShopName(''); setIndustry(''); setBrandPronouns(''); setBrandAudience('');
    setBrandToneNotes(''); setPhone(''); setAddress(''); setBrandDesc('');
    setBrandForbidden(''); setCtaStandard(''); setMainProducts('');
    setSelectedProfile('');
  }

  function validate(): boolean {
    if (!keyword.trim()) { setError('Vui lòng nhập từ khóa / nội dung'); return false; }
    setError('');
    return true;
  }

  function handleGenerate() {
    if (!validate()) return;
    localStorage.setItem('fb_post_params', JSON.stringify({
      provider, keyword: keyword.trim(), wordCount, tone,
      template: selectedTemplate,
      shopName: shopName.trim(), industry: industry.trim(),
      brandPronouns: brandPronouns.trim(), brandAudience: brandAudience.trim(),
      brandToneNotes: brandToneNotes.trim(), phone: phone.trim(),
      address: address.trim(), brandDesc: brandDesc.trim(),
      brandForbidden: brandForbidden.trim(),
      ctaStandard: ctaStandard.trim(), mainProducts: mainProducts.trim(),
      includeEmojis: opts.includeEmojis, includeHashtags: opts.includeHashtags,
      freeShip: opts.freeShip, urgency: opts.urgency,
    }));
    router.push('/viet-bai-facebook/generate');
  }

  const activeProfile = profiles.find(p => p.id === selectedProfile);
  const hasBrandFields = shopName || industry || brandPronouns || phone;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full mx-auto space-y-4">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📱</span>
                <h1 className="text-xl font-bold text-gray-900">Viết bài Facebook Post</h1>
              </div>
              <p className="text-sm text-gray-500">
                Nhập từ khóa — AI tự viết theo brand guideline. Chọn template nếu muốn định hình phong cách.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/quan-ly-bai-fb')}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-1.5">
                📋 Danh sách bài
              </button>
              <button onClick={() => router.back()}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                ← Quay lại
              </button>
            </div>
          </div>
        </div>

        {/* ── AI Model ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm px-1 py-4">
          <ModelPicker value={provider} onChange={handleProviderChange} size="sm" label="AI Model" />
        </div>

        {/* ── Keyword / Content ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <label className="block text-sm font-bold text-gray-800 mb-1.5">
            {tone === 'rewrite' ? '✏️ Nội dung cần viết lại'
              : tone === 'shorten' ? '✂️ Nội dung cần rút ngắn'
              : 'Từ khóa / Chủ đề bài viết'}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setError(''); }}
            rows={(tone === 'rewrite' || tone === 'shorten') ? 8 : 3}
            placeholder={
              tone === 'rewrite'
                ? 'Dán bài viết cũ vào đây...\nAI sẽ viết lại: giữ nguyên ý chính, thông tin, CTA — nhưng câu từ mới, tự nhiên hơn, xóa dấu vết AI.'
                : tone === 'shorten'
                ? 'Dán bài viết dài vào đây...\nAI sẽ rút ngắn: giữ hook, giá, CTA — loại bỏ phần thừa. Bài sau ngắn hơn ít nhất 30%.'
                : 'Ví dụ: giường sắt 2 tầng, bàn ghế inox quán ăn, tủ locker công ty...\nHoặc viết brief chi tiết: mô tả sản phẩm, giá, USP cần nhắc đến...'
            }
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1.5">
            {(tone === 'rewrite' || tone === 'shorten')
              ? '💡 Paste bài Facebook cũ, bài nháp, hoặc nội dung từ bất kỳ đâu — AI sẽ xử lý lại.'
              : '💡 Nhập ngắn (tên sản phẩm) hoặc dài (brief chi tiết) đều được.'}
          </p>
        </div>

        {/* ── Tùy chỉnh thương hiệu ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">

          {/* Header row */}
          <div className="flex items-center px-5 py-3.5 gap-2">
            {/* Collapse toggle */}
            <button onClick={() => setShowBrand(!showBrand)}
              className="flex-1 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors text-left">
              <span className={`text-gray-400 transition-transform duration-200 ${showBrand ? 'rotate-180' : ''}`}>▾</span>
              🏢 Tùy chỉnh thương hiệu
              {activeProfile
                ? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{activeProfile.name}</span>
                : hasBrandFields
                ? <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{shopName || 'Đã điền'}</span>
                : <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-xs rounded-full border border-gray-200">Mặc định: Nội Thất Minh Quân</span>
              }
            </button>

            {/* Brand profile dropdown */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                📂 {profiles.length > 0 ? `${profiles.length} profile` : 'Profiles'}
                <span className="text-gray-400">▾</span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  {profiles.length === 0 ? (
                    <div className="px-4 py-5 text-center">
                      <p className="text-xs text-gray-400 mb-2">Chưa có profile nào được lưu</p>
                      <button
                        onClick={() => { setShowDropdown(false); setShowSaveModal(true); setShowBrand(true); }}
                        className="text-xs text-blue-600 hover:underline">
                        + Lưu thông tin hiện tại
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500">Chọn thương hiệu</p>
                        <button onClick={() => router.push('/quan-ly-thuong-hieu')}
                          className="text-xs text-blue-600 hover:underline">Quản lý →</button>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {/* Option: Xóa chọn */}
                        {selectedProfile && (
                          <button onClick={() => { clearBrand(); setShowDropdown(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 text-xs text-gray-400 border-b border-gray-50">
                            ✕ Bỏ chọn / Nhập tay
                          </button>
                        )}
                        {profiles.map(p => (
                          <button key={p.id}
                            onClick={() => { applyProfile(p); setShowDropdown(false); }}
                            className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${selectedProfile === p.id ? 'bg-blue-50' : ''}`}>
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

            {/* Nút Lưu profile */}
            {hasBrandFields && (
              <button
                onClick={() => setShowSaveModal(true)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                  profileSaved
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
                }`}>
                {profileSaved ? '✓ Đã lưu!' : savingProfile ? '...' : '💾 Lưu profile'}
              </button>
            )}
          </div>

          {/* Expanded fields */}
          {showBrand && (
            <div className="px-5 pb-5 pt-4 border-t border-gray-100 bg-gray-50 space-y-4">
              <p className="text-xs text-gray-400">
                Để trống → AI dùng brand Nội Thất Minh Quân mặc định. Điền vào để viết cho thương hiệu khác.
              </p>

              {/* Hàng 1: Tên shop + Ngành hàng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tên thương hiệu / Shop</label>
                  <input type="text" value={shopName} onChange={e => { setShopName(e.target.value); setSelectedProfile(''); }}
                    placeholder="Ví dụ: Hasaki, Nội Thất Minh Quân..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ngành hàng</label>
                  <input type="text" value={industry}
                    onChange={e => { setIndustry(e.target.value); setShowIndustrySuggestions(true); setSelectedProfile(''); }}
                    onFocus={() => setShowIndustrySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowIndustrySuggestions(false), 150)}
                    placeholder="Nội thất, Mỹ phẩm, Thời trang..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  {showIndustrySuggestions && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 p-2.5">
                        {INDUSTRY_SUGGESTIONS.filter(s => !industry || s.toLowerCase().includes(industry.toLowerCase())).map(s => (
                          <button key={s} type="button"
                            onMouseDown={() => { setIndustry(s); setShowIndustrySuggestions(false); }}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 rounded-lg text-xs transition-colors">
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
                  <input type="text" value={brandPronouns} onChange={e => { setBrandPronouns(e.target.value); setSelectedProfile(''); }}
                    placeholder='"mình / bạn" hoặc "em / anh chị"'
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Đối tượng khách hàng</label>
                  <input type="text" value={brandAudience} onChange={e => { setBrandAudience(e.target.value); setSelectedProfile(''); }}
                    placeholder="Ví dụ: phụ nữ 25–40 tuổi, chủ homestay..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Ghi chú giọng văn */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú giọng văn / USP</label>
                <textarea value={brandToneNotes} onChange={e => { setBrandToneNotes(e.target.value); setSelectedProfile(''); }}
                  placeholder={`Ví dụ:\n- Sản phẩm: mỹ phẩm chính hãng, có VAT\n- USP: giá tốt mọi thời điểm, đền bù 100% nếu hàng giả\n- Giao hàng: miễn phí từ 249k, hỏa tốc 2h tại HCM`}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed" />
              </div>

              {/* Hàng 3: Hotline + Website */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Hotline</label>
                  <input type="text" value={phone} onChange={e => { setPhone(e.target.value); setSelectedProfile(''); }}
                    placeholder="Ví dụ: 1800 6324 hoặc 0901 234 567"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Địa chỉ / Website</label>
                  <input type="text" value={address} onChange={e => { setAddress(e.target.value); setSelectedProfile(''); }}
                    placeholder="Ví dụ: 123 Lê Lai, Q.1 hoặc hasaki.vn"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Sản phẩm chính + CTA chuẩn */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sản phẩm chính</label>
                  <input type="text" value={mainProducts} onChange={e => { setMainProducts(e.target.value); setSelectedProfile(''); }}
                    placeholder="Giường sắt, bàn ghế inox, kệ inox..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">CTA chuẩn</label>
                  <input type="text" value={ctaStandard} onChange={e => { setCtaStandard(e.target.value); setSelectedProfile(''); }}
                    placeholder="Có sẵn – giao liền. Liên hệ báo giá ngay."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Từ cấm bổ sung */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Từ cấm bổ sung</label>
                <input type="text" value={brandForbidden} onChange={e => { setBrandForbidden(e.target.value); setSelectedProfile(''); }}
                  placeholder='"cao cấp, sang trọng, đẳng cấp" — cách nhau bởi dấu phẩy'
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
          )}
        </div>

        {/* ── Template ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800">Phong cách bài viết</p>
              <p className="text-xs text-gray-400">Không chọn → AI tự quyết định phong cách phù hợp nhất</p>
            </div>
            {selectedTemplate && (
              <button onClick={() => setSelectedTemplate(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">Bỏ chọn</button>
            )}
          </div>
          <div className="space-y-2">
            {TEMPLATES.map(t => (
              <button key={t.value} onClick={() => setSelectedTemplate(prev => prev === t.value ? null : t.value)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                  selectedTemplate === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}>
                <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                  selectedTemplate === t.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {selectedTemplate === t.value && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  )}
                </div>
                <span className="text-xl shrink-0">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${selectedTemplate === t.value ? 'text-blue-800' : 'text-gray-800'}`}>{t.label}</span>
                    {t.badge && <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full shrink-0">{t.badge}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Word count ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800">Độ dài bài viết</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Hoặc nhập tay:</span>
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
                <input type="number" min={50} max={3000} value={wordCount}
                  onChange={e => setWordCount(Math.min(3000, Math.max(50, parseInt(e.target.value) || 200)))}
                  className="w-16 px-2 py-1.5 text-sm text-center focus:outline-none" />
                <span className="pr-2 text-xs text-gray-500">từ</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {WORD_COUNT_PRESETS.map(w => (
              <button key={w.value} onClick={() => setWordCount(w.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  wordCount === w.value
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600'
                }`}>
                {w.label} từ
                {w.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${wordCount === w.value ? 'bg-blue-500 text-white' : 'bg-orange-100 text-orange-600'}`}>
                    {w.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2.5">
            {wordCount <= 150  && '💬 Ngắn gọn — phù hợp story, caption ảnh đơn'}
            {wordCount > 150 && wordCount <= 250 && '📱 Chuẩn Facebook — đọc vừa đủ, không mỏi mắt'}
            {wordCount > 250 && wordCount <= 400 && '📝 Bài đầy đủ — hook + specs + giá + story ngắn'}
            {wordCount > 400 && wordCount <= 700 && '📖 Bài dài — storytelling, nhiều USP, kể chuyện sản phẩm'}
            {wordCount > 700 && '🏆 Bài siêu dài kiểu Hasaki — cần ảnh/video kèm để giữ người đọc'}
          </p>
        </div>

        {/* ── Tone ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800">Giọng văn / Chế độ</p>
            {(tone === 'rewrite' || tone === 'shorten') && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                ✏️ Chế độ viết lại — dán bài cũ vào ô trên
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TONES.map(t => (
              <label key={t.value}
                className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                  tone === t.value
                    ? (t.value === 'rewrite' || t.value === 'shorten') ? 'border-amber-400 bg-amber-50' : 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                <input type="radio" name="tone" checked={tone === t.value} onChange={() => setTone(t.value)}
                  className="accent-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className={`text-xs font-semibold ${
                    tone === t.value
                      ? (t.value === 'rewrite' || t.value === 'shorten') ? 'text-amber-800' : 'text-blue-800'
                      : 'text-gray-700'
                  }`}>{t.icon} {t.label}</p>
                  <p className="text-xs text-gray-400 leading-tight mt-0.5">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-300 mt-2 text-center">
            ── 4 giọng trên: Viết bài mới · 2 chế độ dưới: Xử lý bài có sẵn ──
          </p>
        </div>

        {/* ── Options ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm font-bold text-gray-800 mb-3">Tùy chọn thêm</p>
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map(opt => (
              <label key={opt.key} onClick={() => setOpts(prev => ({ ...prev, [opt.key]: !prev[opt.key as keyof typeof prev] }))}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                  opts[opt.key as keyof typeof opts] ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <div className={`w-4 h-4 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                  opts[opt.key as keyof typeof opts] ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {opts[opt.key as keyof typeof opts] && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${opts[opt.key as keyof typeof opts] ? 'text-blue-800' : 'text-gray-700'}`}>{opt.label}</p>
                  <p className="text-xs text-gray-400">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">⚠️ {error}</div>
        )}

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
          <div className="text-xs text-gray-400 space-y-0.5">
            <p>
              {activeProfile
                ? <span className="text-blue-600 font-medium">🏢 {activeProfile.name} · </span>
                : industry ? <span className="text-gray-600 font-medium">{industry} · </span> : null
              }
              {selectedTemplate ? TEMPLATES.find(t => t.value === selectedTemplate)?.label : 'AI tự chọn phong cách'}
            </p>
            <p>~{wordCount} từ · {TONES.find(t => t.value === tone)?.label}</p>
          </div>
          <button onClick={handleGenerate}
            className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <span>📱</span><span>Tạo bài post →</span>
          </button>
        </div>

        <div className="h-4" />
      </div>

      {/* ── Save Profile Modal ───────────────────────────────────────────── */}
      {showSaveModal && (
        <SaveProfileModal
          fields={{ shopName, industry, brandPronouns, brandAudience, brandToneNotes, phone, address, brandDesc, brandForbidden, ctaStandard, mainProducts }}
          onSave={handleSaveProfile}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
