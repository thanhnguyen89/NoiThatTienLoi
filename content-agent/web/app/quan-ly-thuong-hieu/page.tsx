'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
  latitude:        number | null;
  longitude:       number | null;
  openingHours:    string | null;
  priceRange:      string | null;
  isDefault:      boolean;
  isActive:       boolean;
  createdAt:      string;
  updatedAt:      string;
}

const EMPTY_PROFILE: Omit<BrandProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', shopName: '', industry: '', brandPronouns: '', brandAudience: '',
  brandToneNotes: '', phone: '', address: '', brandDesc: '', brandForbidden: '',
  ctaStandard: '', mainProducts: '',
  latitude: null, longitude: null, openingHours: '', priceRange: '',
  isDefault: false, isActive: true,
};

const INDUSTRY_SUGGESTIONS = [
  'Nội thất', 'Thời trang', 'Mỹ phẩm / Làm đẹp', 'Thực phẩm & Đồ uống',
  'Điện tử / Công nghệ', 'Nhà hàng / Cafe', 'Sức khỏe / Thể thao',
  'Giáo dục', 'Bất động sản', 'Du lịch', 'Ô tô / Xe máy', 'Khác',
];

// ─── Profile Modal ────────────────────────────────────────────────────────────

function ProfileModal({ profile, onSave, onClose }: {
  profile: Partial<BrandProfile> | null;
  onSave: (data: Partial<BrandProfile>) => Promise<void>;
  onClose: () => void;
}) {
  const isEdit = !!profile?.id;
  const [form, setForm] = useState<Omit<BrandProfile, 'id' | 'createdAt' | 'updatedAt'>>({
    ...EMPTY_PROFILE,
    ...(profile ? {
      name:           profile.name           || '',
      shopName:       profile.shopName       || '',
      industry:       profile.industry       || '',
      brandPronouns:  profile.brandPronouns  || '',
      brandAudience:  profile.brandAudience  || '',
      brandToneNotes: profile.brandToneNotes || '',
      phone:          profile.phone          || '',
      address:        profile.address        || '',
      brandDesc:      profile.brandDesc      || '',
      brandForbidden: profile.brandForbidden || '',
      ctaStandard:    profile.ctaStandard    || '',
      mainProducts:   profile.mainProducts   || '',
      latitude:        profile.latitude       ?? null,
      longitude:       profile.longitude      ?? null,
      openingHours:    profile.openingHours   || '',
      priceRange:      profile.priceRange     || '',
      isDefault:      profile.isDefault      ?? false,
      isActive:       profile.isActive       ?? true,
    } : {}),
  });
  const [saving, setSaving]  = useState(false);
  const [error,  setError]   = useState('');

  function set(key: keyof typeof form, val: string | boolean | number | null) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSubmit() {
    if (!form.name.trim())     { setError('Vui lòng nhập tên profile'); return; }
    if (!form.shopName.trim()) { setError('Vui lòng nhập tên thương hiệu'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      setError('Lưu thất bại, thử lại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? '✏️ Chỉnh sửa thương hiệu' : '➕ Thêm thương hiệu mới'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          {/* Tên profile + Tên shop */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tên profile <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Ví dụ: Minh Quân — Chính"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <p className="text-xs text-gray-400 mt-1">Tên để nhận dạng profile trong dropdown</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tên thương hiệu / Shop <span className="text-red-500">*</span></label>
              <input value={form.shopName} onChange={e => set('shopName', e.target.value)}
                placeholder="Ví dụ: Nội Thất Minh Quân"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          {/* Ngành hàng */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ngành hàng</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {INDUSTRY_SUGGESTIONS.map(s => (
                <button key={s} type="button" onClick={() => set('industry', s)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                    form.industry === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                  }`}>{s}</button>
              ))}
            </div>
            <input value={form.industry || ''} onChange={e => set('industry', e.target.value)}
              placeholder="Hoặc nhập ngành hàng tùy chỉnh..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Xưng hô + Đối tượng */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Xưng hô</label>
              <input value={form.brandPronouns || ''} onChange={e => set('brandPronouns', e.target.value)}
                placeholder='"mình / bạn" hoặc "em / anh chị"'
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Đối tượng khách hàng</label>
              <input value={form.brandAudience || ''} onChange={e => set('brandAudience', e.target.value)}
                placeholder="Ví dụ: gia đình trẻ 25–40 tuổi, chủ homestay"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          {/* Ghi chú giọng văn */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú giọng văn / USP</label>
            <textarea value={form.brandToneNotes || ''} onChange={e => set('brandToneNotes', e.target.value)}
              rows={3}
              placeholder={'Ví dụ:\n- Sản phẩm: giường, tủ, bàn ghế sắt — giá xưởng\n- USP: giao nhanh 2h, khung dày 1.4mm, bảo hành 12 tháng\n- Tone: thân thiện, không hoa mỹ'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed" />
          </div>

          {/* Hotline + Địa chỉ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hotline</label>
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)}
                placeholder="Ví dụ: 0901 234 567"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Địa chỉ / Website</label>
              <input value={form.address || ''} onChange={e => set('address', e.target.value)}
                placeholder="Ví dụ: 123 Lê Lai, Q.1 hoặc minhquan.vn"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          {/* Mô tả thương hiệu */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mô tả thương hiệu</label>
            <textarea value={form.brandDesc || ''} onChange={e => set('brandDesc', e.target.value)}
              rows={2}
              placeholder="Ví dụ: Chuyên cung cấp giường sắt, bàn ghế inox giá xưởng — giao nhanh toàn quốc, không qua trung gian."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed" />
            <p className="text-xs text-gray-400 mt-1">1–2 câu định nghĩa thương hiệu — AI dùng để mở bài hoặc context</p>
          </div>

          {/* Sản phẩm chính + CTA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sản phẩm chính</label>
              <input value={form.mainProducts || ''} onChange={e => set('mainProducts', e.target.value)}
                placeholder="Giường sắt, bàn ghế inox, kệ inox..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <p className="text-xs text-gray-400 mt-1">AI ưu tiên nhắc đến khi viết bài</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">CTA chuẩn</label>
              <input value={form.ctaStandard || ''} onChange={e => set('ctaStandard', e.target.value)}
                placeholder="Có sẵn – giao liền. Liên hệ báo giá ngay."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <p className="text-xs text-gray-400 mt-1">Câu kêu gọi hành động cuối bài</p>
            </div>
          </div>

          {/* Từ cấm */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Từ cấm bổ sung</label>
            <input value={form.brandForbidden || ''} onChange={e => set('brandForbidden', e.target.value)}
              placeholder='"cao cấp, sang trọng, đẳng cấp" — cách nhau bởi dấu phẩy'
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
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
                  type="number"
                  step="any"
                  value={form.latitude ?? ''}
                  onChange={e => set('latitude', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="10.762622"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude ?? ''}
                  onChange={e => set('longitude', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="106.660172"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Gio mo cua</label>
                <input
                  value={form.openingHours || ''}
                  onChange={e => set('openingHours', e.target.value)}
                  placeholder="Mo-Sa 08:00-20:00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Price range</label>
                <input
                  value={form.priceRange || ''}
                  onChange={e => set('priceRange', e.target.value)}
                  placeholder="$$"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)}
                className="accent-blue-600 w-4 h-4" />
              <div>
                <p className="text-xs font-semibold text-gray-700">Thương hiệu mặc định</p>
                <p className="text-xs text-gray-400">Tự động điền khi mở form viết bài</p>
              </div>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
                className="accent-blue-600 w-4 h-4" />
              <div>
                <p className="text-xs font-semibold text-gray-700">Đang hoạt động</p>
                <p className="text-xs text-gray-400">Hiển thị trong dropdown chọn brand</p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Đang lưu...' : isEdit ? '💾 Cập nhật' : '➕ Thêm profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuanLyThuongHieuPage() {
  const router = useRouter();
  const [profiles,  setProfiles]  = useState<BrandProfile[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState<{ open: boolean; profile: Partial<BrandProfile> | null }>({ open: false, profile: null });
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [toast,     setToast]     = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching brand profiles...');
      const res  = await fetch('/api/brand-profiles');
      console.log('📡 Response status:', res.status);
      const json = await res.json();
      console.log('📦 Response data:', json);
      
      if (json.success) {
        console.log('✅ Loaded profiles:', json.data.length);
        setProfiles(json.data);
      } else {
        console.error('❌ API returned error:', json.error);
        showToast('❌ Lỗi: ' + (json.error || 'Không thể tải dữ liệu'));
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      showToast('❌ Lỗi kết nối API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Quản lý thương hiệu — Content Agent';
    fetchProfiles();
  }, [fetchProfiles]);

  // ── Save (create / update) ─────────────────────────────────────────────────
  async function handleSave(data: Partial<BrandProfile>) {
    const isEdit = !!modal.profile?.id;
    const url    = isEdit ? `/api/brand-profiles/${modal.profile!.id}` : '/api/brand-profiles';
    const method = isEdit ? 'PATCH' : 'POST';

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Lỗi');

    if (isEdit) {
      setProfiles(prev => prev.map(p => p.id === modal.profile!.id ? json.data : p));
      showToast('✅ Đã cập nhật thương hiệu');
    } else {
      // Nếu set default → reset default của các profile khác
      if (data.isDefault) setProfiles(prev => [json.data, ...prev.map(p => ({ ...p, isDefault: false }))]);
      else setProfiles(prev => [...prev, json.data]);
      showToast('✅ Đã thêm thương hiệu mới');
    }
  }

  // ── Set default ───────────────────────────────────────────────────────────
  async function handleSetDefault(id: string) {
    const res  = await fetch(`/api/brand-profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    const json = await res.json();
    if (json.success) {
      setProfiles(prev => prev.map(p => ({ ...p, isDefault: p.id === id })));
      showToast('⭐ Đã đặt làm thương hiệu mặc định');
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────
  async function handleToggleActive(p: BrandProfile) {
    const res  = await fetch(`/api/brand-profiles/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    const json = await res.json();
    if (json.success) {
      setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/brand-profiles/${id}`, { method: 'DELETE' });
      setProfiles(prev => prev.filter(p => p.id !== id));
      showToast('🗑️ Đã xóa thương hiệu');
    } finally {
      setDeleting(null);
    }
  }

  const activeCount  = profiles.filter(p =>  p.isActive).length;
  const inactiveCount = profiles.filter(p => !p.isActive).length;

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏢</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Quản lý thương hiệu</h1>
            <p className="text-xs text-gray-400">
              {activeCount} đang hoạt động{inactiveCount > 0 ? ` · ${inactiveCount} ẩn` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal({ open: true, profile: null })}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            ➕ Thêm thương hiệu
          </button>
          <button onClick={() => router.back()}
            className="px-3.5 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
            ← Quay lại
          </button>
        </div>
      </div>

      {/* ── Hint ──────────────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2.5 shrink-0">
        <p className="text-xs text-blue-700">
          💡 Profile thương hiệu sẽ xuất hiện trong dropdown <strong>Tùy chỉnh thương hiệu</strong> khi viết bài Facebook.
          Profile mặc định sẽ tự động được chọn khi mở form.
        </p>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏢</p>
            <p className="text-base font-medium text-gray-500 mb-1">Chưa có thương hiệu nào</p>
            <p className="text-sm text-gray-400 mb-6">Thêm profile để dùng lại khi viết bài Facebook</p>
            <button onClick={() => setModal({ open: true, profile: null })}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
              ➕ Thêm thương hiệu đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map(p => (
              <div key={p.id}
                className={`bg-white rounded-xl border-2 transition-all ${
                  p.isDefault
                    ? 'border-blue-400 shadow-sm shadow-blue-100'
                    : p.isActive
                    ? 'border-gray-200 hover:border-gray-300'
                    : 'border-gray-100 opacity-60'
                }`}>

                {/* Card header */}
                <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{p.name}</h3>
                      {p.isDefault && (
                        <span className="shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">⭐ Mặc định</span>
                      )}
                      {!p.isActive && (
                        <span className="shrink-0 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Đã ẩn</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      🏢 {p.shopName}{p.industry ? ` · ${p.industry}` : ''}
                    </p>
                  </div>
                </div>

                {/* Card fields */}
                <div className="px-4 pb-3 space-y-1.5">
                  {p.mainProducts   && <p className="text-xs text-gray-500">📦 SP: <span className="text-gray-700 line-clamp-1">{p.mainProducts}</span></p>}
                  {p.brandPronouns  && <p className="text-xs text-gray-500">🗣️ Xưng hô: <span className="text-gray-700">{p.brandPronouns}</span></p>}
                  {p.brandAudience  && <p className="text-xs text-gray-500">👥 Đối tượng: <span className="text-gray-700 line-clamp-1">{p.brandAudience}</span></p>}
                  {p.phone          && <p className="text-xs text-gray-500">📞 {p.phone}</p>}
                  {p.ctaStandard    && <p className="text-xs text-blue-500 line-clamp-1">💬 CTA: {p.ctaStandard}</p>}
                  {p.brandToneNotes && (
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1 border-t border-gray-50 pt-1.5">
                      📝 {p.brandToneNotes}
                    </p>
                  )}
                  {p.brandForbidden && (
                    <p className="text-xs text-red-400 line-clamp-1">🚫 Cấm: {p.brandForbidden}</p>
                  )}
                </div>

                {/* Card actions */}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2 bg-gray-50 rounded-b-xl">
                  <div className="flex items-center gap-1.5">
                    {!p.isDefault && (
                      <button onClick={() => handleSetDefault(p.id)}
                        title="Đặt làm mặc định"
                        className="p-1.5 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors text-sm">
                        ⭐
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(p)}
                      title={p.isActive ? 'Ẩn profile' : 'Hiện profile'}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-sm">
                      {p.isActive ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button
                      onClick={() => {
                        if (deleting === p.id) { handleDelete(p.id); }
                        else setDeleting(p.id);
                      }}
                      onBlur={() => setTimeout(() => { if (deleting === p.id) setDeleting(null); }, 200)}
                      className={`p-1.5 rounded-lg transition-colors text-sm ${
                        deleting === p.id
                          ? 'bg-red-100 text-red-600'
                          : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                      }`}
                      title={deleting === p.id ? 'Click lần nữa để xác nhận xóa' : 'Xóa'}>
                      {deleting === p.id ? '⚠️ Xóa?' : '🗑️'}
                    </button>
                  </div>
                  <button onClick={() => setModal({ open: true, profile: p })}
                    className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-white hover:border-blue-300 hover:text-blue-700 text-gray-600 transition-all">
                    ✏️ Sửa
                  </button>
                </div>
              </div>
            ))}

            {/* Add new card */}
            <button onClick={() => setModal({ open: true, profile: null })}
              className="bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[160px] flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-600">
              <span className="text-3xl">➕</span>
              <span className="text-sm font-medium">Thêm thương hiệu</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {modal.open && (
        <ProfileModal
          profile={modal.profile}
          onSave={handleSave}
          onClose={() => setModal({ open: false, profile: null })}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full shadow-xl z-50 animate-bounce-once">
          {toast}
        </div>
      )}
    </div>
  );
}
